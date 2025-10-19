import React, { useEffect, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
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
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const equityLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const benchmarkLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const equityPercentageSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || hasInitialized) return;

    try {
      setHasInitialized(true);

      const containerWidth = chartContainerRef.current.clientWidth;
      console.log(`📊 Chart container dimensions: width=${containerWidth}px, height=${height}px`);
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
        height: height,
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

      const equitySeries = chart.addSeries(LineSeries, {
        priceScaleId: 'right',
        color: '#2563EB',
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
      equityLineSeriesRef.current = equitySeries;
      benchmarkLineSeriesRef.current = benchmarkSeries;
      equityPercentageSeriesRef.current = equityPercentageSeries;

      console.log('✅ Candlestick series created successfully');

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError(`Failed to initialize chart: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [height, hasInitialized]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      equityLineSeriesRef.current = null;
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
      equityLineSeriesRef.current?.setData([]);
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

    if (equityLineSeriesRef.current) {
      if (equityData.length > 0) {
        equityData.sort((a, b) => (a.time as number) - (b.time as number));
        equityLineSeriesRef.current.setData(equityData);
      } else {
        equityLineSeriesRef.current.setData([]);
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
        style={{ width: '100%', height: '100%' }}
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
