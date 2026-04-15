const BACKTEST_WINDOW_START_YEAR = 2026;
const BACKTEST_WINDOW_START_MONTH_INDEX = 0;
const BACKTEST_WINDOW_START_DAY = 1;

export const createBacktestWindowStartDate = (): Date => {
  // Creates the configured backtest window start; takes no inputs and returns a fresh local Date for 2026-01-01 00:00:00.
  return new Date(
    BACKTEST_WINDOW_START_YEAR,
    BACKTEST_WINDOW_START_MONTH_INDEX,
    BACKTEST_WINDOW_START_DAY,
    0,
    0,
    0,
    0
  );
};
