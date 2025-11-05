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
  splitEquityDataByCreationTime,
  type TradingDataPoint,
  type TradingMetrics,
  type TradingCandlestickPoint,
} from '../../utils/chartData';
import { getFirstValidStockPrice, resolveEffectiveStockPrice } from '../../utils/assetsMetrics';
import CandlestickChart from './CandlestickChart';
import { useToast } from '../../hooks/useToast';

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

const MIN_WARMUP_RETRY_MS = 1_500;
const DEFAULT_WARMUP_RETRY_MS = 2_000;
const EQUITY_CURVE_FETCH_INTERVAL_MS = 5_000; // 5 seconds

const getWarmupStateFromCurve = (
  curve?: EquityCurveNewData | null
): { active: boolean; retryAfterMs: number } => {
  if (!curve) {
    return { active: false, retryAfterMs: 0 };
  }

  const statusValue = typeof curve.status === 'string' ? curve.status.toLowerCase() : undefined;
  const warming =
    curve.warming_up === true ||
    statusValue === 'warming' ||
    Boolean(curve.gap_count && curve.gap_count > 0);

  if (!warming) {
    return { active: false, retryAfterMs: 0 };
  }

  const retryAfterSeconds =
    typeof curve.retry_after === 'number' && Number.isFinite(curve.retry_after)
      ? curve.retry_after
      : undefined;

  const retryAfterMs = Math.max(
    Math.round((retryAfterSeconds ?? DEFAULT_WARMUP_RETRY_MS / 1000) * 1000),
    MIN_WARMUP_RETRY_MS
  );

  return {
    active: true,
    retryAfterMs,
  };
};

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
  beforeCreationData: TradingDataPoint[];
  metrics: TradingMetrics;
  candlestickData: TradingCandlestickPoint[];
  baselinePrice?: number;
};

