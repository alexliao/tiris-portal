import type {
  Transaction,
  TradingLog,
  EquityCurveData,
  EquityCurveNewData,
  EquityCurveOhlcv,
} from './api';

export interface TradingEvent {
  type: 'buy' | 'sell' | 'stop_loss' | 'deposit' | 'withdraw';
  description: string;
  price?: number; // Executed trade price when available
  timestamp?: string; // Original event time (ISO string)
}

export interface TradingDataPoint {
  date: string;
  timestamp: string; // Exact event time (ISO string)
  timestampNum: number; // Numeric timestamp for chart X-axis scale
  netValue: number; // Keep for tooltip display
  roi: number; // Primary chart value - return percentage
  benchmark?: number; // Benchmark return percentage
  benchmarkPrice?: number; // ETH price calculated from benchmark return
  position?: number; // ETH position balance (quantity of ETH held)
  events?: TradingEvent[];
  isPartial?: boolean; // Indicates the point was derived from partial/warmup data
}

type TradingEventType = TradingEvent['type'];

export interface TradingCandlestickPoint {
  timestamp: string;
  timestampNum: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  final?: boolean;
  coverage?: number;
}

export interface TradingMetrics {
  totalROI: number;
  benchmarkROI?: number;
  excessROI?: number;
  totalTrades: number;
}


/**
 * Convert timeframe string to milliseconds
 * Used for calculating appropriate event matching window
 */
function timeframeToMilliseconds(timeframe: string): number {
  const timeframeMap: Record<string, number> = {
    '1m': 1 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };
  return timeframeMap[timeframe] || 60 * 1000; // Default to 1 minute
}

/**
 * Split equity data into before and after creation time datasets
 * Used to visualize the creation time with different colored area chart series
 *
 * @param data - The full equity data points
 * @param createdAt - The creation timestamp (ISO string)
 * @param timeframe - The timeframe for the data (optional, used to shift dividing line)
 * @returns Object with beforeData and afterData arrays
 */
export function splitEquityDataByCreationTime(
  data: TradingDataPoint[],
  createdAt: string | undefined,
  timeframe: string = '1m'
): {
  beforeCreationData: TradingDataPoint[];
  afterCreationData: TradingDataPoint[];
  creationTimestampNum?: number;
} {
  if (!createdAt || !data.length) {
    return {
      beforeCreationData: [],
      afterCreationData: data,
    };
  }

  const creationTimestampNum = new Date(createdAt).getTime();
  if (!Number.isFinite(creationTimestampNum)) {
    return {
      beforeCreationData: [],
      afterCreationData: data,
    };
  }

  // Shift the dividing line one timeframe earlier so after-creation data aligns with creation marker
  const timeframeMs = timeframeToMilliseconds(timeframe);
  const shiftedCreationTime = creationTimestampNum - timeframeMs;

  const beforeCreationData: TradingDataPoint[] = [];
  const afterCreationData: TradingDataPoint[] = [];

  for (const point of data) {
    if (point.timestampNum < shiftedCreationTime) {
      beforeCreationData.push(point);
    } else {
      afterCreationData.push(point);
    }
  }

  return {
    beforeCreationData,
    afterCreationData,
    creationTimestampNum,
  };
}

/**
 * Transform new equity curve API data into chart data format
 * This is the primary function used with the new API endpoint
 *
 * @param equityCurve - The equity curve data from the API
 * @param tradingLogs - Trading logs for event matching (optional)
 * @param timeframe - The timeframe for the data (optional)
 */
