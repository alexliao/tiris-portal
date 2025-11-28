import {
  getEquityCurve,
  getSubAccountsByTrading,
  type EquityCurveNewData,
  type Trading,
} from './api';

export type AttemptPublicFirst = <T>(request: (useAuth: boolean) => Promise<T>) => Promise<T>;

export interface MarketSnapshot {
  stockSymbol: string;
  quoteSymbol: string;
  stockBalance: number;
  quoteBalance: number;
  price: number | null;
  warmingUp: boolean;
}

export interface MarketSnapshotOptions {
  attemptPublicFirst?: AttemptPublicFirst;
  endTimeMs?: number;
}

const parseSymbolPair = (value?: unknown): { stockSymbol: string; quoteSymbol: string } | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const separator = trimmed.includes('/') ? '/' : trimmed.includes('_') ? '_' : null;
  if (!separator) {
    return null;
  }

  const [stock, quote] = trimmed.split(separator);
  if (!stock || !quote) {
    return null;
  }

  return {
    stockSymbol: stock.toUpperCase(),
    quoteSymbol: quote.toUpperCase(),
  };
};

export const deriveMarketContextFromTrading = (trading: Trading): MarketSnapshot => {
  const info = trading.info ?? {};
  const candidates: unknown[] = [
    info.market_symbol,
    info.symbol,
    info.trading_pair,
    info.pair,
    info.bot_symbol,
    info.strategy_symbol,
  ];

  let parsedPair: { stockSymbol: string; quoteSymbol: string } | null = null;
  for (const candidate of candidates) {
    parsedPair = parseSymbolPair(candidate);
    if (parsedPair) {
      break;
    }
  }

  const rawStockSymbol = (info.stock_symbol || info.stockSymbol || info.asset_symbol) as string | undefined;
  const rawQuoteSymbol = (info.quote_symbol || info.quoteSymbol || info.quote_currency) as string | undefined;

  const stockSymbol = (parsedPair?.stockSymbol || rawStockSymbol || 'ETH').toString().toUpperCase();
  const quoteSymbol = (parsedPair?.quoteSymbol || rawQuoteSymbol || 'USDT').toString().toUpperCase();

  const stockBalanceCandidate =
    info.initial_stock_balance ?? info.initial_asset_balance ?? info.initial_position ?? info.stock_balance;
  const quoteBalanceCandidate =
    info.initial_balance ?? info.initial_funds ?? info.initial_quote_balance ?? info.quote_balance ?? info.balance;

  const stockBalance = typeof stockBalanceCandidate === 'number'
    ? stockBalanceCandidate
    : Number(stockBalanceCandidate) || 0;
  const quoteBalance = typeof quoteBalanceCandidate === 'number'
    ? quoteBalanceCandidate
    : Number(quoteBalanceCandidate) || 0;

  return {
    stockSymbol,
    quoteSymbol,
    stockBalance,
    quoteBalance,
    price: null,
    warmingUp: false,
  };
};

const extractPriceFromEquityCurve = (curve?: EquityCurveNewData | null): number | null => {
  if (!curve?.data_points?.length) {
    return null;
  }

  const latestPoint = curve.data_points[curve.data_points.length - 1];
  const candleClose = latestPoint?.ohlcv?.close;
  if (typeof candleClose === 'number' && Number.isFinite(candleClose) && candleClose > 0) {
    return candleClose;
  }

  const stockPrice = latestPoint?.stock_price;
  if (typeof stockPrice === 'number' && Number.isFinite(stockPrice) && stockPrice > 0) {
    return stockPrice;
  }

  return null;
};

export async function fetchMarketSnapshot(
  trading: Trading,
  options: MarketSnapshotOptions = {},
): Promise<MarketSnapshot> {
  const fallbackContext = deriveMarketContextFromTrading(trading);

  const requestWithAuthFallback = async <T,>(request: (useAuth: boolean) => Promise<T>): Promise<T> => {
    if (options.attemptPublicFirst) {
      return options.attemptPublicFirst(request);
    }
    // Default: use auth for live trades, avoid auth for paper/backtest
    const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';
    return request(requireAuth);
  };

  let resolvedStockSymbol = fallbackContext.stockSymbol;
  let resolvedQuoteSymbol = fallbackContext.quoteSymbol;
  let resolvedStockBalance = fallbackContext.stockBalance;
  let resolvedQuoteBalance = fallbackContext.quoteBalance;

  try {
    const subAccounts = await requestWithAuthFallback(useAuth => getSubAccountsByTrading(trading.id, useAuth));
    if (subAccounts && subAccounts.length > 0) {
      const stockSubAccount = subAccounts.find(account =>
        account.info?.account_type === 'stock' ||
        ['ETH', 'BTC'].includes(account.symbol)
      );
      const balanceSubAccount = subAccounts.find(account =>
        account.info?.account_type === 'balance' ||
        ['USDT', 'USD', 'USDC'].includes(account.symbol)
      );

      if (stockSubAccount && balanceSubAccount) {
        resolvedStockSymbol = stockSubAccount.symbol;
        resolvedQuoteSymbol = balanceSubAccount.symbol;
        resolvedStockBalance = typeof stockSubAccount.balance === 'number'
          ? stockSubAccount.balance
          : (parseFloat(stockSubAccount.balance) || 0);
        resolvedQuoteBalance = typeof balanceSubAccount.balance === 'number'
          ? balanceSubAccount.balance
          : (parseFloat(balanceSubAccount.balance) || 0);
      }
    }
  } catch (error) {
    console.warn('fetchMarketSnapshot: failed to fetch sub-accounts; using fallback context', error);
  }

  let price: number | null = null;
  let warmingUp = false;
  const effectiveEndTime = options.endTimeMs ?? Date.now();

  try {
    const equityCurve = await requestWithAuthFallback(useAuth =>
      getEquityCurve(
        trading.id,
        '1m',
        1,
        resolvedStockSymbol,
        resolvedQuoteSymbol,
        useAuth,
        trading.exchange_binding?.exchange_type,
        effectiveEndTime
      )
    );

    price = extractPriceFromEquityCurve(equityCurve);
    warmingUp = equityCurve?.warming_up === true;
  } catch (error) {
    console.warn('fetchMarketSnapshot: failed to fetch 1m price', error);
  }

  return {
    stockSymbol: resolvedStockSymbol,
    quoteSymbol: resolvedQuoteSymbol,
    stockBalance: resolvedStockBalance,
    quoteBalance: resolvedQuoteBalance,
    price,
    warmingUp,
  };
}
