import type { BotChartEvent } from '../../../utils/api';

export interface StatusEventInterval {
  startSec: number;
  endSec: number;
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

const timeframeToSeconds = (timeframe?: string): number => {
  const normalized = typeof timeframe === 'string' ? timeframe.trim().toLowerCase() : '';
  const map: Record<string, number> = {
    '1m': 60,
    '5m': 5 * 60,
    '15m': 15 * 60,
    '30m': 30 * 60,
    '1h': 60 * 60,
    '2h': 2 * 60 * 60,
    '4h': 4 * 60 * 60,
    '8h': 8 * 60 * 60,
    '12h': 12 * 60 * 60,
    '1d': 24 * 60 * 60,
    '1w': 7 * 24 * 60 * 60,
  };
  return map[normalized] ?? 60 * 60;
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

export const buildStatusEventIntervals = (
  events: BotChartEvent[],
  tradingTimeframe?: string
): StatusEventInterval[] => {
  const intervals: StatusEventInterval[] = [];
  const durationSec = Math.max(timeframeToSeconds(tradingTimeframe), 1);

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

    intervals.push({
      startSec: barTime,
      endSec: barTime + durationSec,
      color,
    });
  });

  intervals.sort((a, b) => a.startSec - b.startSec);
  return intervals;
};
