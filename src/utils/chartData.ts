import type { Transaction, TradingLog } from './api';

export interface TradingDataPoint {
  date: string;
  timestamp: string; // Exact event time (ISO string)
  netValue: number;
  roi: number;
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

export function transformTransactionsToChartData(
  transactions: Transaction[],
  tradingLogs: TradingLog[]
): { data: TradingDataPoint[]; metrics: TradingMetrics } {
  // Sort transactions by event_time
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  );

  // Create a map of events by date for quick lookup
  const eventsByDate = new Map<string, TradingDataPoint['event']>();
  tradingLogs.forEach(log => {
    const date = log.event_time.split('T')[0];
    if (log.type === 'long' || log.type === 'short') {
      eventsByDate.set(date, {
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
    const event = eventsByDate.get(date);

    chartData.push({
      date,
      timestamp: latestTimestamp,
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

  // For win rate calculation, we'll use a simplified approach
  // In a real implementation, you'd match buy/sell pairs to determine wins/losses
  const profitableTrades = tradeLogs.filter(log => {
    // This is a simplified heuristic - in reality you'd need to track position opens/closes
    return log.message.toLowerCase().includes('profit') || 
           (log.info.confidence && log.info.confidence > 0.6);
  });
  const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades) * 100 : 0;

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