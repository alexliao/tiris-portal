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

export interface ExchangeBinding {
  id: string;
  name: string;
  exchange: string;
  type: 'private' | 'public';
  status: string;
  created_at: string;
  info: {
    description?: string;
    testnet?: boolean;
    permissions?: string[];
    [key: string]: any;
  };
}

export interface CreateTradingRequest {
  name: string;
  exchange_binding_id: string;
  type: 'backtest' | 'simulation' | 'real';
  info: {
    strategy?: string;
    risk_level?: string;
    description?: string;
    [key: string]: any;
  };
}

export async function getPublicExchangeBindings(): Promise<ExchangeBinding[]> {
  const response = await apiRequest<ExchangeBinding[]>('/exchange-bindings/public');
  return response;
}

export async function getExchangeBindings(): Promise<ExchangeBinding[]> {
  const response = await apiRequest<ExchangeBinding[]>('/exchange-bindings');
  return response;
}

export async function createTrading(request: CreateTradingRequest): Promise<Trading> {
  return apiRequest<Trading>('/tradings', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Interface for creating sub-account
export interface CreateSubAccountRequest {
  name: string;
  symbol: string;
  balance: string;
  trading_id: string;
  info?: { [key: string]: any };
}

// Create a new sub-account
export async function createSubAccount(request: CreateSubAccountRequest): Promise<SubAccount> {
  return apiRequest<SubAccount>('/sub-accounts', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Interface for creating trading log
export interface CreateTradingLogRequest {
  trading_id: string;
  type: string;
  source: string;
  message: string;
  sub_account_id?: string;
  transaction_id?: string;
  event_time?: string;
  info?: { [key: string]: any };
}

// Create a new trading log
export async function createTradingLog(request: CreateTradingLogRequest): Promise<void> {
  return apiRequest<void>('/trading-logs', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Complete simulation trading creation according to business logic
export async function createSimulationTrading(request: CreateTradingRequest): Promise<Trading> {
  console.log('Creating simulation trading with business logic steps...');

  try {
    // Step 1: Create the trading
    console.log('Step 1: Creating trading...');
    const trading = await createTrading(request);
    console.log('Trading created:', trading.id);

    // Step 2: Create two sub-accounts (ETH for stock, USDT for balance)
    console.log('Step 2: Creating sub-accounts...');

    // Create ETH sub-account
    const ethSubAccount = await createSubAccount({
      name: 'ETH Stock Account',
      symbol: 'ETH',
      balance: '0',
      trading_id: trading.id,
      info: {
        description: 'Sub-account for ETH stock holdings',
        account_type: 'stock'
      }
    });
    console.log('ETH sub-account created:', ethSubAccount.id);

    // Create USDT sub-account
    const usdtSubAccount = await createSubAccount({
      name: 'USDT Balance Account',
      symbol: 'USDT',
      balance: '0', // Balance will be set by deposit trading log
      trading_id: trading.id,
      info: {
        description: 'Sub-account for USDT balance',
        account_type: 'balance'
      }
    });
    console.log('USDT sub-account created:', usdtSubAccount.id);

    // Step 3: Create trading log for initial deposit of 10,000 USDT
    console.log('Step 3: Creating initial deposit trading log...');
    await createTradingLog({
      trading_id: trading.id,
      type: 'deposit',
      source: 'manual',
      message: 'Initial deposit for simulation trading',
      event_time: new Date().toISOString(),
      info: {
        account_id: usdtSubAccount.id,
        amount: 10000.00,
        currency: 'USDT'
      }
    });
    console.log('Initial deposit trading log created');

    // Step 4: Sub-account IDs are now available and linked via trading_id
    // No need to update trading info since sub-accounts can be retrieved by trading_id
    console.log('Step 4: Simulation trading creation completed');
    console.log('Sub-account IDs:', {
      eth_account_id: ethSubAccount.id,
      usdt_account_id: usdtSubAccount.id
    });

    return trading;

  } catch (error) {
    console.error('Failed to create simulation trading:', error);
    // Note: In case of failure, the created resources might need cleanup
    // The backend should handle this or we might need to implement cleanup logic
    throw error;
  }
}

// Interface for sub-account
interface SubAccount {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  trading_id: string;
  created_at: string;
  info: { [key: string]: any };
}

// Get sub-accounts for a trading
export async function getSubAccountsByTrading(tradingId: string): Promise<SubAccount[]> {
  const response = await apiRequest<{ sub_accounts: SubAccount[] }>(`/sub-accounts?trading_id=${tradingId}`);
  return response.sub_accounts || [];
}

// Delete individual sub-account
export async function deleteSubAccount(subAccountId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/sub-accounts/${subAccountId}`, {
    method: 'DELETE',
  });
}

export async function deleteTrading(tradingId: string, tradingType: string): Promise<void> {
  console.log('deleteTrading called with tradingId:', tradingId, 'type:', tradingType);

  try {
    // Backend now handles all cascade deletion logic based on trading type:
    // - Hard delete (backtest/simulation): Backend deletes all dependent records in atomic transaction
    // - Soft delete (real trading): Backend marks as deleted while preserving audit trail
    const result = await apiRequest<{ message: string }>(`/tradings/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('deleteTrading API response:', result);

  } catch (error) {
    console.error('deleteTrading error:', error);
    throw error;
  }
}

