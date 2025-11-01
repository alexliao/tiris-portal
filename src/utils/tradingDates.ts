import { type Trading } from './api';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const calculateDayDifference = (start: Date, end: Date): number | null => {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;

  return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
};

export const getTradingDayCount = (trading: Trading | null | undefined): number | null => {
  if (!trading) return null;

  const info = trading.info as { start_date?: unknown; end_date?: unknown };
  const startDate = parseDateValue(info?.start_date) ?? parseDateValue(trading.created_at);
  if (!startDate) return null;

  const endDateValue = info?.end_date ?? null;
  const endDate = endDateValue !== null && endDateValue !== undefined ? parseDateValue(endDateValue) : null;

  if (trading.type === 'backtest') {
    if (!endDate) return null;
    return calculateDayDifference(startDate, endDate);
  }

  const effectiveEnd = endDate ?? new Date();
  return calculateDayDifference(startDate, effectiveEnd);
};