export function transformNewEquityCurveToChartData(
  equityCurve: EquityCurveNewData,
  tradingLogs: TradingLog[] = [],
  timeframe: string = '1m'
): {
  data: TradingDataPoint[];
  metrics: TradingMetrics;
  candlestickData: TradingCandlestickPoint[];
  initialBalance: number;
  baselinePrice?: number;
} {
  // Validate input
  if (!equityCurve || !equityCurve.data_points || !Array.isArray(equityCurve.data_points)) {
    console.error('Invalid equity curve data:', equityCurve);
    return {
      data: [],
      metrics: {
        totalROI: 0,
        totalTrades: 0,
      },
      candlestickData: [],
      initialBalance: 0,
    };
  }

  // Create a map of events by exact timestamp for precise lookup
  const eventsByTimestamp = new Map<string, TradingEvent[]>();
  const logTypeToEventType: Record<string, TradingEventType> = {
    long: 'buy',
    short: 'sell',
    stop_loss: 'stop_loss',
    deposit: 'deposit',
    withdraw: 'withdraw',
  };

  tradingLogs.forEach(log => {
    const mappedType = logTypeToEventType[log.type as keyof typeof logTypeToEventType];
    if (!mappedType) {
      return;
    }

    const parsedPrice = parseFloat(log.info?.price?.toString() || '');
    const price = Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) / 100 : undefined;

    const nextEvent: TradingEvent = {
      type: mappedType,
      description: log.message,
      price,
      timestamp: log.event_time,
    };
    const existingEvents = eventsByTimestamp.get(log.event_time) ?? [];
    existingEvents.push(nextEvent);
    eventsByTimestamp.set(log.event_time, existingEvents);
  });

  if (equityCurve.data_points.length === 0) {
    return {
      data: [],
      metrics: {
        totalROI: 0,
        totalTrades: 0,
      },
      candlestickData: [],
      initialBalance: 0,
    };
  }

  // ROI baseline comes directly from the backend-provided initial funds.
  const initialAssetsValue: number = equityCurve.initial_funds ?? 0;
  if (!Number.isFinite(initialAssetsValue) || initialAssetsValue <= 0) {
    throw new Error('Equity curve is missing a valid initial_funds value.');
  }
  const baselinePrice =
    typeof equityCurve.baseline_price === 'number' && Number.isFinite(equityCurve.baseline_price)
      ? equityCurve.baseline_price
      : undefined;

  // Transform equity curve data points to chart data
  const candlestickData: TradingCandlestickPoint[] = [];

  let lastEquityValue = initialAssetsValue;
  let lastBenchmarkReturn = 0;
  let lastStockPrice: number | undefined = baselinePrice;
  let lastPosition = 0;

  const chartData: TradingDataPoint[] = [];

  for (const point of equityCurve.data_points) {
    const timestampNum = new Date(point.timestamp).getTime();
    if (!Number.isFinite(timestampNum)) {
      // Skip malformed timestamps entirely
      continue;
    }

    const date = point.timestamp.split('T')[0];

    const equityValue = typeof point.equity === 'number' && Number.isFinite(point.equity)
      ? point.equity
      : null;
    if (equityValue !== null) {
      lastEquityValue = equityValue;
    }

    const benchmarkReturnValue = typeof point.benchmark_return === 'number' && Number.isFinite(point.benchmark_return)
      ? point.benchmark_return
      : null;
    if (benchmarkReturnValue !== null) {
      lastBenchmarkReturn = benchmarkReturnValue;
    }

    const stockPriceValue = typeof point.stock_price === 'number' && Number.isFinite(point.stock_price)
      ? point.stock_price
      : null;
    if (stockPriceValue !== null) {
      lastStockPrice = stockPriceValue;
    }

    const stockBalanceValue = typeof point.stock_balance === 'number' && Number.isFinite(point.stock_balance)
      ? point.stock_balance
      : null;
    if (stockBalanceValue !== null) {
      lastPosition = stockBalanceValue;
    }

    const roiRaw = initialAssetsValue > 0
      ? ((lastEquityValue - initialAssetsValue) / initialAssetsValue) * 100
      : 0;
    const roi = Math.round(roiRaw * 100) / 100;
    const netValue = Math.round(lastEquityValue * 100) / 100;

    const benchmarkPercentage = Math.round((lastBenchmarkReturn * 100) * 100) / 100;
    const benchmarkPrice =
      typeof lastStockPrice === 'number' && Number.isFinite(lastStockPrice)
        ? Math.round(lastStockPrice * 100) / 100
        : undefined;

    const normalizedPosition =
      typeof lastPosition === 'number' && Number.isFinite(lastPosition)
        ? Math.round(lastPosition * 10000) / 10000
        : undefined;

    const transformedPoint: TradingDataPoint = {
      date,
      timestamp: point.timestamp,
      timestampNum,
      netValue,
      roi,
      benchmark: benchmarkPercentage,
      benchmarkPrice,
      position: normalizedPosition,
      events: undefined, // Will be assigned later
      isPartial:
        equityValue === null || stockPriceValue === null || benchmarkReturnValue === null,
    };

    const fallbackPriceForCandle =
      typeof lastStockPrice === 'number' && Number.isFinite(lastStockPrice)
        ? lastStockPrice
        : undefined;
    const candle = normalizeOhlcv(point.timestamp, point.ohlcv ?? undefined, fallbackPriceForCandle);
    if (candle) {
      candlestickData.push(candle);
    }

    chartData.push(transformedPoint);
  }

  // Calculate the time window based on the timeframe - use half the interval
  const timeframeMs = timeframeToMilliseconds(timeframe);
  const maxTimeWindow = Math.max(timeframeMs / 2, 60 * 1000); // At least 1 minute window
  let minChartTime = Infinity;
  let maxChartTime = -Infinity;
  for (const point of chartData) {
    const pointTime = new Date(point.timestamp).getTime();
    if (!Number.isFinite(pointTime)) {
      continue;
    }
    minChartTime = Math.min(minChartTime, pointTime);
    maxChartTime = Math.max(maxChartTime, pointTime);
  }

  // Now assign each trading event to its nearest chart data point
  for (const [eventTime, events] of eventsByTimestamp) {
    const eventTimestamp = new Date(eventTime).getTime();
    if (!Number.isFinite(eventTimestamp)) {
      continue;
    }
    if (eventTimestamp < minChartTime || eventTimestamp > maxChartTime) {
      continue;
    }
    let closestPoint: TradingDataPoint | undefined;
    let closestTimeDiff = Infinity;
    let closestIndex = -1;
    let closestWindowPoint: TradingDataPoint | undefined;
    let closestWindowDiff = Infinity;
    let closestWindowIndex = -1;

    // Find the closest equity curve point to this event timestamp
    chartData.forEach((point, index) => {
      const pointTimestamp = new Date(point.timestamp).getTime();
      const timeDiff = Math.abs(eventTimestamp - pointTimestamp);

      // Only consider points within reasonable time window (dynamic based on timeframe)
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestPoint = point;
        closestIndex = index;
      }

      if (timeDiff <= maxTimeWindow && timeDiff < closestWindowDiff) {
        closestWindowDiff = timeDiff;
        closestWindowPoint = point;
        closestWindowIndex = index;
      }
    });

    const targetIndex = closestWindowIndex >= 0 ? closestWindowIndex : closestIndex;
    const targetPoint = closestWindowPoint ?? closestPoint;

    // Assign all events for this timestamp to the closest point if found
    if (targetPoint && targetIndex >= 0) {
      const existingEvents = chartData[targetIndex].events ?? [];
      chartData[targetIndex].events = existingEvents.concat(events);
    }
  }

  // Calculate metrics using the new chart data
  const metrics = calculateMetricsFromNewData(chartData, tradingLogs, initialAssetsValue);

  return { data: chartData, metrics, candlestickData, initialBalance: initialAssetsValue, baselinePrice };
}