// Per-timeframe data cache to store loaded data for each timeframe
type TimeframeDataCache = {
  [timeframe: string]: {
    data: TradingDataPoint[];
    benchmarkData: TradingDataPoint[];
    beforeCreationData: TradingDataPoint[];
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

const TOTAL_DATA_TO_LOAD = 500; // Total number of data points to load from backend

const TradingPerformanceWidgetComponent: React.FC<TradingPerformanceWidgetProps> = ({
  trading,
  className = '',
  showHeader = true,
  showHighlights = true,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    benchmarkData: [],
    beforeCreationData: [],
    metrics: {} as TradingMetrics,
    candlestickData: [],
    baselinePrice: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine default timeframe based on trading type and timeframe:
  // - For backtest trading, use 8h as default
  // - If trading timeframe is 5m, use 1m as default
  // - For all other timeframes, use 1h as default
  const getDefaultTimeframe = (): Timeframe => {
    if (trading.type === 'backtest') {
      return '8h';
    }
    const tradingTimeframe = trading.info?.timeframe;
    if (tradingTimeframe === '5m') {
      return '1m';
    }
    return '1h';
  };

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(getDefaultTimeframe());
  const [stockSymbol, setStockSymbol] = useState<string>('ETH');
  const [quoteSymbol, setQuoteSymbol] = useState<string>('USDT');
  const [isRefetchingData, setIsRefetchingData] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [seriesVisibility, setSeriesVisibility] = useState({
    equity: true,
    benchmark: true,
    signals: true,
    price: false,
    position: false,
  });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Per-timeframe data cache to store data loaded for each timeframe
  const timeframeDataCacheRef = useRef<TimeframeDataCache>({});
  const initialStockPriceRef = useRef<number | undefined>(undefined);
  const tradingLogsRef = useRef<TradingLog[]>([]);
  const lastTradingLogTimestampRef = useRef<number | undefined>(undefined);
  const incrementalUpdateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const incrementalUpdateInProgressRef = useRef(false);

  const [initialBalance, setInitialBalance] = useState<number | undefined>(undefined);
  const [stockBalance, setStockBalance] = useState<number>(0);
  const [quoteBalance, setQuoteBalance] = useState<number>(0);
  const warmupRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmupTimerScheduledAtRef = useRef<number>(0); // Timestamp when timer was scheduled
  const [warmupState, setWarmupState] = useState<{ active: boolean; retryAfterMs: number }>(
    () => ({ active: false, retryAfterMs: 0 })
  );
  const [warmupRetryTrigger, setWarmupRetryTrigger] = useState(0); // Force effect re-run after retry
  const apiRequestCountRef = useRef(0);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  const beginApiCall = useCallback(() => {
    apiRequestCountRef.current += 1;
  }, []);

  const endApiCall = useCallback(() => {
    if (apiRequestCountRef.current === 0) {
      return;
    }
    apiRequestCountRef.current -= 1;
  }, []);


  const fetchTradingData = useCallback(async (isInitialLoad = false, silentRefresh = false) => {
    let is202Error = false;

    try {
      // Only show loading state during initial load, not during refresh
      if (isInitialLoad) {
        setLoading(true);
        setError(null);
      } else if (!silentRefresh) {
        setIsRefetchingData(true);
      }

      beginApiCall();

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
        throw new Error(t('trading.tradingDetail.missingSubAccounts', `Missing required sub-accounts. Found ${subAccounts.length} sub-accounts, but need both stock and balance accounts.`, { count: subAccounts.length }));
      }

      const fetchedStockSymbol = stockSubAccount.symbol;
      const fetchedQuoteSymbol = balanceSubAccount.symbol;
      console.log(`Using symbols: stock=${fetchedStockSymbol}, quote=${fetchedQuoteSymbol}`);

      // Update state with the symbols and balances
      setStockSymbol(fetchedStockSymbol);
      setQuoteSymbol(fetchedQuoteSymbol);

      // Extract and set sub-account balances
      const stockBal = typeof stockSubAccount.balance === 'number'
        ? stockSubAccount.balance
        : (parseFloat(stockSubAccount.balance) || 0);
      const quoteBal = typeof balanceSubAccount.balance === 'number'
        ? balanceSubAccount.balance
        : (parseFloat(balanceSubAccount.balance) || 0);
      setStockBalance(stockBal);
      setQuoteBalance(quoteBal);

      const exchangeType = trading.exchange_binding?.exchange_type;

      const [equityCurve, tradingLogs] = await Promise.all([
        // Use new API with timeframe and recent_timeframes parameters
        getEquityCurve(
          trading.id,
          selectedTimeframe,
          TOTAL_DATA_TO_LOAD, // Load 500 recent timeframes for historical scrolling
          fetchedStockSymbol,
          fetchedQuoteSymbol,
          requireAuth,
          exchangeType
        ),
        getTradingLogs(trading.id, requireAuth)
      ]);

      console.log('Equity curve response:', equityCurve);
      console.log('Trading logs response:', tradingLogs);

      // Validate equity curve data - expect new API format only
      if (!equityCurve || !equityCurve.data_points || !Array.isArray(equityCurve.data_points)) {
        console.error('Invalid equity curve data format. Expected data_points array, got:', equityCurve);
        throw new Error(t('trading.tradingDetail.invalidEquityCurveFormat', 'Invalid equity curve data format received from API. Expected new format with data_points array.'));
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

      if (initialStockPriceRef.current === undefined) {
        const initialPriceCandidate =
          typeof baselinePrice === 'number' && Number.isFinite(baselinePrice) && baselinePrice > 0
            ? baselinePrice
            : getFirstValidStockPrice(normalizedEquityCurve);
        if (
          typeof initialPriceCandidate === 'number' &&
          Number.isFinite(initialPriceCandidate) &&
          initialPriceCandidate > 0
        ) {
          initialStockPriceRef.current = initialPriceCandidate;
        }
      }

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

      // Split equity data into before and after start time (using start_date from trading.info if available, otherwise created_at)
      const startDate = (trading.info?.start_date as string | undefined) ?? trading.created_at;
      const { beforeCreationData, afterCreationData } = splitEquityDataByCreationTime(data, startDate, selectedTimeframe);

      tradingLogsRef.current = mergeTradingLogs(tradingLogsRef.current, tradingLogs);
      if (tradingLogsRef.current.length > 0) {
        const latestLog = tradingLogsRef.current[tradingLogsRef.current.length - 1];
        lastTradingLogTimestampRef.current = new Date(latestLog.event_time).getTime();
      }

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, afterCreationData);
        const mergedBenchmark = mergeTradingDataSets(previous.benchmarkData, benchmarkData);
        const mergedBeforeCreationData = mergeTradingDataSets(previous.beforeCreationData, beforeCreationData);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);
        const candlestickChanged = haveCandlestickDataChanged(previous.candlestickData, normalizedCandles);

        const nextData = mergedData.changed ? mergedData.value : previous.data;
        const nextBenchmark = mergedBenchmark.changed ? mergedBenchmark.value : previous.benchmarkData;
        const nextBeforeCreationData = mergedBeforeCreationData.changed ? mergedBeforeCreationData.value : previous.beforeCreationData;
        const nextMetrics = metricsChanged ? calculatedMetrics : previous.metrics;
        const nextCandlesticks = candlestickChanged ? normalizedCandles : previous.candlestickData;
        const nextBaselinePrice = baselinePrice ?? previous.baselinePrice;

        // Store in cache for this timeframe
        const cacheKey = selectedTimeframe;
        timeframeDataCacheRef.current[cacheKey] = {
          data: nextData,
          benchmarkData: nextBenchmark,
          beforeCreationData: nextBeforeCreationData,
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

        console.log(`Cached data for timeframe ${cacheKey}: ${nextData.length} data points, beforeCreation: ${nextBeforeCreationData.length}`);

        if (!mergedData.changed && !mergedBenchmark.changed && !mergedBeforeCreationData.changed && !metricsChanged && !candlestickChanged) {
          return previous;
        }

        return {
          data: nextData,
          benchmarkData: nextBenchmark,
          beforeCreationData: nextBeforeCreationData,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          baselinePrice: nextBaselinePrice,
        };
      });

      const nextWarmupState = getWarmupStateFromCurve(normalizedEquityCurve);
      console.log('fetchTradingData success - nextWarmupState:', nextWarmupState, 'warming_up:', normalizedEquityCurve.warming_up);
      setWarmupState((previous) => {
        if (
          previous.active === nextWarmupState.active &&
          previous.retryAfterMs === nextWarmupState.retryAfterMs
        ) {
          console.log('Warmup state unchanged, skipping state update');
          return previous;
        }
        console.log('Warmup state changed from', previous, 'to', nextWarmupState);
        return nextWarmupState;
      });

    } catch (err) {
      console.error('Failed to fetch trading data:', err);

      // Check if this is a 202 (warmup in progress) - if so, keep the warmup spinner showing
      is202Error = err instanceof ApiError && err.status === 202;

      // Handle errors - show in inline error state during initial load, toast during refresh
      if (isInitialLoad) {
        if (err instanceof ApiError) {
          // Don't show error for 202 responses - we'll retry automatically
          if (err.status !== 202) {
            setError(`${t('trading.tradingDetail.errorFetchingData', 'Error fetching trading data')} (${err.code}): ${err.message}`);
          }
        } else if (err instanceof Error) {
          setError(`${t('trading.tradingDetail.networkError', 'Network Error')}: ${err.message}`);
        } else {
          setError(t('trading.tradingDetail.unknownErrorMessage', 'Failed to load trading data'));
        }
      } else {
        // During refresh (not initial load), show toast notification for non-202 errors
        if (!is202Error) {
          if (err instanceof ApiError) {
            toast.error(
              t('trading.tradingDetail.errorFetchingData', 'Error fetching trading data'),
              `${err.code ? `[${err.code}] ` : ''}${err.message}`
            );
          } else if (err instanceof Error) {
            toast.error(
              t('trading.tradingDetail.networkError', 'Network Error'),
              err.message
            );
          } else {
            toast.error(
              t('trading.tradingDetail.unknownError', 'Unknown Error'),
              t('trading.tradingDetail.unknownErrorMessage', 'Failed to load trading data')
            );
          }
        }
      }

      // If this is a 202 error, start showing the warmup spinner
      // Otherwise, stop showing it and clear the warmup state
      if (is202Error) {
        setIsWarmingUp(true);
        setWarmupState((previous) => (previous.active ? previous : { active: true, retryAfterMs: DEFAULT_WARMUP_RETRY_MS }));
      } else {
        setIsWarmingUp(false);
        setWarmupState((previous) => (previous.active ? { active: false, retryAfterMs: 0 } : previous));
      }
    } finally {
      // Always end the API call - the warmup spinner is controlled by isWarmingUp state instead
      endApiCall();

      // Only hide loading state if we showed it (initial load)
      if (isInitialLoad) {
        setLoading(false);
      } else if (!silentRefresh) {
        setIsRefetchingData(false);
      }
    }
  }, [
    selectedTimeframe,
    trading.exchange_binding?.exchange_type,
    trading.id,
    trading.type,
    beginApiCall,
    endApiCall,
    toast,
    t,
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
    const exchangeType = trading.exchange_binding?.exchange_type;

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
    beginApiCall();

    try {
      const incrementalEquity = await getEquityCurveByTimeRange(
        trading.id,
        selectedTimeframe,
        startTime,
        endTime,
        stockSymbol,
        quoteSymbol,
        requireAuth,
        exchangeType
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

      const warmupSourceCurve = normalizedIncremental ?? incrementalEquity ?? existingEquityCurve;
      const derivedWarmupState = getWarmupStateFromCurve(warmupSourceCurve);

      let derivedRetryAfterSeconds: number | undefined;
      if (
        warmupSourceCurve &&
        typeof warmupSourceCurve.retry_after === 'number' &&
        Number.isFinite(warmupSourceCurve.retry_after)
      ) {
        derivedRetryAfterSeconds = warmupSourceCurve.retry_after;
      } else if (derivedWarmupState.active) {
        derivedRetryAfterSeconds = Math.max(Math.round(derivedWarmupState.retryAfterMs / 1000), 1);
      } else if (
        typeof existingEquityCurve.retry_after === 'number' &&
        Number.isFinite(existingEquityCurve.retry_after)
      ) {
        derivedRetryAfterSeconds = existingEquityCurve.retry_after;
      }

      const updatedEquityCurve: EquityCurveNewData = {
        ...existingEquityCurve,
        start_time: combinedPoints.length > 0 ? combinedPoints[0].timestamp : existingEquityCurve.start_time,
        end_time: combinedPoints.length > 0
          ? combinedPoints[combinedPoints.length - 1].timestamp
          : existingEquityCurve.end_time,
        data_points: combinedPoints,
        warming_up: derivedWarmupState.active,
        retry_after: derivedRetryAfterSeconds,
        gap_count: warmupSourceCurve?.gap_count ?? existingEquityCurve.gap_count,
        status: warmupSourceCurve?.status ?? existingEquityCurve.status,
        message: warmupSourceCurve?.message ?? existingEquityCurve.message,
      };

      const nextWarmupState = getWarmupStateFromCurve(updatedEquityCurve);
      setWarmupState((previous) => {
        if (previous.active === nextWarmupState.active && previous.retryAfterMs === nextWarmupState.retryAfterMs) {
          return previous;
        }
        return nextWarmupState;
      });

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

      if (initialStockPriceRef.current === undefined) {
        const initialPriceCandidate =
          typeof baselinePrice === 'number' && Number.isFinite(baselinePrice) && baselinePrice > 0
            ? baselinePrice
            : getFirstValidStockPrice(updatedEquityCurve);
        if (
          typeof initialPriceCandidate === 'number' &&
          Number.isFinite(initialPriceCandidate) &&
          initialPriceCandidate > 0
        ) {
          initialStockPriceRef.current = initialPriceCandidate;
        }
      }

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

      // Split equity data into before and after start time (using start_date from trading.info if available, otherwise created_at)
      const startDate = (trading.info?.start_date as string | undefined) ?? trading.created_at;
      const { beforeCreationData, afterCreationData } = splitEquityDataByCreationTime(data, startDate, selectedTimeframe);

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, afterCreationData);
        const mergedBenchmark = mergeTradingDataSets(previous.benchmarkData, benchmarkData);
        const mergedBeforeCreationData = mergeTradingDataSets(previous.beforeCreationData, beforeCreationData);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);
        const candlestickChanged = haveCandlestickDataChanged(previous.candlestickData, normalizedCandles);

        const nextData = mergedData.changed ? mergedData.value : previous.data;
        const nextBenchmark = mergedBenchmark.changed ? mergedBenchmark.value : previous.benchmarkData;
        const nextBeforeCreationData = mergedBeforeCreationData.changed ? mergedBeforeCreationData.value : previous.beforeCreationData;
        const nextMetrics = metricsChanged ? calculatedMetrics : previous.metrics;
        const nextCandlesticks = candlestickChanged ? normalizedCandles : previous.candlestickData;
        const nextBaselinePrice = baselinePrice ?? previous.baselinePrice ?? cacheEntry.baselinePrice;

        timeframeDataCacheRef.current[cacheKey] = {
          data: nextData,
          benchmarkData: nextBenchmark,
          beforeCreationData: nextBeforeCreationData,
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

        if (!mergedData.changed && !mergedBenchmark.changed && !mergedBeforeCreationData.changed && !metricsChanged && !candlestickChanged) {
          return previous;
        }

        return {
          data: nextData,
          benchmarkData: nextBenchmark,
          beforeCreationData: nextBeforeCreationData,
          metrics: nextMetrics,
          candlestickData: nextCandlesticks,
          baselinePrice: nextBaselinePrice,
        };
      });
    } catch (err) {
      console.error('Failed to fetch incremental trading data:', err);
    } finally {
      incrementalUpdateInProgressRef.current = false;
      endApiCall();
    }
  }, [
    quoteSymbol,
    selectedTimeframe,
    stockSymbol,
    trading.id,
    trading.type,
    trading.exchange_binding?.exchange_type,
    beginApiCall,
    endApiCall,
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
          beforeCreationData: cachedData.beforeCreationData,
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

  // When backend is warming up equity data, retry in the background using the suggested cadence
  useEffect(() => {
    if (!warmupState.active) {
      // Warmup is complete, stop showing the spinner and clear any pending timer
      if (warmupRetryTimerRef.current) {
        console.log('Warmup complete, clearing retry timer');
        clearTimeout(warmupRetryTimerRef.current);
        warmupRetryTimerRef.current = null;
        warmupTimerScheduledAtRef.current = 0;
      }
      if (isWarmingUp) {
        setIsWarmingUp(false);
      }
      return;
    }

    // Warmup is active - ensure spinner is visible
    if (!isWarmingUp) {
      setIsWarmingUp(true);
    }

    // Check if a timer is already scheduled and still valid (hasn't fired yet)
    const now = Date.now();
    const timerScheduledAt = warmupTimerScheduledAtRef.current;
    const delayMs = Math.max(
      warmupState.retryAfterMs > 0 ? warmupState.retryAfterMs : DEFAULT_WARMUP_RETRY_MS,
      MIN_WARMUP_RETRY_MS
    );

    // If timer is already scheduled and less than (delayMs - 500ms) has passed, keep the existing timer
    // This prevents resetting the timer when state updates but nothing meaningful changed
    if (warmupRetryTimerRef.current && timerScheduledAt > 0) {
      const elapsedMs = now - timerScheduledAt;
      if (elapsedMs < delayMs - 500) {
        // Timer is still valid, don't reset it
        console.log(`Warmup timer already running (${(delayMs - elapsedMs).toFixed(0)}ms remaining), skipping reset`);
        return;
      }
      // Timer should have fired or is about to fire, clear it for reset
      clearTimeout(warmupRetryTimerRef.current);
      warmupRetryTimerRef.current = null;
    }

    // Set a new timer
    console.log(`Starting warmup retry timer for ${delayMs}ms (retry_after: ${warmupState.retryAfterMs}ms)`);
    warmupTimerScheduledAtRef.current = now;

    warmupRetryTimerRef.current = setTimeout(() => {
      console.log('Warmup retry timer fired, fetching data');
      warmupRetryTimerRef.current = null;
      warmupTimerScheduledAtRef.current = 0;
      // Trigger effect re-run after fetch so we can schedule next retry if still warming
      fetchTradingData(false, true).then(() => {
        setWarmupRetryTrigger(prev => prev + 1);
      }).catch(() => {
        setWarmupRetryTrigger(prev => prev + 1);
      });
    }, delayMs);

    return () => {
      // Don't clear the timer in cleanup - let it fire naturally
    };
  }, [warmupState, fetchTradingData, isWarmingUp, warmupRetryTrigger]);

  // Periodically fetch incremental updates when data is available
  useEffect(() => {
    if (incrementalUpdateTimerRef.current) {
      clearInterval(incrementalUpdateTimerRef.current);
      incrementalUpdateTimerRef.current = null;
    }

    if (chartState.data.length === 0) {
      return;
    }

    incrementalUpdateTimerRef.current = setInterval(() => {
      fetchIncrementalUpdates();
    }, EQUITY_CURVE_FETCH_INTERVAL_MS);

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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatSignificantDigits = (value: number, digits: number = 5) => {
    if (value === 0) return '0';
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const decimalPlaces = Math.max(0, digits - 1 - magnitude);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces,
    }).format(parseFloat(value.toFixed(decimalPlaces)));
  };

  const preferredPriceTimeframes: Timeframe[] = ['1m', '1h', '4h', '8h', '1d', '1w'];
  let cachedEffectivePrice: number | undefined;

  for (const timeframe of preferredPriceTimeframes) {
    const cacheEntry = timeframeDataCacheRef.current[timeframe];
    if (!cacheEntry) {
      continue;
    }

    const candidatePrice = resolveEffectiveStockPrice({
      candlestickData: cacheEntry.candlestickData,
      fallbackPrice: cacheEntry.baselinePrice,
      equityCurve: cacheEntry.equityCurve,
    });

    if (typeof candidatePrice === 'number' && Number.isFinite(candidatePrice) && candidatePrice > 0) {
      cachedEffectivePrice = candidatePrice;
      break;
    }
  }

  const fallbackBenchmarkPrice =
    filteredData.length > 0 ? filteredData[filteredData.length - 1]?.benchmarkPrice : undefined;

  const normalizedBaselinePrice =
    typeof chartState.baselinePrice === 'number' && Number.isFinite(chartState.baselinePrice)
      ? chartState.baselinePrice
      : undefined;

  const effectiveStockPrice = resolveEffectiveStockPrice({
    candlestickData: chartState.candlestickData,
    fallbackPrice: typeof cachedEffectivePrice === 'number' ? cachedEffectivePrice : fallbackBenchmarkPrice,
    equityCurve: timeframeDataCacheRef.current[selectedTimeframe]?.equityCurve,
  }) ?? normalizedBaselinePrice ?? cachedEffectivePrice;

  const normalizedQuoteBalance = Number.isFinite(quoteBalance) ? quoteBalance : 0;
  const normalizedStockBalance = Number.isFinite(stockBalance) ? stockBalance : 0;
  const normalizedInitialBalance =
    typeof initialBalance === 'number' && Number.isFinite(initialBalance) && initialBalance > 0
      ? initialBalance
      : undefined;
  const initialStockPrice =
    typeof initialStockPriceRef.current === 'number' &&
    Number.isFinite(initialStockPriceRef.current) &&
    initialStockPriceRef.current > 0
      ? initialStockPriceRef.current
      : normalizedBaselinePrice;

  const derivedAssetsValue = (() => {
    if (typeof effectiveStockPrice === 'number' && Number.isFinite(effectiveStockPrice)) {
      return normalizedQuoteBalance + normalizedStockBalance * effectiveStockPrice;
    }

    const latestNetValue =
      filteredData.length > 0 ? filteredData[filteredData.length - 1]?.netValue : undefined;

    if (typeof latestNetValue === 'number' && Number.isFinite(latestNetValue)) {
      return latestNetValue;
    }

    return normalizedQuoteBalance;
  })();

  const fallbackTotalROI = typeof chartState.metrics.totalROI === 'number' ? chartState.metrics.totalROI : 0;
  const derivedTotalROI = normalizedInitialBalance
    ? ((derivedAssetsValue - normalizedInitialBalance) / normalizedInitialBalance) * 100
    : fallbackTotalROI;

  const fallbackBenchmarkPercentage = (() => {
    const lastBenchmarkPoint =
      visibleBenchmarkData.length > 0 ? visibleBenchmarkData[visibleBenchmarkData.length - 1] : undefined;
    if (lastBenchmarkPoint && typeof lastBenchmarkPoint.benchmark === 'number') {
      return lastBenchmarkPoint.benchmark;
    }
    const lastFilteredBenchmark =
      filteredData.length > 0 ? filteredData[filteredData.length - 1]?.benchmark : undefined;
    return typeof lastFilteredBenchmark === 'number' ? lastFilteredBenchmark : 0;
  })();

  const derivedBenchmarkROI = (() => {
    if (
      typeof initialStockPrice === 'number' &&
      Number.isFinite(initialStockPrice) &&
      initialStockPrice > 0 &&
      typeof effectiveStockPrice === 'number' &&
      Number.isFinite(effectiveStockPrice)
    ) {
      return ((effectiveStockPrice / initialStockPrice) - 1) * 100;
    }
    return fallbackBenchmarkPercentage;
  })();

  const derivedExcessROI = derivedTotalROI - derivedBenchmarkROI;

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
      {/* Metrics Cards - Group 1: Account */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-4">
          {/* Total Value */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[150px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.chart.assetsValue')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-gray-700">
                ${formatSignificantDigits(derivedAssetsValue, 4)}
              </div>
            </div>
          </div>

          {/* Equals Sign */}
          <div className="text-2xl font-bold text-gray-400 h-full flex items-center pb-2">=</div>

          {/* Quote Sub-Account */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[150px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{quoteSymbol}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-tiris-primary-600">
                ${formatSignificantDigits(normalizedQuoteBalance, 4)}
              </div>
            </div>
          </div>

          {/* Plus Sign */}
          <div className="text-2xl font-bold text-gray-400 h-full flex items-center pb-2">+</div>

          {/* Stock Sub-Account */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[150px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{stockSymbol}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-indigo-600">
                {formatSignificantDigits(normalizedStockBalance, 4)}
              </div>
            </div>
          </div>

          {/* Multiply Sign */}
          <div className="text-2xl font-bold text-gray-400 h-full flex items-center pb-2">×</div>

          {/* Stock Price */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[150px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.chart.ethPrice', `${stockSymbol} Price`)}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-emerald-600">
                ${formatSignificantDigits(
                  typeof effectiveStockPrice === 'number' && Number.isFinite(effectiveStockPrice)
                    ? effectiveStockPrice
                    : 0,
                  4
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards - Group 2: Trading Status */}
      <div className="mb-8">
        {/* First Row: Total ROI - Benchmark = Excess ROI */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-4 mb-4">
          {/* Total ROI */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[140px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalROI')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-green-600">
                {formatPercentage(derivedTotalROI)}
              </div>
            </div>
          </div>

          {/* Minus Sign */}
          <div className="text-2xl font-bold text-gray-400 h-full flex items-center pb-2">-</div>

          {/* Benchmark ROI */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[140px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.benchmarkROI', 'Benchmark')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-amber-600">
                {formatPercentage(derivedBenchmarkROI)}
              </div>
            </div>
          </div>

          {/* Equals Sign */}
          <div className="text-2xl font-bold text-gray-400 h-full flex items-center pb-2">=</div>

          {/* Excess ROI */}
          <div className="bg-white p-3 rounded-lg shadow-sm flex-1 min-w-[140px]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.excessROI', 'Excess ROI')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-teal-600">
                {formatPercentage(derivedExcessROI)}
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Other Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Sharpe Ratio */}
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.sharpeRatio')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-purple-600">
                {(chartState.metrics.sharpeRatio ?? 0).toFixed(1)}
              </div>
            </div>
          </div>
          {/* Max Drawdown */}
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.maxDrawdown')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-orange-600">
                {formatPercentage(chartState.metrics.maxDrawdown ?? 0)}
              </div>
            </div>
          </div>
          {/* Win Rate */}
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.winRate')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-cyan-600">
                {formatPercentage(chartState.metrics.winRate ?? 0)}
              </div>
            </div>
          </div>
          {/* Total Trades */}
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalTrades')}</div>
              <div className="text-xl font-['Bebas_Neue'] font-bold text-rose-600">
                {chartState.metrics.totalTrades ?? 0}
              </div>
            </div>
          </div>
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
                { key: 'equity' as const, labelKey: 'trading.tradingDetail.equityLabel', color: '#10B981' },
                { key: 'benchmark' as const, labelKey: 'trading.tradingDetail.benchmarkLabel', color: '#F59E0B' },
                { key: 'signals' as const, labelKey: 'trading.tradingDetail.signalsLabel', color: '#3B82F6' },
                { key: 'price' as const, labelKey: 'trading.tradingDetail.priceLabel', color: '#4B5563' },
                { key: 'position' as const, labelKey: 'trading.tradingDetail.positionLabel', color: '#6366F1' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSeriesVisibility(prev => {
                    // Make benchmark and price mutually exclusive
                    if (item.key === 'benchmark' && prev.benchmark === false) {
                      // Turning benchmark ON, turn price OFF
                      return {
                        ...prev,
                        benchmark: true,
                        price: false,
                      };
                    } else if (item.key === 'price' && prev.price === false) {
                      // Turning price ON, turn benchmark OFF
                      return {
                        ...prev,
                        price: true,
                        benchmark: false,
                      };
                    } else {
                      // For other buttons or toggling off, just toggle normally
                      return {
                        ...prev,
                        [item.key]: !prev[item.key],
                      };
                    }
                  })}
                  className={`flex items-center gap-1 rounded-md border px-3 py-1 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    seriesVisibility[item.key]
                      ? 'bg-white border-gray-300 text-gray-700 focus:ring-tiris-primary-200'
                      : 'bg-gray-100 border-gray-200 text-gray-400 focus:ring-tiris-primary-100'
                  }`}
                >
                  {item.key === 'signals' ? (
                    <svg
                      className="inline-block h-5 w-5"
                      viewBox="0 0 12 12"
                    >
                      {/* Blue dot for buy signals */}
                      <circle cx="3" cy="6" r="2.5" fill={seriesVisibility[item.key] ? '#3B82F6' : '#D1D5DB'} />
                      {/* Red dot for sell signals */}
                      <circle cx="9" cy="6" r="2.5" fill={seriesVisibility[item.key] ? '#EF4444' : '#D1D5DB'} />
                    </svg>
                  ) : item.key === 'price' ? (
                    <svg
                      className="inline-block h-4 w-4"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      {/* Green candlestick (left) */}
                      <line x1="3" y1="1" x2="3" y2="10" stroke="#10B981" strokeWidth="1.2" />
                      <rect x="1" y="3" width="4" height="5" fill="#10B981" />
                      {/* Red candlestick (right) */}
                      <line x1="9" y1="1" x2="9" y2="10" stroke="#EF4444" strokeWidth="1.2" />
                      <rect x="7" y="3" width="4" height="4" fill="#EF4444" />
                    </svg>
                  ) : (
                    <svg
                      className="inline-block h-3 w-3"
                      viewBox="0 0 12 12"
                    >
                      <line
                        x1="2"
                        y1="6"
                        x2="10"
                        y2="6"
                        stroke={seriesVisibility[item.key] ? item.color : '#D1D5DB'}
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
            {/* Timeframe Selector Buttons - Right Aligned */}
            <div className="flex items-center gap-2 flex-wrap">
              {isWarmingUp && (
                <span className="inline-flex items-center justify-center">
                  <span
                    className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    {t('trading.detail.loadingDataLabel', 'Fetching latest market data')}
                  </span>
                </span>
              )}
              {(() => {
                const baseTimeframes: Timeframe[] = ['1m', '1h', '8h', '1d'];
                const tradingTimeframe = trading.info?.timeframe;
                // Include 5m timeframe if the trading/strategy timeframe is 5m
                if (tradingTimeframe === '5m') {
                  if (!baseTimeframes.includes('5m' as Timeframe)) {
                    baseTimeframes.splice(1, 0, '5m' as Timeframe);
                  }
                  // Hide 1d timeframe for 5m trading
                  return baseTimeframes.filter(tf => tf !== '1d');
                }
                return baseTimeframes;
              })().map((tf) => (
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
                  {t(`trading.timeframeButtons.${tf}`, tf)}
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
                beforeCreationEquityPoints={chartState.beforeCreationData}
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
        <div className="mt-8 bg-gradient-to-r from-green-50 to-tiris-primary-50 p-6 rounded-lg">
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
