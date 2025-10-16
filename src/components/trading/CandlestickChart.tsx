import React, { useEffect, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type CandlestickData,
  type Time
} from 'lightweight-charts';
import { getOHLCV, type OHLCVCandle } from '../../utils/api';

interface CandlestickChartProps {
  exchange: string;        // Exchange ID (e.g., 'binance')
  market: string;          // Market symbol (e.g., 'ETH/USDT')
  startTime: number;       // Start time in milliseconds
  endTime: number;         // End time in milliseconds
  height?: number;         // Chart height in pixels
  className?: string;
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
          <p className="text-gray-500 text-sm">Chart temporarily unavailable</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const CandlestickChartInner: React.FC<CandlestickChartProps> = ({
  exchange,
  market,
  startTime,
  endTime,
  height = 200,
  className = ''
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || hasInitialized) return;

    try {
      setHasInitialized(true);

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
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
        secondsVisible: true,
        borderColor: '#d1d4dc',
      },
      rightPriceScale: {
        borderColor: '#d1d4dc',
      },
    });

    // Create candlestick series using the new v5 API
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError('Failed to initialize chart');
      setLoading(false);
    }
  }, [height, hasInitialized]);

  // Fetch and update OHLCV data
  useEffect(() => {
    const fetchData = async () => {
      if (!candlestickSeriesRef.current || !hasInitialized) return;

      try {
        setLoading(true);
        setError(null);

        // Convert market format from ETH/USDT to ETH_USDT for backend API
        const marketFormatted = market.replace('/', '_');

        const candles = await getOHLCV(exchange, marketFormatted, startTime, endTime);

        // Check if we got data
        if (!candles || candles.length === 0) {
          setError('No candlestick data available for this time range');
          return;
        }

        // Transform OHLCV data to lightweight-charts format
        const chartData: CandlestickData<Time>[] = candles.map((candle: OHLCVCandle) => ({
          time: (new Date(candle.ts).getTime() / 1000) as Time,
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
        }));

        // Sort by time (required by lightweight-charts)
        chartData.sort((a, b) => (a.time as number) - (b.time as number));

        // Update chart data
        candlestickSeriesRef.current.setData(chartData);

        // Fit content to visible range
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Failed to fetch OHLCV data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load candlestick data');
      } finally {
        setLoading(false);
      }
    };

    if (hasInitialized) {
      fetchData();
    }
  }, [exchange, market, startTime, endTime, hasInitialized]);

  // Update chart time range when props change
  useEffect(() => {
    if (!chartRef.current) return;

    const fromTime = (startTime / 1000) as Time;
    const toTime = (endTime / 1000) as Time;

    chartRef.current.timeScale().setVisibleRange({
      from: fromTime,
      to: toTime,
    });
  }, [startTime, endTime]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-white rounded-lg border ${className}`} style={{ height }}>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div ref={chartContainerRef} style={{ height }} />
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
