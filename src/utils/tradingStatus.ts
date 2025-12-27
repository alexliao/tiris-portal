export type TradingStatusInfo = Record<string, unknown> & {
  end_date?: unknown;
};

const parseDateValue = (value: unknown): number | null => {
  if (!value) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

export const isTradingActive = (
  trading: { info?: TradingStatusInfo | null } | null | undefined,
  now: Date = new Date()
): boolean => {
  if (!trading) return false;

  const endDateValue = trading.info?.end_date ?? null;
  if (endDateValue === null || endDateValue === undefined) {
    return true;
  }

  const endTime = parseDateValue(endDateValue);
  if (endTime === null) {
    return true;
  }

  return endTime >= now.getTime();
};
