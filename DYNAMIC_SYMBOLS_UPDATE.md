# Dynamic Symbol Detection Update

## Problem
The equity curve API was being called with hardcoded symbols (`BTC` and `USDT`) instead of dynamically detecting the actual stock and quote symbols from the trading's sub-accounts.

## Solution
Updated `TradingPerformanceWidget` to:

1. **Fetch sub-accounts** before loading equity curve data
2. **Detect stock symbol** from sub-accounts (ETH, BTC, etc.)
3. **Detect quote symbol** from sub-accounts (USDT, USD, USDC, etc.)
4. **Use detected symbols** for:
   - Equity curve API calls
   - Candlestick chart market symbol
   - Chart labels and tooltips

## Changes Made

### 1. Added Sub-Account Fetching
```typescript
// Fetch sub-accounts to determine stock and quote symbols
const subAccounts = await getSubAccountsByTrading(trading.id);

// Identify stock and balance sub-accounts
const stockSubAccount = subAccounts.find(account =>
  account.info?.account_type === 'stock' ||
  ['ETH', 'BTC'].includes(account.symbol)
);
const balanceSubAccount = subAccounts.find(account =>
  account.info?.account_type === 'balance' ||
  ['USDT', 'USD', 'USDC'].includes(account.symbol)
);
```

### 2. Added State for Symbols
```typescript
const [stockSymbol, setStockSymbol] = useState<string>('ETH');
const [quoteSymbol, setQuoteSymbol] = useState<string>('USDT');
```

### 3. Updated API Calls
```typescript
getEquityCurve(
  trading.id,
  selectedTimeframe,
  100,
  fetchedStockSymbol,  // Dynamic instead of 'BTC'
  fetchedQuoteSymbol,  // Dynamic instead of 'USDT'
  requireAuth
)
```

### 4. Updated Chart Components
- **CandlestickChart**: `market={`${stockSymbol}/${quoteSymbol}`}` instead of `"ETH/USDT"`
- **Chart Title**: Shows dynamic pair like "BTC/USDT" or "ETH/USDT"
- **Tooltips**: Display correct symbol in position labels

## Benefits

1. **Flexibility**: Works with any trading pair (BTC/USDT, ETH/USDT, etc.)
2. **Accuracy**: Always uses the correct symbols from the trading's actual sub-accounts
3. **Error Prevention**: Validates that both stock and balance sub-accounts exist
4. **Better UX**: Chart labels show the actual trading pair

## Error Handling

If sub-accounts are missing or invalid:
```
Error: Missing required sub-accounts. Found X sub-accounts, but need both stock and balance accounts.
```

This ensures the user knows when there's a configuration issue with the trading setup.
