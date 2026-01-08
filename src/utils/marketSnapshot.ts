import {
  getOHLCV,
  getEquityCurve,
  getPortfolioEquityCurve,
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

type CachedPriceEntry = {
  status: 'warming' | 'ready';
  price: number | null;
  warmingUp: boolean;
  promise?: Promise<void>;
};

type PriceCache = Record<string, Record<number, CachedPriceEntry>>;
const latestPriceCache: PriceCache = {};

const getPriceEntry = (market: string, minuteKey: number): CachedPriceEntry | null => {
  return latestPriceCache[market]?.[minuteKey] ?? null;
};

const ensurePriceEntry = (market: string, minuteKey: number): CachedPriceEntry => {
  if (!latestPriceCache[market]) {
    latestPriceCache[market] = {};
  }
  if (!latestPriceCache[market][minuteKey]) {
    latestPriceCache[market][minuteKey] = { status: 'warming', price: null, warmingUp: false };
  }
  return latestPriceCache[market][minuteKey];
};

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

  // Use the previous minute's data (current time - 60s) to avoid backend warmup delays.
  // The current minute's candle is still forming, causing the backend to warm up on every request.
  // The previous minute's data is finalized and can be returned immediately from the database.
  const effectiveEndTime = options.endTimeMs ?? (Date.now() - 60_000);
  const minuteKey = Math.floor(effectiveEndTime / 60000) * 60; // seconds precision per minute
  const market = `${resolvedStockSymbol}_${resolvedQuoteSymbol}`;

  const fetchPrice = async (entry: CachedPriceEntry): Promise<void> => {
    let fetchedPrice: number | null = null;
    let fetchedWarming = false;

    // Try the cheaper OHLCV endpoint first for the latest 1m close
    try {
      const exchangeType = trading.exchange_binding?.exchange_type;
      if (exchangeType) {
        const startTime = effectiveEndTime - 60_000; // 1 minute window
        const ohlcv = await getOHLCV(exchangeType, market, startTime, effectiveEndTime, '1m', 'warmup', Number.POSITIVE_INFINITY);
        const latestCandle = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;
        const latestClose = latestCandle?.c;
        if (typeof latestClose === 'number' && Number.isFinite(latestClose) && latestClose > 0) {
          fetchedPrice = latestClose;
        } else {
          fetchedWarming = true;
        }
      }
    } catch (error) {
      console.warn('fetchMarketSnapshot: failed to fetch OHLCV price; falling back to equity curve', error);
    }

    // Fallback to equity curve if OHLCV price is unavailable
    if (fetchedPrice === null) {
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

        fetchedPrice = extractPriceFromEquityCurve(equityCurve);
        fetchedWarming = equityCurve?.warming_up === true;
      } catch (error) {
        console.warn('fetchMarketSnapshot: failed to fetch 1m price', error);
      }
    }

    entry.price = Number.isFinite(fetchedPrice ?? NaN) && (fetchedPrice ?? 0) > 0 ? fetchedPrice : null;
    entry.warmingUp = fetchedWarming || fetchedPrice === null;
    entry.status = entry.price === null ? 'warming' : 'ready';
  };

  const triggerFetchIfNeeded = (entry: CachedPriceEntry): void => {
    if (entry.promise) {
      return;
    }
    entry.promise = fetchPrice(entry).finally(() => {
      entry.promise = undefined;
    });
  };

  const entry = getPriceEntry(market, minuteKey);
  if (entry && entry.status === 'ready') {
    return {
      stockSymbol: resolvedStockSymbol,
      quoteSymbol: resolvedQuoteSymbol,
      stockBalance: resolvedStockBalance,
      quoteBalance: resolvedQuoteBalance,
      price: entry.price,
      warmingUp: entry.warmingUp,
    };
  }

  const workingEntry = entry ?? ensurePriceEntry(market, minuteKey);
  triggerFetchIfNeeded(workingEntry);

  return {
    stockSymbol: resolvedStockSymbol,
    quoteSymbol: resolvedQuoteSymbol,
    stockBalance: resolvedStockBalance,
    quoteBalance: resolvedQuoteBalance,
    price: workingEntry.price,
    warmingUp: workingEntry.status === 'warming' || workingEntry.warmingUp,
  };
}

export async function fetchPortfolioSnapshot(
  portfolioId: string,
  trading: Trading,
  options: MarketSnapshotOptions = {},
): Promise<MarketSnapshot> {
  const fallbackContext = deriveMarketContextFromTrading(trading);

  const requestWithAuthFallback = async <T,>(request: (useAuth: boolean) => Promise<T>): Promise<T> => {
    if (options.attemptPublicFirst) {
      return options.attemptPublicFirst(request);
    }
    return request(true);
  };

  const effectiveEndTime = options.endTimeMs ?? (Date.now() - 60_000);
  let snapshot: MarketSnapshot = {
    ...fallbackContext,
    price: null,
    warmingUp: false,
  };

  try {
    const equityCurve = await requestWithAuthFallback(useAuth =>
      getPortfolioEquityCurve(portfolioId, '1m', 1, useAuth, effectiveEndTime)
    );

    if (equityCurve?.data_points?.length) {
      const latestPoint = equityCurve.data_points[equityCurve.data_points.length - 1];
      const latestPrice =
        typeof latestPoint?.ohlcv?.close === 'number' && Number.isFinite(latestPoint.ohlcv.close) && latestPoint.ohlcv.close > 0
          ? latestPoint.ohlcv.close
          : typeof latestPoint?.stock_price === 'number' && Number.isFinite(latestPoint.stock_price) && latestPoint.stock_price > 0
            ? latestPoint.stock_price
            : null;

      snapshot = {
        stockSymbol: fallbackContext.stockSymbol,
        quoteSymbol: fallbackContext.quoteSymbol,
        stockBalance:
          typeof latestPoint.stock_balance === 'number' && Number.isFinite(latestPoint.stock_balance)
            ? latestPoint.stock_balance
            : fallbackContext.stockBalance,
        quoteBalance:
          typeof latestPoint.quote_balance === 'number' && Number.isFinite(latestPoint.quote_balance)
            ? latestPoint.quote_balance
            : fallbackContext.quoteBalance,
        price: latestPrice,
        warmingUp: equityCurve?.warming_up === true || latestPrice === null,
      };
    }
  } catch (error) {
    console.warn('fetchPortfolioSnapshot: failed to fetch portfolio equity curve; using fallback context', error);
  }

  return snapshot;
}
