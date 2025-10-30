# Performance Chart Specification

## Overview

The performance chart provides a comprehensive visualization of trading performance with synchronized multi-chart display. It shows assets returns, market prices, position holdings, and trading signals across multiple timeframes.

## Architecture

The performance chart consists of three stacked sub-charts/series:

### 1. Return Chart
Displays assets performance with multiple layers:
- **Equity Curve (Green Area)**: Assets return percentage (ROI %) over time
- **Benchmark Curve (Amber Dashed Line)**: Market benchmark return for comparison
- **Trading Signals (long/short/stop_loss/debit/withdraw)**: Visual markers for executed trades on the chart
  - **Long/Buy**: Blue upward arrow marker aligned with the benchmark curve
  - **Short/Sell**: Red downward arrow marker aligned with the curve
  - **Stop-Loss**: Orange downward arrow marker highlighting risk exits
  - **Deposit**: Green circle marker indicating capital inflow
  - **Withdraw**: Purple square marker indicating capital outflow

### 2. Position Chart
Occupies approximately one-fourth of the Return Chart height and shows:
- **Position Holdings**: Quantity of the traded asset held at each timestamp
- Uses area chart visualization (Blue color) for clear visibility of position changes

### 3. Candlestick Chart (Market Chart)
Displays OHLCV (Open, High, Low, Close, Volume) price data:
- Synchronized with Return Chart on time range and visible window
- Shows market price action for the underlying asset
- Supports volume visualization

## Chart Synchronization

All three charts are fully synchronized:
- **Time Range Alignment**: All charts display the same time period
- **Y-Axis Alignment**: Left and right axes are aligned across all charts
- **Visible Window Synchronization**: Panning in one chart pans all charts to the same visible data range
- **Timeframe Consistency**: Changing timeframe updates all charts simultaneously

## Timeframe Selection

Users can select from the following timeframes via UI buttons:
- 1 minute (1m)
- 1 hour (1h)
- 8 hours (8h)
- 1 day (1d)

When a timeframe is selected:
1. All charts switch to the new timeframe
2. Data is reloaded and re-displayed
3. Visible window resets to the most recent 100 data points

## Data Loading Strategy

### Initial Load
The system implements an optimized data loading strategy to balance performance and memory usage:
- Loads approximately **500 data points** per timeframe during initialization
- Displays a **visible window of approximately 100 points** at a time
- Allows horizontal panning to view different sections of pre-loaded data
- Eliminates backend API calls during panning operations

### Data Sources

All sub-charts use data from the backend API endpoint GET /tradings/{id}/equity-curve

### Trading Signal Matching
Trading signals are matched to equity curve data points using dynamic time windows based on the selected timeframe:
- Accounts for timestamp precision differences between data sources
- Ensures signals appear correctly on all charts regardless of timeframe

## Performance Metrics Display

The chart displays key performance metrics:
- **ROI (Return on Investment)**: Total assets return percentage
- **Win Rate**: Percentage of profitable trades
- **Sharpe Ratio**: Risk-adjusted return measure
- **Max Drawdown**: Largest peak-to-trough decline
- **Total Trades**: Number of trades executed

## Auto-Refresh Functionality

All charts support automatic data refresh with intelligent incremental updates:

### Default Behavior
- Charts automatically refresh with new data
- Toggle Switch: Users can enable/disable auto-refresh via UI switch

### Incremental Update Strategy
To minimize API load and improve performance during auto-refresh:
- **Time-Range Based Fetching**: Tracks the timestamp of the last loaded data point
- **Incremental API Calls**: Uses `start_time`/`end_time` parameters instead of `recent_timeframes`
- **New Data Only**: Fetches only data points after the last recorded timestamp
- **Append to Existing**: New data is appended to the pre-loaded dataset rather than replacing all 500 points

### Implementation Details
- Last update timestamp is tracked from the most recent complete/final data point's timestamp
- Start time for incremental fetch = (last timestamp + timeframe duration)
- End time = current time
- Each new data point received extends the dataset incrementally
- Metrics are recalculated from the complete dataset to ensure accuracy

## User Interactions

### Panning
- **Mouse Wheel Scrolling**: Scroll to pan left/right through the data
- **No API Calls**: Panning uses pre-loaded data slices; no backend requests
- **Synchronized Panning**: Moving in one chart pans all synchronized charts

### Auto-Scroll During Incremental Updates
- **Auto-Follow Latest Data**: When viewing the end of the data (within 5 points of the latest), charts automatically scroll to show newly appended data
- **User Control Preserved**: If user pans to historical data, auto-scroll is disabled to preserve user position
- **Smart Detection**: Uses visible window position to detect if user is at the end of the chart
- **Interaction-Aware**: Disables auto-scroll when user is actively panning (detected via mouse wheel events)
- **Debounce Protection**: Waits 500ms after last pan action before re-enabling auto-scroll, ensuring smooth user interactions

## Performance Optimizations

### 1. Efficient Data Pre-loading
- Load 500 recent data points once per timeframe change
- Avoid repeated API calls for historical data
- Pre-load the entire time range for OHLCV data

### 2. Slicing Without Re-fetching
- Pan operation use array slicing of pre-loaded data
- Maintain visible data start and end indices
- Eliminates backend calls during user interactions

### 3. Incremental Auto-Refresh
- During auto-refresh, fetches only new data since last update using time-range API parameters
- Tracks timestamp of most recent data point for subsequent fetches
- Appends new data to existing dataset instead of reloading entire 500-point window
- Reduces API payload and network bandwidth during continuous monitoring
- Fallback to full 500-point reload if no previous timestamp exists

### 4. Intelligent Data Merging
- During auto-refresh, compare new data with existing data using timestamps as keys
- Only add truly new data points; avoid duplicates and unnecessary re-renders

### 5. Component Memoization
- Memoize chart components to prevent unnecessary re-renders
- Use custom comparison functions for props equality checks
- Optimize state updates to trigger only when data actually changes

### 6. Event Matching Optimization
- Use dynamic time windows based on timeframe for event matching
- Reduces computation overhead compared to fixed time window approaches

## Technical Implementation

### Key Components
- **TradingPerformanceWidget**: Main orchestration component managing data fetching and chart rendering
- **CandlestickChart**: Lightweight-charts library integration for OHLCV visualization

### Data Transformation
- Equity curve data is transformed to ROI percentages
- Trading logs are matched to benchmark data points for signal placement
- OHLCV data is pre-sliced for visible window display

### State Management
- Maintains visible window indices for synchronized panning
- Tracks current timeframe selection
- Manages pre-loaded data for each timeframe
- Handles auto-refresh toggle state
- **Incremental Update Tracking**: Stores timestamp of last loaded data point for intelligent incremental fetches
 
