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

// Helper function to delete all sub-accounts for a trading
export async function deleteSubAccountsByTrading(tradingId: string): Promise<void> {
  console.log('Deleting sub-accounts for trading:', tradingId);

  const subAccounts = await getSubAccountsByTrading(tradingId);
  console.log(`Found ${subAccounts.length} sub-accounts to delete`);

  const deletionErrors: string[] = [];

  for (const subAccount of subAccounts) {
    console.log(`Deleting sub-account: ${subAccount.id} (${subAccount.name})`);
    try {
      await deleteSubAccount(subAccount.id);
      console.log(`Successfully deleted sub-account: ${subAccount.id}`);
    } catch (error) {
      console.error(`Failed to delete sub-account ${subAccount.id}:`, error);
      deletionErrors.push(`${subAccount.id}: ${error}`);
    }
  }

  // If there were any deletion errors, throw to prevent proceeding
  if (deletionErrors.length > 0) {
    throw new Error(`Failed to delete ${deletionErrors.length} sub-accounts: ${deletionErrors.join(', ')}`);
  }
}

// Helper function to delete trading logs (placeholder - may need individual deletion)
export async function deleteTradingLogsByTrading(tradingId: string): Promise<void> {
  console.log('Deleting trading logs for trading:', tradingId);
  // Try bulk delete first (if endpoint exists)
  try {
    await apiRequest<{ message: string }>(`/trading-logs/trading/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('Successfully deleted trading logs for trading:', tradingId);
  } catch (error) {
    console.log('Bulk trading logs deletion not available or failed:', error);
    // If bulk delete fails, it may be that the endpoint doesn't exist
    // For backtest/simulation, we'll continue but log the warning
    console.warn('Trading logs may need to be handled by backend cascade deletion');
  }
}

// Helper function to delete transactions (placeholder - may need individual deletion)
export async function deleteTransactionsByTrading(tradingId: string): Promise<void> {
  console.log('Deleting transactions for trading:', tradingId);
  try {
    // Try bulk delete first (if endpoint exists)
    await apiRequest<{ message: string }>(`/transactions/trading/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('Successfully deleted transactions for trading:', tradingId);
  } catch (error) {
    console.log('Bulk transactions deletion not available or failed:', error);
    // If bulk delete fails, it may be that the endpoint doesn't exist
    // For backtest/simulation, we'll continue but log the warning
    console.warn('Transactions may need to be handled by backend cascade deletion');
  }
}

// Helper function to delete positions (placeholder - may need individual deletion)
export async function deletePositionsByTrading(tradingId: string): Promise<void> {
  console.log('Deleting positions for trading:', tradingId);
  try {
    // Try bulk delete first (if endpoint exists)
    await apiRequest<{ message: string }>(`/positions/trading/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('Successfully deleted positions for trading:', tradingId);
  } catch (error) {
    console.log('Bulk positions deletion not available or failed:', error);
    // If bulk delete fails, it may be that the endpoint doesn't exist
    // For backtest/simulation, we'll continue but log the warning
    console.warn('Positions may need to be handled by backend cascade deletion');
  }
}

export async function deleteTrading(tradingId: string, tradingType: string): Promise<void> {
  console.log('deleteTrading called with tradingId:', tradingId, 'type:', tradingType);

  try {
    // For backtest and simulation: cascade delete dependent records first
    if (tradingType === 'backtest' || tradingType === 'simulation') {
      console.log('Performing cascade deletion for', tradingType, 'trading');
      console.log('Following deletion order: positions → trading_logs → transactions → sub_accounts → tradings');

      // Delete in the EXACT order specified in business logic:
      // positions → trading_logs → transactions → sub_accounts → tradings
      console.log('Step 1: Deleting positions...');
      await deletePositionsByTrading(tradingId);

      console.log('Step 2: Deleting trading logs...');
      await deleteTradingLogsByTrading(tradingId);

      console.log('Step 3: Deleting transactions...');
      await deleteTransactionsByTrading(tradingId);

      console.log('Step 4: Deleting sub-accounts...');
      await deleteSubAccountsByTrading(tradingId);

      console.log('Step 5: Deleting trading...');
    } else {
      console.log('Real trading - performing soft deletion (backend will handle)');
    }

    // Finally delete the trading itself (or mark as deleted for real trading)
    const result = await apiRequest<{ message: string }>(`/tradings/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('deleteTrading API response:', result);

  } catch (error) {
    console.error('deleteTrading error:', error);
    throw error;
  }
}

