import React, { useEffect, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type BusinessDay,
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
}

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
  height = 200,
  className = '',
  loading = false,
  initialBalance,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const equityAreaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const benchmarkLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const equityPercentageSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const heightRef = useRef(height);
  const benchmarkBaselineRef = useRef<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [seriesVisibility, setSeriesVisibility] = useState({
    price: false,
    equity: true,
    benchmark: true,
  });
  const seriesVisibilityStateRef = useRef(seriesVisibility);

  heightRef.current = height;

  const legendItems: Array<{ key: keyof typeof seriesVisibility; label: string; color: string }> = [
    { key: 'price', label: 'Price', color: '#4B5563' },
    { key: 'equity', label: 'Equity Return', color: '#10B981' },
    { key: 'benchmark', label: 'Benchmark Return', color: '#F59E0B' },
  ];

  const toggleSeriesVisibility = (key: keyof typeof seriesVisibility) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const containerWidth = chartContainerRef.current.clientWidth;
      console.log(`📊 Chart container dimensions: width=${containerWidth}px, height=${heightRef.current}px`);
      if (containerWidth === 0) {
        console.warn('Chart container width is 0, chart may not render properly');
      }

      const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: undefined,
          hour12: false,
        });
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
          tickMarkFormatter: (time: number) => formatTime(time),
        },
        rightPriceScale: {
          borderColor: '#d1d4dc',
          scaleMargins: {
            top: 0.2,
            bottom: 0.1,
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

      const series = chart.addSeries(CandlestickSeries, {
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

      chartRef.current = chart;
      candlestickSeriesRef.current = series;
      equityAreaSeriesRef.current = equitySeries;
      benchmarkLineSeriesRef.current = benchmarkSeries;
      equityPercentageSeriesRef.current = equityPercentageSeries;

      console.log('✅ Candlestick series created successfully');

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

      const isBusinessDay = (time: Time): time is BusinessDay => {
        return typeof time === 'object' && time !== null && 'year' in time && 'month' in time && 'day' in time;
      };

      const formatCrosshairTime = (time: Time) => {
        if (typeof time === 'number') {
          return formatTime(time);
        }

        if (isBusinessDay(time)) {
          const date = new Date(Date.UTC(time.year, time.month - 1, time.day));
          return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          });
        }

        return '';
      };

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
          (currentVisibility.price && candlestickData) ||
          (currentVisibility.equity && (equityValue !== undefined || roiValue !== undefined)) ||
          (currentVisibility.benchmark && benchmarkPercent !== undefined)
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

        if (currentVisibility.price && candlestickData) {
          tooltipLines.push(
            `<div>O: ${candlestickData.open.toFixed(2)} H: ${candlestickData.high.toFixed(2)}</div>`
          );
          tooltipLines.push(
            `<div>L: ${candlestickData.low.toFixed(2)} C: ${candlestickData.close.toFixed(2)}</div>`
          );
        }

        if (currentVisibility.equity) {
          if (roiValue !== undefined) {
            tooltipLines.push(`<div>ROI: ${roiValue.toFixed(2)}%</div>`);

            if (
              initialBalance !== undefined &&
              Number.isFinite(initialBalance) &&
              initialBalance > 0
            ) {
              const portfolioValue = initialBalance * (1 + roiValue / 100);
              tooltipLines.push(`<div>Portfolio: $${portfolioValue.toFixed(2)}</div>`);
            }
          }
        }

        if (currentVisibility.benchmark && benchmarkPercent !== undefined) {
          tooltipLines.push(`<div>Benchmark: ${benchmarkPercent.toFixed(2)}%</div>`);
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
        if (tooltipRef.current && chartContainerRef.current?.contains(tooltipRef.current)) {
          chartContainerRef.current.removeChild(tooltipRef.current);
        }
        tooltipRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError(`Failed to initialize chart: ${err instanceof Error ? err.message : String(err)}`);
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
      equityPercentageSeriesRef.current = null;
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
      equityPercentageSeriesRef.current?.setData([]);
      if (!loading) {
        setError('No candlestick data available for this timeframe.');
      }
      return;
    }

    const chartData: CandlestickData<Time>[] = [];
    for (const candle of candles) {
      const timeInSeconds = candle.timestampNum / 1000;

      if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
        console.error(`Skipping invalid candle with timestamp: ${candle.timestamp}`);
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
      setError('No valid candlestick data available after validation');
      return;
    }

    chartData.sort((a, b) => (a.time as number) - (b.time as number));

    console.log(`📈 Setting ${chartData.length} candlesticks for timeframe ${timeframe}`);
    console.log('First candle:', chartData[0]);
    console.log('Last candle:', chartData[chartData.length - 1]);

    setError(null);
    candlestickSeriesRef.current.setData(chartData);

    const baselinePrice = benchmarkPoints.find(point => {
      const price = point.benchmarkPrice;
      return typeof price === 'number' && Number.isFinite(price);
    })?.benchmarkPrice;
    benchmarkBaselineRef.current = baselinePrice;

    const equityData = equityPoints
      .map((point) => {
        const timeInSeconds = point.timestampNum / 1000;
        if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
          return null;
        }

        if (point.roi === undefined || point.roi === null || baselinePrice === undefined) {
          return null;
        }

        return {
          time: timeInSeconds as Time,
          value: baselinePrice * (1 + point.roi / 100),
        };
      })
      .filter((item): item is { time: Time; value: number } => item !== null);

    if (equityAreaSeriesRef.current) {
      if (equityData.length > 0) {
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

    if (benchmarkLineSeriesRef.current) {
      if (benchmarkData.length > 0) {
        benchmarkData.sort((a, b) => (a.time as number) - (b.time as number));
        benchmarkLineSeriesRef.current.setData(benchmarkData);
      } else {
        benchmarkLineSeriesRef.current.setData([]);
      }
    }

    if (chartRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!chartRef.current) {
            return;
          }

          try {
            chartRef.current.timeScale().fitContent();
            console.log('✅ Chart fitted to content - showing all candlesticks');
          } catch (fitErr) {
            console.warn('Failed to fit content, chart will show default view:', fitErr);
          }
        });
      });
    }
  }, [candles, equityPoints, benchmarkPoints, loading, hasInitialized, timeframe]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    seriesVisibilityStateRef.current = seriesVisibility;
    candlestickSeriesRef.current?.applyOptions({ visible: seriesVisibility.price });
    equityAreaSeriesRef.current?.applyOptions({ visible: seriesVisibility.equity });
    benchmarkLineSeriesRef.current?.applyOptions({ visible: seriesVisibility.benchmark });
  }, [hasInitialized, seriesVisibility]);

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
      <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-2">
        {legendItems.map((item) => {
          const isActive = seriesVisibility[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSeriesVisibility(item.key)}
              className={`flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isActive
                  ? 'bg-white border-gray-300 text-gray-700 focus:ring-blue-200'
                  : 'bg-gray-100 border-gray-200 text-gray-400 focus:ring-blue-100'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: isActive ? item.color : '#D1D5DB' }}
              />
              {item.label}
            </button>
          );
        })}
      </div>
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
