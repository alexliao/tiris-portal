import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getEquityCurve,
  getTradingLogs,
  getSubAccountsByTrading,
  getEquityCurveByTimeRange,
  ApiError,
  type Trading,
  type TradingLog,
  type EquityCurveNewData,
} from '../../utils/api';
import {
  transformNewEquityCurveToChartData,
  type TradingDataPoint,
  type TradingMetrics,
  type TradingCandlestickPoint,
} from '../../utils/chartData';
import CandlestickChart from './CandlestickChart';

type Timeframe = '1m' | '1h' | '4h' | '8h' | '1d' | '1w';

const timeframeToMilliseconds = (timeframe: Timeframe): number => {
  const timeframeMap: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };

  return timeframeMap[timeframe] ?? 60 * 1000;
};

const CHART_LEFT_MARGIN = 5;
const CHART_RIGHT_MARGIN = 0;

interface TradingPerformanceWidgetProps {
  trading: Trading;
  className?: string;
  showHeader?: boolean;
  showHighlights?: boolean;
  height?: string;
}

const areTradingPointsEqual = (a: TradingDataPoint, b: TradingDataPoint): boolean => {
  if (a.timestampNum !== b.timestampNum) return false;
  if (a.netValue !== b.netValue) return false;
  if (a.roi !== b.roi) return false;
  if ((a.benchmark ?? null) !== (b.benchmark ?? null)) return false;
  if ((a.benchmarkPrice ?? null) !== (b.benchmarkPrice ?? null)) return false;
  if ((a.position ?? null) !== (b.position ?? null)) return false;
  if ((a.isPartial ?? false) !== (b.isPartial ?? false)) return false;

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

const mergeTradingLogs = (existing: TradingLog[], incoming: TradingLog[]): TradingLog[] => {
  if (incoming.length === 0) {
    return existing;
  }

  const logMap = new Map<string, TradingLog>();
  existing.forEach(log => logMap.set(log.id, log));
  incoming.forEach(log => logMap.set(log.id, log));

  return Array.from(logMap.values()).sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
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

const areCandlestickPointsEqual = (
  a: TradingCandlestickPoint,
  b: TradingCandlestickPoint,
): boolean => {
  return (
    a.timestampNum === b.timestampNum &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    (a.volume ?? null) === (b.volume ?? null) &&
    (a.final ?? null) === (b.final ?? null) &&
    (a.coverage ?? null) === (b.coverage ?? null)
  );
};

const haveCandlestickDataChanged = (
  prev: TradingCandlestickPoint[],
  next: TradingCandlestickPoint[],
): boolean => {
  if (prev.length !== next.length) {
    return true;
  }

  for (let index = 0; index < prev.length; index++) {
    if (!areCandlestickPointsEqual(prev[index], next[index])) {
      return true;
    }
  }

  return false;
};

type ChartState = {
  data: TradingDataPoint[];
  benchmarkData: TradingDataPoint[];
  metrics: TradingMetrics;
  candlestickData: TradingCandlestickPoint[];
  baselinePrice?: number;
};

// Per-timeframe data cache to store loaded data for each timeframe
type TimeframeDataCache = {
  [timeframe: string]: {
    data: TradingDataPoint[];
    benchmarkData: TradingDataPoint[];
    metrics: TradingMetrics;
    lastUpdateTimestamp?: number;
    candlestickData: TradingCandlestickPoint[];
    equityCurve: EquityCurveNewData;
    baselinePrice?: number;
    initialBalance: number;
  };
};

const hasValidEquityPoint = (point: EquityCurveNewData['data_points'][number]): boolean => {
  const equityValid = typeof point.equity === 'number' && Number.isFinite(point.equity) && point.equity > 0;
  const stockPriceValid = typeof point.stock_price === 'number' && Number.isFinite(point.stock_price) && point.stock_price > 0;
  const stockBalanceValid = typeof point.stock_balance === 'number' && Number.isFinite(point.stock_balance);
  const quoteBalanceValid = typeof point.quote_balance === 'number' && Number.isFinite(point.quote_balance);

  return equityValid || stockPriceValid || stockBalanceValid || quoteBalanceValid;
};

const isIncomingPointPreferred = (
  existing: EquityCurveNewData['data_points'][number] | undefined,
  incoming: EquityCurveNewData['data_points'][number]
): boolean => {
  if (!existing) {
    return true;
  }

  const existingValid = hasValidEquityPoint(existing);
  const incomingValid = hasValidEquityPoint(incoming);

  if (incomingValid && !existingValid) {
    return true;
  }

  if (!incomingValid && existingValid) {
    return false;
  }

  const existingCoverage = existing.ohlcv?.coverage ?? 0;
  const incomingCoverage = incoming.ohlcv?.coverage ?? 0;
  if (incomingCoverage !== existingCoverage) {
    return incomingCoverage > existingCoverage;
  }

  const existingFinal = existing.ohlcv?.final ?? false;
  const incomingFinal = incoming.ohlcv?.final ?? false;
  if (incomingFinal !== existingFinal) {
    return incomingFinal;
  }

  return true;
};

const normalizeEquityCurve = (curve: EquityCurveNewData): EquityCurveNewData => {
  if (!curve?.data_points || curve.data_points.length === 0) {
    return curve;
  }

  const pointsMap = new Map<number, (typeof curve.data_points)[number]>();

  curve.data_points.forEach(point => {
    const timestampNum = new Date(point.timestamp).getTime();
    if (Number.isFinite(timestampNum)) {
      const existing = pointsMap.get(timestampNum);
      if (isIncomingPointPreferred(existing, point)) {
        pointsMap.set(timestampNum, point);
      }
    }
  });

  const orderedPoints = Array.from(pointsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, point]) => point);

  if (orderedPoints.length === 0) {
    return curve;
  }

  return {
    ...curve,
    start_time: orderedPoints[0].timestamp,
    end_time: orderedPoints[orderedPoints.length - 1].timestamp,
    data_points: orderedPoints,
  };
};

