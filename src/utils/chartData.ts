import type { Transaction, TradingLog, EquityCurveData } from './api';

export interface TradingDataPoint {
  date: string;
  timestamp: string; // Exact event time (ISO string)
  timestampNum: number; // Numeric timestamp for chart X-axis scale
  netValue: number; // Keep for tooltip display
  roi: number; // Primary chart value - return percentage
  benchmark?: number; // Benchmark return percentage
  event?: {
    type: 'buy' | 'sell';
    description: string;
  };
}

export interface TradingMetrics {
  totalROI: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
}

// Helper function to find the closest event within a reasonable time window
function findClosestEvent(
  targetTime: string, 
  eventsByTimestamp: Map<string, TradingDataPoint['event']>
): TradingDataPoint['event'] | undefined {
  const targetTimestamp = new Date(targetTime).getTime();
  const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  let closestEvent: TradingDataPoint['event'] | undefined;
  let closestTimeDiff = Infinity;
  
  for (const [eventTime, event] of eventsByTimestamp) {
    const eventTimestamp = new Date(eventTime).getTime();
    const timeDiff = Math.abs(targetTimestamp - eventTimestamp);
    
    // Only consider events within the time window
    if (timeDiff <= timeWindow && timeDiff < closestTimeDiff) {
      closestTimeDiff = timeDiff;
      closestEvent = event;
    }
  }
  
  return closestEvent;
}

export function transformEquityCurveToChartData(
  equityCurve: EquityCurveData,
  tradingLogs: TradingLog[]
): { data: TradingDataPoint[]; metrics: TradingMetrics } {
  // Create a map of events by exact timestamp for precise lookup
  const eventsByTimestamp = new Map<string, TradingDataPoint['event']>();
  tradingLogs.forEach(log => {
    if (log.type === 'long' || log.type === 'short') {
      eventsByTimestamp.set(log.event_time, {
        type: log.type === 'long' ? 'buy' : 'sell',
        description: log.message,
      });
    }
  });

  // Transform equity curve points to chart data
  const chartData: TradingDataPoint[] = equityCurve.points.map(point => {
    const date = point.time.split('T')[0];
    // Find exact matching event by timestamp, or closest event within reasonable time window
    const event = eventsByTimestamp.get(point.time) || findClosestEvent(point.time, eventsByTimestamp);
    
    // Calculate absolute value using the API formula: initial_value * (1 + return)
    const absoluteValue = equityCurve.initial_value * (1 + point.return);
    // Convert return and benchmark from decimal to percentage for display
    const roiPercentage = point.return * 100;
    const benchmarkPercentage = point.benchmark * 100;

    return {
      date,
      timestamp: point.time,
      timestampNum: new Date(point.time).getTime(),
      netValue: Math.round(absoluteValue * 100) / 100, // Keep for tooltip
      roi: Math.round(roiPercentage * 100) / 100, // Primary chart value
      benchmark: Math.round(benchmarkPercentage * 100) / 100, // Benchmark for comparison
      event,
    };
  });

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
  const eventsByTimestamp = new Map<string, TradingDataPoint['event']>();
  tradingLogs.forEach(log => {
    if (log.type === 'long' || log.type === 'short') {
      eventsByTimestamp.set(log.event_time, {
        type: log.type === 'long' ? 'buy' : 'sell',
        description: log.message,
      });
    }
  });

  // Group transactions by date and sub_account_id to track balances
  const accountBalances = new Map<string, Map<string, number>>(); // date -> { sub_account_id -> balance }

  // Process transactions to build daily portfolio snapshots
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

  // Calculate portfolio value progression using a simpler approach
  // Based on the API data structure, let's calculate total portfolio value by combining USDT and ETH values
  
  const chartData: TradingDataPoint[] = [];
  
  // Get unique dates from transactions
  const uniqueDates = [...new Set(sortedTransactions.map(tx => tx.event_time.split('T')[0]))].sort();
  
  let initialPortfolioValue = 10000; // Standard starting amount
  
  uniqueDates.forEach(date => {
    // Get all transactions for this date
    const dayTransactions = sortedTransactions.filter(tx => tx.event_time.startsWith(date));
    
    if (dayTransactions.length === 0) return;
    
    // Calculate total portfolio value for this date
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
    
    // Calculate total portfolio value: USDT + (ETH * ETH_Price)
    const ethValueInUSDT = ethBalance * ethPrice;
    const totalPortfolioValue = usdtBalance + ethValueInUSDT;
    
    const roi = ((totalPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;
    const event = eventsByTimestamp.get(latestTimestamp) || findClosestEvent(latestTimestamp, eventsByTimestamp);

    chartData.push({
      date,
      timestamp: latestTimestamp,
      timestampNum: new Date(latestTimestamp).getTime(),
      netValue: Math.round(totalPortfolioValue * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      event,
    });
  });
  

  // Calculate metrics
  const metrics = calculateMetrics(chartData, tradingLogs, initialPortfolioValue);

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
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
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

  // Calculate win rate by matching long/short trading pairs
  let winRate = 0;
  if (totalTrades > 0) {
    const longTrades = tradingLogs.filter(log => log.type === 'long');
    const shortTrades = tradingLogs.filter(log => log.type === 'short');
    
    let completedTrades = 0;
    let winningTrades = 0;
    
    // Match long positions with their corresponding short (exit) positions
    for (const longTrade of longTrades) {
      // Find the next short trade after this long trade (chronologically)
      const longTime = new Date(longTrade.event_time).getTime();
      const correspondingShort = shortTrades.find(shortTrade => {
        const shortTime = new Date(shortTrade.event_time).getTime();
        return shortTime > longTime;
      });
      
      if (correspondingShort && longTrade.info && correspondingShort.info) {
        const entryPrice = parseFloat(longTrade.info.price?.toString() || '0');
        const exitPrice = parseFloat(correspondingShort.info.price?.toString() || '0');
        
        if (entryPrice > 0 && exitPrice > 0) {
          completedTrades++;
          
          // For long positions: profit if exit price > entry price
          if (exitPrice > entryPrice) {
            winningTrades++;
          }
        }
      }
    }
    
    // Calculate win rate from completed trades
    winRate = completedTrades > 0 ? (winningTrades / completedTrades) * 100 : 0;
  }

  // Calculate max drawdown
  let peak = initialBalance;
  let maxDrawdown = 0;
  chartData.forEach(point => {
    if (point.netValue > peak) {
      peak = point.netValue;
    }
    const drawdown = ((peak - point.netValue) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Simplified Sharpe ratio calculation
  // In reality, you'd need risk-free rate and calculate volatility properly
  const dailyReturns = chartData.slice(1).map((point, index) => {
    const prevValue = chartData[index].netValue;
    return (point.netValue - prevValue) / prevValue;
  });
  
  const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const volatility = Math.sqrt(
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
  );
  const sharpeRatio = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(252) : 0; // Annualized

  return {
    totalROI: Math.round(totalROI * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: -Math.round(maxDrawdown * 100) / 100, // Negative for display
    totalTrades,
  };
}