const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Get access token from localStorage
const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// Get refresh token from localStorage
const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
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

type AnyRecord = Record<string, unknown>;

export interface Trading {
  id: string;
  name: string;
  exchange_binding_id: string;
  exchange_binding?: {
    id: string;
    name: string;
    exchange_type: string;
    status?: string;
    created_at?: string;
    info?: { [key: string]: unknown };
    api_key?: string | null;
    api_secret?: string | null;
  };
  type: string;
  status: string;
  created_at: string;
  info: {
    strategy?: string;
    timeframe?: string;
    bot_id?: string;
    [key: string]: unknown;
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
    [key: string]: unknown;
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
    [key: string]: unknown;
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
  public payload?: unknown;

  constructor(
    code: string,
    message: string,
    details?: string,
    status?: number,
    payload?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}, requireAuth: boolean = true): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  // Debug log for POST requests
  if (options.method === 'POST' && (endpoint.includes('tradings') || endpoint.includes('trading-logs'))) {
    console.log('🔍 [HTTP DEBUG] POST request to:', url);
    console.log('🔍 [HTTP DEBUG] Request body:', options.body);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Only add authorization header if required and token exists
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 202 Accepted (warmup in progress)
  if (response.status === 202) {
    const warmupData = await response.json();
    // Return 202 as an ApiError but include payload so callers can surface partial data
    throw new ApiError(
      warmupData.status || 'WARMING_UP',
      warmupData.message || 'Data is being fetched, please retry',
      `${warmupData.gaps || 0} gaps to fill, retry after ${warmupData.retry_after || 2} seconds`,
      202,
      warmupData
    );
  }

  const data: ApiResponse<T> = await response.json();

  // Debug log for POST responses
  if (options.method === 'POST' && (endpoint.includes('tradings') || endpoint.includes('trading-logs'))) {
    console.log('🔍 [HTTP DEBUG] Response status:', response.status);
    console.log('🔍 [HTTP DEBUG] Response data:', data);
  }

  if (!response.ok || !data.success) {
    // Log error details for debugging
    if (endpoint.includes('trading-logs')) {
      console.error('🔍 [HTTP ERROR] Trading log error details:', JSON.stringify(data.error, null, 2));
    }
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      data.error?.details,
      response.status,
      data
    );
  }

  return data.data;
}

export async function getTradings(): Promise<Trading[]> {
  const response = await apiRequest<{ tradings: Trading[] }>('/tradings');
  console.log('🔍 [getTradings] Raw response:', response);
  console.log('🔍 [getTradings] First trading:', response.tradings?.[0]);
  return response.tradings || [];
}

