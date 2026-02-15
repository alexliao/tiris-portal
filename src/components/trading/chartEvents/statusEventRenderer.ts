import type { BotChartEvent } from '../../../utils/api';

export interface StatusEventInterval {
  startSec: number;
  endSec: number;
  color: string;
}

export type StatusEventDisplayType = 'bgcolor' | 'plotshape';

export type ChartEventMarkerShape = 'arrowUp' | 'arrowDown' | 'circle' | 'square';
export type ChartEventMarkerPosition =
  | 'aboveBar'
  | 'belowBar'
  | 'inBar'
  | 'atPriceTop'
  | 'atPriceBottom'
  | 'atPriceMiddle';

export interface PlotShapeEventMarker {
  timeSec: number;
  color: string;
  shape: ChartEventMarkerShape;
  position: ChartEventMarkerPosition;
  price?: number;
  text?: string;
}

export interface ChartEventLayers {
  backgroundIntervals: StatusEventInterval[];
  plotShapeMarkers: PlotShapeEventMarker[];
}

interface ChartEventParseContext {
  timeframeSec: number;
}

interface ChartEventParser {
  kind: StatusEventDisplayType;
  match: (eventType: string) => boolean;
  parse: (event: BotChartEvent, context: ChartEventParseContext, output: ChartEventLayers) => void;
}

const STATUS_BACKGROUND_EVENT_TYPES = new Set(['bgcolor', 'background_color', 'bar_bgcolor']);

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

const readPayloadSources = (
  payload: Record<string, unknown> | undefined
): Array<Record<string, unknown>> => {
  if (!payload) {
    return [];
  }

  const sources: Array<Record<string, unknown>> = [payload];
  if (payload.params && typeof payload.params === 'object') {
    sources.push(payload.params as Record<string, unknown>);
  }
  return sources;
};

const readStringFromPayload = (
  payload: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined => {
  const sources = readPayloadSources(payload);
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
  }
  return undefined;
};

const readNumberFromPayload = (
  payload: Record<string, unknown> | undefined,
  keys: string[]
): number | undefined => {
  const sources = readPayloadSources(payload);
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
  }
  return undefined;
};

const mapPlotShapeStyle = (style?: string): ChartEventMarkerShape => {
  const normalized = style?.toLowerCase().trim();
  switch (normalized) {
    case 'triangleup':
    case 'arrowup':
    case 'up':
      return 'arrowUp';
    case 'triangledown':
    case 'arrowdown':
    case 'down':
      return 'arrowDown';
    case 'diamond':
      return 'square';
    case 'square':
      return 'square';
    case 'circle':
    default:
      return 'circle';
  }
};

const mapPlotShapeLocation = (
  location: string | undefined,
  hasAbsolutePrice: boolean
): ChartEventMarkerPosition => {
  const normalized = location?.toLowerCase().trim();

  if (normalized === 'absolute') {
    return hasAbsolutePrice ? 'atPriceMiddle' : 'inBar';
  }

  if (normalized === 'top' || normalized === 'abovebar') {
    return 'aboveBar';
  }

  if (normalized === 'bottom' || normalized === 'belowbar') {
    return 'belowBar';
  }

  return 'inBar';
};

const backgroundEventParser: ChartEventParser = {
  kind: 'bgcolor',
  match: (eventType) => isBackgroundEventType(eventType),
  parse: (event, context, output) => {
    const barTime = parseEventBarTimeSeconds(event);
    if (barTime === null) {
      return;
    }

    const color = readColorFromPayload(event.payload);
    if (!color) {
      return;
    }

    output.backgroundIntervals.push({
      startSec: barTime,
      endSec: barTime + context.timeframeSec,
      color,
    });
  },
};

const plotShapeEventParser: ChartEventParser = {
  kind: 'plotshape',
  match: (eventType) => eventType.toLowerCase().trim() === 'plotshape',
  parse: (event, _context, output) => {
    const timeSec = parseEventBarTimeSeconds(event);
    if (timeSec === null) {
      return;
    }

    const color = readColorFromPayload(event.payload) ?? '#111827';
    const style = readStringFromPayload(event.payload, ['style', 'shape']);
    const value = readNumberFromPayload(event.payload, ['value', 'price', 'y']);
    const location = readStringFromPayload(event.payload, ['location']);
    const text = readStringFromPayload(event.payload, ['text', 'label', 'title']);
    const position = mapPlotShapeLocation(location, Number.isFinite(value));

    output.plotShapeMarkers.push({
      timeSec,
      color,
      shape: mapPlotShapeStyle(style),
      position,
      price: Number.isFinite(value) ? value : undefined,
      text,
    });
  },
};

const EVENT_PARSERS: ChartEventParser[] = [backgroundEventParser, plotShapeEventParser];

export const buildChartEventLayers = (
  events: BotChartEvent[],
  tradingTimeframe?: string,
  enabledKinds?: StatusEventDisplayType[]
): ChartEventLayers => {
  const layers: ChartEventLayers = {
    backgroundIntervals: [],
    plotShapeMarkers: [],
  };
  const enabledSet = new Set<StatusEventDisplayType>(
    enabledKinds && enabledKinds.length > 0 ? enabledKinds : ['bgcolor', 'plotshape']
  );

  const context: ChartEventParseContext = {
    timeframeSec: Math.max(timeframeToSeconds(tradingTimeframe), 1),
  };

  events.forEach((event) => {
    const normalizedType = event.event_type.toLowerCase().trim();
    for (const parser of EVENT_PARSERS) {
      if (!enabledSet.has(parser.kind)) {
        continue;
      }
      if (!parser.match(normalizedType)) {
        continue;
      }
      parser.parse(event, context, layers);
      return;
    }
  });

  layers.backgroundIntervals.sort((a, b) => a.startSec - b.startSec);
  layers.plotShapeMarkers.sort((a, b) => a.timeSec - b.timeSec);

  return layers;
};

export const buildStatusEventIntervals = (
  events: BotChartEvent[],
  tradingTimeframe?: string
): StatusEventInterval[] => {
  return buildChartEventLayers(events, tradingTimeframe).backgroundIntervals;
};