function normalizeOhlcv(
  timestamp: string,
  ohlcv: EquityCurveOhlcv | undefined,
  fallbackPrice: number | undefined
): TradingCandlestickPoint | null {
  const timestampNum = new Date(timestamp).getTime();
  if (!Number.isFinite(timestampNum)) {
    return null;
  }

  if (ohlcv) {
    return {
      timestamp,
      timestampNum,
      open: ohlcv.open,
      high: ohlcv.high,
      low: ohlcv.low,
      close: ohlcv.close,
      volume: ohlcv.volume,
      final: ohlcv.final,
      coverage: ohlcv.coverage,
    };
  }

  if (typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice)) {
    const price = Math.round(fallbackPrice * 100) / 100;
    return {
      timestamp,
      timestampNum,
      open: price,
      high: price,
      low: price,
      close: price,
    };
  }

  return null;
}

function calculateMetricsFromNewData(
  chartData: TradingDataPoint[],
  tradingLogs: TradingLog[],
  initialEquity: number
): TradingMetrics {
  if (chartData.length === 0) {
    return {
      totalROI: 0,
      totalTrades: 0,
    };
  }

  const finalValue = chartData[chartData.length - 1].netValue;
  const totalROI = initialEquity > 0 ? ((finalValue - initialEquity) / initialEquity) * 100 : 0;

  // Calculate win rate from trading logs
  const tradeLogs = tradingLogs.filter(log =>
    log.type === 'long' || log.type === 'short' || log.type === 'stop_loss'
  );
  const totalTrades = tradeLogs.length;

  return {
    totalROI: Math.round(totalROI * 100) / 100,
    totalTrades,
  };
}

