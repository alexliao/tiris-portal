# Candlestick Chart Timeframe Fix

## Problem
The candlestick chart was not reflecting the selected timeframe. It was always showing 1-minute candles regardless of the timeframe selection (1m, 1h, 4h, 8h, 1d, 1w).

## Root Cause
1. The `getOHLCV` API function had the timeframe hardcoded to `'1m'`
2. The `CandlestickChart` component was receiving the `timeframe` prop but not passing it to the API call
3. The useEffect dependency array didn't include `timeframe`, so it wouldn't refetch when timeframe changed

## Solution

### 1. Updated `getOHLCV` API Function (`src/utils/api.ts`)
Added `timeframe` as a parameter:

```typescript
export async function getOHLCV(
  exchange: string,
  market: string,
  startTime: number,
  endTime: number,
  timeframe: string = '1m',  // NEW PARAMETER
  onMiss: 'warmup' | 'none' = 'warmup'
): Promise<OHLCVCandle[]> {
  const params = new URLSearchParams({
    ex: exchange.toLowerCase(),
    market: market,
    tf: timeframe,  // Use dynamic timeframe instead of hardcoded '1m'
    start: startTime.toString(),
    end: endTime.toString(),
    on_miss: onMiss
  });
  // ...
}
```

### 2. Updated CandlestickChart Component (`src/components/trading/CandlestickChart.tsx`)

**Pass timeframe to API call:**
```typescript
let candles = await getOHLCV(exchange, marketFormatted, startTime, endTime, timeframe);
```

**Added timeframe to useEffect dependencies:**
```typescript
}, [exchange, market, startTime, endTime, timeframe, hasInitialized]);
```

This ensures the chart refetches data whenever the timeframe changes.

## Result

Now when users select different timeframes:
- **1m**: Shows 1-minute candles
- **1h**: Shows 1-hour candles
- **4h**: Shows 4-hour candles
- **8h**: Shows 8-hour candles
- **1d**: Shows daily candles
- **1w**: Shows weekly candles

All three charts (equity curve, position, and candlestick) now properly sync with the selected timeframe.

## Testing
1. Select different timeframes using the buttons (1m, 1h, 4h, 8h, 1d, 1w)
2. Verify the candlestick chart updates to show candles of the selected timeframe
3. Check console logs to confirm: `Fetching OHLCV for ETH_USDT with timeframe 1h from ...`
4. Verify all three charts show the same time range
