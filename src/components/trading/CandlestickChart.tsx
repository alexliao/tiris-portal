import React, { useEffect, useMemo, useRef, useState, useCallback, Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type SeriesMarker,
  type SeriesMarkerBarPosition,
  type ISeriesMarkersPluginApi,
  type IChartApi,
  type ISeriesApi,
  type IPriceScaleApi,
  type Time,
  type BusinessDay,
  type LogicalRange,
  type Logical,
} from 'lightweight-charts';
import type {
  TradingCandlestickPoint,
  TradingDataPoint,
} from '../../utils/chartData';
import type { BotChartEvent } from '../../utils/api';
import { createChartTooltip, positionTooltipAvoidingCrosshair } from './tooltipUtils';
import { AxisDateTimeFormatOption, createDateTimeFormatter, DateFormatOption, DateTimeFormatOption, resolveLocale } from '../../utils/locale';
import {
  buildChartEventLayers,
  type ChartEventLayers,
  type PlotShapeEventMarker,
  type StatusEventDisplayType,
} from './chartEvents/statusEventRenderer';

const toTimeKeySeconds = (timestampSeconds: number): number | null => {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return null;
  }
  return Math.floor(timestampSeconds);
};

const timeframeToSeconds = (timeframe?: string): number => {
  const normalized = typeof timeframe === 'string' ? timeframe.trim().toLowerCase() : '';
  const map: Record<string, number> = {
    '1m': 60,
    '5m': 5 * 60,
    '15m': 15 * 60,
    '30m': 30 * 60,
    '1h': 60 * 60,
    '2h': 2 * 60 * 60,
    '4h': 4 * 60 * 60,
    '8h': 8 * 60 * 60,
    '12h': 12 * 60 * 60,
    '1d': 24 * 60 * 60,
    '1w': 7 * 24 * 60 * 60,
  };
  return map[normalized] ?? 60 * 60;
};

const alignToNearestCandleSecond = (
  targetSec: number,
  sortedCandleTimesSec: number[],
  maxDistanceSec: number
): number | null => {
  if (sortedCandleTimesSec.length === 0) {
    return null;
  }

  let low = 0;
  let high = sortedCandleTimesSec.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = sortedCandleTimesSec[mid];
    if (value === targetSec) {
      return value;
    }
    if (value < targetSec) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const candidates: number[] = [];
  if (low < sortedCandleTimesSec.length) {
    candidates.push(sortedCandleTimesSec[low]);
  }
  if (high >= 0) {
    candidates.push(sortedCandleTimesSec[high]);
  }

  if (candidates.length === 0) {
    return null;
  }

  let best = candidates[0];
  let bestDistance = Math.abs(best - targetSec);
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const distance = Math.abs(candidate - targetSec);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return bestDistance <= maxDistanceSec ? best : null;
};

const toSeriesMarker = (
  marker: PlotShapeEventMarker,
  alignedTimeSec: number
): SeriesMarker<Time> => {
  const hasPricePosition =
    marker.position === 'atPriceTop' ||
    marker.position === 'atPriceBottom' ||
    marker.position === 'atPriceMiddle';

  if (hasPricePosition) {
    return {
      time: alignedTimeSec as Time,
      color: marker.color,
      shape: marker.shape,
      position: marker.position,
      text: marker.text,
      price:
        typeof marker.price === 'number' && Number.isFinite(marker.price)
          ? marker.price
          : 0,
    };
  }

  return {
    time: alignedTimeSec as Time,
    color: marker.color,
    shape: marker.shape,
    position: marker.position as SeriesMarkerBarPosition,
    text: marker.text,
  };
};