const normalizeCandlesticks = (candles: TradingCandlestickPoint[]): TradingCandlestickPoint[] => {
  if (!candles || candles.length === 0) {
    return candles;
  }

  const candleMap = new Map<number, TradingCandlestickPoint>();

  candles.forEach(candle => {
    if (Number.isFinite(candle.timestampNum)) {
      const existing = candleMap.get(candle.timestampNum);
      if (!existing || (candle.final && !existing.final)) {
        candleMap.set(candle.timestampNum, candle);
      } else if (!existing.final && !candle.final) {
        // Prefer candle with wider coverage or higher close value if both provisional
        const existingCoverage = existing.coverage ?? 0;
        const incomingCoverage = candle.coverage ?? 0;
        if (incomingCoverage >= existingCoverage) {
          candleMap.set(candle.timestampNum, candle);
        }
      } else if (existing.final === candle.final) {
        candleMap.set(candle.timestampNum, candle);
      }
    }
  });

  return Array.from(candleMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, candle]) => candle);
};

const TOTAL_DATA_TO_LOAD = 200; // Total number of data points to load from backend

const TradingPerformanceWidgetComponent: React.FC<TradingPerformanceWidgetProps> = ({
  trading,
  className = '',
  showHeader = true,
  showHighlights = true,
}) => {
  const { t } = useTranslation();
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    benchmarkData: [],
    metrics: {} as TradingMetrics,
    candlestickData: [],
    baselinePrice: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1m');
  const [stockSymbol, setStockSymbol] = useState<string>('ETH');
  const [quoteSymbol, setQuoteSymbol] = useState<string>('USDT');
  const [isRefetchingData, setIsRefetchingData] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [seriesVisibility, setSeriesVisibility] = useState({
    price: false,
    equity: true,
    benchmark: true,
    position: true,
    signals: false,
  });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Per-timeframe data cache to store data loaded for each timeframe
  const timeframeDataCacheRef = useRef<TimeframeDataCache>({});
  const tradingLogsRef = useRef<TradingLog[]>([]);
  const lastTradingLogTimestampRef = useRef<number | undefined>(undefined);
  const incrementalUpdateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incrementalUpdateInProgressRef = useRef(false);

  const [initialBalance, setInitialBalance] = useState<number | undefined>(undefined);


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

      const exchangeId = trading.exchange_binding?.exchange;

      const [equityCurve, tradingLogs] = await Promise.all([
        // Use new API with timeframe and recent_timeframes parameters
        getEquityCurve(
          trading.id,
          selectedTimeframe,
          TOTAL_DATA_TO_LOAD, // Load 500 recent timeframes for historical scrolling
          fetchedStockSymbol,
          fetchedQuoteSymbol,
          requireAuth,
          exchangeId
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

      const normalizedEquityCurve = normalizeEquityCurve(equityCurve);

      const {
        data,
        metrics: calculatedMetrics,
        candlestickData,
        initialBalance: resolvedInitialBalance,
        baselinePrice,
      } = transformNewEquityCurveToChartData(
        normalizedEquityCurve,
        tradingLogs,
        selectedTimeframe
      );

      setInitialBalance(resolvedInitialBalance);

      const normalizedCandles = normalizeCandlesticks(candlestickData);
      if (normalizedCandles.length > 0) {
        const lastCandle = normalizedCandles[normalizedCandles.length - 1];
        console.debug(
          `Candles after initial load (${selectedTimeframe}): count=${normalizedCandles.length}, last=${new Date(lastCandle.timestamp).toISOString()} O:${lastCandle.open} H:${lastCandle.high} L:${lastCandle.low} C:${lastCandle.close}`
        );
      }

      const benchmarkDataFromApi: TradingDataPoint[] = data.map(point => ({
        date: point.date,
        timestamp: point.timestamp,
        timestampNum: point.timestampNum,
        netValue: 0,
        roi: 0,
        benchmark: point.benchmark ?? 0,
        benchmarkPrice: point.benchmarkPrice ?? 0,
        event: point.event,
      }));

      const benchmarkData: TradingDataPoint[] = benchmarkDataFromApi;

      tradingLogsRef.current = mergeTradingLogs(tradingLogsRef.current, tradingLogs);
      if (tradingLogsRef.current.length > 0) {
        const latestLog = tradingLogsRef.current[tradingLogsRef.current.length - 1];
        lastTradingLogTimestampRef.current = new Date(latestLog.event_time).getTime();
      }

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, data);
        const mergedBenchmark = mergeTradingDataSets(previous.benchmarkData, benchmarkData);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);
        const candlestickChanged = haveCandlestickDataChanged(previous.candlestickData, normalizedCandles);

        const nextData = mergedData.changed ? mergedData.value : previous.data;
        const nextBenchmark = mergedBenchmark.changed ? mergedBenchmark.value : previous.benchmarkData;
        const nextMetrics = metricsChanged ? calculatedMetrics : previous.metrics;
        const nextCandlesticks = candlestickChanged ? normalizedCandles : previous.candlestickData;
        const nextBaselinePrice = baselinePrice ?? previous.baselinePrice;

        // Store in cache for this timeframe
        const cacheKey = selectedTimeframe;
        timeframeDataCacheRef.current[cacheKey] = {
          data: nextData,
          benchmarkData: nextBenchmark,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          equityCurve: normalizedEquityCurve,
          baselinePrice: nextBaselinePrice,
          initialBalance: resolvedInitialBalance,
          lastUpdateTimestamp:
            nextData.length > 0
              ? nextData[nextData.length - 1].timestampNum
              : undefined,
        };

        console.log(`Cached data for timeframe ${cacheKey}: ${nextData.length} data points`);

        if (!mergedData.changed && !mergedBenchmark.changed && !metricsChanged && !candlestickChanged) {
          return previous;
        }

        return {
          data: nextData,
          benchmarkData: nextBenchmark,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          baselinePrice: nextBaselinePrice,
        };
      });

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
  }, [
    selectedTimeframe,
    trading.exchange_binding?.exchange,
    trading.id,
    trading.type,
  ]);


  const fetchIncrementalUpdates = useCallback(async () => {
    const cacheKey = selectedTimeframe;
    const cacheEntry = timeframeDataCacheRef.current[cacheKey];

    if (!cacheEntry || incrementalUpdateInProgressRef.current) {
      return;
    }

    const existingEquityCurve = cacheEntry.equityCurve;
    if (!existingEquityCurve || !existingEquityCurve.data_points || existingEquityCurve.data_points.length === 0) {
      return;
    }

    const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';
    const exchangeId = trading.exchange_binding?.exchange;

    const lastCachedTimestamp = cacheEntry.lastUpdateTimestamp
      ?? new Date(existingEquityCurve.data_points[existingEquityCurve.data_points.length - 1].timestamp).getTime();
    const timeframeMs = timeframeToMilliseconds(selectedTimeframe);
    const earliestAllowedTimestamp = new Date(existingEquityCurve.start_time).getTime();
    const startTime = Math.max(lastCachedTimestamp - timeframeMs, earliestAllowedTimestamp);
    const endTime = Date.now();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      return;
    }

    incrementalUpdateInProgressRef.current = true;

    try {
      const incrementalEquity = await getEquityCurveByTimeRange(
        trading.id,
        selectedTimeframe,
        startTime,
        endTime,
        stockSymbol,
        quoteSymbol,
        requireAuth,
        exchangeId
      );

      const normalizedIncremental = incrementalEquity ? normalizeEquityCurve(incrementalEquity) : undefined;
      const newDataPoints = normalizedIncremental?.data_points ?? [];

      if (newDataPoints.length > 0) {
        const firstNew = newDataPoints[0];
        const lastNew = newDataPoints[newDataPoints.length - 1];
        console.debug(
          `Incremental equity fetched ${newDataPoints.length} points from ${firstNew.timestamp} to ${lastNew.timestamp}`
        );
      }

      const combinedMap = new Map<number, typeof newDataPoints[number]>();
      existingEquityCurve.data_points.forEach(point => {
        const timestampNum = new Date(point.timestamp).getTime();
        if (Number.isFinite(timestampNum)) {
          combinedMap.set(timestampNum, point);
        }
      });
      newDataPoints.forEach(point => {
        const timestampNum = new Date(point.timestamp).getTime();
        if (Number.isFinite(timestampNum)) {
          const existingPoint = combinedMap.get(timestampNum);
          if (isIncomingPointPreferred(existingPoint, point)) {
            combinedMap.set(timestampNum, point);
          }
        }
      });

      let combinedPoints = Array.from(combinedMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, point]) => point);

      if (combinedPoints.length > TOTAL_DATA_TO_LOAD) {
        combinedPoints = combinedPoints.slice(combinedPoints.length - TOTAL_DATA_TO_LOAD);
      }

      const updatedEquityCurve: EquityCurveNewData = {
        ...existingEquityCurve,
        start_time: combinedPoints.length > 0 ? combinedPoints[0].timestamp : existingEquityCurve.start_time,
        end_time: combinedPoints.length > 0
          ? combinedPoints[combinedPoints.length - 1].timestamp
          : existingEquityCurve.end_time,
        data_points: combinedPoints,
      };

      const latestTimestampNum = combinedPoints.length > 0
        ? new Date(combinedPoints[combinedPoints.length - 1].timestamp).getTime()
        : cacheEntry.lastUpdateTimestamp;

      let hasUpdatedData = newDataPoints.length > 0;

      // Fetch trading logs incrementally to capture new events
      const newTradingLogs = await getTradingLogs(
        trading.id,
        requireAuth,
        lastTradingLogTimestampRef.current
      );

      if (newTradingLogs.length > 0) {
        tradingLogsRef.current = mergeTradingLogs(tradingLogsRef.current, newTradingLogs);
        const latestLog = tradingLogsRef.current[tradingLogsRef.current.length - 1];
        lastTradingLogTimestampRef.current = new Date(latestLog.event_time).getTime();
        hasUpdatedData = true;
      }

      if (!hasUpdatedData) {
        // Update cache with latest timestamps even if nothing changed to ensure fresh metadata
        timeframeDataCacheRef.current[cacheKey] = {
          ...cacheEntry,
          equityCurve: updatedEquityCurve,
          lastUpdateTimestamp: latestTimestampNum,
        };
        return;
      }

      const {
        data,
        metrics: calculatedMetrics,
        candlestickData,
        initialBalance: resolvedInitialBalance,
        baselinePrice,
      } = transformNewEquityCurveToChartData(
        updatedEquityCurve,
        tradingLogsRef.current,
        selectedTimeframe
      );

      setInitialBalance(resolvedInitialBalance);

      const normalizedCandles = normalizeCandlesticks(candlestickData);

      if (normalizedCandles.length > 0) {
        const lastCandle = normalizedCandles[normalizedCandles.length - 1];
        console.debug(
          `Candles after incremental update (${selectedTimeframe}): count=${normalizedCandles.length}, last=${new Date(lastCandle.timestamp).toISOString()} O:${lastCandle.open} H:${lastCandle.high} L:${lastCandle.low} C:${lastCandle.close}`
        );
      }

      const benchmarkData: TradingDataPoint[] = data.map(point => ({
        date: point.date,
        timestamp: point.timestamp,
        timestampNum: point.timestampNum,
        netValue: 0,
        roi: 0,
        benchmark: point.benchmark ?? 0,
        benchmarkPrice: point.benchmarkPrice ?? 0,
        event: point.event,
      }));

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, data);
        const mergedBenchmark = mergeTradingDataSets(previous.benchmarkData, benchmarkData);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);
        const candlestickChanged = haveCandlestickDataChanged(previous.candlestickData, normalizedCandles);

        const nextData = mergedData.changed ? mergedData.value : previous.data;
        const nextBenchmark = mergedBenchmark.changed ? mergedBenchmark.value : previous.benchmarkData;
        const nextMetrics = metricsChanged ? calculatedMetrics : previous.metrics;
        const nextCandlesticks = candlestickChanged ? normalizedCandles : previous.candlestickData;
        const nextBaselinePrice = baselinePrice ?? previous.baselinePrice ?? cacheEntry.baselinePrice;

        timeframeDataCacheRef.current[cacheKey] = {
          data: nextData,
          benchmarkData: nextBenchmark,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          equityCurve: updatedEquityCurve,
          baselinePrice: nextBaselinePrice,
          initialBalance: resolvedInitialBalance,
          lastUpdateTimestamp:
            nextData.length > 0
              ? nextData[nextData.length - 1].timestampNum
              : latestTimestampNum,
        };

        if (!mergedData.changed && !mergedBenchmark.changed && !metricsChanged && !candlestickChanged) {
          return previous;
        }

        return {
          data: nextData,
          benchmarkData: nextBenchmark,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          baselinePrice: nextBaselinePrice,
        };
      });
    } catch (err) {
      console.error('Failed to fetch incremental trading data:', err);
    } finally {
      incrementalUpdateInProgressRef.current = false;
    }
  }, [
    quoteSymbol,
    selectedTimeframe,
    stockSymbol,
    trading.id,
    trading.type,
    trading.exchange_binding?.exchange,
  ]);


  // Initial data loading effect - only run once on mount
  useEffect(() => {
    fetchTradingData(true); // Mark as initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (
          cachedData.initialBalance !== undefined &&
          Number.isFinite(cachedData.initialBalance) &&
          cachedData.initialBalance > 0 &&
          cachedData.initialBalance !== initialBalance
        ) {
          setInitialBalance(cachedData.initialBalance);
        }
        setChartState({
          data: cachedData.data,
          benchmarkData: cachedData.benchmarkData,
          metrics: cachedData.metrics,
          candlestickData: cachedData.candlestickData,
          baselinePrice: cachedData.baselinePrice,
        });
        setInitialized(false); // Reset to show latest 100 points
      } else {
        // No cache for this timeframe, fetch fresh data
        console.debug(`No cached data for timeframe ${cacheKey}, fetching fresh data`);
        setInitialized(false); // Reset initialization flag to show latest 100 again
        fetchTradingData(false); // Don't show loading spinner
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe]);

  // Reset initialized flag when data changes significantly
  useEffect(() => {
    if (!initialized && chartState.data.length > 0) {
      // On initial load or timeframe change, mark as initialized
      setInitialized(true);
    }
  }, [chartState.data.length, initialized]);

  // Periodically fetch incremental updates when data is available
  useEffect(() => {
    if (incrementalUpdateTimerRef.current) {
      clearInterval(incrementalUpdateTimerRef.current);
      incrementalUpdateTimerRef.current = null;
    }

    if (chartState.data.length === 0) {
      return;
    }

    const timeframeMs = timeframeToMilliseconds(selectedTimeframe);
    const intervalMs = Math.min(
      Math.max(Math.floor(timeframeMs / 2), 15_000),
      5 * 60 * 1000
    );

    incrementalUpdateTimerRef.current = setInterval(() => {
      fetchIncrementalUpdates();
    }, intervalMs);

    return () => {
      if (incrementalUpdateTimerRef.current) {
        clearInterval(incrementalUpdateTimerRef.current);
        incrementalUpdateTimerRef.current = null;
      }
    };
  }, [chartState.data.length, fetchIncrementalUpdates, selectedTimeframe]);


  // Data is already filtered by the API with the selected timeframe
  // Show all data on the equity chart (no panning/slicing)
  const filteredData = chartState.data;
  const visibleBenchmarkData = chartState.benchmarkData;


  // Handle timeframe selection
  const handleTimeframeChange = (timeframe: Timeframe) => {
    setSelectedTimeframe(timeframe);
  };

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
            {/* Legend Buttons - Left Aligned */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { key: 'equity' as const, label: 'Equity', color: '#10B981' },
                { key: 'benchmark' as const, label: 'Benchmark', color: '#F59E0B' },
                { key: 'position' as const, label: 'Position', color: '#6366F1' },
                { key: 'signals' as const, label: 'Signals', color: '#3B82F6' },
                { key: 'price' as const, label: 'Price', color: '#4B5563' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSeriesVisibility(prev => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))}
                  className={`flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    seriesVisibility[item.key]
                      ? 'bg-white border-gray-300 text-gray-700 focus:ring-blue-200'
                      : 'bg-gray-100 border-gray-200 text-gray-400 focus:ring-blue-100'
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: seriesVisibility[item.key] ? item.color : '#D1D5DB' }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
            {/* Timeframe Selector Buttons - Right Aligned */}
            <div className="flex items-center gap-1 flex-wrap">
              {(['1m', '1h', '8h', '1d'] as Timeframe[]).map((tf) => (
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
            </div>
          </div>
        </div>
        
        <div
          ref={chartContainerRef}
          className={`flex flex-col`}
          style={{
            outline: 'none',
            overflow: 'visible'
          }}
          onFocus={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          {/* Candlestick Chart */}
          <div style={{ flex: '0 0 35%', outline: 'none', minHeight: '250px', display: 'flex', flexDirection: 'column'}} tabIndex={-1}>
            <div
              style={{
                flex: '1 1 auto',
                minHeight: '250px',
                marginLeft: CHART_LEFT_MARGIN,
                marginRight: CHART_RIGHT_MARGIN,
              }}
            >
              <CandlestickChart
                candles={chartState.candlestickData}
                equityPoints={chartState.data}
                benchmarkPoints={visibleBenchmarkData}
                timeframe={selectedTimeframe}
                height={400}
                className=""
                loading={loading || isRefetchingData}
                initialBalance={initialBalance}
                baselinePrice={chartState.baselinePrice}
                tradingSignalsVisible={seriesVisibility.signals}
                onTradingSignalsToggle={(next) => setSeriesVisibility(prev => ({
                  ...prev,
                  signals: next,
                }))}
                seriesVisibility={seriesVisibility}
                onSeriesVisibilityChange={(next) => setSeriesVisibility(next)}
              />
            </div>
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
    prev.height === next.height
  );
};

const TradingPerformanceWidget = memo(TradingPerformanceWidgetComponent, arePropsEqual);

export { TradingPerformanceWidget };
export default TradingPerformanceWidget;