export function transformEquityCurveToChartData(
  equityCurve: EquityCurveData,
  tradingLogs: TradingLog[]
): { data: TradingDataPoint[]; metrics: TradingMetrics } {
  // Create a map of events by exact timestamp for precise lookup
  const eventsByTimestamp = new Map<string, TradingEvent[]>();
  tradingLogs.forEach(log => {
    if (log.type === 'long' || log.type === 'short') {
      const parsedPrice = parseFloat(log.info?.price?.toString() || '');
      const price = Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) / 100 : undefined;

      const nextEvent: TradingEvent = {
        type: log.type === 'long' ? 'buy' : 'sell',
        description: log.message,
        price,
        timestamp: log.event_time,
      };
      const existingEvents = eventsByTimestamp.get(log.event_time) ?? [];
      existingEvents.push(nextEvent);
      eventsByTimestamp.set(log.event_time, existingEvents);
    }
  });

  // First, create all chart data points without events
  const chartData: TradingDataPoint[] = equityCurve.points.map((point, index) => {
    const date = point.time.split('T')[0];

    // Calculate absolute value using the API formula: initial_value * (1 + return)
    const absoluteValue = equityCurve.initial_value * (1 + point.return);
    // Convert return and benchmark from decimal to percentage for display
    const roiPercentage = point.return * 100;
    const benchmarkPercentage = point.benchmark * 100;

    // Calculate benchmark price from initial market price and benchmark return
    const benchmarkPrice = equityCurve.initial_market_price * (1 + point.benchmark);

    // Debug: Log first few price calculations
    if (index < 3) {
      console.log(`Point ${index}: initial_price=${equityCurve.initial_market_price}, benchmark=${point.benchmark}, calculated_price=${benchmarkPrice}`);
    }

    // Extract ETH position from breakdown if available
    let ethPosition = 0;
    if (point.breakdown) {
      const ethBreakdown = point.breakdown.find(item => item.symbol === 'ETH');
      if (ethBreakdown) {
        ethPosition = ethBreakdown.balance;
      }
    }

    return {
      date,
      timestamp: point.time,
      timestampNum: new Date(point.time).getTime(),
      netValue: Math.round(absoluteValue * 100) / 100, // Keep for tooltip
      roi: Math.round(roiPercentage * 100) / 100, // Primary chart value
      benchmark: Math.round(benchmarkPercentage * 100) / 100, // Benchmark for comparison
      benchmarkPrice: Math.round(benchmarkPrice * 100) / 100, // ETH price from benchmark
      position: Math.round(ethPosition * 10000) / 10000, // ETH position with 4 decimal precision
      events: undefined, // Will be assigned later
    };
  });

  let minChartTime = Infinity;
  let maxChartTime = -Infinity;
  for (const point of chartData) {
    const pointTime = new Date(point.timestamp).getTime();
    if (!Number.isFinite(pointTime)) {
      continue;
    }
    minChartTime = Math.min(minChartTime, pointTime);
    maxChartTime = Math.max(maxChartTime, pointTime);
  }

  // Now assign each trading event to its nearest equity curve point
  for (const [eventTime, events] of eventsByTimestamp) {
    const eventTimestamp = new Date(eventTime).getTime();
    if (!Number.isFinite(eventTimestamp)) {
      continue;
    }
    if (eventTimestamp < minChartTime || eventTimestamp > maxChartTime) {
      continue;
    }
    let closestPoint: TradingDataPoint | undefined;
    let closestTimeDiff = Infinity;
    let closestIndex = -1;
    let closestWindowPoint: TradingDataPoint | undefined;
    let closestWindowDiff = Infinity;
    let closestWindowIndex = -1;

    // Find the closest equity curve point to this event
    chartData.forEach((point, index) => {
      const pointTimestamp = new Date(point.timestamp).getTime();
      const timeDiff = Math.abs(eventTimestamp - pointTimestamp);

      // Only consider points within the time window (1 minute)
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestPoint = point;
        closestIndex = index;
      }

      if (timeDiff <= 1 * 60 * 1000 && timeDiff < closestWindowDiff) {
        closestWindowDiff = timeDiff;
        closestWindowPoint = point;
        closestWindowIndex = index;
      }
    });

    // Assign the event to the closest point if found
    const targetIndex = closestWindowIndex >= 0 ? closestWindowIndex : closestIndex;
    const targetPoint = closestWindowPoint ?? closestPoint;

    if (targetPoint && targetIndex >= 0) {
      const existingEvents = chartData[targetIndex].events ?? [];
      chartData[targetIndex].events = existingEvents.concat(events);
    }
  }

  // Calculate metrics using the equity curve data
  const metrics = calculateMetrics(chartData, tradingLogs, equityCurve.initial_value);

  return { data: chartData, metrics };
}