interface CandlestickChartProps {
  candles: TradingCandlestickPoint[];
  equityPoints: TradingDataPoint[];
  benchmarkPoints: TradingDataPoint[];
  beforeCreationEquityPoints?: TradingDataPoint[];
  timeframe?: string;
  height?: number;
  className?: string;
  loading?: boolean;
  initialBalance?: number;
  baselinePrice?: number;
  tradingSignalsVisible?: boolean;
  onTradingSignalsToggle?: (nextVisible: boolean) => void;
  statusEvents?: BotChartEvent[];
  statusEventTimeframe?: string;
  statusEventTypeFilters?: StatusEventDisplayType[];
  seriesVisibility?: { price: boolean; equity: boolean; benchmark: boolean; position: boolean; signals: boolean; status: boolean };
  onSeriesVisibilityChange?: (visibility: { price: boolean; equity: boolean; benchmark: boolean; position: boolean; signals: boolean; status: boolean }) => void;
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
  beforeCreationEquityPoints,
  timeframe = '1m',
  height = 400,
  className = '',
  loading = false,
  initialBalance,
  baselinePrice,
  tradingSignalsVisible,
  statusEvents = [],
  statusEventTimeframe,
  statusEventTypeFilters,
  seriesVisibility: externalSeriesVisibility,
}) => {
  const { t, i18n } = useTranslation();
  const axisDateTimeFormatter = useMemo(
    () => (typeof Intl !== 'undefined' ? createDateTimeFormatter(AxisDateTimeFormatOption) : undefined),
    [i18n.language]
  );
  const fullDateTimeFormatter = useMemo(
    () => (typeof Intl !== 'undefined' ? createDateTimeFormatter(DateTimeFormatOption) : undefined),
    [i18n.language]
  );
  const dateOnlyFormatter = useMemo(
    () => (typeof Intl !== 'undefined' ? createDateTimeFormatter(DateFormatOption) : undefined),
    [i18n.language]
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartSurfaceRef = useRef<HTMLDivElement>(null);
  const statusBackgroundOverlayRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const beforeCreationAreaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const equityAreaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const benchmarkLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const benchmarkMarkersSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const benchmarkMarkersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const benchmarkLabelMarkersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const statusMarkersSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const statusMarkersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const positionSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const rightPriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const volumePriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const positionPriceScaleRef = useRef<IPriceScaleApi | null>(null);
  const zeroPriceLineRef = useRef<{
    line: ReturnType<ISeriesApi<'Area'>['createPriceLine']> | ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>;
    series: ISeriesApi<'Area'> | ISeriesApi<'Candlestick'>;
  } | null>(null);
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
    signals: true,
    status: false,
  });

  // Use external visibility if provided, otherwise use internal state
  const seriesVisibility = externalSeriesVisibility || internalSeriesVisibility;
  const seriesVisibilityStateRef = useRef(seriesVisibility);
  const [localSignalsVisible, setLocalSignalsVisible] = useState(
    tradingSignalsVisible ?? true
  );
  const candlesRef = useRef<TradingCandlestickPoint[]>([]);
  const chartEventLayersRef = useRef<ChartEventLayers>({
    backgroundIntervals: [],
    plotShapeMarkers: [],
  });
  const statusPlotShapeMarkersRef = useRef<SeriesMarker<Time>[]>([]);
  const roiByTimeRef = useRef<Map<number, number>>(new Map());
  const tradingEventsBySecondRef = useRef<Map<number, NonNullable<TradingDataPoint['events']>>>(new Map());

  const tradingEventsBySecond = useMemo(() => {
    const map = new Map<number, NonNullable<TradingDataPoint['events']>>();
    benchmarkPoints.forEach((point) => {
      if (!point.events || point.events.length === 0) {
        return;
      }
      const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
      if (timeInSeconds !== null) {
        const existingEvents = map.get(timeInSeconds) ?? [];
        map.set(timeInSeconds, existingEvents.concat(point.events));
      }
    });
    return map;
  }, [benchmarkPoints]);

  const chartEventLayers = useMemo(
    () => buildChartEventLayers(statusEvents, statusEventTimeframe, statusEventTypeFilters),
    [statusEventTimeframe, statusEventTypeFilters, statusEvents]
  );

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    chartEventLayersRef.current = chartEventLayers;
  }, [chartEventLayers]);

  const renderStatusBackgroundOverlay = useCallback(() => {
    const overlayEl = statusBackgroundOverlayRef.current;
    const chart = chartRef.current;

    if (!overlayEl || !chart) {
      return;
    }

    overlayEl.innerHTML = '';

    if (!seriesVisibilityStateRef.current.status || candlesRef.current.length === 0) {
      return;
    }

    const candlesWithStyle = candlesRef.current
      .map((candle) => {
        const timeInSeconds = toTimeKeySeconds(candle.timestampNum / 1000);
        if (timeInSeconds === null) {
          return null;
        }
        let activeColor: string | null = null;
        const intervals = chartEventLayersRef.current.backgroundIntervals;
        for (let index = intervals.length - 1; index >= 0; index -= 1) {
          const interval = intervals[index];
          if (timeInSeconds >= interval.startSec && timeInSeconds < interval.endSec) {
            activeColor = interval.color;
            break;
          }
          if (timeInSeconds >= interval.endSec) {
            break;
          }
        }
        if (!activeColor) {
          return null;
        }

        const coordinate = chart.timeScale().timeToCoordinate(timeInSeconds as Time);
        const x = coordinate === null ? Number.NaN : Number(coordinate);
        if (!Number.isFinite(x)) {
          return null;
        }

        return {
          x,
          color: activeColor,
        };
      })
      .filter((bar): bar is { x: number; color: string } => bar !== null)
      .sort((a, b) => a.x - b.x);

    if (candlesWithStyle.length === 0) {
      return;
    }

    const overlayHeight = overlayEl.clientHeight;
    if (overlayHeight <= 0) {
      return;
    }

    for (let index = 0; index < candlesWithStyle.length; index += 1) {
      const current = candlesWithStyle[index];
      const previous = candlesWithStyle[index - 1];
      const next = candlesWithStyle[index + 1];
      const leftGap = previous ? Math.max(current.x - previous.x, 1) : next ? Math.max(next.x - current.x, 1) : 12;
      const rightGap = next ? Math.max(next.x - current.x, 1) : previous ? Math.max(current.x - previous.x, 1) : 12;
      const left = current.x - leftGap / 2;
      const right = current.x + rightGap / 2;
      const width = Math.max(right - left, 1);

      const barEl = document.createElement('div');
      barEl.style.position = 'absolute';
      barEl.style.left = `${left}px`;
      barEl.style.top = '0px';
      barEl.style.width = `${width}px`;
      barEl.style.height = `${overlayHeight}px`;
      barEl.style.backgroundColor = current.color;
      overlayEl.appendChild(barEl);
    }
  }, []);

  useEffect(() => {
    tradingEventsBySecondRef.current = tradingEventsBySecond;
  }, [tradingEventsBySecond]);

  type TradingEventType = NonNullable<TradingDataPoint['events']>[number]['type'];

  const signalMarkerStyles: Record<TradingEventType, { color: string; shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square'; position: SeriesMarker<Time>['position']; }> = {
    buy: {
      color: '#3B82F6',
      shape: 'circle',
      position: 'inBar',
    },
    sell: {
      color: '#EF4444',
      shape: 'circle',
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
  const LABEL_PRICE_OFFSET_PX = 18; // fixed pixel offset to keep labels from overlapping candles

  useEffect(() => {
    if (typeof tradingSignalsVisible === 'boolean') {
      setLocalSignalsVisible(tradingSignalsVisible);
    }
  }, [tradingSignalsVisible]);

  const syncZeroLine = (value: number | undefined) => {
    const targetSeries = equityAreaSeriesRef.current || candlestickSeriesRef.current;
    if (!targetSeries) {
      return;
    }
    if (zeroPriceLineRef.current) {
      zeroPriceLineRef.current.series.removePriceLine(zeroPriceLineRef.current.line);
      zeroPriceLineRef.current = null;
    }
    if (value === undefined || !Number.isFinite(value)) {
      return;
    }
    const line = targetSeries.createPriceLine({
      price: value,
      color: '#9CA3AF',
      lineWidth: 1,
      lineStyle: 0,
      axisLabelVisible: false,
    });
    zeroPriceLineRef.current = { line, series: targetSeries };
  };

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
    const priceVisible = true; // Always show the right Y-axis for price
    const candleVisible = visibility.price; // Show candlesticks and volume based on price toggle
    const positionVisible = visibility.position;

    rightPriceScaleRef.current?.applyOptions({
      visible: priceVisible,
      scaleMargins: {
        top: 0.1,
        bottom: positionVisible ? 0.32 : 0.12,
      },
    });

    volumeSeriesRef.current?.applyOptions({ visible: candleVisible });
    const volumeMargins = positionVisible
      ? { top: 0.72, bottom: 0.18 }
      : { top: 0.78, bottom: 0.02 };

    volumePriceScaleRef.current?.applyOptions({
      visible: candleVisible, // Show volume scale only when candlesticks are visible
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
    if (!chartContainerRef.current || !chartSurfaceRef.current) return;

    try {
      const containerWidth = chartContainerRef.current.clientWidth;
      console.log(`📊 Chart container dimensions: width=${containerWidth}px, height=${heightRef.current}px`);
      if (containerWidth === 0) {
        console.warn(t('trading.chart.containerWidthZero', 'Chart container width is 0, chart may not render properly'));
      }

      const resolvedLocale = resolveLocale(i18n.language);

      const pad2 = (value: number) => value.toString().padStart(2, '0');

      const fallbackDateTimeFormat = (date: Date) => `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(
        date.getHours()
      )}:${pad2(date.getMinutes())}`;

      const fallbackDateTimeFormatWithYear = (date: Date) =>
        `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

      const fallbackDateFormat = (year: number, month: number, day: number) =>
        `${pad2(month)}/${pad2(day)}/${year.toString()}`;

      const formatDateTime = (date: Date) => {
        if (axisDateTimeFormatter) {
          return axisDateTimeFormatter.format(date);
        }
        return fallbackDateTimeFormat(date);
      };

      const formatDateTimeWithYear = (date: Date) => {
        if (fullDateTimeFormatter) {
          return fullDateTimeFormatter.format(date);
        }
        return fallbackDateTimeFormatWithYear(date);
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

      const formatTimestampSecondsWithYear = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        if (Number.isNaN(date.getTime())) {
          return '';
        }
        return formatDateTimeWithYear(date);
      };

      const formatBusinessDay = (time: BusinessDay) => {
        if (dateOnlyFormatter) {
          return dateOnlyFormatter.format(new Date(Date.UTC(time.year, time.month - 1, time.day, 12, 0, 0)));
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

      const formatTimeValueWithYear = (time: Time) => {
        if (typeof time === 'number') {
          return formatTimestampSecondsWithYear(time);
        }

        if (isBusinessDayTime(time)) {
          return formatBusinessDay(time);
        }

        return '';
      };

      const formatValueAsRoi = (value: number) => {
        const baseline = benchmarkBaselineRef.current ?? baselinePrice;
        if (typeof baseline === 'number' && Number.isFinite(baseline) && baseline !== 0) {
          const roiPercent = ((value - baseline) / baseline) * 100;
          return `${roiPercent.toFixed(2)}%`;
        }
        return `${value.toFixed(2)}`;
      };

      const chart = createChart(chartSurfaceRef.current, {
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
          locale: resolvedLocale,
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
          visible: false,
        },
      });

      rightPriceScaleRef.current = chart.priceScale('right');
      rightPriceScaleRef.current.applyOptions({ visible: true }); // Always show the right Y-axis for price

      const timeScale = chart.timeScale();
      const handleVisibleRangeChange = (newRange: LogicalRange | null) => {
        if (!newRange) {
          return;
        }

        if (suppressTimeRangeEventRef.current) {
          return;
        }

        hasUserAdjustedRangeRef.current = true;
        renderStatusBackgroundOverlay();
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
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: formatValueAsRoi,
        },
      });

      if (!series) {
        throw new Error('Failed to create candlestick series - returned null or undefined');
      }

      const beforeCreationSeries = chart.addSeries(AreaSeries, {
        priceScaleId: 'right',
        lineColor: '#6EE7B7',
        topColor: 'rgba(110, 231, 183, 0)',
        bottomColor: 'rgba(110, 231, 183, 0)',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: formatValueAsRoi,
        },
      });

      const equitySeries = chart.addSeries(AreaSeries, {
        priceScaleId: 'right',
        lineColor: '#10B981',
        topColor: 'rgba(16, 185, 129, 0.3)',
        bottomColor: 'rgba(16, 185, 129, 0.1)',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: formatValueAsRoi,
        },
      });

      const benchmarkSeries = chart.addSeries(LineSeries, {
        priceScaleId: 'right',
        color: '#F59E0B',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          minMove: 0.01,
          formatter: formatValueAsRoi,
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
      benchmarkLabelMarkersPluginRef.current = createSeriesMarkers(benchmarkMarkerSeries, []);

      const statusMarkerSeries = chart.addSeries(LineSeries, {
        priceScaleId: 'right',
        color: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        visible: true,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      statusMarkersSeriesRef.current = statusMarkerSeries;
      statusMarkersPluginRef.current = createSeriesMarkers(statusMarkerSeries, []);

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
        visible: seriesVisibilityStateRef.current.price, // Show volume scale only when candlesticks are visible
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
      beforeCreationAreaSeriesRef.current = beforeCreationSeries;
      equityAreaSeriesRef.current = equitySeries;
      benchmarkLineSeriesRef.current = benchmarkSeries;
      if (!benchmarkMarkersSeriesRef.current) {
        benchmarkMarkersSeriesRef.current = benchmarkMarkerSeries;
      }
      if (!statusMarkersSeriesRef.current) {
        statusMarkersSeriesRef.current = statusMarkerSeries;
      }
      volumeSeriesRef.current = volumeSeries;
      positionSeriesRef.current = positionSeries;

      console.log('✅ Candlestick series created successfully');

      applyScaleVisibility();

      if (!chartContainerRef.current) {
        throw new Error('Chart container not available for tooltip creation');
      }
      const toolTip = createChartTooltip(chartContainerRef.current);
      tooltipRef.current = toolTip;

      const formatCrosshairTime = (time: Time) => formatTimeValueWithYear(time);

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

        const toSeconds = (timeValue: Time): number | null => {
          if (typeof timeValue === 'number') {
            return Math.floor(timeValue);
          }
          if (typeof timeValue === 'string') {
            const parsed = new Date(timeValue).getTime();
            return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
          }
          const maybeBusinessDay = timeValue as BusinessDay | undefined;
          if (
            maybeBusinessDay &&
            typeof maybeBusinessDay.year === 'number' &&
            typeof maybeBusinessDay.month === 'number' &&
            typeof maybeBusinessDay.day === 'number'
          ) {
            const parsed = Date.UTC(maybeBusinessDay.year, maybeBusinessDay.month - 1, maybeBusinessDay.day);
            return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
          }
          return null;
        };

        const currentVisibility = seriesVisibilityStateRef.current;

        const candlestickData = candlestickSeriesRef.current
          ? extractOhlc(param.seriesData.get(candlestickSeriesRef.current))
          : undefined;
        const equityValue = equityAreaSeriesRef.current
          ? extractSingleValue(param.seriesData.get(equityAreaSeriesRef.current))
          : undefined;
        const beforeCreationEquityValue = beforeCreationAreaSeriesRef.current
          ? extractSingleValue(param.seriesData.get(beforeCreationAreaSeriesRef.current))
          : undefined;
        const resolvedEquityValue = equityValue ?? beforeCreationEquityValue;
        const volumeValue = volumeSeriesRef.current
          ? extractSingleValue(param.seriesData.get(volumeSeriesRef.current))
          : undefined;
        const positionValue = positionSeriesRef.current
          ? extractSingleValue(param.seriesData.get(positionSeriesRef.current))
          : undefined;
        const benchmarkValue = benchmarkLineSeriesRef.current
          ? extractSingleValue(param.seriesData.get(benchmarkLineSeriesRef.current))
          : undefined;
        const crosshairSeconds = toSeconds(param.time);
        const roiValue = crosshairSeconds !== null
          ? roiByTimeRef.current.get(crosshairSeconds)
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
          (currentVisibility.equity && (resolvedEquityValue !== undefined || roiValue !== undefined)) ||
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

        const assetsLabel = t('trading.chart.tooltipLabels.assets');
        if (currentVisibility.equity) {
          if (roiValue !== undefined) {
            if (
              initialBalance !== undefined &&
              Number.isFinite(initialBalance) &&
              initialBalance > 0
            ) {
              const assetsValue = initialBalance * (1 + roiValue / 100);
              tooltipLines.push(`<div>${assetsLabel}: $${assetsValue.toFixed(2)}</div>`);
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

        const timeInSeconds = toSeconds(param.time);
        const tradingEvents = timeInSeconds !== null ? tradingEventsBySecondRef.current.get(timeInSeconds) : undefined;
        if (tradingEvents && tradingEvents.length > 0) {
          tooltipLines.push(`<hr />`);

          tradingEvents.forEach((tradingEvent) => {
            const priceLabelKey = (() => {
              switch (tradingEvent.type) {
                case 'buy':
                  return 'signalPriceBuy';
                case 'sell':
                  return 'signalPriceSell';
                case 'stop_loss':
                  return 'signalPriceStopLoss';
                case 'deposit':
                  return 'signalPriceDeposit';
                case 'withdraw':
                  return 'signalPriceWithdraw';
                default:
                  return 'signalPrice';
              }
            })();

            if (typeof tradingEvent.price === 'number' && Number.isFinite(tradingEvent.price)) {
              const signalPriceLabel = t(`trading.chart.tooltipLabels.${priceLabelKey}`);
              tooltipLines.push(`<div>${signalPriceLabel}: $${tradingEvent.price.toFixed(2)}</div>`);
              return;
            }

            const signalLabel = t('trading.chart.tooltipLabels.signal', 'Signal');
            const eventLabel = t(`trading.events.${tradingEvent.type}`, tradingEvent.type);
            const description = tradingEvent.description ? ` - ${tradingEvent.description}` : '';
            tooltipLines.push(`<div>${signalLabel}: ${eventLabel}${description}</div>`);
          });
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
        tooltipEl.style.display = 'block';
        positionTooltipAvoidingCrosshair({
          point: { x, y },
          tooltipEl,
          container: containerEl,
        });
      };

      chart.subscribeCrosshairMove(handleCrosshairMove);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
          renderStatusBackgroundOverlay();
        }
      };

      window.addEventListener('resize', handleResize);

      setHasInitialized(true);
      requestAnimationFrame(() => {
        renderStatusBackgroundOverlay();
      });

      // Capture container ref in effect scope to avoid stale ref issues
      const containerRef = chartContainerRef.current;
      const overlayRef = statusBackgroundOverlayRef.current;
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
        timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
        if (tooltipRef.current && containerRef?.contains(tooltipRef.current)) {
          containerRef.removeChild(tooltipRef.current);
        }
        tooltipRef.current = null;
        benchmarkMarkersPluginRef.current?.detach();
        benchmarkMarkersPluginRef.current = null;
        benchmarkLabelMarkersPluginRef.current?.detach();
        benchmarkLabelMarkersPluginRef.current = null;
        statusMarkersPluginRef.current?.detach();
        statusMarkersPluginRef.current = null;
        if (overlayRef) {
          overlayRef.innerHTML = '';
        }
      };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError(t('trading.chart.failedToInitialize', `Failed to initialize chart: ${err instanceof Error ? err.message : String(err)}`));
    }
  }, [initialBalance, baselinePrice, renderStatusBackgroundOverlay, t]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    chartRef.current.applyOptions({ height });
  }, [height]);

  // Cleanup chart on unmount
  useEffect(() => {
    const overlayRef = statusBackgroundOverlayRef.current;
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
      benchmarkLabelMarkersPluginRef.current = null;
      statusMarkersSeriesRef.current = null;
      statusMarkersPluginRef.current = null;
      volumeSeriesRef.current = null;
      positionSeriesRef.current = null;
      rightPriceScaleRef.current = null;
      volumePriceScaleRef.current = null;
      positionPriceScaleRef.current = null;
      statusPlotShapeMarkersRef.current = [];
      if (overlayRef) {
        overlayRef.innerHTML = '';
      }
      if (zeroPriceLineRef.current) {
        zeroPriceLineRef.current.series.removePriceLine(zeroPriceLineRef.current.line);
        zeroPriceLineRef.current = null;
      }
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
      statusMarkersSeriesRef.current?.setData([]);
      statusMarkersPluginRef.current?.setMarkers([]);
      statusPlotShapeMarkersRef.current = [];
      volumeSeriesRef.current?.setData([]);
      positionSeriesRef.current?.setData([]);
      roiByTimeRef.current = new Map();
      syncZeroLine(undefined);
      if (statusBackgroundOverlayRef.current) {
        statusBackgroundOverlayRef.current.innerHTML = '';
      }
      if (!loading) {
        setError(t('trading.chart.noDataAvailable', 'No candlestick data available for this timeframe.'));
      }
      return;
    }

    const validCandles = candles.filter(candle => {
      const timeInSeconds = toTimeKeySeconds(candle.timestampNum / 1000);
      if (timeInSeconds === null) {
        console.error(t('trading.chart.invalidCandle', `Skipping invalid candle with timestamp: ${candle.timestamp}`));
        return false;
      }
      return true;
    });

    const chartData = validCandles.map((candle) => ({
      time: Math.floor(candle.timestampNum / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

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
    renderStatusBackgroundOverlay();

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
        const timeInSeconds = toTimeKeySeconds(candle.timestampNum / 1000);
        if (timeInSeconds === null) {
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
        const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
        if (timeInSeconds === null) {
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
    syncZeroLine(resolvedBaselinePrice);

    // Handle before creation equity data
    const beforeCreationData = (beforeCreationEquityPoints || [])
      .map((point: TradingDataPoint) => {
        const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
        if (timeInSeconds === null) {
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

    if (beforeCreationAreaSeriesRef.current) {
      if (resolvedBaselinePrice !== undefined && beforeCreationData.length > 0) {
        beforeCreationData.sort((a: { time: Time; value: number }, b: { time: Time; value: number }) => (a.time as number) - (b.time as number));
        beforeCreationAreaSeriesRef.current.setData(beforeCreationData);
      } else {
        beforeCreationAreaSeriesRef.current.setData([]);
      }
    }

    const equityData = equityPoints
      .map((point) => {
        const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
        if (timeInSeconds === null) {
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

    const equityRoiMap = new Map<number, number>();
    const addRoiPoints = (points: TradingDataPoint[]) => {
      points.forEach((point) => {
        const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
        if (timeInSeconds === null) {
          return;
        }

        if (point.roi === undefined || point.roi === null) {
          return;
        }

        equityRoiMap.set(timeInSeconds, point.roi);
      });
    };
    addRoiPoints(beforeCreationEquityPoints ?? []);
    addRoiPoints(equityPoints);
    roiByTimeRef.current = equityRoiMap;

    const benchmarkData = benchmarkPoints
      .map((point) => {
        const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
        if (timeInSeconds === null) {
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

    const benchmarkPriceMarkers: SeriesMarker<Time>[] = [];
    const benchmarkLabelMarkers: SeriesMarker<Time>[] = [];
    const buyLabelText = t('performance.tooltip.buy', 'BUY');
    const sellLabelText = t('performance.tooltip.sell', 'SELL');

    benchmarkPoints.forEach((point) => {
      if (!point.events || point.events.length === 0) {
        return;
      }
      const timeInSeconds = toTimeKeySeconds(point.timestampNum / 1000);
      if (timeInSeconds === null) {
        return;
      }

      point.events.forEach((event) => {
        const markerStyle = signalMarkerStyles[event.type] ?? signalMarkerStyles.sell;
        const markerPrice =
          typeof event.price === 'number' && Number.isFinite(event.price)
            ? event.price
            : typeof point.benchmarkPrice === 'number' && Number.isFinite(point.benchmarkPrice)
              ? point.benchmarkPrice
              : typeof resolvedBaselinePrice === 'number' && Number.isFinite(resolvedBaselinePrice)
                ? resolvedBaselinePrice
                : undefined;

        if (markerPrice !== undefined) {
          benchmarkPriceMarkers.push({
            time: timeInSeconds as Time,
            position: 'atPriceMiddle',
            color: markerStyle.color,
            shape: markerStyle.shape,
            price: markerPrice,
          });
        } else {
          benchmarkPriceMarkers.push({
            time: timeInSeconds as Time,
            position: markerStyle.position as SeriesMarkerBarPosition,
            color: markerStyle.color,
            shape: markerStyle.shape,
          });
        }

        const markerText =
          event.type === 'buy'
            ? buyLabelText
            : event.type === 'sell'
              ? sellLabelText
              : undefined;

        if (markerText) {
          const markerSeries = benchmarkMarkersSeriesRef.current;
          const markerCoordinate =
            markerSeries && markerPrice !== undefined && Number.isFinite(markerPrice)
              ? markerSeries.priceToCoordinate(markerPrice)
              : null;

          const pixelOffset = event.type === 'buy' ? LABEL_PRICE_OFFSET_PX : -LABEL_PRICE_OFFSET_PX;
          const adjustedPrice =
            markerSeries && markerCoordinate !== null && markerCoordinate !== undefined
              ? markerSeries.coordinateToPrice(markerCoordinate + pixelOffset)
              : undefined;

          benchmarkLabelMarkers.push(
            markerPrice !== undefined
              ? {
                  time: timeInSeconds as Time,
                  position: event.type === 'buy' ? 'atPriceBottom' : 'atPriceTop',
                  color: markerStyle.color,
                  shape: 'circle',
                  text: markerText,
                  price: adjustedPrice ?? markerPrice,
                  size: 0,
                }
              : {
                  time: timeInSeconds as Time,
                  position: event.type === 'buy' ? 'belowBar' : 'aboveBar',
                  color: markerStyle.color,
                  shape: 'circle',
                  text: markerText,
                  size: 0,
                }
          );
        }
      });
    });

    benchmarkPriceMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    benchmarkLabelMarkers.sort((a, b) => (a.time as number) - (b.time as number));

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
        signalsVisible ? benchmarkPriceMarkers : []
      );
    }

    if (benchmarkLabelMarkersPluginRef.current) {
      benchmarkLabelMarkersPluginRef.current.setMarkers(
        signalsVisible ? benchmarkLabelMarkers : []
      );
    }

    const statusMarkersBaseData = chartData.map((point, index) => ({
      time: point.time,
      value: chartData[index].close,
    }));

    if (statusMarkersSeriesRef.current) {
      statusMarkersSeriesRef.current.setData(statusMarkersBaseData);
    }

    const statusMarkers: SeriesMarker<Time>[] = [];
    const candleTimesSec = chartData.map(point => Number(point.time)).sort((a, b) => a - b);
    const maxMarkerDistanceSec = Math.max(Math.floor(timeframeToSeconds(timeframe) / 2), 60);

    chartEventLayers.plotShapeMarkers.forEach((marker) => {
      const alignedTime = alignToNearestCandleSecond(marker.timeSec, candleTimesSec, maxMarkerDistanceSec);
      if (alignedTime === null) {
        return;
      }
      statusMarkers.push(toSeriesMarker(marker, alignedTime));
    });

    statusMarkers.sort((a, b) => Number(a.time) - Number(b.time));
    statusPlotShapeMarkersRef.current = statusMarkers;

    if (statusMarkersPluginRef.current) {
      statusMarkersPluginRef.current.setMarkers(
        seriesVisibility.status ? statusMarkers : []
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
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    candles,
    equityPoints,
    beforeCreationEquityPoints,
    benchmarkPoints,
    loading,
    hasInitialized,
    timeframe,
    baselinePrice,
    signalsVisible,
    chartEventLayers,
    axisDateTimeFormatter,
    fullDateTimeFormatter,
    dateOnlyFormatter,
    i18n.language,
    renderStatusBackgroundOverlay,
  ]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }
    renderStatusBackgroundOverlay();
  }, [hasInitialized, chartEventLayers, renderStatusBackgroundOverlay, seriesVisibility.status]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    seriesVisibilityStateRef.current = seriesVisibility;
    candlestickSeriesRef.current?.applyOptions({ visible: seriesVisibility.price });
    equityAreaSeriesRef.current?.applyOptions({ visible: seriesVisibility.equity });
    beforeCreationAreaSeriesRef.current?.applyOptions({ visible: seriesVisibility.equity });
    benchmarkLineSeriesRef.current?.applyOptions({ visible: seriesVisibility.benchmark });
    applyScaleVisibility(seriesVisibility);
    renderStatusBackgroundOverlay();
    statusMarkersPluginRef.current?.setMarkers(
      seriesVisibility.status ? statusPlotShapeMarkersRef.current : []
    );
  }, [hasInitialized, renderStatusBackgroundOverlay, seriesVisibility]);

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tiris-primary-600"></div>
        </div>
      )}
      <div
        ref={chartContainerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
        data-testid="candlestick-chart-container"
      >
        <div
          ref={statusBackgroundOverlayRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}
        />
        <div
          ref={chartSurfaceRef}
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
      </div>
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
