const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend.dev.tiris.ai/v1';

// Get access token from localStorage
const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details: string;
  };
  metadata?: {
    timestamp: string;
    trace_id: string;
  };
}

export interface Trading {
  id: string;
  name: string;
  exchange_binding_id: string;
  type: string;
  status: string;
  created_at: string;
  info: {
    strategy?: string;
    risk_level?: string;
    [key: string]: any;
  };
}

export interface Transaction {
  id: string;
  timestamp: string;
  event_time: string;
  direction: 'credit' | 'debit';
  reason: string;
  amount: string;
  closing_balance: string;
  price: string;
  quote_symbol: string;
  sub_account_id: string;
  trading_id: string;
  info: {
    trade_id?: string;
    symbol?: string;
    order_type?: string;
    side?: string;
    [key: string]: any;
  };
}

export interface TradingLog {
  id: string;
  timestamp: string;
  event_time: string;
  type: string;
  source: string;
  message: string;
  transaction_id?: string;
  sub_account_id?: string;
  trading_id: string;
  info: {
    order_id?: string;
    symbol?: string;
    price?: string;
    quantity?: string;
    strategy?: string;
    confidence?: number;
    [key: string]: any;
  };
}

export interface EquityCurvePoint {
  time: string;
  return: number;
  benchmark: number;
  breakdown?: Array<{
    symbol: string;
    balance: number;
    price: number;
    value: number;
  }>;
}

export interface EquityCurveData {
  trading_id: string;
  start_date: string;
  end_date: string;
  initial_value: number;
  end_value: number;
  initial_market_price: number;
  end_market_price: number;
  points: EquityCurvePoint[];
}

export class ApiError extends Error {
  public code: string;
  public details?: string;
  public status?: number;

  constructor(
    code: string,
    message: string,
    details?: string,
    status?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      data.error?.details,
      response.status
    );
  }

  return data.data;
}

export async function getTradings(): Promise<Trading[]> {
  return apiRequest<{ tradings: Trading[] }>('/tradings')
    .then(response => response.tradings || []);
}

export async function getLatestBacktestTrading(): Promise<Trading | null> {
  const tradings = await getTradings();
  const backtestTradings = tradings.filter(t => t.type === 'backtest');
  
  if (backtestTradings.length === 0) {
    return null;
  }
  
  // Try to find a backtest with actual transaction data
  // Check each backtest trading to find one with data
  for (const trading of backtestTradings.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )) {
    try {
      const transactions = await getTransactions(trading.id);
      if (transactions.length > 0) {
        console.log(`Found backtest with data: ${trading.id} (${transactions.length} transactions)`);
        return trading;
      }
    } catch (error) {
      console.warn(`Failed to check transactions for trading ${trading.id}:`, error);
      continue;
    }
  }
  
  // If no backtest has transaction data, return the latest one anyway
  console.warn('No backtest trading found with transaction data, using latest');
  return backtestTradings.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}

export async function getTransactions(tradingId: string): Promise<Transaction[]> {
  return apiRequest<{ transactions: Transaction[] }>(`/transactions?trading_id=${tradingId}&limit=1000`)
    .then(response => response.transactions);
}

export async function getTradingLogs(tradingId: string): Promise<TradingLog[]> {
  const allLogs: TradingLog[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const response = await apiRequest<{ trading_logs: TradingLog[] }>(`/trading-logs/trading/${tradingId}?limit=${limit}&offset=${offset}`);
    const logs = response.trading_logs;
    
    if (logs.length === 0) {
      break; // No more logs to fetch
    }
    
    allLogs.push(...logs);
    
    if (logs.length < limit) {
      break; // Last page, no more data
    }
    
    offset += limit;
  }
  
  return allLogs;
}

export async function getEquityCurve(
  tradingId: string, 
  breakdown: boolean = false,
  benchmarkSymbol?: string
): Promise<EquityCurveData> {
  const params = new URLSearchParams();
  if (breakdown) {
    params.append('breakdown', 'true');
  }
  if (benchmarkSymbol) {
    params.append('benchmark_symbol', benchmarkSymbol);
  }
  
  const endpoint = `/tradings/${tradingId}/equity-curve${params.toString() ? `?${params.toString()}` : ''}`;
  return apiRequest<EquityCurveData>(endpoint);
}

