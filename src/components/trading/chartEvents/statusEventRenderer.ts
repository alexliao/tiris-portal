import type { BotChartEvent } from '../../../utils/api';

export interface StatusBarStyle {
  color: string;
}

const STATUS_BACKGROUND_EVENT_TYPES = new Set([
  'bgcolor',
  'background_color',
  'bar_bgcolor',
]);

const isBackgroundEventType = (eventType: string): boolean => {
  const normalized = eventType.toLowerCase().trim();
  if (STATUS_BACKGROUND_EVENT_TYPES.has(normalized)) {
    return true;
  }
  return normalized.includes('bgcolor') || normalized.includes('background');
};

const toEpochSeconds = (value: number): number | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value >= 1_000_000_000_000) {
    return Math.floor(value / 1000);
  }

  return Math.floor(value);
};

const parseEventBarTimeSeconds = (event: BotChartEvent): number | null => {
  if (typeof event.bar_ts === 'number') {
    return toEpochSeconds(event.bar_ts);
  }

  const parsed = new Date(event.event_ts).getTime();
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.floor(parsed / 1000);
};

const readColorFromPayload = (payload: Record<string, unknown> | undefined): string | null => {
  if (!payload) {
    return null;
  }

  const candidateKeys = ['color', 'bgcolor', 'background', 'backgroundColor'];
  const sources: Array<Record<string, unknown>> = [payload];
  if (payload.params && typeof payload.params === 'object') {
    sources.push(payload.params as Record<string, unknown>);
  }

  for (const source of sources) {
    for (const key of candidateKeys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return null;
};

export const buildStatusBarStyleMap = (events: BotChartEvent[]): Map<number, StatusBarStyle> => {
  const styleBySecond = new Map<number, StatusBarStyle>();

  events.forEach((event) => {
    if (!isBackgroundEventType(event.event_type)) {
      return;
    }

    const barTime = parseEventBarTimeSeconds(event);
    if (barTime === null) {
      return;
    }

    const color = readColorFromPayload(event.payload);
    if (!color) {
      return;
    }

    styleBySecond.set(barTime, { color });
  });

  return styleBySecond;
};
