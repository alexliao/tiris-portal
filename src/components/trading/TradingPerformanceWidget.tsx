import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Scatter } from 'recharts';
import { getEquityCurve, getEquityCurveByTimeRange, getTradingLogs, getSubAccountsByTrading, getOHLCV, ApiError, type Trading } from '../../utils/api';
import { transformNewEquityCurveToChartData, type TradingDataPoint, type TradingMetrics } from '../../utils/chartData';
import CandlestickChart from './CandlestickChart';

type Timeframe = '1m' | '1h' | '4h' | '8h' | '1d' | '1w';

const DEFAULT_LEFT_AXIS_WIDTH = 60;
const DEFAULT_RIGHT_AXIS_WIDTH = 60;
const CHART_LEFT_MARGIN = 5;
const CHART_RIGHT_MARGIN = 0;

interface TradingPerformanceWidgetProps {
  trading: Trading;
  className?: string;
  showHeader?: boolean;
  showHighlights?: boolean;
  height?: string;
  refreshTrigger?: number;
  autoRefreshEnabled?: boolean;
  onAutoRefreshToggle?: (enabled: boolean) => void;
}

const areTradingPointsEqual = (a: TradingDataPoint, b: TradingDataPoint): boolean => {
  if (a.timestampNum !== b.timestampNum) return false;
  if (a.netValue !== b.netValue) return false;
  if (a.roi !== b.roi) return false;
  if ((a.benchmark ?? null) !== (b.benchmark ?? null)) return false;
  if ((a.benchmarkPrice ?? null) !== (b.benchmarkPrice ?? null)) return false;
  if ((a.position ?? null) !== (b.position ?? null)) return false;

  const aEventType = a.event?.type ?? null;
  const bEventType = b.event?.type ?? null;
  if (aEventType !== bEventType) return false;

  const aEventDescription = a.event?.description ?? null;
  const bEventDescription = b.event?.description ?? null;
  if (aEventDescription !== bEventDescription) return false;

  return true;
};

const areMetricsEqual = (prev: TradingMetrics, next: TradingMetrics): boolean => {
  return (
    prev.totalROI === next.totalROI &&
    prev.winRate === next.winRate &&
    prev.sharpeRatio === next.sharpeRatio &&
    prev.maxDrawdown === next.maxDrawdown &&
    prev.totalTrades === next.totalTrades &&
    prev.initialPrice === next.initialPrice
  );
};

const mergeTradingDataSets = (
  prev: TradingDataPoint[],
  next: TradingDataPoint[]
): { value: TradingDataPoint[]; changed: boolean } => {
  if (prev.length === 0) {
    return { value: next, changed: true };
  }

  const prevByTimestamp = new Map<number, TradingDataPoint>();
  prev.forEach(point => {
    prevByTimestamp.set(point.timestampNum, point);
  });

  let changed = prev.length !== next.length;
  const merged = next.map(point => {
    const previousPoint = prevByTimestamp.get(point.timestampNum);
    if (previousPoint && areTradingPointsEqual(previousPoint, point)) {
      return previousPoint;
    }

    changed = true;
    return point;
  });

  if (!changed) {
    return { value: prev, changed: false };
  }

  return { value: merged, changed: true };
};

type ChartState = {
  data: TradingDataPoint[];
  benchmarkData: TradingDataPoint[];
  metrics: TradingMetrics;
  ohlcvData?: any[];
  fullOHLCVData?: any[]; // Full OHLCV data for the entire time range (for panning without API calls)
};

// Per-timeframe data cache to store loaded data for each timeframe
type TimeframeDataCache = {
  [timeframe: string]: {
    data: TradingDataPoint[];
    benchmarkData: TradingDataPoint[];
    metrics: TradingMetrics;
    fullOHLCVData?: any[];
    lastUpdateTimestamp?: number;
  };
};

const VISIBLE_WINDOW_SIZE = 100; // Number of data points to display at once
const TOTAL_DATA_TO_LOAD = 500; // Total number of data points to load from backend

