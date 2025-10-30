# Equity Curve API Update Summary

## Overview
Updated the equity curve data fetching implementation to use the new backend API interface with timeframe-based data loading.

## Changes Made

### 1. API Layer (`src/utils/api.ts`)
- **Updated `getEquityCurve` function return type**: Changed from `EquityCurveData` to `EquityCurveNewData`
- The function now correctly returns the new API response format with:
  - `trading_id`: Trading identifier
  - `timeframe`: Selected timeframe (1m, 1h, 4h, 8h, 1d, 1w)
  - `start_time` and `end_time`: Time range for the data
  - `data_points`: Array of equity data points with:
    - `timestamp`: ISO timestamp
    - `equity`: Total assets value
    - `quote_balance`: Quote currency balance
    - `stock_balance`: Stock/asset balance
    - `stock_price`: Market price at that timestamp

### 2. Data Transformation (`src/components/trading/TradingPerformanceWidget.tsx`)
- **Updated import**: Changed from `transformEquityCurveToChartData` to `transformNewEquityCurveToChartData`
- **Updated data transformation call**: Now uses the new transformation function that handles the `EquityCurveNewData` format
- This ensures proper handling of the new API response structure

### 3. Timeframe Selection UI
- **Implemented timeframe buttons**: Added buttons for 1m, 1h, 4h, 8h, 1d, 1w
- **Always loads 100 recent timeframes**: The API call uses `recent_timeframes=100` parameter
- **Synced all charts**: 
  - Equity curve chart updates based on selected timeframe
  - Position chart syncs with the same time range
  - Candlestick chart syncs with the same time range (still uses 1m candles as per API limitation)

### 4. Chart Synchronization (`src/components/trading/CandlestickChart.tsx`)
- **Added timeframe prop**: Added optional `timeframe` parameter to CandlestickChart interface
- **Passed timeframe from parent**: TradingPerformanceWidget now passes the selected timeframe to CandlestickChart
- **Time range synchronization**: CandlestickChart automatically syncs with the equity curve time range through `startTime` and `endTime` props

## API Behavior

### New Endpoint Parameters
```
GET /tradings/{trading_id}/equity-curve?timeframe={tf}&recent_timeframes=100&stock_symbol=BTC&quote_symbol=USDT
```

- `timeframe`: Time interval between data points (1m, 1h, 4h, 8h, 1d, 1w)
- `recent_timeframes`: Number of recent timeframes to retrieve (set to 100)
- `stock_symbol`: Stock/asset symbol (e.g., BTC, ETH)
- `quote_symbol`: Quote currency symbol (e.g., USDT, USD)

### Data Loading Strategy
1. User selects a timeframe (e.g., "1h")
2. Frontend requests 100 recent timeframes of that interval
3. Backend calculates: `time_range = 100 × timeframe_duration`
4. Backend returns equity data points at the selected interval
5. All charts update to show the same time range

## Benefits

1. **Consistent Time Ranges**: All charts (equity, position, candlestick) show the same time period
2. **Flexible Granularity**: Users can zoom in (1m, 1h) or zoom out (1d, 1w) to see different levels of detail
3. **Fixed Data Points**: Always loads 100 data points regardless of timeframe, ensuring consistent chart density
4. **Efficient Loading**: Only loads the necessary data for the selected view
5. **Real-time Sync**: When timeframe changes, all charts update together

## Testing Recommendations

1. Test each timeframe button (1m, 1h, 4h, 8h, 1d, 1w)
2. Verify that all three charts (equity, position, candlestick) show the same time range
3. Confirm that 100 data points are loaded for each timeframe
4. Check that the auto-refresh functionality still works correctly
5. Verify that trading signals (buy/sell dots) appear correctly on all timeframes

## Future Enhancements

1. **Custom Time Range**: Add date pickers to allow users to select specific start/end dates
2. **Timeframe-specific Candles**: When backend supports multiple OHLCV timeframes, update CandlestickChart to use matching candle intervals
3. **Performance Optimization**: Implement data caching to avoid re-fetching unchanged data
4. **Zoom Controls**: Add zoom in/out buttons for finer control over visible time range