export function transformTransactionsToChartData(
  transactions: Transaction[],
  tradingLogs: TradingLog[]
): { data: TradingDataPoint[]; metrics: TradingMetrics } {
  // Sort transactions by event_time
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  );

  // Create a map of events by exact timestamp for precise lookup
  const eventsByTimestamp = new Map<string, TradingEvent[]>();
  tradingLogs.forEach(log => {
    if (log.type === 'long' || log.type === 'short') {
      const parsedPrice = parseFloat(log.info?.price?.toString() || '');
      const price = Number.isFinite(parsedPrice) ? Math.round(parsedPrice * 100) / 100 : undefined;

      const nextEvent: TradingEvent = {
        type: log.type === 'long' ? 'buy' : 'sell',
        description: log.message,
        price,
        timestamp: log.event_time,
      };
      const existingEvents = eventsByTimestamp.get(log.event_time) ?? [];
      existingEvents.push(nextEvent);
      eventsByTimestamp.set(log.event_time, existingEvents);
    }
  });

  // Group transactions by date and sub_account_id to track balances
  const accountBalances = new Map<string, Map<string, number>>(); // date -> { sub_account_id -> balance }

  // Process transactions to build daily assets snapshots
  sortedTransactions.forEach(transaction => {
    const date = transaction.event_time.split('T')[0];
    const subAccountId = transaction.sub_account_id;
    const balance = parseFloat(transaction.closing_balance);

    if (!accountBalances.has(date)) {
      accountBalances.set(date, new Map());
    }
    
    // Update the balance for this sub-account on this date
    accountBalances.get(date)!.set(subAccountId, balance);
  });

  // Calculate assets value progression using a simpler approach
  // Based on the API data structure, let's calculate total assets value by combining USDT and ETH values

  const chartData: TradingDataPoint[] = [];

  // Get unique dates from transactions
  const uniqueDates = [...new Set(sortedTransactions.map(tx => tx.event_time.split('T')[0]))].sort();

  const initialAssetsValue = 10000; // Standard starting amount

  uniqueDates.forEach(date => {
    // Get all transactions for this date
    const dayTransactions = sortedTransactions.filter(tx => tx.event_time.startsWith(date));

    if (dayTransactions.length === 0) return;

    // Calculate total assets value for this date
    // We need to get both USDT balance and ETH balance, then convert ETH to USDT value

    let usdtBalance = 0;
    let ethBalance = 0;
    let ethPrice = 0;
    let latestTimestamp = '';

    // Process all transactions for this date to get final balances
    dayTransactions.forEach(tx => {
      const price = parseFloat(tx.price);
      const balance = parseFloat(tx.closing_balance);

      // Track the latest timestamp for this date
      if (tx.event_time > latestTimestamp) {
        latestTimestamp = tx.event_time;
      }

      if (tx.quote_symbol === 'USDT') {
        // This transaction affected USDT balance
        if ((tx.direction === 'credit' && tx.reason === 'short') ||
            (tx.direction === 'debit' && tx.reason === 'long')) {
          usdtBalance = balance; // USDT account balance
          ethPrice = price; // ETH price for conversion
        }
        // This transaction affected ETH balance
        if ((tx.direction === 'credit' && tx.reason === 'long') ||
            (tx.direction === 'debit' && tx.reason === 'short')) {
          ethBalance = balance; // ETH account balance
          ethPrice = price; // ETH price for conversion
        }
      }
    });

    // Calculate total assets value: USDT + (ETH * ETH_Price)
    const ethValueInUSDT = ethBalance * ethPrice;
    const totalAssetsValue = usdtBalance + ethValueInUSDT;

    const roi = ((totalAssetsValue - initialAssetsValue) / initialAssetsValue) * 100;

    chartData.push({
      date,
      timestamp: latestTimestamp,
      timestampNum: new Date(latestTimestamp).getTime(),
      netValue: Math.round(totalAssetsValue * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      benchmarkPrice: ethPrice, // Use current ETH price from transactions
      position: Math.round(ethBalance * 10000) / 10000, // ETH position with 4 decimal precision
      events: undefined, // Will be assigned later
    });
  });

  // Now assign each trading event to its nearest chart data point
  for (const [eventTime, events] of eventsByTimestamp) {
    const eventTimestamp = new Date(eventTime).getTime();
    let closestPoint: TradingDataPoint | undefined;
    let closestTimeDiff = Infinity;
    let closestIndex = -1;
    let closestWindowPoint: TradingDataPoint | undefined;
    let closestWindowDiff = Infinity;
    let closestWindowIndex = -1;

    // Find the closest chart data point to this event
    chartData.forEach((point, index) => {
      const pointTimestamp = new Date(point.timestamp).getTime();
      const timeDiff = Math.abs(eventTimestamp - pointTimestamp);

      // Only consider points within the time window (5 minutes)
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestPoint = point;
        closestIndex = index;
      }

      if (timeDiff <= 5 * 60 * 1000 && timeDiff < closestWindowDiff) {
        closestWindowDiff = timeDiff;
        closestWindowPoint = point;
        closestWindowIndex = index;
      }
    });

    // Assign the event to the closest point if found
    const targetIndex = closestWindowIndex >= 0 ? closestWindowIndex : closestIndex;
    const targetPoint = closestWindowPoint ?? closestPoint;

    if (targetPoint && targetIndex >= 0) {
      const existingEvents = chartData[targetIndex].events ?? [];
      chartData[targetIndex].events = existingEvents.concat(events);
    }
  }

  // Calculate metrics
  const metrics = calculateMetrics(chartData, tradingLogs, initialAssetsValue);

  return { data: chartData, metrics };
}

function calculateMetrics(
  chartData: TradingDataPoint[],
  tradingLogs: TradingLog[],
  initialBalance: number
): TradingMetrics {
  if (chartData.length === 0) {
    return {
      totalROI: 0,
      totalTrades: 0,
    };
  }

  const finalValue = chartData[chartData.length - 1].netValue;
  const totalROI = ((finalValue - initialBalance) / initialBalance) * 100;

  // Calculate win rate from trading logs
  const tradeLogs = tradingLogs.filter(log => 
    log.type === 'long' || log.type === 'short' || log.type === 'stop_loss'
  );
  const totalTrades = tradeLogs.length;

  return {
    totalROI: Math.round(totalROI * 100) / 100,
    totalTrades,
  };
}