const TradingPerformanceWidgetComponent: React.FC<TradingPerformanceWidgetProps> = ({
  trading,
  className = '',
  showHeader = true,
  showHighlights = true,
  height = 'h-screen',
  refreshTrigger = 0,
  autoRefreshEnabled = true,
  onAutoRefreshToggle
}) => {
  const { t } = useTranslation();
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    benchmarkData: [],
    metrics: {} as TradingMetrics
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradingDots, setShowTradingDots] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1m');
  const [stockSymbol, setStockSymbol] = useState<string>('ETH');
  const [quoteSymbol, setQuoteSymbol] = useState<string>('USDT');
  const [isRefetchingData, setIsRefetchingData] = useState(false);
  const [rightAxisWidth, setRightAxisWidth] = useState(DEFAULT_RIGHT_AXIS_WIDTH);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number | null>(null);
  const [isIncrementalOHLCVUpdate, setIsIncrementalOHLCVUpdate] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const userIsPanningRef = useRef(false);
  const panDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Per-timeframe data cache to store data loaded for each timeframe
  const timeframeDataCacheRef = useRef<TimeframeDataCache>({});

  // Helper function to get timeframe duration in milliseconds
  const getTimeframeDurationMs = (timeframe: Timeframe): number => {
    const durationMap: Record<Timeframe, number> = {
      '1m': 1 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return durationMap[timeframe];
  };

  const handlePriceScaleWidthChange = useCallback((width: number) => {
    if (!Number.isFinite(width)) {
      return;
    }

    const normalized = Math.max(Math.round(width), 40);

    setRightAxisWidth(prevWidth => {
      if (Math.abs(prevWidth - normalized) <= 1) {
        return prevWidth;
      }
      return normalized;
    });
  }, []);

  const handleChartWheel = useCallback((e: WheelEvent) => {
    if (!chartContainerRef.current?.contains(e.target as Node)) {
      return;
    }

    // Disable wheel scrolling on candlestick chart (TradingView chart)
    const target = e.target as HTMLElement;
    if (target?.closest('[data-testid="candlestick-chart-container"]')) {
      return;
    }

    // Only handle horizontal scrolling (left/right mouse wheel)
    // Disable vertical scrolling (up/down)
    const hasHorizontalScroll = Math.abs(e.deltaX) > 0;
    const hasVerticalScroll = Math.abs(e.deltaY) > 0;

    // If there's vertical scroll without horizontal scroll, ignore it
    if (hasVerticalScroll && !hasHorizontalScroll) {
      return;
    }

    const scrollDelta = e.deltaX;

    // Only handle scroll events if there's actual horizontal movement
    if (Math.abs(scrollDelta) < 1) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Mark that user is actively panning
    userIsPanningRef.current = true;

    // Clear any existing debounce timer
    if (panDebounceTimeoutRef.current) {
      clearTimeout(panDebounceTimeoutRef.current);
    }

    // Set a timer to reset the panning flag after user stops interacting (500ms)
    panDebounceTimeoutRef.current = setTimeout(() => {
      userIsPanningRef.current = false;
    }, 500);

    // Scroll increment per wheel event (1 data point)
    const scrollIncrement = 1;

    // Positive delta = scroll right = move forward in time (increase index)
    // Negative delta = scroll left = move back in time (decrease index)
    const direction = scrollDelta > 0 ? 1 : -1;
    const newIndex = visibleStartIndex + direction * scrollIncrement;

    // Constrain to valid range
    const maxStartIndex = Math.max(0, chartState.data.length - VISIBLE_WINDOW_SIZE);
    const constrainedIndex = Math.max(0, Math.min(newIndex, maxStartIndex));

    setVisibleStartIndex(constrainedIndex);
  }, [visibleStartIndex, chartState.data.length]);

  // Fetch OHLCV data for the entire time range (called once per timeframe change)
  const fetchFullOHLCVData = useCallback(async (startTime: number, endTime: number, stockSymbol: string, quoteSymbol: string) => {
    try {
      console.log(`Fetching full OHLCV data for ${stockSymbol}/${quoteSymbol} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

      const marketFormatted = `${stockSymbol}_${quoteSymbol}`;
      const ohlcvCandles = await getOHLCV('binance', marketFormatted, startTime, endTime, selectedTimeframe);

      console.log(`Fetched ${ohlcvCandles.length} OHLCV candles for full range`);

      return ohlcvCandles;
    } catch (err) {
      console.error('Failed to fetch full OHLCV data:', err);
      // Don't throw, just return empty array - chart can still function with time-based fetching as fallback
      return [];
    }
  }, [selectedTimeframe]);

  // Fetch incremental OHLCV data (new candles since last update)
  const fetchIncrementalOHLCVData = useCallback(async (startTime: number, endTime: number, stockSymbol: string, quoteSymbol: string) => {
    try {
      console.log(`Fetching incremental OHLCV data for ${stockSymbol}/${quoteSymbol} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

      const marketFormatted = `${stockSymbol}_${quoteSymbol}`;
      const ohlcvCandles = await getOHLCV('binance', marketFormatted, startTime, endTime, selectedTimeframe);

      console.log(`Fetched ${ohlcvCandles.length} new OHLCV candles for incremental update`);

      return ohlcvCandles;
    } catch (err) {
      console.error('Failed to fetch incremental OHLCV data:', err);
      return [];
    }
  }, [selectedTimeframe]);

  // Extract trading data fetching logic into reusable function
  const fetchTradingData = useCallback(async (isInitialLoad = false) => {
    try {
      // Only show loading state during initial load, not during refresh
      if (isInitialLoad) {
        setLoading(true);
        setError(null);
      } else {
        setIsRefetchingData(true);
      }

      // Determine if authentication is required based on trading type
      const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';

      // Fetch sub-accounts to determine stock and quote symbols
      const subAccounts = await getSubAccountsByTrading(trading.id);
      console.log('Sub-accounts:', subAccounts);

      // Identify stock and balance sub-accounts
      const stockSubAccount = subAccounts.find(account =>
        account.info?.account_type === 'stock' ||
        ['ETH', 'BTC'].includes(account.symbol)
      );
      const balanceSubAccount = subAccounts.find(account =>
        account.info?.account_type === 'balance' ||
        ['USDT', 'USD', 'USDC'].includes(account.symbol)
      );

      if (!stockSubAccount || !balanceSubAccount) {
        throw new Error(`Missing required sub-accounts. Found ${subAccounts.length} sub-accounts, but need both stock and balance accounts.`);
      }

      const fetchedStockSymbol = stockSubAccount.symbol;
      const fetchedQuoteSymbol = balanceSubAccount.symbol;
      console.log(`Using symbols: stock=${fetchedStockSymbol}, quote=${fetchedQuoteSymbol}`);

      // Update state with the symbols
      setStockSymbol(fetchedStockSymbol);
      setQuoteSymbol(fetchedQuoteSymbol);

      const [equityCurve, tradingLogs] = await Promise.all([
        // Use new API with timeframe and recent_timeframes parameters
        getEquityCurve(
          trading.id,
          selectedTimeframe,
          TOTAL_DATA_TO_LOAD, // Load 500 recent timeframes for historical scrolling
          fetchedStockSymbol,
          fetchedQuoteSymbol,
          requireAuth
        ),
        getTradingLogs(trading.id, requireAuth)
      ]);

      console.log('Equity curve response:', equityCurve);
      console.log('Trading logs response:', tradingLogs);

      // Validate equity curve data - expect new API format only
      if (!equityCurve || !equityCurve.data_points || !Array.isArray(equityCurve.data_points)) {
        console.error('Invalid equity curve data format. Expected data_points array, got:', equityCurve);
        throw new Error('Invalid equity curve data format received from API. Expected new format with data_points array.');
      }

      // Get the initial balance from trading info for ROI calculation
      const initialBalance = typeof trading.info?.initial_funds === 'number'
        ? trading.info.initial_funds
        : (typeof trading.info?.initial_balance === 'number' ? trading.info.initial_balance : undefined);

      const { data, metrics: calculatedMetrics } = transformNewEquityCurveToChartData(equityCurve, tradingLogs, selectedTimeframe, initialBalance);

      const benchmarkDataFromApi: TradingDataPoint[] = data.map(point => ({
        date: point.date,
        timestamp: point.timestamp,
        timestampNum: point.timestampNum,
        netValue: 0,
        roi: 0,
        benchmark: point.benchmark ?? 0,
        benchmarkPrice: point.benchmarkPrice ?? 0,
      }));

      let benchmarkData: TradingDataPoint[] = benchmarkDataFromApi;

      // Fetch OHLCV data for the entire time range
      // start_time and end_time are ISO strings from the API, convert to milliseconds
      const startTimeMs = new Date(equityCurve.start_time).getTime();
      const endTimeMs = new Date(equityCurve.end_time).getTime();
      const fullTimeRange = {
        start: startTimeMs,
        end: endTimeMs,
      };
      console.log(`Equity curve time range: ${new Date(fullTimeRange.start).toISOString()} to ${new Date(fullTimeRange.end).toISOString()}`);

      const fullOHLCVData = await fetchFullOHLCVData(fullTimeRange.start, fullTimeRange.end, fetchedStockSymbol, fetchedQuoteSymbol);

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, data);
        const mergedBenchmark = mergeTradingDataSets(previous.benchmarkData, benchmarkData);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);

        if (!mergedData.changed && !mergedBenchmark.changed && !metricsChanged && previous.fullOHLCVData === fullOHLCVData) {
          return previous;
        }

        // Store in cache for this timeframe
        const cacheKey = selectedTimeframe;
        timeframeDataCacheRef.current[cacheKey] = {
          data: mergedData.value,
          benchmarkData: mergedBenchmark.value,
          metrics: calculatedMetrics,
          fullOHLCVData: fullOHLCVData,
          lastUpdateTimestamp: mergedData.value.length > 0 ? mergedData.value[mergedData.value.length - 1].timestampNum : undefined
        };

        console.log(`Cached data for timeframe ${cacheKey}: ${mergedData.value.length} data points`);

        return {
          data: mergedData.changed ? mergedData.value : previous.data,
          benchmarkData: mergedBenchmark.changed ? mergedBenchmark.value : previous.benchmarkData,
          metrics: metricsChanged ? calculatedMetrics : previous.metrics,
          fullOHLCVData: fullOHLCVData
        };
      });

      // Track the timestamp of the last data point for incremental updates
      if (data.length > 0) {
        const lastDataPoint = data[data.length - 1];
        setLastUpdateTimestamp(lastDataPoint.timestampNum);
        console.log(`Updated last timestamp for incremental refresh: ${new Date(lastDataPoint.timestampNum).toISOString()}`);
      }
    } catch (err) {
      console.error('Failed to fetch trading data:', err);
      // Only show errors during initial load, silently handle refresh errors
      if (isInitialLoad) {
        if (err instanceof ApiError) {
          setError(`API Error (${err.code}): ${err.message}`);
        } else if (err instanceof Error) {
          setError(`Network Error: ${err.message}`);
        } else {
          setError('Failed to load trading data - Unknown error');
        }
      }
    } finally {
      // Only hide loading state if we showed it (initial load)
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsRefetchingData(false);
      }
    }
  }, [trading.id, selectedTimeframe, fetchFullOHLCVData]);

  // Incremental fetch for auto-refresh - only loads new data since last update
  const fetchIncrementalData = useCallback(async () => {
    // Only do incremental fetch if we have a previous timestamp
    if (lastUpdateTimestamp === null || chartState.data.length === 0) {
      console.log('No previous timestamp for incremental fetch, falling back to regular fetch');
      await fetchTradingData(false);
      return;
    }

    try {
      setIsRefetchingData(true);

      // Determine if authentication is required based on trading type
      const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';

      // Fetch trading logs once (these contain all historical trades)
      const tradingLogs = await getTradingLogs(trading.id, requireAuth);

      // Calculate time range for incremental fetch
      // Start from last timestamp (not adding timeframe duration - that would make startTime > endTime)
      // End at current time to fetch any new data since last update
      const startTimeMs = lastUpdateTimestamp;
      const endTimeMs = new Date().getTime();

      console.log(`Fetching incremental data from ${new Date(startTimeMs).toISOString()} to ${new Date(endTimeMs).toISOString()}`);

      // Get fresh equity curve data for just the new time range
      const incrementalEquityCurve = await getEquityCurveByTimeRange(
        trading.id,
        selectedTimeframe,
        startTimeMs,
        endTimeMs,
        stockSymbol,
        quoteSymbol,
        requireAuth
      );

      if (!incrementalEquityCurve || !incrementalEquityCurve.data_points) {
        console.log('No new data points in incremental fetch');
        setIsRefetchingData(false);
        return;
      }

      // Get the initial balance from trading info for ROI calculation
      const initialBalance = typeof trading.info?.initial_funds === 'number'
        ? trading.info.initial_funds
        : (typeof trading.info?.initial_balance === 'number' ? trading.info.initial_balance : undefined);

      // Transform the new data with the correct initial balance
      // This ensures ROI for incremental data is calculated relative to the true initial balance,
      // maintaining consistency with the initial data load
      const { data: correctedNewData, metrics: newMetrics } = transformNewEquityCurveToChartData(
        incrementalEquityCurve,
        tradingLogs,
        selectedTimeframe,
        initialBalance
      );

      console.log(`Received ${correctedNewData.length} new data points from incremental fetch`);

      // Create benchmark data for the new points (same as initial load)
      const newBenchmarkData: TradingDataPoint[] = correctedNewData.map(point => ({
        date: point.date,
        timestamp: point.timestamp,
        timestampNum: point.timestampNum,
        netValue: 0,
        roi: point.roi,
        benchmark: point.benchmark ?? 0,
        benchmarkPrice: point.benchmarkPrice ?? 0,
      }));

      // Fetch incremental OHLCV data for candlestick chart
      const incrementalOHLCVData = await fetchIncrementalOHLCVData(startTimeMs, endTimeMs, stockSymbol, quoteSymbol);
      console.log(`Received ${incrementalOHLCVData.length} new OHLCV candles from incremental fetch`);

      // Signal that candlestick chart should use append mode for next render
      setIsIncrementalOHLCVUpdate(true);

      // Append new data to existing data
      setChartState((previous) => {
        if (correctedNewData.length === 0) {
          return previous;
        }

        // Merge trading data points by timestamp to avoid duplicates
        let mergedData: TradingDataPoint[];
        let mergedBenchmarkData: TradingDataPoint[];

        if (previous.data.length > 0) {
          // Create a map of existing data points by timestamp for quick lookup
          const existingDataMap = new Map<number, TradingDataPoint>();
          previous.data.forEach(point => {
            existingDataMap.set(point.timestampNum, point);
          });

          // Filter out new data points that already exist (by timestamp)
          const trulyNewDataPoints = correctedNewData.filter(point => !existingDataMap.has(point.timestampNum));
          mergedData = [...previous.data, ...trulyNewDataPoints];
          console.log(`Deduplicating trading data: removed ${correctedNewData.length - trulyNewDataPoints.length} duplicate data points`);

          // Recalculate ROI for all merged data to ensure consistency with the original initial balance
          // This prevents discontinuities when equity values change slightly in API responses
          const initialEquity = previous.data[0]?.netValue ?? initialBalance ?? 0;
          if (initialEquity > 0) {
            mergedData = mergedData.map(point => ({
              ...point,
              roi: Math.round(((point.netValue - initialEquity) / initialEquity) * 10000) / 100
            }));
          }

          // Do the same for benchmark data
          const existingBenchmarkMap = new Map<number, TradingDataPoint>();
          previous.benchmarkData.forEach(point => {
            existingBenchmarkMap.set(point.timestampNum, point);
          });

          const trulyNewBenchmarkPoints = newBenchmarkData.filter(point => !existingBenchmarkMap.has(point.timestampNum));
          mergedBenchmarkData = [...previous.benchmarkData, ...trulyNewBenchmarkPoints];
          console.log(`Deduplicating benchmark data: removed ${newBenchmarkData.length - trulyNewBenchmarkPoints.length} duplicate benchmark points`);
        } else {
          // First time - no existing data to merge with
          mergedData = correctedNewData;
          mergedBenchmarkData = newBenchmarkData;
        }

        const metricsChanged = !areMetricsEqual(previous.metrics, newMetrics);

        // Update the cache with the new appended data
        const cacheKey = selectedTimeframe;

        // Append OHLCV candles to existing data, deduplicating by timestamp
        let mergedOHLCVData: any[];
        if (previous.fullOHLCVData && previous.fullOHLCVData.length > 0) {
          // Get the timestamp of the last existing candle
          const lastExistingCandle = previous.fullOHLCVData[previous.fullOHLCVData.length - 1];
          const lastExistingTime = new Date(lastExistingCandle.ts).getTime();

          // Filter out incremental candles that have same or earlier timestamp than the last existing candle
          const trulyNewCandles = incrementalOHLCVData.filter(candle => {
            const candleTime = new Date(candle.ts).getTime();
            return candleTime > lastExistingTime;
          });

          mergedOHLCVData = [...previous.fullOHLCVData, ...trulyNewCandles];
          console.log(`Deduplicating OHLCV: removed ${incrementalOHLCVData.length - trulyNewCandles.length} duplicate candles`);
        } else {
          mergedOHLCVData = incrementalOHLCVData;
        }

        timeframeDataCacheRef.current[cacheKey] = {
          data: mergedData,
          benchmarkData: mergedBenchmarkData,
          metrics: metricsChanged ? newMetrics : previous.metrics,
          fullOHLCVData: mergedOHLCVData,
          lastUpdateTimestamp: mergedData.length > 0 ? mergedData[mergedData.length - 1].timestampNum : undefined
        };

        console.log(`Updated cache for timeframe ${cacheKey}: now ${mergedData.length} data points, ${mergedBenchmarkData.length} benchmark points, ${mergedOHLCVData.length} OHLCV candles`);

        return {
          data: mergedData,
          benchmarkData: mergedBenchmarkData,
          metrics: metricsChanged ? newMetrics : previous.metrics,
          fullOHLCVData: mergedOHLCVData
        };
      });

      // Update the last timestamp for next incremental fetch
      if (correctedNewData.length > 0) {
        const lastNewPoint = correctedNewData[correctedNewData.length - 1];
        setLastUpdateTimestamp(lastNewPoint.timestampNum);
        console.log(`Incremental fetch completed. New last timestamp: ${new Date(lastNewPoint.timestampNum).toISOString()}`);
      }
    } catch (err) {
      console.error('Failed to fetch incremental data:', err);
      // Silently handle errors during incremental updates
    } finally {
      setIsRefetchingData(false);
    }
  }, [lastUpdateTimestamp, chartState.data.length, selectedTimeframe, trading.id, trading.type, stockSymbol, quoteSymbol]);

  // Initial data loading effect - only run once on mount
  useEffect(() => {
    fetchTradingData(true); // Mark as initial load
  }, []); // Empty dependency array - only run on mount

  // Timeframe change effect - use cached data if available, otherwise fetch
  useEffect(() => {
    // Skip the initial render (handled by the effect above)
    if (chartState.data.length > 0) {
      const cacheKey = selectedTimeframe;
      const cachedData = timeframeDataCacheRef.current[cacheKey];

      if (cachedData) {
        // Use cached data for this timeframe
        console.log(`Using cached data for timeframe ${cacheKey}: ${cachedData.data.length} points`);
        setChartState({
          data: cachedData.data,
          benchmarkData: cachedData.benchmarkData,
          metrics: cachedData.metrics,
          fullOHLCVData: cachedData.fullOHLCVData
        });
        setLastUpdateTimestamp(cachedData.lastUpdateTimestamp ?? null);
        setInitialized(false); // Reset to show latest 100 points
      } else {
        // No cache for this timeframe, fetch fresh data
        console.log(`No cached data for timeframe ${cacheKey}, fetching fresh data`);
        setInitialized(false); // Reset initialization flag to show latest 100 again
        fetchTradingData(false); // Don't show loading spinner
      }
    }
  }, [selectedTimeframe]); // Only when timeframe changes

  // Reset visible start index when data changes significantly
  useEffect(() => {
    if (!initialized && chartState.data.length > 0) {
      // On initial load, position to show the latest 100 data points
      const newStartIndex = Math.max(0, chartState.data.length - VISIBLE_WINDOW_SIZE);
      setVisibleStartIndex(newStartIndex);
      setInitialized(true);
    } else if (chartState.data.length <= VISIBLE_WINDOW_SIZE) {
      // If all data is less than window size, reset to 0
      setVisibleStartIndex(0);
    }
  }, [chartState.data.length, initialized]);

  // Auto-scroll to show newly appended data during incremental updates
  // This keeps the chart showing the latest data points when new data is added
  useEffect(() => {
    if (!initialized) return; // Skip during initial load
    if (userIsPanningRef.current) return; // Skip if user is actively panning

    // After initialization, if data grows beyond current visible window,
    // adjust the visible start index to keep showing the latest data
    const maxStartIndex = Math.max(0, chartState.data.length - VISIBLE_WINDOW_SIZE);
    const visibleEndIndex = visibleStartIndex + VISIBLE_WINDOW_SIZE;

    // If we're viewing the end of the data (last visible point is near the end),
    // auto-scroll to keep showing the latest newly appended data
    if (visibleEndIndex >= chartState.data.length - 5) {
      // User is at the end, so auto-scroll to keep showing latest data
      console.log(`Auto-scrolling to show new data: from ${visibleStartIndex} to ${maxStartIndex}, total data: ${chartState.data.length}`);
      setVisibleStartIndex(maxStartIndex);
    }
  }, [chartState.data.length, initialized, visibleStartIndex]);

  // Refresh trigger effect - refetch data when refreshTrigger changes
  // Uses incremental fetch to load only new data since last update
  useEffect(() => {
    if (refreshTrigger > 0 && autoRefreshEnabled) {
      fetchIncrementalData(); // Use incremental fetch to reduce API load
    }
  }, [refreshTrigger, autoRefreshEnabled, fetchIncrementalData]);

  // Auto-refresh state change effect - refresh immediately when turned back on
  // Uses incremental fetch to load only new data since last update
  useEffect(() => {
    if (autoRefreshEnabled && refreshTrigger > 0) {
      fetchIncrementalData(); // Use incremental fetch to reduce API load
    }
  }, [autoRefreshEnabled, fetchIncrementalData, refreshTrigger]);

  // Attach wheel event listener to chart container
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleChartWheel as EventListener, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleChartWheel as EventListener);
    };
  }, [handleChartWheel]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (panDebounceTimeoutRef.current) {
        clearTimeout(panDebounceTimeoutRef.current);
      }
    };
  }, []);

  // Reset incremental OHLCV update flag after chart renders and scrolls
  // Wait for 2 animation frames to ensure chart renders, updates, and scroll completes
  useEffect(() => {
    if (isIncrementalOHLCVUpdate) {
      let frameId1: number;
      let frameId2: number;

      frameId1 = requestAnimationFrame(() => {
        frameId2 = requestAnimationFrame(() => {
          setIsIncrementalOHLCVUpdate(false);
        });
      });

      return () => {
        cancelAnimationFrame(frameId1);
        cancelAnimationFrame(frameId2);
      };
    }
  }, [isIncrementalOHLCVUpdate]);

  // Data is already filtered by the API with the selected timeframe
  // No need for client-side filtering
  const allData = chartState.data;

  // Slice data for visible window
  const filteredData = useMemo(() => {
    const visibleEndIndex = Math.min(visibleStartIndex + VISIBLE_WINDOW_SIZE, allData.length);
    return allData.slice(visibleStartIndex, visibleEndIndex);
  }, [allData, visibleStartIndex]);

  // Slice benchmark data for visible window
  const visibleBenchmarkData = useMemo(() => {
    const visibleEndIndex = Math.min(visibleStartIndex + VISIBLE_WINDOW_SIZE, chartState.benchmarkData.length);
    return chartState.benchmarkData.slice(visibleStartIndex, visibleEndIndex);
  }, [chartState.benchmarkData, visibleStartIndex]);

  const yAxisDomain = useMemo<[number, number] | null>(() => {
    const roiValues = filteredData
      .map(point => point.roi)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value !== null);

    const benchmarkValues = visibleBenchmarkData
      .map(point => point.benchmark)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value !== null);

    const values = [...roiValues, ...benchmarkValues];
    if (values.length === 0) {
      return null;
    }

    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return null;
    }

    // If range is very small or zero, add padding
    if (minValue === maxValue) {
      const offset = Math.abs(minValue) < 1 ? 1 : Math.abs(minValue) * 0.1;
      return [minValue - offset, maxValue + offset];
    }

    // Calculate dynamic padding: 10% of the visible range on each side
    const range = maxValue - minValue;
    const padding = range * 0.1;

    return [minValue - padding, maxValue + padding];
  }, [filteredData, visibleBenchmarkData]);

  const rightAxisDomain = useMemo<[number, number] | null>(() => {
    const priceValues = visibleBenchmarkData
      .map(point => point.benchmarkPrice)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (priceValues.length === 0) {
      return null;
    }

    const minValue = Math.min(...priceValues);
    const maxValue = Math.max(...priceValues);

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return null;
    }

    if (minValue === maxValue) {
      const offset = Math.abs(minValue) < 10 ? 10 : Math.abs(minValue) * 0.05;
      return [minValue - offset, maxValue + offset];
    }

    const padding = Math.max((maxValue - minValue) * 0.05, maxValue * 0.01);
    return [minValue - padding, maxValue + padding];
  }, [visibleBenchmarkData]);

  const showZeroReferenceLine = useMemo(() => {
    if (!yAxisDomain) {
      return true;
    }
    const [minValue, maxValue] = yAxisDomain;
    return minValue <= 0 && maxValue >= 0;
  }, [yAxisDomain]);

  // Handle timeframe selection
  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  // Chart domain should use the visible window's timestamp range
  // This ensures the chart scales properly even when data grows incrementally
  const chartDomain = useMemo<[number, number]>(() => {
    if (filteredData.length === 0) {
      return [0, 1]; // Fallback for empty data
    }

    // Get the first and last timestamps from the visible filtered data
    const firstTimestamp = filteredData[0].timestampNum;
    const lastTimestamp = filteredData[filteredData.length - 1].timestampNum;

    return [firstTimestamp, lastTimestamp];
  }, [filteredData]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as TradingDataPoint | undefined;
      if (!data) {
        return null;
      }

      // Find the closest benchmark data point by timestamp from visible data
      let benchmarkReturn: number | undefined;
      let benchmarkPrice: number | undefined;
      if (visibleBenchmarkData.length > 0 && data.timestampNum) {
        // Find the closest benchmark point
        const closestBenchmark = visibleBenchmarkData.reduce((prev, curr) => {
          const prevDiff = Math.abs(prev.timestampNum - data.timestampNum);
          const currDiff = Math.abs(curr.timestampNum - data.timestampNum);
          return currDiff < prevDiff ? curr : prev;
        });
        // Only use if within reasonable time window (e.g., 1 hour = 3600000ms)
        if (Math.abs(closestBenchmark.timestampNum - data.timestampNum) < 3600000) {
          benchmarkReturn = closestBenchmark.benchmark;
          benchmarkPrice = closestBenchmark.benchmarkPrice;
        }
      }

      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-['Nunito'] text-sm text-gray-600">
            {`${t('trading.chart.time')}: ${formatDateTime(data.timestamp)}`}
          </p>
          <p className="font-['Nunito'] text-sm text-[#080404] font-semibold">
            {`${t('trading.chart.portfolioValue')}: ${formatCurrency(data.netValue)}`}
          </p>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="font-['Nunito'] text-sm text-green-600 font-semibold">
              {`${t('trading.chart.portfolioReturn')}: ${formatPercentage(data.roi)}`}
            </p>
          </div>
          {benchmarkReturn !== undefined && (
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
              <p className="font-['Nunito'] text-sm text-amber-600 font-semibold">
                {`${t('trading.chart.ethBenchmark')}: ${formatPercentage(benchmarkReturn)}`}
              </p>
            </div>
          )}
          {benchmarkPrice && (
            <p className="font-['Nunito'] text-xs text-amber-600 ml-6">
              {`${t('trading.chart.ethPrice')}: ${formatCurrency(benchmarkPrice)}`}
            </p>
          )}
          {benchmarkReturn !== undefined && (
            <p className="font-['Nunito'] text-xs text-gray-500 mt-2 text-center border-t pt-2">
              {`${t('trading.chart.excessReturn')}: ${formatPercentage(data.roi - benchmarkReturn)}`}
            </p>
          )}
          {data.position !== undefined && (
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
              <p className="font-['Nunito'] text-sm text-blue-600 font-semibold">
              {`${t('trading.chart.ethPosition')}: ${data.position.toFixed(4)} ${stockSymbol}`}
              </p>
            </div>
          )}
          {data.event && (
            <p className="font-['Nunito'] text-xs text-blue-600 mt-2 border-t pt-2">
              {`${t(`trading.events.${data.event.type.toLowerCase()}`) || data.event.type}: ${data.event.description}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="text-center text-red-600 py-8">
          {error}
        </div>
      </div>
    );
  }

  // No data state
  if (chartState.data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="text-center text-gray-600 py-8">
          {t('trading.detail.noDataAvailable')}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
            {formatCurrency(filteredData[filteredData.length - 1]?.netValue ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.chart.portfolioValue')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-green-600">
            {formatPercentage(chartState.metrics.totalROI ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalROI')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-blue-600">
            {formatPercentage(chartState.metrics.winRate ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.winRate')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-purple-600">
            {(chartState.metrics.sharpeRatio ?? 0).toFixed(1)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.sharpeRatio')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-orange-600">
            {formatPercentage(chartState.metrics.maxDrawdown ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.maxDrawdown')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
            {chartState.metrics.totalTrades ?? 0}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalTrades')}</div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            {showHeader && (
              <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404]">
                {trading.name} - {t('trading.detail.performanceChart')}
              </h3>
            )}
            <div className="flex items-center justify-between flex-1 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTradingDots(!showTradingDots)}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-['Nunito'] transition-colors ${
                    showTradingDots
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    showTradingDots ? 'bg-blue-600' : 'bg-gray-400'
                  }`}></div>
                  {showTradingDots ? t('trading.chart.hideTradingSignals') : t('trading.chart.showTradingSignals')}
                </button>
                {/* Timeframe Selector Buttons */}
                <div className="flex items-center gap-1">
                  {(['1m', '1h', '4h', '8h', '1d', '1w'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      disabled={isRefetchingData}
                      className={`px-3 py-1 rounded-md text-sm font-['Nunito'] transition-colors ${
                        selectedTimeframe === tf
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${isRefetchingData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {tf}
                    </button>
                  ))}
                  {isRefetchingData && (
                    <div className="ml-2 flex items-center text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                      <span className="font-['Nunito']">Loading...</span>
                    </div>
                  )}
                </div>

                {/* Pan Controls */}
                {allData.length > VISIBLE_WINDOW_SIZE && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setVisibleStartIndex(Math.max(0, visibleStartIndex - VISIBLE_WINDOW_SIZE))}
                      disabled={visibleStartIndex === 0}
                      className="px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-['Nunito']"
                      title="Scroll left (earlier data)"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-gray-600 font-['Nunito'] whitespace-nowrap">
                      {visibleStartIndex + 1} - {Math.min(visibleStartIndex + VISIBLE_WINDOW_SIZE, allData.length)} / {allData.length}
                    </span>
                    <button
                      onClick={() => setVisibleStartIndex(Math.min(allData.length - VISIBLE_WINDOW_SIZE, visibleStartIndex + VISIBLE_WINDOW_SIZE))}
                      disabled={visibleStartIndex + VISIBLE_WINDOW_SIZE >= allData.length}
                      className="px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-['Nunito']"
                      title="Scroll right (later data)"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
              {onAutoRefreshToggle && (
                <div className="flex items-center space-x-2 text-sm font-['Nunito']">
                  <span className="text-gray-600">{t('common.autoRefresh')}:</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={(e) => onAutoRefreshToggle(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex items-center ${
                        autoRefreshEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAutoRefreshToggle(!autoRefreshEnabled);
                      }}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ml-0.5 pointer-events-none ${
                          autoRefreshEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div
          ref={chartContainerRef}
          className={`${height} flex flex-col`}
          style={{
            outline: 'none',
            overflow: 'visible'
          }}
          onFocus={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          {/* Main Chart - Performance and Benchmark */}
          <div style={{ flex: '0 0 30%', marginBottom: '10px', outline: 'none' }} tabIndex={-1}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <ComposedChart
                data={filteredData}
                margin={{ top: 5, right: CHART_RIGHT_MARGIN, left: CHART_LEFT_MARGIN, bottom: 5 }}
                style={{ outline: 'none' }}
                tabIndex={-1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  scale="time"
                  domain={chartDomain}
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={() => ''} // Hide tick labels on main chart
                  interval="preserveStartEnd"
                  minTickGap={30}
                  padding={{ left: 0, right: CHART_RIGHT_MARGIN }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  domain={yAxisDomain ?? ['auto', 'auto']}
                  width={DEFAULT_LEFT_AXIS_WIDTH}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#F59E0B"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={rightAxisDomain ?? ['auto', 'auto']}
                  width={rightAxisWidth}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Zero Reference Line */}
                {showZeroReferenceLine && (
                  <ReferenceLine
                    y={0}
                    stroke="#94A3B8"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                )}

                {/* Portfolio Return Area Chart */}
                <Area
                  yAxisId="left"
                  type="linear"
                  dataKey="roi"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.1}
                  dot={false}
                  baseValue="dataMin"
                  activeDot={{ r: 4, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                  name={t('trading.chart.portfolioReturn')}
                  isAnimationActive={false}
                />

                {/* ETH Benchmark Line - using separate dataset */}
                <Line
                  yAxisId="left"
                  type="linear"
                  data={visibleBenchmarkData}
                  dataKey="benchmark"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 2 }}
                  name={t('trading.chart.ethBenchmark')}
                  isAnimationActive={false}
                />

                {/* ETH Price Line (Invisible - Just for Y-axis scaling) */}
                <Line
                  yAxisId="right"
                  type="linear"
                  data={visibleBenchmarkData}
                  dataKey="benchmarkPrice"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={false}
                  name="ETH Price"
                  isAnimationActive={false}
                />

                {/* Trading Signal Dots - positioned on benchmark line */}
                {showTradingDots && (() => {
                  // Create data points with trading signals positioned on the benchmark line
                  const signalPoints = filteredData
                    .filter(point => point.event)
                    .map(point => {
                      // Find the closest benchmark data point from visible data
                      const closestBenchmark = visibleBenchmarkData.reduce((prev, curr) => {
                        const prevDiff = Math.abs(prev.timestampNum - point.timestampNum);
                        const currDiff = Math.abs(curr.timestampNum - point.timestampNum);
                        return currDiff < prevDiff ? curr : prev;
                      });

                      return {
                        ...point,
                        // Use benchmark return for Y position instead of ROI
                        yValue: closestBenchmark?.benchmark ?? point.roi
                      };
                    });

                  return (
                    <Scatter
                      yAxisId="left"
                      data={signalPoints}
                      dataKey="yValue"
                      fill="#3B82F6"
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (!payload || !payload.event) {
                          return <circle cx={0} cy={0} r={0} opacity={0} />;
                        }
                        const color = payload.event.type === 'buy' ? '#3B82F6' : '#EF4444';
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={color}
                            stroke="white"
                            strokeWidth={2}
                            opacity={0.9}
                          />
                        );
                      }}
                      isAnimationActive={false}
                    />
                  );
                })()}

                {/* Dotted Lines Connecting Signals to Position Area */}
                {showTradingDots && filteredData.filter(point => point.event).map((point, index) => (
                  <ReferenceLine
                    key={`signal-line-${index}`}
                    x={point.timestampNum}
                    stroke="#94A3B8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-Chart - Position Area */}
          <div style={{ flex: '0 0 20%', marginBottom: '10px', outline: 'none', minHeight: '0' }} tabIndex={-1}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <ComposedChart
                data={filteredData}
                margin={{ top: 20, right: CHART_RIGHT_MARGIN, left: CHART_LEFT_MARGIN, bottom: 50 }}
                style={{ outline: 'none' }}
                tabIndex={-1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  scale="time"
                  domain={chartDomain}
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                  minTickGap={30}
                  padding={{ left: 0, right: CHART_RIGHT_MARGIN }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="transparent"
                  fontSize={12}
                  tickFormatter={() => ''}
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  width={DEFAULT_LEFT_AXIS_WIDTH}
                />
                <YAxis
                  yAxisId="position"
                  orientation="right"
                  stroke="#60A5FA"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(2)} ETH`}
                  domain={[0, 'dataMax']}
                  width={rightAxisWidth}
                />

                {/* Position Area Chart */}
                <Area
                  yAxisId="position"
                  type="linear"
                  dataKey="position"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  fill="#60A5FA"
                  fillOpacity={0.3}
                  dot={false}
                  activeDot={{ r: 4, fill: '#60A5FA', stroke: '#ffffff', strokeWidth: 2 }}
                  name="ETH Position"
                  isAnimationActive={false}
                />

                {/* Trading Signal Dots on Position Chart */}
                {showTradingDots && filteredData.filter(point => point.event).map((point, index) => (
                  <ReferenceLine
                    key={`position-signal-line-${index}`}
                    x={point.timestampNum}
                    stroke="#94A3B8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Candlestick Chart */}
          <div style={{ flex: '1 1 auto', outline: 'none', minHeight: '200px', display: 'flex', flexDirection: 'column' }} tabIndex={-1}>
            <div className="mb-2">
              <h4 className="text-sm font-['Nunito'] font-semibold text-gray-700">
                {t('trading.chart.priceChart')} ({stockSymbol}/{quoteSymbol})
              </h4>
            </div>
            <div
              style={{
                flex: '1 1 auto',
                minHeight: '200px',
                marginLeft: DEFAULT_LEFT_AXIS_WIDTH + CHART_LEFT_MARGIN,
                marginRight: CHART_RIGHT_MARGIN,
              }}
            >
              <CandlestickChart
                exchange="binance"
                market={`${stockSymbol}/${quoteSymbol}`}
                timeframe={selectedTimeframe}
                height={200}
                ohlcvData={chartState.fullOHLCVData}
                visibleDataStartIndex={visibleStartIndex}
                visibleDataEndIndex={Math.min(visibleStartIndex + VISIBLE_WINDOW_SIZE, chartState.fullOHLCVData?.length || 0)}
                onPriceScaleWidthChange={handlePriceScaleWidthChange}
                isIncrementalUpdate={isIncrementalOHLCVUpdate}
              />
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 space-y-3">
          {/* Main Chart Legend */}
          <div className="flex items-center justify-center space-x-4 text-sm font-['Nunito'] flex-wrap">
            <div className="flex items-center">
              <div
                className="w-4 h-3 rounded mr-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid #10B981'
                }}
              ></div>
              <span>{t('trading.chart.portfolioReturn')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-amber-500 mr-2" style={{borderTop: '2px dashed #F59E0B', backgroundColor: 'transparent'}}></div>
              <span>{t('trading.chart.ethBenchmark')} ({stockSymbol} Buy & Hold)</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-3 rounded mr-2"
                style={{
                  backgroundColor: 'rgba(96, 165, 250, 0.3)',
                  border: '2px solid #60A5FA'
                }}
              ></div>
              <span>{t('trading.chart.ethPosition')}</span>
            </div>
            {showTradingDots && (
              <>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>{t('trading.chart.buySignals')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>{t('trading.chart.sellSignals')}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Performance Highlights */}
      {showHighlights && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('trading.chart.performanceHighlights')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm font-['Nunito']">
            <div>
              {t('trading.chart.highlight1')}
            </div>
            <div>
              {t('trading.chart.highlight2')}
            </div>
            <div>
              {t('trading.chart.highlight3')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const arePropsEqual = (
  prev: TradingPerformanceWidgetProps,
  next: TradingPerformanceWidgetProps
): boolean => {
  return (
    prev.trading.id === next.trading.id &&
    prev.trading.name === next.trading.name &&
    prev.className === next.className &&
    prev.showHeader === next.showHeader &&
    prev.showHighlights === next.showHighlights &&
    prev.height === next.height &&
    prev.refreshTrigger === next.refreshTrigger &&
    prev.autoRefreshEnabled === next.autoRefreshEnabled &&
    prev.onAutoRefreshToggle === next.onAutoRefreshToggle
  );
};

const TradingPerformanceWidget = memo(TradingPerformanceWidgetComponent, arePropsEqual);

export { TradingPerformanceWidget };
export default TradingPerformanceWidget;
