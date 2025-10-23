import React, { useEffect, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type SeriesMarkerBar,
  type ISeriesMarkersPluginApi,
  type IChartApi,
  type ISeriesApi,
  type IPriceScaleApi,
  type CandlestickData,
  type Time,
  type BusinessDay,
  type LogicalRange,
  type Logical,
} from 'lightweight-charts';
import type {
  TradingCandlestickPoint,
  TradingDataPoint,
} from '../../utils/chartData';

interface CandlestickChartProps {
  candles: TradingCandlestickPoint[];
  equityPoints: TradingDataPoint[];
  benchmarkPoints: TradingDataPoint[];
  timeframe?: string;
  height?: number;
  className?: string;
  loading?: boolean;
  initialBalance?: number;
  baselinePrice?: number;
  tradingSignalsVisible?: boolean;
  onTradingSignalsToggle?: (nextVisible: boolean) => void;
  seriesVisibility?: { price: boolean; equity: boolean; benchmark: boolean; position: boolean; signals: boolean };
  onSeriesVisibilityChange?: (visibility: { price: boolean; equity: boolean; benchmark: boolean; position: boolean; signals: boolean }) => void;
}

const DEFAULT_VISIBLE_CANDLE_COUNT = 100;

// Error boundary to catch chart errors
class ChartErrorBoundary extends Component<
  { children: ReactNode; height: number; className: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; height: number; className: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CandlestickChart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex items-center justify-center bg-white rounded-lg border ${this.props.className}`}
          style={{ height: this.props.height }}
        >
          <p className="text-red-600 text-sm">
            {/* Note: Error boundary doesn't have access to i18n, fallback to English */}
            Chart error: {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const CandlestickChartInner: React.FC<CandlestickChartProps> = ({
  candles,
  equityPoints,
  benchmarkPoints,
  timeframe = '1m',
  height = 400,
  className = '',
  loading = false,
  initialBalance,
  baselinePrice,
  tradingSignalsVisible,
  seriesVisibility: externalSeriesVisibility,
}) => {
  const { t } = useTranslation();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const equityAreaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const benchmarkLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const benchmarkMarkersSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const benchmarkMarkersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const equityPercentageSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const positionSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const rightPriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const volumePriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const positionPriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const heightRef = useRef(height);
  const benchmarkBaselineRef = useRef<number | undefined>(undefined);
  const hasUserAdjustedRangeRef = useRef(false);
  const suppressTimeRangeEventRef = useRef(false);
  const previousCandlesLengthRef = useRef(0);
  const previousLatestBarTimeRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [internalSeriesVisibility] = useState({
    price: false,
    equity: true,
    benchmark: true,
    position: true,
  });

  // Use external visibility if provided, otherwise use internal state
  const seriesVisibility = externalSeriesVisibility || internalSeriesVisibility;
  const seriesVisibilityStateRef = useRef(seriesVisibility);
  const [localSignalsVisible, setLocalSignalsVisible] = useState(
    tradingSignalsVisible ?? true
  );

  type TradingEventType = NonNullable<TradingDataPoint['event']>['type'];

  const signalMarkerStyles: Record<TradingEventType, { color: string; shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square'; position: 'aboveBar' | 'belowBar' | 'inBar'; }> = {
    buy: {
      color: '#3B82F6',
      shape: 'arrowUp',
      position: 'inBar',
    },
    sell: {
      color: '#EF4444',
      shape: 'arrowDown',
      position: 'inBar',
    },
    stop_loss: {
      color: '#F97316',
      shape: 'arrowDown',
      position: 'inBar',
    },
    deposit: {
      color: '#10B981',
      shape: 'circle',
      position: 'inBar',
    },
    withdraw: {
      color: '#8B5CF6',
      shape: 'square',
      position: 'inBar',
    },
  };

  heightRef.current = height;

  useEffect(() => {
    if (typeof tradingSignalsVisible === 'boolean') {
      setLocalSignalsVisible(tradingSignalsVisible);
    }
  }, [tradingSignalsVisible]);

  const signalsVisible =
    typeof tradingSignalsVisible === 'boolean'
      ? tradingSignalsVisible
      : localSignalsVisible;

  useEffect(() => {
    hasUserAdjustedRangeRef.current = false;
    previousCandlesLengthRef.current = 0;
    previousLatestBarTimeRef.current = null;
  }, [timeframe]);


  const applyScaleVisibility = (visibility = seriesVisibilityStateRef.current) => {
    const priceVisible = visibility.price;
    const positionVisible = visibility.position;

    rightPriceScaleRef.current?.applyOptions({
      visible: priceVisible,
      scaleMargins: {
        top: 0.1,
        bottom: positionVisible ? 0.32 : 0.12,
      },
    });

    volumeSeriesRef.current?.applyOptions({ visible: priceVisible });
    const volumeMargins = positionVisible
      ? { top: 0.72, bottom: 0.18 }
      : { top: 0.78, bottom: 0.02 };

    volumePriceScaleRef.current?.applyOptions({
      visible: priceVisible,
      scaleMargins: volumeMargins,
      borderColor: '#d1d4dc',
    });

    positionSeriesRef.current?.applyOptions({ visible: positionVisible });
    const positionMargins = positionVisible
      ? { top: 0.9, bottom: 0 }
      : { top: 0.98, bottom: 0.02 };

    positionPriceScaleRef.current?.applyOptions({
      visible: positionVisible,
      scaleMargins: positionMargins,
      borderColor: '#d1d4dc',
    });
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const containerWidth = chartContainerRef.current.clientWidth;
      console.log(`📊 Chart container dimensions: width=${containerWidth}px, height=${heightRef.current}px`);
      if (containerWidth === 0) {
        console.warn(t('trading.chart.containerWidthZero', 'Chart container width is 0, chart may not render properly'));
      }

      const resolvedLocale = typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions()
        : undefined;

      const pad2 = (value: number) => value.toString().padStart(2, '0');

      const localTimeFormatter = typeof Intl !== 'undefined'
        ? new Intl.DateTimeFormat(resolvedLocale?.locale, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: resolvedLocale?.timeZone,
        })
        : undefined;

      const localDateFormatter = typeof Intl !== 'undefined'
        ? new Intl.DateTimeFormat(resolvedLocale?.locale, {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          timeZone: resolvedLocale?.timeZone,
        })
        : undefined;

      const fallbackDateTimeFormat = (date: Date) => `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(
        date.getHours()
      )}:${pad2(date.getMinutes())}`;

      const fallbackDateFormat = (year: number, month: number, day: number) =>
        `${pad2(month)}/${pad2(day)}/${year.toString()}`;

      const formatDateTime = (date: Date) => {
        if (localTimeFormatter) {
          return localTimeFormatter.format(date);
        }
        return fallbackDateTimeFormat(date);
      };

      const isBusinessDayTime = (time: Time): time is BusinessDay => {
        return typeof time === 'object' && time !== null && 'year' in time && 'month' in time && 'day' in time;
      };

      const formatTimestampSeconds = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        if (Number.isNaN(date.getTime())) {
          return '';
        }
        return formatDateTime(date);
      };

      const formatBusinessDay = (time: BusinessDay) => {
        if (localDateFormatter) {
          return localDateFormatter.format(new Date(Date.UTC(time.year, time.month - 1, time.day, 12, 0, 0)));
        }
        return fallbackDateFormat(time.year, time.month, time.day);
      };

      const formatTimeValue = (time: Time) => {
        if (typeof time === 'number') {
          return formatTimestampSeconds(time);
        }

        if (isBusinessDayTime(time)) {
          return formatBusinessDay(time);
        }

        return '';
      };

      const chart = createChart(chartContainerRef.current, {
        width: containerWidth || 600,
        height: heightRef.current,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#d1d4dc',
          barSpacing: 12,
          tickMarkFormatter: (time: Time) => formatTimeValue(time),
        },
        localization: {
          locale: resolvedLocale?.locale,
          timeFormatter: (time: Time) => formatTimeValue(time),
        },
        rightPriceScale: {
          borderColor: '#d1d4dc',
          scaleMargins: {
            top: 0.1,
            bottom: seriesVisibilityStateRef.current.position ? 0.32 : 0.12,
          },
        },
        leftPriceScale: {
          visible: true,
          borderColor: '#d1d4dc',
          scaleMargins: {
            top: 0.2,
            bottom: 0.1,
          },
        },
      });

      rightPriceScaleRef.current = chart.priceScale('right');
      rightPriceScaleRef.current.applyOptions({ visible: seriesVisibilityStateRef.current.price });

      const timeScale = chart.timeScale();
      const handleVisibleRangeChange = (newRange: LogicalRange | null) => {
        if (!newRange) {
          return;
        }

        if (suppressTimeRangeEventRef.current) {
          return;
        }

        hasUserAdjustedRangeRef.current = true;
      };

      timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

      const series = chart.addSeries(CandlestickSeries, {
        priceScaleId: 'right',
        upColor: '#10B981',
        downColor: '#EF4444',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      if (!series) {
        throw new Error('Failed to create candlestick series - returned null or undefined');
      }

      const equitySeries = chart.addSeries(AreaSeries, {
        priceScaleId: 'right',
        lineColor: '#10B981',
        topColor: 'rgba(16, 185, 129, 0.3)',
        bottomColor: 'rgba(16, 185, 129, 0.1)',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: (value: number) => `$${value.toFixed(2)}`,
        },
      });

      const benchmarkSeries = chart.addSeries(LineSeries, {
        priceScaleId: 'right',
        color: '#F59E0B',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: (value: number) => `$${value.toFixed(2)}`,
        },
      });

      const benchmarkMarkerSeries = chart.addSeries(LineSeries, {
        priceScaleId: 'right',
        color: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        visible: true,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });

      benchmarkMarkersSeriesRef.current = benchmarkMarkerSeries;
      benchmarkMarkersPluginRef.current = createSeriesMarkers(benchmarkMarkerSeries, []);

      const equityPercentageSeries = chart.addSeries(LineSeries, {
        priceScaleId: 'left',
        color: 'rgba(37, 99, 235, 0)',
        lineWidth: 1,
        priceFormat: {
          type: 'custom',
          minMove: 0.1,
          formatter: (value: number) => `${value.toFixed(1)}%`,
        },
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: 'volume',
        priceFormat: {
          type: 'volume',
        },
        base: 0,
        color: 'rgba(148, 163, 184, 0.4)',
      });

      volumePriceScaleRef.current = volumeSeries.priceScale();
      volumePriceScaleRef.current.applyOptions({
        scaleMargins: seriesVisibilityStateRef.current.position
          ? { top: 0.72, bottom: 0.18 }
          : { top: 0.78, bottom: 0.02 },
        visible: seriesVisibilityStateRef.current.price,
        borderColor: '#d1d4dc',
      });

      const positionSeries = chart.addSeries(AreaSeries, {
        priceScaleId: 'position',
        lineColor: '#3B82F6',
        topColor: 'rgba(59, 130, 246, 0.25)',
        bottomColor: 'rgba(59, 130, 246, 0.05)',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerBorderColor: '#FFFFFF',
        crosshairMarkerBackgroundColor: '#3B82F6',
        priceFormat: {
          type: 'custom',
          minMove: 0.0001,
          formatter: (value: number) => value.toFixed(4),
        },
      });

      positionPriceScaleRef.current = positionSeries.priceScale();
      positionPriceScaleRef.current.applyOptions({
        scaleMargins: seriesVisibilityStateRef.current.position
          ? { top: 0.9, bottom: 0 }
          : { top: 0.98, bottom: 0.02 },
        visible: seriesVisibilityStateRef.current.position,
        borderColor: '#d1d4dc',
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = series;
      equityAreaSeriesRef.current = equitySeries;
      benchmarkLineSeriesRef.current = benchmarkSeries;
      if (!benchmarkMarkersSeriesRef.current) {
        benchmarkMarkersSeriesRef.current = benchmarkMarkerSeries;
      }
      equityPercentageSeriesRef.current = equityPercentageSeries;
      volumeSeriesRef.current = volumeSeries;
      positionSeriesRef.current = positionSeries;

      console.log('✅ Candlestick series created successfully');

      applyScaleVisibility();

      const toolTip = document.createElement('div');
      toolTip.style.position = 'absolute';
      toolTip.style.display = 'none';
      toolTip.style.pointerEvents = 'none';
      toolTip.style.padding = '8px 10px';
      toolTip.style.borderRadius = '6px';
      toolTip.style.background = 'rgba(255, 255, 255, 0.95)';
      toolTip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      toolTip.style.border = '1px solid rgba(209, 213, 219, 0.8)';
      toolTip.style.color = '#111827';
      toolTip.style.fontSize = '12px';
      toolTip.style.lineHeight = '1.4';
      toolTip.style.zIndex = '30';
      toolTip.style.whiteSpace = 'nowrap';
      tooltipRef.current = toolTip;
      chartContainerRef.current?.appendChild(toolTip);

      const formatCrosshairTime = (time: Time) => formatTimeValue(time);

      const extractOhlc = (data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'open' in data &&
          'high' in data &&
          'low' in data &&
          'close' in data
        ) {
          const { open, high, low, close } = data as {
            open: number;
            high: number;
            low: number;
            close: number;
          };
          return { open, high, low, close };
        }
        return undefined;
      };

      const extractSingleValue = (data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'value' in data &&
          typeof (data as { value: unknown }).value === 'number'
        ) {
          return (data as { value: number }).value;
        }
        return undefined;
      };

      const handleCrosshairMove: Parameters<IChartApi['subscribeCrosshairMove']>[0] = (param) => {
        const tooltipEl = tooltipRef.current;
        const containerEl = chartContainerRef.current;

        if (!tooltipEl || !containerEl) {
          return;
        }

        if (!param?.time || !param?.point) {
          tooltipEl.style.display = 'none';
          return;
        }

        const currentVisibility = seriesVisibilityStateRef.current;

        const candlestickData = candlestickSeriesRef.current
          ? extractOhlc(param.seriesData.get(candlestickSeriesRef.current))
          : undefined;
        const equityValue = equityAreaSeriesRef.current
          ? extractSingleValue(param.seriesData.get(equityAreaSeriesRef.current))
          : undefined;
        const volumeValue = volumeSeriesRef.current
          ? extractSingleValue(param.seriesData.get(volumeSeriesRef.current))
          : undefined;
        const positionValue = positionSeriesRef.current
          ? extractSingleValue(param.seriesData.get(positionSeriesRef.current))
          : undefined;
        const benchmarkValue = benchmarkLineSeriesRef.current
          ? extractSingleValue(param.seriesData.get(benchmarkLineSeriesRef.current))
          : undefined;
        const roiValue = equityPercentageSeriesRef.current
          ? extractSingleValue(param.seriesData.get(equityPercentageSeriesRef.current))
          : undefined;
        let benchmarkPercent: number | undefined;

        if (benchmarkValue !== undefined) {
          const baselinePrice = benchmarkBaselineRef.current;
          if (baselinePrice !== undefined && Number.isFinite(baselinePrice) && baselinePrice > 0) {
            benchmarkPercent = ((benchmarkValue - baselinePrice) / baselinePrice) * 100;
          }
        }

        const hasAnyData = Boolean(
          (currentVisibility.price && (candlestickData || volumeValue !== undefined)) ||
          (currentVisibility.equity && (equityValue !== undefined || roiValue !== undefined)) ||
          (currentVisibility.benchmark && benchmarkPercent !== undefined) ||
          (currentVisibility.position && positionValue !== undefined)
        );

        if (!hasAnyData) {
          tooltipEl.style.display = 'none';
          return;
        }

        const tooltipLines: string[] = [];
        const formattedTime = formatCrosshairTime(param.time);
        if (formattedTime) {
          tooltipLines.push(`<div style="font-weight: 600; margin-bottom: 4px;">${formattedTime}</div>`);
        }

        const portfolioLabel = t('trading.chart.tooltipLabels.portfolio');
        if (currentVisibility.equity) {
          if (roiValue !== undefined) {
            if (
              initialBalance !== undefined &&
              Number.isFinite(initialBalance) &&
              initialBalance > 0
            ) {
              const portfolioValue = initialBalance * (1 + roiValue / 100);
              tooltipLines.push(`<div>${portfolioLabel}: $${portfolioValue.toFixed(2)}</div>`);
            }
          }
        }

        if (roiValue !== undefined) {
          const roiLabel = t('trading.chart.tooltipLabels.roi');
          tooltipLines.push(`<div>${roiLabel}: ${roiValue.toFixed(2)}%</div>`);
        }

        if (currentVisibility.benchmark && benchmarkPercent !== undefined) {
          const benchmarkLabel = t('trading.chart.tooltipLabels.benchmark');
          tooltipLines.push(`<div>${benchmarkLabel}: ${benchmarkPercent.toFixed(2)}%</div>`);
        }

        if (currentVisibility.price && candlestickData) {
          const openLabel = t('trading.chart.tooltipLabels.open');
          const highLabel = t('trading.chart.tooltipLabels.high');
          const lowLabel = t('trading.chart.tooltipLabels.low');
          const closeLabel = t('trading.chart.tooltipLabels.close');
          tooltipLines.push(`<hr />`);
          tooltipLines.push(
            `<div>${openLabel}: ${candlestickData.open.toFixed(2)} ${highLabel}: ${candlestickData.high.toFixed(2)}</div>`
          );
          tooltipLines.push(
            `<div>${lowLabel}: ${candlestickData.low.toFixed(2)} ${closeLabel}: ${candlestickData.close.toFixed(2)}</div>`
          );
        }

        if (currentVisibility.price && volumeValue !== undefined) {
          const volumeLabel = t('trading.chart.tooltipLabels.volume');
          const formattedVolume = Number(volumeValue).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          });
          tooltipLines.push(`<div>${volumeLabel}: ${formattedVolume}</div>`);
        }

        if (currentVisibility.position && positionValue !== undefined) {
          const positionLabel = t('trading.chart.tooltipLabels.position');
          const formattedPosition = Number(positionValue).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
          tooltipLines.push(`<hr />`);
          tooltipLines.push(`<div>${positionLabel}: ${formattedPosition}</div>`);
        }

        tooltipEl.innerHTML = tooltipLines.join('');

        const { x, y } = param.point;
        const containerWidth = containerEl.clientWidth;
        const containerHeight = containerEl.clientHeight;

        tooltipEl.style.display = 'block';

        const tooltipWidth = tooltipEl.clientWidth;
        const tooltipHeight = tooltipEl.clientHeight;

        let left = x + 12;
        let top = y + 12;

        if (left + tooltipWidth > containerWidth) {
          left = x - tooltipWidth - 12;
        }

        if (top + tooltipHeight > containerHeight) {
          top = y - tooltipHeight - 12;
        }

        tooltipEl.style.left = `${Math.max(0, left)}px`;
        tooltipEl.style.top = `${Math.max(0, top)}px`;
      };

      chart.subscribeCrosshairMove(handleCrosshairMove);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      setHasInitialized(true);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
        timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
        if (tooltipRef.current && chartContainerRef.current?.contains(tooltipRef.current)) {
          chartContainerRef.current.removeChild(tooltipRef.current);
        }
        tooltipRef.current = null;
        benchmarkMarkersPluginRef.current?.detach();
        benchmarkMarkersPluginRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError(t('trading.chart.failedToInitialize', `Failed to initialize chart: ${err instanceof Error ? err.message : String(err)}`));
    }
  }, [initialBalance]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    chartRef.current.applyOptions({ height });
  }, [height]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      equityAreaSeriesRef.current = null;
      benchmarkLineSeriesRef.current = null;
      benchmarkMarkersSeriesRef.current = null;
      benchmarkMarkersPluginRef.current = null;
      equityPercentageSeriesRef.current = null;
      volumeSeriesRef.current = null;
      positionSeriesRef.current = null;
      rightPriceScaleRef.current = null;
      volumePriceScaleRef.current = null;
      positionPriceScaleRef.current = null;
    };
  }, []);

  // Update chart data whenever the shared candles change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !hasInitialized) {
      return;
    }

    if (loading) {
      return;
    }

    if (!candles || candles.length === 0) {
      candlestickSeriesRef.current.setData([]);
      equityAreaSeriesRef.current?.setData([]);
      benchmarkLineSeriesRef.current?.setData([]);
      benchmarkMarkersSeriesRef.current?.setData([]);
      equityPercentageSeriesRef.current?.setData([]);
      volumeSeriesRef.current?.setData([]);
      positionSeriesRef.current?.setData([]);
      if (!loading) {
        setError(t('trading.chart.noDataAvailable', 'No candlestick data available for this timeframe.'));
      }
      return;
    }

    const chartData: CandlestickData<Time>[] = [];
    for (const candle of candles) {
      const timeInSeconds = candle.timestampNum / 1000;

      if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
        console.error(t('trading.chart.invalidCandle', `Skipping invalid candle with timestamp: ${candle.timestamp}`));
        continue;
      }

      chartData.push({
        time: timeInSeconds as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    }

    if (chartData.length === 0) {
      candlestickSeriesRef.current.setData([]);
      volumeSeriesRef.current?.setData([]);
      setError(t('trading.chart.noValidData', 'No valid candlestick data available after validation'));
      return;
    }

    chartData.sort((a, b) => (a.time as number) - (b.time as number));

    console.log(`📈 Setting ${chartData.length} candlesticks for timeframe ${timeframe}`);
    console.log('First candle:', chartData[0]);
    console.log('Last candle:', chartData[chartData.length - 1]);

    setError(null);
    candlestickSeriesRef.current.setData(chartData);

    const lastBarTime = chartData.length > 0 ? Number(chartData[chartData.length - 1].time) : Number.NaN;
    const datasetResetDetected =
      previousCandlesLengthRef.current === 0 ||
      chartData.length < previousCandlesLengthRef.current ||
      (Number.isFinite(lastBarTime) &&
        typeof previousLatestBarTimeRef.current === 'number' &&
        previousLatestBarTimeRef.current !== null &&
        lastBarTime < previousLatestBarTimeRef.current);

    if (datasetResetDetected) {
      hasUserAdjustedRangeRef.current = false;
    }

    const volumeData = candles
      .map((candle) => {
        const timeInSeconds = candle.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (typeof candle.volume !== 'number') {
          return null;
        }

        const color = candle.close >= candle.open ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';

        return {
          time: timeInSeconds as Time,
          value: candle.volume,
          color,
        };
      })
      .filter((item): item is { time: Time; value: number; color: string } => item !== null);

    if (volumeData.length > 0) {
      volumeData.sort((a, b) => (a.time as number) - (b.time as number));
    }

    if (volumeSeriesRef.current) {
      if (volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    const positionData = equityPoints
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (point.position === undefined || point.position === null) {
          return null;
        }

        return {
          time: timeInSeconds as Time,
          value: point.position,
        };
      })
      .filter((item): item is { time: Time; value: number } => item !== null);

    if (positionData.length > 0) {
      positionData.sort((a, b) => (a.time as number) - (b.time as number));
    }

    if (positionSeriesRef.current) {
      if (positionData.length > 0) {
        positionSeriesRef.current.setData(positionData);
      } else {
        positionSeriesRef.current.setData([]);
      }
    }

    const resolvedBaselinePrice =
      typeof baselinePrice === 'number' && Number.isFinite(baselinePrice) && baselinePrice > 0
        ? baselinePrice
        : undefined;
    benchmarkBaselineRef.current = resolvedBaselinePrice;

    const equityData = equityPoints
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (point.roi === undefined || point.roi === null || resolvedBaselinePrice === undefined) {
          return null;
        }

        return {
          time: timeInSeconds as Time,
          value: resolvedBaselinePrice * (1 + point.roi / 100),
        };
      })
      .filter((item): item is { time: Time; value: number } => item !== null);

    if (equityAreaSeriesRef.current) {
      if (resolvedBaselinePrice !== undefined && equityData.length > 0) {
        equityData.sort((a, b) => (a.time as number) - (b.time as number));
        equityAreaSeriesRef.current.setData(equityData);
      } else {
        equityAreaSeriesRef.current.setData([]);
      }
    }

    const equityPercentageData = equityPoints
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (point.roi === undefined || point.roi === null) {
          return null;
        }

        return {
          time: timeInSeconds as Time,
          value: point.roi,
        };
      })
      .filter((item): item is { time: Time; value: number } => item !== null);

    if (equityPercentageSeriesRef.current) {
      if (equityPercentageData.length > 0) {
        equityPercentageData.sort((a, b) => (a.time as number) - (b.time as number));
        equityPercentageSeriesRef.current.setData(equityPercentageData);
      } else {
        equityPercentageSeriesRef.current.setData([]);
      }
    }

    const benchmarkData = benchmarkPoints
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (point.benchmarkPrice === undefined || point.benchmarkPrice === null) {
          return null;
        }

        return {
          time: timeInSeconds as Time,
          value: point.benchmarkPrice,
        };
      })
      .filter((item): item is { time: Time; value: number } => item !== null);

    const benchmarkMarkers: SeriesMarkerBar<Time>[] = benchmarkPoints
      .filter((point) => point.event)
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        const event = point.event!;
        const markerStyle = signalMarkerStyles[event.type] ?? signalMarkerStyles.sell;

        const marker: SeriesMarkerBar<Time> = {
          time: timeInSeconds as Time,
          position: markerStyle.position,
          color: markerStyle.color,
          shape: markerStyle.shape,
        };

        return marker;
      })
      .filter((marker): marker is SeriesMarkerBar<Time> => marker !== null)
      .sort((a, b) => (a.time as number) - (b.time as number));

    let sortedBenchmarkData: { time: Time; value: number }[] | undefined;
    if (benchmarkData.length > 0) {
      sortedBenchmarkData = [...benchmarkData].sort((a, b) => (a.time as number) - (b.time as number));
    }

    if (benchmarkLineSeriesRef.current) {
      if (sortedBenchmarkData && sortedBenchmarkData.length > 0) {
        benchmarkLineSeriesRef.current.setData(sortedBenchmarkData);
      } else {
        benchmarkLineSeriesRef.current.setData([]);
      }
    }

    if (benchmarkMarkersSeriesRef.current) {
      if (sortedBenchmarkData && sortedBenchmarkData.length > 0) {
        benchmarkMarkersSeriesRef.current.setData(sortedBenchmarkData);
      } else {
        benchmarkMarkersSeriesRef.current.setData([]);
      }
    }

    if (benchmarkMarkersPluginRef.current) {
      benchmarkMarkersPluginRef.current.setMarkers(
        signalsVisible ? benchmarkMarkers : []
      );
    }

    if (chartRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!chartRef.current) {
            return;
          }

          if (hasUserAdjustedRangeRef.current) {
            return;
          }

          const timeScale = chartRef.current.timeScale();
          suppressTimeRangeEventRef.current = true;

          try {
            if (chartData.length <= DEFAULT_VISIBLE_CANDLE_COUNT) {
              timeScale.fitContent();
              console.log('✅ Chart fitted to content - showing all available candlesticks');
            } else {
              const lastIndex = chartData.length - 1;
              const firstVisibleIndex = Math.max(0, lastIndex - DEFAULT_VISIBLE_CANDLE_COUNT + 1);
              const visibleRange: LogicalRange = {
                from: firstVisibleIndex as unknown as Logical,
                to: lastIndex as unknown as Logical,
              };
              timeScale.setVisibleLogicalRange(visibleRange);
              console.log(`✅ Chart showing latest ${DEFAULT_VISIBLE_CANDLE_COUNT} candlesticks`);
            }
          } catch (rangeErr) {
            console.warn('Failed to adjust candlestick visible range, chart will show default view:', rangeErr);
          } finally {
            requestAnimationFrame(() => {
              suppressTimeRangeEventRef.current = false;
            });
          }
        });
      });
    }

    if (Number.isFinite(lastBarTime)) {
      previousLatestBarTimeRef.current = lastBarTime;
    } else {
      previousLatestBarTimeRef.current = null;
    }
    previousCandlesLengthRef.current = chartData.length;
  }, [
    candles,
    equityPoints,
    benchmarkPoints,
    loading,
    hasInitialized,
    timeframe,
    baselinePrice,
    signalsVisible,
  ]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    seriesVisibilityStateRef.current = seriesVisibility;
    candlestickSeriesRef.current?.applyOptions({ visible: seriesVisibility.price });
    equityAreaSeriesRef.current?.applyOptions({ visible: seriesVisibility.equity });
    benchmarkLineSeriesRef.current?.applyOptions({ visible: seriesVisibility.benchmark });
    applyScaleVisibility(seriesVisibility);
  }, [hasInitialized, seriesVisibility]);

  // Update internal state when external visibility changes (if from parent)
  useEffect(() => {
    if (externalSeriesVisibility && !internalSeriesVisibility) {
      return;
    }
    if (externalSeriesVisibility && internalSeriesVisibility) {
      if (JSON.stringify(externalSeriesVisibility) === JSON.stringify(internalSeriesVisibility)) {
        return;
      }
    }
  }, [externalSeriesVisibility, internalSeriesVisibility]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg border ${className}`} style={{ height }}>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg border border-gray-200 ${className}`} style={{ height, overflow: 'hidden' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
        data-testid="candlestick-chart-container"
      />
    </div>
  );
};

const CandlestickChart: React.FC<CandlestickChartProps> = (props) => {
  return (
    <ChartErrorBoundary height={props.height || 200} className={props.className || ''}>
      <CandlestickChartInner {...props} />
    </ChartErrorBoundary>
  );
};

export default CandlestickChart;
