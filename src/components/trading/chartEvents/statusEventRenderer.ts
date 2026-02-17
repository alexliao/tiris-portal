import type { BotChartEvent } from '../../../utils/api';

export interface StatusEventInterval {
  startSec: number;
  endSec: number;
  color: string;
}

export type StatusEventDisplayType =
  | 'bgcolor'
  | 'fill'
  | 'plot'
  | 'plotcandle'
  | 'plotshape'
  | 'signal';

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

export interface StatusLinePoint {
  lineKey: string;
  handle?: string;
  series?: string;
  timeSec: number;
  value: number;
  color: string;
}

export interface StatusCandlePoint {
  candleKey?: string;
  timeSec: number;
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}

export interface ChartEventLayers {
  backgroundIntervals: StatusEventInterval[];
  statusMarkers: PlotShapeEventMarker[];
  statusLinePoints: StatusLinePoint[];
  statusCandles: StatusCandlePoint[];
}

interface ChartEventParseContext {
  timeframeSec: number;
  plotValueByTimeAndHandle: Map<string, number>;
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

const clampStyleColor = (color: string | null, fallback: string): string => color ?? fallback;

const buildPlotLookupKey = (timeSec: number, handle: string, series?: string): string =>
  `${timeSec}:${series ?? ''}:${handle}`;

const parseMarkerFromPayload = (
  event: BotChartEvent,
  fallback: {
    color: string;
    style?: string;
    location?: string;
    text?: string;
  } = { color: '#111827' }
): PlotShapeEventMarker | null => {
  const timeSec = parseEventBarTimeSeconds(event);
  if (timeSec === null) {
    return null;
  }

  const color = clampStyleColor(readColorFromPayload(event.payload), fallback.color);
  const style = readStringFromPayload(event.payload, ['style', 'shape']) ?? fallback.style;
  const value = readNumberFromPayload(event.payload, ['value', 'price', 'y']);
  const location = readStringFromPayload(event.payload, ['location']) ?? fallback.location;
  const text = readStringFromPayload(event.payload, ['text', 'label', 'title']) ?? fallback.text;
  const position = mapPlotShapeLocation(location, Number.isFinite(value));

  return {
    timeSec,
    color,
    shape: mapPlotShapeStyle(style),
    position,
    price: Number.isFinite(value) ? value : undefined,
    text,
  };
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

const fillEventParser: ChartEventParser = {
  kind: 'fill',
  match: (eventType) => eventType.toLowerCase().trim() === 'fill',
  parse: (event, context, output) => {
    const timeSec = parseEventBarTimeSeconds(event);
    if (timeSec === null) {
      return;
    }

    const upperHandle = readStringFromPayload(event.payload, ['upper']);
    const lowerHandle = readStringFromPayload(event.payload, ['lower']);
    if (!upperHandle || !lowerHandle) {
      return;
    }

    const fillSeries = readStringFromPayload(event.payload, ['series']);
    const upper =
      context.plotValueByTimeAndHandle.get(buildPlotLookupKey(timeSec, upperHandle, fillSeries)) ??
      context.plotValueByTimeAndHandle.get(buildPlotLookupKey(timeSec, upperHandle));
    const lower =
      context.plotValueByTimeAndHandle.get(buildPlotLookupKey(timeSec, lowerHandle, fillSeries)) ??
      context.plotValueByTimeAndHandle.get(buildPlotLookupKey(timeSec, lowerHandle));
    if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
      return;
    }

    const high = Math.max(upper as number, lower as number);
    const low = Math.min(upper as number, lower as number);
    const color = readColorFromPayload(event.payload) ?? 'rgba(59, 130, 246, 0.15)';
    const fillSeriesKey =
      fillSeries ??
      `${upperHandle}:${lowerHandle}`;

    // Render fill as a candle-range bar (open/high = upper, close/low = lower).
    output.statusCandles.push({
      candleKey: `fill:${fillSeriesKey}`,
      timeSec,
      open: upper as number,
      high,
      low,
      close: lower as number,
      color,
    });
  },
};

const plotShapeEventParser: ChartEventParser = {
  kind: 'plotshape',
  match: (eventType) => eventType.toLowerCase().trim() === 'plotshape',
  parse: (event, _context, output) => {
    const marker = parseMarkerFromPayload(event, { color: '#111827' });
    if (!marker) {
      return;
    }
    output.statusMarkers.push(marker);
  },
};

const signalEventParser: ChartEventParser = {
  kind: 'signal',
  match: (eventType) => eventType.toLowerCase().trim() === 'signal',
  parse: (event, _context, output) => {
    const direction =
      readStringFromPayload(event.payload, ['direction', 'side', 'signal'])?.toLowerCase() ?? '';

    const marker = parseMarkerFromPayload(event, {
      color: direction === 'buy' || direction === 'long' ? '#2563EB' : '#DC2626',
      style: direction === 'buy' || direction === 'long' ? 'triangleup' : 'triangledown',
      location: direction === 'buy' || direction === 'long' ? 'belowbar' : 'abovebar',
      text: direction ? direction.toUpperCase() : 'SIGNAL',
    });
    if (!marker) {
      return;
    }
    output.statusMarkers.push(marker);
  },
};

const plotEventParser: ChartEventParser = {
  kind: 'plot',
  match: (eventType) => eventType.toLowerCase().trim() === 'plot',
  parse: (event, _context, output) => {
    const timeSec = parseEventBarTimeSeconds(event);
    if (timeSec === null) {
      return;
    }
    const value = readNumberFromPayload(event.payload, ['value', 'price', 'y']);
    if (!Number.isFinite(value)) {
      return;
    }
    const color = 'rgba(156, 163, 175, 0.5)';
    const lineSeries = readStringFromPayload(event.payload, ['series']) ?? 'plot';
    const lineHandle =
      readStringFromPayload(event.payload, ['handle']) ??
      readStringFromPayload(event.payload, ['name', 'id', 'series', 'title']) ??
      'plot';
    output.statusLinePoints.push({
      lineKey: `plot:${lineHandle}`,
      handle: lineHandle,
      series: lineSeries,
      timeSec,
      value: value as number,
      color,
    });
  },
};

const plotCandleEventParser: ChartEventParser = {
  kind: 'plotcandle',
  match: (eventType) => eventType.toLowerCase().trim() === 'plotcandle',
  parse: (event, _context, output) => {
    const timeSec = parseEventBarTimeSeconds(event);
    if (timeSec === null) {
      return;
    }

    const open = readNumberFromPayload(event.payload, ['open', 'o']);
    const high = readNumberFromPayload(event.payload, ['high', 'h']);
    const low = readNumberFromPayload(event.payload, ['low', 'l']);
    const close = readNumberFromPayload(event.payload, ['close', 'c', 'value']);

    if (![open, high, low, close].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return;
    }

    output.statusCandles.push({
      candleKey:
        readStringFromPayload(event.payload, ['handle', 'name', 'id', 'series', 'title']) ??
        'plotcandle',
      timeSec,
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number,
    });
  },
};

const EVENT_PARSERS: ChartEventParser[] = [
  backgroundEventParser,
  fillEventParser,
  plotShapeEventParser,
  signalEventParser,
  plotEventParser,
  plotCandleEventParser,
];

export const buildChartEventLayers = (
  events: BotChartEvent[],
  tradingTimeframe?: string,
  enabledKinds?: StatusEventDisplayType[]
): ChartEventLayers => {
  const layers: ChartEventLayers = {
    backgroundIntervals: [],
    statusMarkers: [],
    statusLinePoints: [],
    statusCandles: [],
  };
  const enabledSet = new Set<StatusEventDisplayType>(
    enabledKinds && enabledKinds.length > 0
      ? enabledKinds
      : ['bgcolor', 'fill', 'plot', 'plotcandle', 'plotshape', 'signal']
  );

  const plotValueByTimeAndHandle = new Map<string, number>();
  events.forEach((event) => {
    const normalizedType = event.event_type.toLowerCase().trim();
    if (normalizedType !== 'plot') {
      return;
    }

    const timeSec = parseEventBarTimeSeconds(event);
    if (timeSec === null) {
      return;
    }

    const handle =
      readStringFromPayload(event.payload, ['handle']) ??
      readStringFromPayload(event.payload, ['name', 'id', 'series', 'title']);
    const series = readStringFromPayload(event.payload, ['series']);
    const value = readNumberFromPayload(event.payload, ['value', 'price', 'y']);
    if (!handle || !Number.isFinite(value)) {
      return;
    }

    plotValueByTimeAndHandle.set(buildPlotLookupKey(timeSec, handle), value as number);
    if (series) {
      plotValueByTimeAndHandle.set(buildPlotLookupKey(timeSec, handle, series), value as number);
    }
  });

  const context: ChartEventParseContext = {
    timeframeSec: Math.max(timeframeToSeconds(tradingTimeframe), 1),
    plotValueByTimeAndHandle,
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
  layers.statusMarkers.sort((a, b) => a.timeSec - b.timeSec);
  layers.statusLinePoints.sort((a, b) => a.timeSec - b.timeSec);
  layers.statusCandles.sort((a, b) => a.timeSec - b.timeSec);

  return layers;
};

export const buildStatusEventIntervals = (
  events: BotChartEvent[],
  tradingTimeframe?: string
): StatusEventInterval[] => {
  return buildChartEventLayers(events, tradingTimeframe).backgroundIntervals;
};
