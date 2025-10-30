import type { EquityCurveNewData } from './api';
import type { TradingCandlestickPoint } from './chartData';

export interface PriceResolutionInput {
  candlestickData?: TradingCandlestickPoint[];
  fallbackPrice?: number;
  equityCurve?: EquityCurveNewData;
}

export function getFirstValidStockPrice(curve?: EquityCurveNewData): number | undefined {
  if (!curve?.data_points || curve.data_points.length === 0) {
    return undefined;
  }

  for (const point of curve.data_points) {
    const candidate = point.stock_price;
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return undefined;
}

export function resolveEffectiveStockPrice({
  candlestickData,
  fallbackPrice,
  equityCurve,
}: PriceResolutionInput): number | undefined {
  if (candlestickData && candlestickData.length > 0) {
    const lastCandle = candlestickData[candlestickData.length - 1];
    if (typeof lastCandle.close === 'number' && Number.isFinite(lastCandle.close) && lastCandle.close > 0) {
      return lastCandle.close;
    }
  }

  if (equityCurve?.data_points && equityCurve.data_points.length > 0) {
    const lastPoint = equityCurve.data_points[equityCurve.data_points.length - 1];
    const candidate = lastPoint?.stock_price;
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  if (equityCurve?.baseline_price && Number.isFinite(equityCurve.baseline_price) && equityCurve.baseline_price > 0) {
    return equityCurve.baseline_price;
  }

  if (typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return fallbackPrice;
  }

  return undefined;
}
