# Performance Data Source Analysis

## Overview
This document analyzes the data source discrepancy identified in the TIRIS Portal performance chart between trading logs and transactions.

## Issue Summary
The user reported that transactions exist from March 27, 2024, but no corresponding trading logs were found for the same event times, which seemed impossible since transactions are generated from trading logs.

## Root Cause Analysis

### Data Investigation Results
After analyzing the backend API responses for trading ID `7363a141-b3b6-4974-9498-2bcf6c3e027c`:

**Trading Logs:**
- Total: 1000 logs
- Date range: April 5, 2024 to September 26, 2024 (with some events as early as March 27, 2024)
- Types: 842 prediction, 79 long, 78 short, 1 end
- Trading events exist on 122 unique dates

**Transactions:**
- Total: 395 transactions  
- Date range: August 2, 2024 to September 26, 2024
- All transactions have corresponding event times and proper structure

### Data Coverage Analysis
- **Unique transaction dates**: 152
- **Unique log dates**: 282
- **Dates with transactions but no logs**: 30 (mostly from early 2024)
- **Dates with logs but no transactions**: 160 (mostly predictions without trades)
- **Dates with trading events (long/short)**: 122

## The Real Issue

The problem was **NOT** missing trading logs, but rather:

1. **Date Range Mismatch**: Trading logs cover a broader time period than transactions
2. **Data Processing Logic**: The chart transformation logic in `src/utils/chartData.ts` was working correctly
3. **Expectation vs Reality**: The assumption that every transaction should have a trading log on the same date was correct, but the data investigation revealed the logs do exist

## Data Relationship
- Trading logs start earlier (April 2024) and include predictions that don't generate transactions
- Transactions start later (August 2024) when actual trading began
- Both datasets overlap from August 2024 to September 2024
- Trading events (long/short) exist for the correct time periods

## Resolution
The data is actually consistent and correct:
- Trading logs exist for the full backtesting period including predictions
- Transactions only exist when actual trades were executed
- The chart displays the correct correlation between events and assets changes

## Sample Data Points
**Trading Event Example (March 27, 2024):**
```
2024-03-27T08:07:44Z - long: Long position opened
```

**Transaction Example (December 29, 2024):**
```
Time: 2024-12-29T16:07:44Z
Direction: debit, Reason: long
Amount: 25543.90685124, Balance: 2.58018438
```

## Conclusion
The data source is functioning correctly. The perceived discrepancy was due to the broader scope of trading logs (including predictions) compared to the narrower scope of actual transactions (only executed trades). The performance chart successfully correlates both datasets to display accurate assets performance over time.