// Get a single trading by ID (supports both authenticated and unauthenticated access)
// For unauthenticated access, the backend must support public access to paper/backtest tradings
export async function getTradingById(tradingId: string, requireAuth: boolean = true): Promise<Trading | null> {
  try {
    // Make request with or without auth
    const url = `${API_BASE_URL}/tradings/${tradingId}`;
    const token = getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth header if required and token exists
    if (requireAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // Handle different error cases
      if (response.status === 401 && !requireAuth) {
        // Unauthenticated access not allowed - backend doesn't support it yet
        console.warn('Unauthenticated access to trading details not supported by backend');
      }
      return null;
    }

    const data: ApiResponse<Trading> = await response.json();
    if (!data.success) {
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Failed to fetch trading by ID:', error);
    return null;
  }
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

export async function getTransactions(tradingId: string, requireAuth: boolean = true): Promise<Transaction[]> {
  return apiRequest<{ transactions: Transaction[] }>(`/transactions?trading_id=${tradingId}&limit=1000`, {}, requireAuth)
    .then(response => response.transactions);
}

export async function getTradingLogs(tradingId: string, requireAuth: boolean = true, sinceTimestamp?: number): Promise<TradingLog[]> {
  const allLogs: TradingLog[] = [];
  let offset = 0;
  const limit = 1000;

  // Build query parameters
  let query = `/trading-logs/trading/${tradingId}?limit=${limit}&offset=${offset}`;
  if (sinceTimestamp !== undefined) {
    // Convert timestamp to ISO string for backend filtering
    const sinceIso = new Date(sinceTimestamp).toISOString();
    query = `/trading-logs/trading/${tradingId}?limit=${limit}&offset=${offset}&since=${sinceIso}`;
  }

  while (true) {
    const response = await apiRequest<{ trading_logs: TradingLog[] }>(query, {}, requireAuth);
    const logs = response.trading_logs;

    if (logs.length === 0) {
      break; // No more logs to fetch
    }

    allLogs.push(...logs);

    if (logs.length < limit) {
      break; // Last page, no more data
    }

    offset += limit;
    // Update query with new offset
    query = sinceTimestamp !== undefined
      ? `/trading-logs/trading/${tradingId}?limit=${limit}&offset=${offset}&since=${new Date(sinceTimestamp).toISOString()}`
      : `/trading-logs/trading/${tradingId}?limit=${limit}&offset=${offset}`;
  }

  return allLogs;
}

export interface EquityCurveOhlcv {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  final?: boolean;
  coverage?: number;
}

export interface EquityCurveNewData {
  trading_id: string;
  timeframe: string;
  start_time: string;
  end_time: string;
  initial_funds?: number;
  baseline_price?: number;
  warming_up?: boolean;
  gap_count?: number;
  retry_after?: number;
  status?: string;
  message?: string;
  data_points: Array<{
    timestamp: string;
    equity: number | null;
    quote_balance: number;
    stock_balance: number | null;
    stock_price: number | null;
    benchmark_return?: number | null;
    ohlcv?: EquityCurveOhlcv | null;
    events?: Array<Record<string, unknown>>;
  }>;
}

export interface EquityCurveWarmupEnvelope {
  status?: string;
  message?: string;
  retry_after?: number;
  gaps?: number;
  data?: EquityCurveNewData;
}

function buildWarmupEquityCurve(
  payload: unknown,
  tradingId: string,
  timeframe: string,
  range?: { startTimeMs?: number; endTimeMs?: number }
): EquityCurveNewData | undefined {
  const warmup = payload as EquityCurveWarmupEnvelope | undefined;
  if (!warmup) {
    return undefined;
  }

  const baseData = warmup.data;
  if (baseData && Array.isArray(baseData.data_points)) {
    return {
      ...baseData,
      warming_up: baseData.warming_up ?? true,
      gap_count: baseData.gap_count ?? warmup.gaps,
      retry_after: baseData.retry_after ?? warmup.retry_after,
      status: warmup.status ?? baseData.status,
      message: warmup.message ?? baseData.message,
    };
  }

  const nowIso = new Date().toISOString();
  const startIso = range?.startTimeMs
    ? new Date(range.startTimeMs).toISOString()
    : baseData?.start_time ?? nowIso;
  const endIso = range?.endTimeMs
    ? new Date(range.endTimeMs).toISOString()
    : baseData?.end_time ?? startIso;

  const dataPoints = baseData && Array.isArray(baseData.data_points) ? baseData.data_points : [];

  return {
    trading_id: baseData?.trading_id ?? tradingId,
    timeframe: baseData?.timeframe ?? timeframe,
    start_time: startIso,
    end_time: endIso,
    initial_funds: baseData?.initial_funds ?? 0,
    baseline_price: baseData?.baseline_price ?? 0,
    warming_up: true,
    gap_count: warmup.gaps,
    retry_after: warmup.retry_after,
    status: warmup.status,
    message: warmup.message,
    data_points: dataPoints,
  };
}

export async function getEquityCurve(
  tradingId: string,
  timeframe: string = '1h',
  recentTimeframes: number = 100,
  stockSymbol: string = 'BTC',
  quoteSymbol: string = 'USDT',
  requireAuth: boolean = true,
  exchangeType?: string
): Promise<EquityCurveNewData> {
  const params = new URLSearchParams();
  params.append('timeframe', timeframe);
  params.append('recent_timeframes', recentTimeframes.toString());
  params.append('stock_symbol', stockSymbol);
  params.append('quote_symbol', quoteSymbol);
  if (exchangeType) {
    params.append('exchange', exchangeType.toLowerCase());
  }

  const endpoint = `/tradings/${tradingId}/equity-curve${params.toString() ? `?${params.toString()}` : ''}`;
  try {
    const data = await apiRequest<EquityCurveNewData>(endpoint, {}, requireAuth);
    console.log(`✅ getEquityCurve response: received ${data.data_points?.length ?? 0} data points`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 202) {
      const warmupCurve = buildWarmupEquityCurve(error.payload, tradingId, timeframe);
      if (warmupCurve) {
        console.warn(
          `⏳ Equity curve data warming detected. Returning ${warmupCurve.data_points.length} partial data points (gap_count=${warmupCurve.gap_count ?? 'unknown'}).`
        );
        return warmupCurve;
      }
    }

    console.error(`❌ getEquityCurve error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get equity curve data with explicit time range (for incremental updates).
 * This function allows fetching data for a specific time range, useful for
 * incremental updates during auto-refresh.
 *
 * @param tradingId - Trading ID
 * @param timeframe - Time interval (e.g., '1m', '1h', '1d')
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @param stockSymbol - Stock/asset symbol
 * @param quoteSymbol - Quote currency symbol
 * @param requireAuth - Whether authentication is required
 * @returns Equity curve data for the specified time range
 */
export async function getEquityCurveByTimeRange(
  tradingId: string,
  timeframe: string,
  startTime: number,
  endTime: number,
  stockSymbol: string = 'BTC',
  quoteSymbol: string = 'USDT',
  requireAuth: boolean = true,
  exchangeType?: string
): Promise<EquityCurveNewData> {
  const params = new URLSearchParams();
  params.append('timeframe', timeframe);
  params.append('start_time', startTime.toString());
  params.append('end_time', endTime.toString());
  params.append('stock_symbol', stockSymbol);
  params.append('quote_symbol', quoteSymbol);
  if (exchangeType) {
    params.append('exchange', exchangeType.toLowerCase());
  }

  const endpoint = `/tradings/${tradingId}/equity-curve${params.toString() ? `?${params.toString()}` : ''}`;
  try {
    const data = await apiRequest<EquityCurveNewData>(endpoint, {}, requireAuth);
    console.log(`✅ getEquityCurveByTimeRange response: received ${data.data_points?.length ?? 0} data points`);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 202) {
      const warmupCurve = buildWarmupEquityCurve(error.payload, tradingId, timeframe, {
        startTimeMs: startTime,
        endTimeMs: endTime,
      });
      if (warmupCurve) {
        console.warn(
          `⏳ Equity curve (time range) warming detected. Returning ${warmupCurve.data_points.length} partial data points (gap_count=${warmupCurve.gap_count ?? 'unknown'}).`
        );
        return warmupCurve;
      }
    }

    console.error(`❌ getEquityCurveByTimeRange error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export interface ExchangeBinding {
  id: string;
  name: string;
  exchange_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
  api_key?: string | null;
  api_secret?: string | null;
  info: {
    description?: string;
    testnet?: boolean;
    permissions?: string[];
    api_key?: string;
    api_secret?: string;
    passphrase?: string;
    [key: string]: unknown;
  };
}

export interface CreateTradingRequest {
  name: string;
  exchange_binding_id: string;
  type: 'backtest' | 'paper' | 'real';
  info: {
    strategy?: string;
    description?: string;
    [key: string]: unknown;
  };
}

export async function getPublicExchangeBindings(): Promise<ExchangeBinding[]> {
  const response = await apiRequest<ExchangeBinding[]>('/exchange-bindings/public');
  return response;
}

export async function getExchangeBindings(): Promise<ExchangeBinding[]> {
  const response = await apiRequest<AnyRecord>('/exchange-bindings');
  console.log('getExchangeBindings raw response:', response);
  console.log('getExchangeBindings response type:', typeof response);
  console.log('getExchangeBindings is array:', Array.isArray(response));

  // If response is already an array, return it directly
  if (Array.isArray(response)) {
    return response;
  }

  // If response is an object with items property (paginated response)
  if (response && typeof response === 'object' && 'items' in response) {
    return (response as { items: ExchangeBinding[] }).items || [];
  }

  // If response is an object with exchange_bindings property, extract it
  if (response && typeof response === 'object' && 'exchange_bindings' in response) {
    return (response as { exchange_bindings: ExchangeBinding[] }).exchange_bindings || [];
  }

  // If response is an object with the array directly as values, try to extract
  if (response && typeof response === 'object') {
    // Sometimes APIs return the array directly in the data field
    return response as unknown as ExchangeBinding[] || [];
  }

  console.warn('Unexpected exchange bindings response format:', response);
  return [];
}

export async function getExchangeBindingById(id: string): Promise<ExchangeBinding> {
  return apiRequest<ExchangeBinding>(`/exchange-bindings/${id}`);
}

export interface CreateExchangeBindingRequest {
  name: string;
  exchange_type: string;
  api_key: string;
  api_secret: string;
  info?: {
    testnet?: boolean;
    description?: string;
    quote_currency?: string;
    passphrase?: string;
    [key: string]: unknown;
  };
}

export async function createExchangeBinding(request: CreateExchangeBindingRequest): Promise<ExchangeBinding> {
  return apiRequest<ExchangeBinding>('/exchange-bindings', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export interface UpdateExchangeBindingRequest {
  name?: string;
  api_key?: string;
  api_secret?: string;
  status?: string;
  info?: {
    testnet?: boolean;
    description?: string;
    quote_currency?: string;
    passphrase?: string;
    [key: string]: unknown;
  };
}

export async function updateExchangeBinding(id: string, request: UpdateExchangeBindingRequest): Promise<ExchangeBinding> {
  return apiRequest<ExchangeBinding>(`/exchange-bindings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

export async function deleteExchangeBinding(id: string): Promise<void> {
  return apiRequest<void>(`/exchange-bindings/${id}`, {
    method: 'DELETE',
  });
}

export async function createTrading(request: CreateTradingRequest): Promise<Trading> {
  console.log('🔍 [API DEBUG] createTrading request:', request);
  const result = await apiRequest<Trading>('/tradings', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  console.log('🔍 [API DEBUG] createTrading response:', result);
  return result;
}

export interface UpdateTradingRequest {
  name?: string;
  description?: string;
  info?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function updateTrading(tradingId: string, request: UpdateTradingRequest): Promise<Trading> {
  return apiRequest<Trading>(`/tradings/${tradingId}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

// Helper function to extract exchange credentials from binding
function extractExchangeCredentials(binding?: ExchangeBinding | null): { apiKey: string | null; apiSecret: string | null } {
  if (!binding) {
    return { apiKey: null, apiSecret: null };
  }

  const info = binding.info || {};
  const credentialsSections = [info.credentials, info.credential, info.security, info.api_credentials, info.apiCredentials].filter((section): section is Record<string, unknown> => section !== undefined && section !== null && typeof section === 'object');

  const candidateKeys: Array<string | null | undefined> = [
    binding.api_key,
    info.api_key as string | undefined,
    info.apiKey as string | undefined,
    info.api_key_plain as string | undefined,
    info.apiKeyPlain as string | undefined,
    info.api_key_preview as string | undefined,
    info.apiKeyPreview as string | undefined,
    ...credentialsSections.map(section => (section.api_key ?? section.apiKey ?? section.key ?? null) as string | null),
  ];

  const candidateSecrets: Array<string | null | undefined> = [
    binding.api_secret,
    info.api_secret as string | undefined,
    info.apiSecret as string | undefined,
    info.api_secret_plain as string | undefined,
    info.apiSecretPlain as string | undefined,
    info.api_secret_preview as string | undefined,
    info.apiSecretPreview as string | undefined,
    ...credentialsSections.map(section => (section.api_secret ?? section.apiSecret ?? section.secret ?? null) as string | null),
  ];

  const apiKey = candidateKeys.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;
  const apiSecret = candidateSecrets.find((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? null;

  return { apiKey, apiSecret };
}

// Fetch available balance for a given exchange binding and quote currency
// This considers existing real tradings using the same exchange binding
export async function fetchExchangeBalanceForBinding(
  exchangeBindingId: string,
  quoteCurrency: 'USDT' | 'USDC'
): Promise<ExchangeAccountResponse | null> {
  try {
    const exchangeBinding = await getExchangeBindingById(exchangeBindingId);
    const { apiKey, apiSecret } = extractExchangeCredentials(exchangeBinding);

    if (!apiKey || !apiSecret) {
      console.warn('No credentials found for exchange binding');
      return null;
    }

    // Construct symbol for balance check (e.g., ETH/USDT)
    const symbol = `ETH/${quoteCurrency}`;

    // Extract passphrase if needed (for exchanges like OKX)
    const passphrase = exchangeBinding.info?.passphrase || undefined;

    const accountData = await getExchangeAccount(
      exchangeBinding.exchange_type,
      symbol,
      apiKey,
      apiSecret,
      passphrase
    );

    // Calculate available funds by subtracting current balances of all quote currency sub-accounts
    // from existing real tradings using the same exchange binding
    let tradings: Trading[] = [];
    try {
      tradings = await getTradings();
      console.log('✅ Successfully fetched tradings:', tradings.length);
    } catch (tradingsError) {
      console.error('⚠️ Failed to fetch existing tradings for constraint calculation:', tradingsError);
      console.warn('⚠️ Proceeding without constraint - this may allow over-allocation!');
      tradings = [];
    }

    // Filter for existing real tradings with the same exchange binding
    const existingRealTradings = tradings.filter(
      t => t.type === 'real' &&
        (t.exchange_binding_id === exchangeBindingId || t.exchange_binding?.id === exchangeBindingId)
    );

    console.log(`Found ${existingRealTradings.length} existing real tradings with same exchange binding`);

    // Fetch sub-accounts for all existing real tradings and sum up quote currency balances
    let totalAllocatedFunds = 0;
    for (const trading of existingRealTradings) {
      try {
        const subAccounts = await getSubAccountsByTrading(trading.id);
        console.log(`Trading ${trading.id.substring(0, 8)}: Found ${subAccounts.length} sub-accounts:`,
          subAccounts.map(sa => ({ symbol: sa.symbol, balance: sa.balance, account_type: sa.info?.account_type }))
        );

        // Find the quote currency sub-account (matching the requested quoteCurrency)
        // The balance sub-account is identified by symbol (USDT/USDC) and name containing "Balance"
        const quoteSubAccount = subAccounts.find(
          sa => sa.symbol === quoteCurrency && (sa.name.includes('Balance') || sa.info?.account_type === 'balance')
        );

        if (quoteSubAccount) {
          // Balance can be either number or string, handle both
          const balance = typeof quoteSubAccount.balance === 'number'
            ? quoteSubAccount.balance
            : (parseFloat(quoteSubAccount.balance) || 0);
          totalAllocatedFunds += balance;
          console.log(`✅ Trading ${trading.id.substring(0, 8)}: ${balance} ${quoteCurrency} in sub-account`);
        } else {
          console.log(`⚠️ Trading ${trading.id.substring(0, 8)}: No ${quoteCurrency} balance sub-account found`);
        }
      } catch (subAccountError) {
        console.error(`❌ Failed to fetch sub-accounts for trading ${trading.id}:`, subAccountError);
        // Continue with other tradings even if one fails
      }
    }

    console.log('Exchange balance calculation:', {
      exchangeBalance: accountData.balance,
      totalAllocatedFunds,
      availableBalance: accountData.balance - totalAllocatedFunds
    });

    // Return the available balance (exchange balance - already allocated funds)
    return {
      ...accountData,
      balance: Math.max(0, accountData.balance - totalAllocatedFunds)
    };
  } catch (error) {
    console.error('Failed to fetch exchange balance:', error);
    return null;
  }
}

export async function createRealTrading(request: CreateTradingRequest): Promise<Trading> {
  console.log('🔍 [REAL DEBUG] Creating real trading with business logic steps...');
  console.log('🔍 [REAL DEBUG] Request received:', request);

  const quoteCurrency = request.info?.quote_currency as string | undefined;

  if (!quoteCurrency || typeof quoteCurrency !== 'string') {
    throw new Error('Quote currency is required to create a real trading.');
  }

  try {
    // Step 1: Fetch initial balance from exchange account before creating trading
    console.log('Step 1: Fetching initial balance from exchange account...');

    // Get exchange binding to extract credentials
    const exchangeBindingId = request.exchange_binding_id;
    if (!exchangeBindingId) {
      throw new Error('Exchange binding ID is required to fetch account balance.');
    }

    const exchangeBinding = await getExchangeBindingById(exchangeBindingId);
    const { apiKey, apiSecret } = extractExchangeCredentials(exchangeBinding);

    if (!apiKey || !apiSecret) {
      throw new Error('Exchange credentials are required to fetch account balance.');
    }

    // Construct symbol for balance check (e.g., ETH/USDT)
    const symbol = `ETH/${quoteCurrency}`;

    // Extract passphrase if needed (for exchanges like OKX)
    const passphrase = exchangeBinding.info?.passphrase || undefined;

    try {
      const accountData = await getExchangeAccount(
        exchangeBinding.exchange_type,
        symbol,
        apiKey,
        apiSecret,
        passphrase
      );

      // Store initial balance in trading info
      request.info = {
        ...request.info,
        initial_balance: accountData.balance,
        initial_frozen_balance: accountData.frozen_balance,
        initial_stocks: accountData.stocks,
        initial_frozen_stocks: accountData.frozen_stocks,
      };

      console.log('Initial balance fetched:', {
        balance: accountData.balance,
        frozen_balance: accountData.frozen_balance,
        stocks: accountData.stocks,
        frozen_stocks: accountData.frozen_stocks,
      });
    } catch (balanceError) {
      console.warn('Failed to fetch initial balance, will proceed without it:', balanceError);
      // Continue with trading creation even if balance fetch fails
    }

    console.log('Step 2: Creating real trading...');
    const trading = await createTrading(request);
    console.log('Real trading created:', trading.id);

    console.log('Step 3: Creating sub-accounts for real trading...');

    // Create ETH sub-account without balance
    const stockSubAccount = await createSubAccount({
      name: 'ETH Stock Account',
      symbol: 'ETH',
      balance: '0',  // Backend doesn't accept balance, will fund via deposit log
      trading_id: trading.id,
      info: {
        description: 'Sub-account for ETH stock holdings',
        account_type: 'stock'
      }
    });
    console.log('ETH sub-account created:', stockSubAccount.id);

    // Create quote currency sub-account without balance
    const balanceSubAccount = await createSubAccount({
      name: `${quoteCurrency} Balance Account`,
      symbol: quoteCurrency,
      balance: '0',  // Backend doesn't accept balance, will fund via deposit log
      trading_id: trading.id,
      info: {
        description: `Sub-account for ${quoteCurrency} balance`,
        account_type: 'balance'
      }
    });
    console.log(`${quoteCurrency} sub-account created:`, balanceSubAccount.id);

    console.log('Step 4: Creating deposit trading logs to fund sub-accounts...');

    // Do not need to create deposit log for ETH sub-account for now, because the strategy is not using ETH initial balance. 
    // TODO: The following code might be needed in the future.
    // // Create deposit log for ETH sub-account if initial_stocks > 0
    // const initialStocks = request.info?.initial_stocks || 0;
    // if (initialStocks > 0) {
    //   const ethDepositRequest = {
    //     trading_id: trading.id,
    //     type: 'deposit',
    //     source: 'manual',
    //     message: `Initial ETH deposit to account`,
    //     sub_account_id: stockSubAccount.id,
    //     event_time: new Date().toISOString(),
    //     info: {
    //       account_id: stockSubAccount.id,
    //       amount: initialStocks,
    //       currency: 'ETH'
    //     }
    //   };
    //   console.log('🔍 Creating ETH deposit log:', JSON.stringify(ethDepositRequest, null, 2));
    //   await createTradingLog(ethDepositRequest);
    //   console.log(`Deposit log created for ETH sub-account: ${initialStocks} ETH`);
    // }

    // Create deposit log for quote currency sub-account
    // Use initial_funds if provided by user, otherwise use the fetched initial_balance
    const initialFunds = request.info?.initial_funds;
    const initialBalance = request.info?.initial_balance || 0;
    const depositAmount = typeof initialFunds === 'number' ? initialFunds : Number(initialBalance);

    if (depositAmount > 0) {
      await createTradingLog({
        trading_id: trading.id,
        type: 'deposit',
        source: 'manual',
        message: `Initial ${quoteCurrency} deposit to account`,
        sub_account_id: balanceSubAccount.id,
        event_time: new Date().toISOString(),
        info: {
          account_id: balanceSubAccount.id,
          amount: depositAmount,
          currency: quoteCurrency
        }
      });
      console.log(`Deposit log created for ${quoteCurrency} sub-account: ${depositAmount} ${quoteCurrency}`);
    }

    console.log('Real trading creation completed with sub-accounts and deposit logs.');
    return trading;
  } catch (error) {
    console.error('Failed to create real trading:', error);
    throw error;
  }
}

// Interface for creating sub-account
export interface CreateSubAccountRequest {
  name: string;
  symbol: string;
  balance: string;
  trading_id: string;
  info?: { [key: string]: unknown };
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
  info?: { [key: string]: unknown };
}

// Create a new trading log
export async function createTradingLog(request: CreateTradingLogRequest): Promise<void> {
  return apiRequest<void>('/trading-logs', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Bot API Configuration
const BOT_API_BASE_URL = import.meta.env.VITE_BOT_API_BASE_URL;

// Bot API types based on OpenAPI spec
export interface Bot {
  record: {
    id: string;
    user_id: string;
    spec: {
      trading: {
        id: string;
        name: string;
        type: string;
      };
      exchange_type?: string;
      exchange_binding?: {
        id: string;
        name: string;
        type?: string;
        api_key?: string | null;
        api_secret?: string | null;
        info?: { [key: string]: unknown };
      };
      /**
       * Some legacy bot records may still include the old exchange object.
       * Keep it optional for backward compatibility until migrations finish.
       */
      exchange?: {
        id: string;
        name: string;
        type: string;
        api_key?: string | null;
        api_secret?: string | null;
        info?: { [key: string]: unknown };
      };
      params?: { [key: string]: unknown };
    };
    status?: {
      info?: { [key: string]: unknown };
      errors?: Array<{
        timestamp: string;
        code: string;
        message: string;
      }>;
    };
    enabled: boolean;
    last_heartbeat_at?: string;
    created_at: string;
    updated_at: string;
  };
  alive: boolean;
}

export interface BotSpec {
  trading: {
    id: string;
    name: string;
    type: string;
    stock_sub_account?: {
      id: string;
      symbol: string;
      balance: number;
    } | null;
    balance_sub_account?: {
      id: string;
      symbol: string;
      balance: number;
    } | null;
  };
  params?: { [key: string]: unknown };
  exchange_type?: string;
  exchange_binding?: {
    id: string;
    name: string;
    exchange_type?: string;
    api_key?: string | null;
    api_secret?: string | null;
    info?: { [key: string]: unknown };
  };
}

export interface BotCreateRequest {
  spec: BotSpec;
}

// Bot API request functions
async function botApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BOT_API_BASE_URL}${endpoint}`;
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  console.log('🔍 [BOT API DEBUG] Bot API Request:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
    refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'No refresh token'
  });

  if (options.method === 'POST' && options.body) {
    console.log('🔍 [BOT API DEBUG] Request body:', options.body);
    console.log('🔍 [BOT API DEBUG] Request body length:', typeof options.body === 'string' ? options.body.length : 'Not a string');
    console.log('🔍 [BOT API DEBUG] Request body type:', typeof options.body);
  }

  const requestOptions = {
    ...options,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(refreshToken ? { 'X-Refresh-Token': refreshToken } : {}),
      'Content-Type': 'application/json',
      // Explicitly set Content-Length to fix ERR_CONTENT_LENGTH_MISMATCH
      ...(options.body && typeof options.body === 'string' ? { 'Content-Length': new TextEncoder().encode(options.body).length.toString() } : {}),
      ...options.headers,
    },
  };

  console.log('🔍 [BOT API DEBUG] Final request options:', {
    method: requestOptions.method,
    headers: requestOptions.headers,
    bodyLength: requestOptions.body ? (typeof requestOptions.body === 'string' ? requestOptions.body.length : 'Not string') : 0
  });

  const response = await fetch(url, requestOptions);

  console.log('Bot API Response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [BOT API ERROR] Bot API Error Response:', {
      status: response.status,
      statusText: response.statusText,
      url,
      method: options.method || 'GET',
      errorText,
      headers: response.headers
    });
    throw new ApiError(
      'BOT_API_ERROR',
      `Bot API error: ${response.status} ${response.statusText}`,
      errorText,
      response.status
    );
  }

  const result = await response.json();
  console.log('Bot API Success Response:', result);
  return result;
}

// Create a bot
export async function createBot(request: BotCreateRequest): Promise<Bot> {
  const payload = JSON.stringify(request);
  return botApiRequest<Bot>(`/bots`, {
    method: 'POST',
    body: payload,
  });
}

// Start a bot
export async function startBot(botId: string): Promise<Bot> {
  return botApiRequest<Bot>(`/bots/${botId}/start`, {
    method: 'POST',
  });
}

// Stop a bot
export async function stopBot(botId: string): Promise<Bot> {
  return botApiRequest<Bot>(`/bots/${botId}/stop`, {
    method: 'POST',
  });
}

// Pause a bot
export async function pauseBot(botId: string): Promise<Bot> {
  return botApiRequest<Bot>(`/bots/${botId}/pause`, {
    method: 'POST',
  });
}

// Resume a bot
export async function resumeBot(botId: string): Promise<Bot> {
  return botApiRequest<Bot>(`/bots/${botId}/resume`, {
    method: 'POST',
  });
}

// Get bot details
export async function getBot(botId: string): Promise<Bot> {
  return botApiRequest<Bot>(`/bots/${botId}`);
}

// List user bots
export async function getBots(enabled?: boolean, alive?: boolean, limit = 50, offset = 0): Promise<{ bots: Bot[]; total: number }> {
  const params = new URLSearchParams();
  if (enabled !== undefined) params.append('enabled', String(enabled));
  if (alive !== undefined) params.append('alive', String(alive));
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const endpoint = `/bots${params.toString() ? `?${params.toString()}` : ''}`;
  return botApiRequest<{ bots: Bot[]; total: number }>(endpoint);
}

// Find bot for a specific trading
export async function getBotByTradingId(tradingId: string): Promise<Bot | null> {
  try {
    const { bots } = await getBots();
    return bots.find(bot => bot.record.spec.trading.id === tradingId) || null;
  } catch (error) {
    console.error('Failed to find bot for trading:', error);
    return null;
  }
}

// Delete a bot
export async function deleteBot(botId: string): Promise<void> {
  return botApiRequest<void>(`/bots/${botId}`, {
    method: 'DELETE',
  });
}

// Complete paper trading creation according to business logic
const PAPER_TRADING_DEFAULT_INITIAL_FUNDS = 10000;

export async function createPaperTrading(request: CreateTradingRequest): Promise<Trading> {
  console.log('🔍 [PAPER DEBUG] Creating paper trading with business logic steps...');
  console.log('🔍 [PAPER DEBUG] Request received:', request);

  try {
    const configuredInitialFunds = Number(request.info?.initial_funds);
    const initialFunds = Number.isFinite(configuredInitialFunds) && configuredInitialFunds > 0
      ? configuredInitialFunds
      : PAPER_TRADING_DEFAULT_INITIAL_FUNDS;

    const preparedRequest: CreateTradingRequest = {
      ...request,
      info: {
        ...request.info,
        initial_funds: initialFunds,
      },
    };

    // Step 1: Create the trading
    console.log('Step 1: Creating trading...');
    const trading = await createTrading(preparedRequest);
    console.log('🔍 [PAPER DEBUG] Trading created, checking info field:', trading.info);
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
      message: 'Initial deposit for paper trading',
      event_time: new Date().toISOString(),
      info: {
        account_id: usdtSubAccount.id,
        amount: initialFunds,
        currency: 'USDT'
      }
    });
    console.log('Initial deposit trading log created');

    // Step 4: Sub-account IDs are now available and linked via trading_id
    // No need to update trading info since sub-accounts can be retrieved by trading_id
    console.log('Step 4: Paper trading creation completed');
    console.log('Sub-account IDs:', {
      eth_account_id: ethSubAccount.id,
      usdt_account_id: usdtSubAccount.id
    });

    trading.info = {
      ...trading.info,
      initial_funds: initialFunds,
    };

    return trading;

  } catch (error) {
    console.error('Failed to create paper trading:', error);
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
  info: { [key: string]: unknown };
}

// Get available strategies from tiris-bot API
export async function getStrategies(): Promise<string[]> {
  return botApiRequest<string[]>('/strategies');
}

interface RawExchangeConfigResponse {
  type: string;                        // Exchange type key (e.g., 'binance_free', 'okx_demo')
  name: string;
  ccxt_id: string;
  sandbox: boolean;
  ccxt_passphrase_field?: string | null;
  virtual_exchange_fee: number;
}

export interface ExchangeConfigResponse {
  type: string;                        // Exchange type key (e.g., 'binance_free', 'okx_demo')
  name: string;                        // Display name of the exchange
  ccxt_id: string;                     // CCXT module name for the exchange
  sandbox: boolean;                    // Whether this is a sandbox/demo environment
  ccxt_passphrase_field?: string | null; // Field name for passphrase in exchange config (if required)
  virtual_exchange_fee: number;        // Fee rate for paper/backtest trading (as decimal, e.g., 0.001 = 0.1%)
}

const normalizeExchangeConfig = (config: RawExchangeConfigResponse): ExchangeConfigResponse => ({
  type: config.type,
  name: config.name,
  ccxt_id: config.ccxt_id,
  sandbox: config.sandbox,
  ccxt_passphrase_field: config.ccxt_passphrase_field ?? null,
  virtual_exchange_fee: config.virtual_exchange_fee,
});

// Get available exchanges from tiris-bot API
export async function getExchanges(): Promise<ExchangeConfigResponse[]> {
  const response = await botApiRequest<RawExchangeConfigResponse[]>('/exchanges');
  return response.map(normalizeExchangeConfig);
}

// Get exchanges supported for real trading
export async function getRealExchanges(): Promise<ExchangeConfigResponse[]> {
  const response = await botApiRequest<RawExchangeConfigResponse[]>('/exchanges/real');
  return response.map(normalizeExchangeConfig);
}

// Get exchanges supported for paper trading
export async function getPaperExchanges(): Promise<ExchangeConfigResponse[]> {
  const response = await botApiRequest<RawExchangeConfigResponse[]>('/exchanges/paper');
  return response.map(normalizeExchangeConfig);
}

// Get exchanges supported for backtest trading
export async function getBacktestExchanges(): Promise<ExchangeConfigResponse[]> {
  const response = await botApiRequest<RawExchangeConfigResponse[]>('/exchanges/backtest');
  return response.map(normalizeExchangeConfig);
}

// Exchange account response interface based on OpenAPI spec
export interface ExchangeAccountResponse {
  balance: number;          // Available quote currency balance
  frozen_balance: number;   // Frozen quote currency balance
  stocks: number;           // Available base currency balance
  frozen_stocks: number;    // Frozen base currency balance
}

// Get exchange account information from tiris-bot API
export async function getExchangeAccount(
  exchangeType: string,
  symbol: string,
  apiKey: string,
  apiSecret: string,
  passphrase?: string
): Promise<ExchangeAccountResponse> {
  const params = new URLSearchParams({
    exchange_type: exchangeType,
    symbol: symbol,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  if (passphrase) {
    params.append('passphrase', passphrase);
  }

  return botApiRequest<ExchangeAccountResponse>(`/exchange_account?${params.toString()}`);
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
    // Step 1: Check if there's a bot associated with this trading and delete it first
    console.log('Checking for associated bot...');
    const associatedBot = await getBotByTradingId(tradingId);

    if (associatedBot) {
      console.log('Found associated bot:', associatedBot.record.id, 'Deleting bot first...');
      try {
        await deleteBot(associatedBot.record.id);
        console.log('Bot deleted successfully');
      } catch (botError) {
        console.error('Failed to delete bot:', botError);
        // If bot deletion fails, we must not proceed with trading deletion
        // to prevent leaving orphaned bots
        throw new Error(`Cannot delete trading: Failed to delete associated bot (${associatedBot.record.id}). ${botError instanceof Error ? botError.message : 'Unknown error'}`);
      }
    } else {
      console.log('No associated bot found, safe to proceed with trading deletion');
    }

    // Step 2: Delete the trading (only if bot deletion succeeded or no bot exists)
    // Backend now handles all cascade deletion logic based on trading type:
    // - Hard delete (backtest/paper): Backend deletes all dependent records in atomic transaction
    // - Soft delete (real trading): Backend marks as deleted while preserving audit trail
    console.log('Deleting trading...');
    const result = await apiRequest<{ message: string }>(`/tradings/${tradingId}`, {
      method: 'DELETE',
    });
    console.log('deleteTrading API response:', result);

  } catch (error) {
    console.error('deleteTrading error:', error);
    throw error;
  }
}

// OHLCV Data API

export interface OHLCVCandle {
  ex: string;          // Exchange type identifier
  market: string;      // Market symbol (e.g., "BTC/USDT")
  ts: string;          // Timestamp (ISO 8601)
  o: number;           // Open price
  h: number;           // High price
  l: number;           // Low price
  c: number;           // Close price
  v: number;           // Volume
  final: boolean;      // Whether candle is finalized
  schema_ver: number;  // Schema version
}

/**
 * Get OHLCV data for a specific exchange and market
 * @param exchangeType - Exchange type key (e.g., 'binance', 'okx')
 * @param market - Market symbol (e.g., 'BTC/USDT', 'ETH/USDT')
 * @param startTime - Start time in milliseconds since epoch
 * @param endTime - End time in milliseconds since epoch
 * @param timeframe - Timeframe for candles (e.g., '1m', '1h', '4h', '1d')
 * @param onMiss - Action on missing data: 'warmup' (default) or 'none'
 * @returns Array of OHLCV candles
 */
export async function getOHLCV(
  exchangeType: string,
  market: string,
  startTime: number,
  endTime: number,
  timeframe: string = '1m',
  onMiss: 'warmup' | 'none' = 'warmup'
): Promise<OHLCVCandle[]> {
  const params = new URLSearchParams({
    ex: exchangeType.toLowerCase(),
    market: market,
    tf: timeframe,
    start: startTime.toString(),
    end: endTime.toString(),
    on_miss: onMiss
  });

  const endpoint = `/ohlcv?${params.toString()}`;

  console.log(`getOHLCV API request: ${API_BASE_URL}${endpoint}`);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const data = await apiRequest<OHLCVCandle[]>(endpoint);
      console.log(`✅ getOHLCV response: received ${data.length} candles`);
      return data;
    } catch (error) {
      // Handle 202 Accepted (warming) response - data is being fetched
      if (error instanceof ApiError && error.status === 202) {
        retryCount++;
        if (retryCount < maxRetries) {
          const retryDelay = 2000; // 2 seconds as per API spec
          console.log(`⏳ OHLCV data is warming (attempt ${retryCount}/${maxRetries}), retrying after ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          console.warn(`⚠️ OHLCV data warming exceeded max retries (${maxRetries})`);
          return [];
        }
      }
      // Other errors should be thrown
      console.error(`❌ getOHLCV error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  return [];
}
