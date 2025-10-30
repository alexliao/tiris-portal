import { getEquityCurve, type Trading } from './api';
import { resolveEffectiveStockPrice } from './portfolioMetrics';

/**
 * Ultra-lightweight trading metrics that only require the latest data point
 * from the equity curve. No historical data needed.
 */
export interface LightweightTradingMetrics {
  currentEquity: number | null;
  currentROI: number;
  unrealizedPnL: number;
  quoteBalance: number;
  stockBalance: number | null;
  stockPrice: number | null;
  benchmarkReturn: number | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches the latest equity curve data point and calculates ultra-lightweight metrics.
 * This is optimized for trading list cards - only fetches 1 recent timeframe.
 *
 * @param trading - Trading object with initial funds info
 * @param stockSymbol - Stock symbol (e.g., 'ETH', 'BTC')
 * @param quoteSymbol - Quote symbol (e.g., 'USDT', 'USD')
 * @param timeframe - Timeframe for equity curve (default: '1d' for minimal data)
 * @returns Calculated metrics from the latest data point
 *
 * @example
 * const metrics = await fetchLightweightMetrics(trading, 'ETH', 'USDT');
 * console.log(`Portfolio Value: $${metrics.currentEquity}`);
 * console.log(`ROI: ${metrics.currentROI.toFixed(2)}%`);
 */
export async function fetchLightweightMetrics(
  trading: Trading,
  stockSymbol: string = 'BTC',
  quoteSymbol: string = 'USDT',
  timeframe: string = '1d',
  options: {
    stockBalance?: number;
    quoteBalance?: number;
    requireAuth?: boolean;
    exchangeType?: string;
  } = {}
): Promise<LightweightTradingMetrics> {
  const initialFunds = (trading.info?.initial_funds as number | undefined) ?? 0;
  const resolvedRequireAuth =
    options.requireAuth ?? (trading.type !== 'paper' && trading.type !== 'backtest');

  try {
    // Fetch only 1 recent timeframe - minimal data transfer (~500 bytes)
    const equityCurveData = await getEquityCurve(
      trading.id,
      timeframe,
      1, // Only get the latest point
      stockSymbol,
      quoteSymbol,
      resolvedRequireAuth,
      options.exchangeType
    );

    // Get the latest data point
    const latestPoint = equityCurveData.data_points[equityCurveData.data_points.length - 1];

    if (!latestPoint) {
      // No data points available yet
      return {
        currentEquity: null,
        currentROI: 0,
        unrealizedPnL: 0,
        quoteBalance: 0,
        stockBalance: null,
        stockPrice: null,
        benchmarkReturn: null,
        isLoading: false,
        error: null,
      };
    }

    const resolvedStockBalance =
      typeof options.stockBalance === 'number' && Number.isFinite(options.stockBalance)
        ? options.stockBalance
        : typeof latestPoint.stock_balance === 'number' && Number.isFinite(latestPoint.stock_balance)
          ? latestPoint.stock_balance
          : 0;

    const resolvedQuoteBalance =
      typeof options.quoteBalance === 'number' && Number.isFinite(options.quoteBalance)
        ? options.quoteBalance
        : typeof latestPoint.quote_balance === 'number' && Number.isFinite(latestPoint.quote_balance)
          ? latestPoint.quote_balance
          : 0;

    const stockPrice = resolveEffectiveStockPrice({
      candlestickData: undefined,
      fallbackPrice: equityCurveData.baseline_price,
      equityCurve: {
        ...equityCurveData,
        data_points: [latestPoint],
      },
    });

    const fallbackEquity =
      typeof latestPoint.equity === 'number' && Number.isFinite(latestPoint.equity)
        ? latestPoint.equity
        : initialFunds;

    const currentEquity =
      typeof stockPrice === 'number'
        ? resolvedQuoteBalance + resolvedStockBalance * stockPrice
        : fallbackEquity;

    const unrealizedPnL = currentEquity - initialFunds;
    const currentROI = initialFunds > 0 ? (unrealizedPnL / initialFunds) * 100 : 0;

    const benchmarkReturn =
      typeof latestPoint.benchmark_return === 'number' && Number.isFinite(latestPoint.benchmark_return)
        ? latestPoint.benchmark_return * 100
        : null;

    return {
      currentEquity,
      currentROI,
      unrealizedPnL,
      quoteBalance: resolvedQuoteBalance,
      stockBalance: resolvedStockBalance,
      stockPrice: typeof stockPrice === 'number' ? stockPrice : null,
      benchmarkReturn,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch lightweight metrics:', error);

    return {
      currentEquity: null,
      currentROI: 0,
      unrealizedPnL: 0,
      quoteBalance: 0,
      stockBalance: null,
      stockPrice: null,
      benchmarkReturn: null,
      isLoading: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Format ROI value for display
 * @param roi - ROI percentage value
 * @returns Formatted string (e.g., "+15.5%", "-8.2%")
 */
export function formatROI(roi: number): string {
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(2)}%`;
}

/**
 * Get color class for ROI display (Tailwind classes)
 * @param roi - ROI percentage value
 * @returns Tailwind color classes
 */
export function getROIColorClass(roi: number): string {
  if (roi > 0) {
    return 'text-green-600'; // Positive return
  } else if (roi < 0) {
    return 'text-red-600'; // Negative return
  }
  return 'text-gray-600'; // No change
}

/**
 * Get background color class for ROI badge
 * @param roi - ROI percentage value
 * @returns Tailwind background and text classes
 */
export function getROIBadgeClass(roi: number): string {
  if (roi > 0) {
    return 'bg-green-100 text-green-800';
  } else if (roi < 0) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

/**
 * Format currency value for display
 * @param value - Numeric value
 * @param currency - Currency symbol (default: '$')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number, currency = '$', decimals = 2): string {
  return `${currency}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
