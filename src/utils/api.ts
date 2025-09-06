const API_BASE_URL = 'https://backend.dev.tiris.ai/v1';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVkMDk1MTktNzM1ZC00YzA3LTgyZjctNjU1NjA4MDBhNWNmIiwidXNlcm5hbWUiOiJhbGV4IiwiZW1haWwiOiJhbGV4QHRpcmlzLmxvY2FsIiwicm9sZSI6InVzZXIiLCJpc3MiOiJ0aXJpcy1iYWNrZW5kIiwic3ViIjoiZWVkMDk1MTktNzM1ZC00YzA3LTgyZjctNjU1NjA4MDBhNWNmIiwiZXhwIjoxNzg4NDY0MjUwLCJuYmYiOjE3NTY5MjgyNTAsImlhdCI6MTc1NjkyODI1MH0.WdfXWnkc1q6FBNMaPeM7F1Zg9f7kY_ChX68smuL7TEY';

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
  value: number;
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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
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
    .then(response => response.tradings);
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
  return apiRequest<{ trading_logs: TradingLog[] }>(`/trading-logs?trading_id=${tradingId}&limit=1000`)
    .then(response => response.trading_logs);
}

export async function getEquityCurve(tradingId: string, breakdown: boolean = false): Promise<EquityCurveData> {
  const params = new URLSearchParams();
  if (breakdown) {
    params.append('breakdown', 'true');
  }
  
  const endpoint = `/tradings/${tradingId}/equity-curve${params.toString() ? `?${params.toString()}` : ''}`;
  return apiRequest<EquityCurveData>(endpoint);
}

