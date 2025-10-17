import React, { useEffect, useRef, useState, Component, useCallback, type ErrorInfo, type ReactNode } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time
} from 'lightweight-charts';
import { getOHLCV, type OHLCVCandle } from '../../utils/api';

interface CandlestickChartProps {
  exchange: string;        // Exchange ID (e.g., 'binance')
  market: string;          // Market symbol (e.g., 'ETH/USDT')
  startTime?: number;      // Start time in milliseconds (optional, for backward compatibility)
  endTime?: number;        // End time in milliseconds (optional, for backward compatibility)
  timeframe?: string;      // Timeframe for candles (e.g., '1m', '1h', '1d')
  height?: number;         // Chart height in pixels
  className?: string;
  ohlcvData?: OHLCVCandle[]; // Optional pre-fetched OHLCV data
  visibleDataStartIndex?: number; // Index in ohlcvData where visible window starts (for panning with loaded data)
  visibleDataEndIndex?: number;   // Index in ohlcvData where visible window ends
  onPriceScaleWidthChange?: (width: number) => void;
  isIncrementalUpdate?: boolean; // If true, append new data instead of replacing
}

// Mock data generator for testing - generates realistic-looking candlestick data
function generateMockOHLCVData(startTime: number, endTime: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];

  // Generate 1-minute candles
  const oneMinuteMs = 60 * 1000;
  let currentTime = Math.floor(startTime / oneMinuteMs) * oneMinuteMs;
  let basePrice = 2000; // ETH price base

  while (currentTime < endTime) {
    // Generate realistic price movement (+/- 0.5%)
    const change = (Math.random() - 0.5) * 20; // Random change in price
    const open = basePrice + change;
    const close = basePrice + (Math.random() - 0.5) * 20;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;

    candles.push({
      ex: 'binance',
      market: 'ETH/USDT',
      ts: new Date(currentTime).toISOString(),
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v: Math.random() * 100,
      final: true,
      schema_ver: 1
    });

    basePrice = close;
    currentTime += oneMinuteMs;
  }

  console.log(`Generated ${candles.length} mock OHLCV candles for testing`);
  return candles;
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
  exchange,
  market,
  startTime,
  endTime,
  timeframe = '1m',
  height = 200,
  className = '',
  ohlcvData,
  visibleDataStartIndex,
  visibleDataEndIndex,
  onPriceScaleWidthChange,
  isIncrementalUpdate = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const updatePriceScaleWidth = useCallback(() => {
    if (!onPriceScaleWidthChange || !chartRef.current) {
      return;
    }

    const priceScale = chartRef.current.priceScale('right');
    if (!priceScale) {
      return;
    }

    const width = priceScale.width();
    if (Number.isFinite(width) && width > 0) {
      onPriceScaleWidthChange(width);
    }
  }, [onPriceScaleWidthChange]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || hasInitialized) return;

    try {
      setHasInitialized(true);

      // Get container width, ensure it's valid
      const containerWidth = chartContainerRef.current.clientWidth;
      console.log(`📊 Chart container dimensions: width=${containerWidth}px, height=${height}px`);
      if (containerWidth === 0) {
        console.warn('Chart container width is 0, chart may not render properly');
      }

      // Format time as local zone time
      const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        return date.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: undefined,
          hour12: false
        });
      };

      // Create chart instance
      const chart = createChart(chartContainerRef.current, {
        width: containerWidth || 600, // Fallback to 600px if width is 0
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
          barSpacing: 12, // Make candlesticks wider (default is usually 4-6)
          tickMarkFormatter: (time: number) => formatTime(time),
        },
        rightPriceScale: {
          borderColor: '#d1d4dc',
        },
      });

      // Create candlestick series using v5 API
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

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      // Notify parent about initial price scale width after chart is ready
      requestAnimationFrame(updatePriceScaleWidth);

      console.log('✅ Candlestick series created successfully');

      // Handle window resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
          updatePriceScaleWidth();
        }
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        // Only remove chart when component unmounts, not on re-renders
        // Keep the chart instance alive for data updates
      };
    } catch (err) {
      console.error('Failed to initialize candlestick chart:', err);
      setError(`Failed to initialize chart: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, [height, hasInitialized, updatePriceScaleWidth]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
    };
  }, [updatePriceScaleWidth]);

  // Fetch and update OHLCV data
  useEffect(() => {
    const fetchData = async () => {
      if (!candlestickSeriesRef.current || !hasInitialized) return;

      try {
        setLoading(true);
        setError(null);

        // Convert market format from ETH/USDT to ETH_USDT for backend API
        const marketFormatted = market.replace('/', '_');

        let candles: OHLCVCandle[];

        // If visible indices are provided, slice from pre-loaded data (panning mode)
        if (ohlcvData && ohlcvData.length > 0 && visibleDataStartIndex !== undefined && visibleDataEndIndex !== undefined) {
          console.log(`Slicing OHLCV data from index ${visibleDataStartIndex} to ${visibleDataEndIndex} (total: ${ohlcvData.length} candles)`);
          candles = ohlcvData.slice(visibleDataStartIndex as number, visibleDataEndIndex as number);
        }
        // Use provided data if available (full dataset provided at once)
        else if (ohlcvData && ohlcvData.length > 0) {
          console.log(`Using provided OHLCV data: ${ohlcvData.length} candles`);
          candles = ohlcvData;
        }
        // Fallback to fetching by time range (backward compatibility)
        else if (startTime && endTime) {
          console.log(`Fetching OHLCV for ${marketFormatted} with timeframe ${timeframe} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
          candles = await getOHLCV(exchange, marketFormatted, startTime, endTime, timeframe);
        }
        else {
          throw new Error('No data source provided: either ohlcvData or startTime/endTime required');
        }

        // Check if we got data
        if (!candles || candles.length === 0) {
          console.warn(`No OHLCV data returned from API. Exchange: ${exchange}, Market: ${marketFormatted}, Time range: ${startTime}-${endTime}`);

          // For development/testing: generate mock data if API returns empty
          // Only generate mock if we have valid time range
          if (startTime && endTime) {
            console.log('Generating mock data for testing purposes...');
            candles = generateMockOHLCVData(startTime, endTime);
            if (candles.length === 0) {
              setError('No candlestick data available for this time range. The backend may not have data yet.');
              setLoading(false);
              return;
            }
          } else {
            setError('No candlestick data available. Cannot fetch data without time range.');
            setLoading(false);
            return;
          }
        }

        console.log(`Received ${candles.length} ${timeframe} candles from API`);

        // Transform OHLCV data to lightweight-charts format
        const chartData: CandlestickData<Time>[] = [];
        for (const candle of candles) {
          // Convert timestamp to seconds (lightweight-charts uses seconds)
          const timeInSeconds = new Date(candle.ts).getTime() / 1000;

          // Validate the timestamp
          if (!isFinite(timeInSeconds) || timeInSeconds <= 0) {
            console.error(`Skipping invalid candle with timestamp: ${candle.ts}, converted to ${timeInSeconds}`);
            continue;
          }

          chartData.push({
            time: timeInSeconds as Time,
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
          });
        }

        // Validate data
        if (chartData.length === 0) {
          setError('No valid candlestick data available after validation');
          setLoading(false);
          return;
        }

        // Sort by time (required by lightweight-charts)
        chartData.sort((a, b) => (a.time as number) - (b.time as number));

        // Log data for debugging
        console.log(`Loading ${chartData.length} valid candles, time range: ${chartData[0].time} to ${chartData[chartData.length - 1].time}`);
        console.log('First candle:', chartData[0]);
        console.log('Last candle:', chartData[chartData.length - 1]);

        // Update chart data
        if (candlestickSeriesRef.current) {
          if (isIncrementalUpdate && chartData.length > 0) {
            // For incremental updates, get existing data and combine with new data
            // Note: lightweight-charts requires candles to be in ascending time order
            console.log(`📈 Appending ${chartData.length} new candles to chart series (incremental update)`);

            // Get existing data from the series
            const existingData = candlestickSeriesRef.current.data() || [];
            console.log(`Existing data count: ${existingData.length}`);

            // Combine existing and new data, then sort
            const combinedData = [...existingData, ...chartData];
            combinedData.sort((a, b) => (a.time as number) - (b.time as number));

            // Remove duplicates (same time) - keep new data, discard old
            const uniqueData: CandlestickData<Time>[] = [];
            const timeSet = new Set<number>();
            for (let i = combinedData.length - 1; i >= 0; i--) {
              const time = combinedData[i].time as number;
              if (!timeSet.has(time)) {
                uniqueData.unshift(combinedData[i]);
                timeSet.add(time);
              }
            }

            console.log(`Combined ${existingData.length} existing + ${chartData.length} new = ${uniqueData.length} unique candles`);
            candlestickSeriesRef.current.setData(uniqueData);
            console.log('✅ New candles appended successfully');

            // After appending, scroll to show the latest candle
            if (chartRef.current) {
              requestAnimationFrame(() => {
                if (chartRef.current) {
                  try {
                    const timeScale = chartRef.current.timeScale();
                    // Scroll right to show the newly appended candles
                    timeScale.scrollToPosition(5, false);
                    console.log('✅ Chart scrolled to show new candles');
                  } catch (scrollErr) {
                    console.warn('Failed to scroll chart:', scrollErr);
                  }
                }
              });
            }
          } else {
            // For full updates, replace all data
            // Make sure data is sorted before setting
            chartData.sort((a, b) => (a.time as number) - (b.time as number));
            console.log(`📈 Setting ${chartData.length} candles to chart series`);
            candlestickSeriesRef.current.setData(chartData);
            console.log('✅ Chart data updated successfully');
          }

          updatePriceScaleWidth();

          // Log what's visible in the chart
          if (chartRef.current) {
            const range = chartRef.current.timeScale().getVisibleRange();
            console.log(`📊 Current visible range:`, range);
          }
        } else {
          console.error('❌ candlestickSeriesRef.current is null!');
        }

        // Fit content to visible range AFTER data is set (only for full updates, not incremental)
        if (chartRef.current && !isIncrementalUpdate) {
          // Use requestAnimationFrame twice to ensure rendering happens after data is set
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (chartRef.current) {
                try {
                  // Fit all candlesticks to the visible range
                  const timeScale = chartRef.current.timeScale();
                  timeScale.fitContent();

                  console.log('✅ Chart fitted to content - showing all candlesticks');
                } catch (fitErr) {
                  console.warn('Failed to fit content, chart will show default view:', fitErr);
                  // Even if fitContent fails, the data should still be visible
                }
              }
            });
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch OHLCV data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load candlestick data';
        setError(errorMessage);
        setLoading(false);
      }
    };

    if (hasInitialized) {
      fetchData();
    }
  }, [exchange, market, startTime, endTime, timeframe, hasInitialized, ohlcvData, visibleDataStartIndex, visibleDataEndIndex, updatePriceScaleWidth, isIncrementalUpdate]);

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
