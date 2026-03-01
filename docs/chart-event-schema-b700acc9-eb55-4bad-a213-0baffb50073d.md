# Chart Event Schema: `b700acc9-eb55-4bad-a213-0baffb50073d`

## Scope
This document describes the observed schema for chart events stored for trading/bot:

- `trading_id`: `b700acc9-eb55-4bad-a213-0baffb50073d`
- `bot_id`: `b700acc9-eb55-4bad-a213-0baffb50073d`
- Source DB: `/Volumes/T7/macbookair/alex/tiris/tiris-bot/data/tiris_bot.db`
- Table: `bot_chart_events`
- Total events analyzed: `1351`
- Time range: `2026-01-31 16:00:00.000000` to `2026-03-01 16:13:30.000000`

## Root Event Schema
All rows in this dataset follow this root structure:

```json
{
  "id": "integer (DB primary key)",
  "bot_id": "string (uuid)",
  "event_ts": "string (timestamp)",
  "bar_ts": "integer (epoch milliseconds)",
  "event_type": "string enum",
  "payload": "JSON object",
  "source": "string"
}
```

Observed constraints in this dataset:

- `bar_ts` is never null.
- `source` is never null/empty.
- `payload` is valid JSON for all rows.
- `event_type` values:
  - `bgcolor` (88)
  - `fill` (170)
  - `hline` (88)
  - `plot` (792)
  - `plotcandle` (88)
  - `plotshape` (88)
  - `signal` (37)

## Payload Schemas By `event_type`

### `bgcolor` (`count=88`)

```json
{
  "color": "string"
}
```

Required keys:

- `color` (88/88)

### `fill` (`count=170`)

```json
{
  "upper": "string",
  "lower": "string",
  "color": "string"
}
```

Required keys:

- `upper` (170/170)
- `lower` (170/170)
- `color` (170/170)

### `hline` (`count=88`)

```json
{
  "args": [
    "integer",
    "string"
  ],
  "kwargs": {
    "color": "string",
    "linestyle": "string",
    "overlay": "boolean"
  }
}
```

Required keys:

- `args` (88/88)
- `kwargs` (88/88)

Required nested keys:

- `args[0]` integer (88/88)
- `args[1]` string (88/88)
- `kwargs.color` string (88/88)
- `kwargs.linestyle` string (88/88)
- `kwargs.overlay` boolean (88/88)

### `plot` (`count=792`)

```json
{
  "handle": "string",
  "value": "number",
  "series": "string",
  "color": "string",
  "style": "string",
  "overlay": "boolean (optional)"
}
```

Required keys:

- `handle` (792/792)
- `value` (792/792)
- `series` (792/792)
- `color` (792/792)
- `style` (792/792)

Optional keys:

- `overlay` (440/792)

### `plotcandle` (`count=88`)

```json
{
  "open": "number",
  "high": "number",
  "low": "number",
  "close": "number",
  "name": "string"
}
```

Required keys:

- `open` (88/88)
- `high` (88/88)
- `low` (88/88)
- `close` (88/88)
- `name` (88/88)

### `plotshape` (`count=88`)

```json
{
  "value": "number",
  "location": "string",
  "style": "string",
  "color": "string"
}
```

Required keys:

- `value` (88/88)
- `location` (88/88)
- `style` (88/88)
- `color` (88/88)

### `signal` (`count=37`)

```json
{
  "kind": "string",
  "price": "number",
  "value": "integer | string",
  "id": "string"
}
```

Required keys:

- `kind` (37/37)
- `price` (37/37)
- `value` (37/37)
- `id` (37/37)

Type notes:

- `value` is mixed-type in this dataset:
  - integer: 24
  - string: 13

## Overlay Field Distribution

Observed `overlay` usage:

- Top-level `payload.overlay` appears only in `plot` events:
  - present in 440 rows
  - `true`: 176
  - `false`: 264
- Nested `payload.kwargs.overlay` appears in all `hline` events:
  - present in 88 rows
  - all values are `false`

Total events containing any overlay key (`payload.overlay` or `payload.kwargs.overlay`): `528`.

## Real Example Events (One Per Type)

### `bgcolor`

```json
{
  "event_id": 23536,
  "event_ts": "2026-01-31 16:00:00.000000",
  "bar_ts": 1769875200000,
  "event_type": "bgcolor",
  "source": "strategy",
  "payload": {
    "color": "rgba(255,0,0,0.2)"
  }
}
```

### `fill`

```json
{
  "event_id": 23579,
  "event_ts": "2026-02-01 16:00:00.000000",
  "bar_ts": 1769961600000,
  "event_type": "fill",
  "source": "strategy",
  "payload": {
    "upper": "plot_1",
    "lower": "plot_2",
    "color": "rgba(0, 255, 0, 0.2)"
  }
}
```

### `hline`

```json
{
  "event_id": 23546,
  "event_ts": "2026-01-31 16:00:00.000000",
  "bar_ts": 1769875200000,
  "event_type": "hline",
  "source": "strategy",
  "payload": {
    "args": [
      0,
      "zero"
    ],
    "kwargs": {
      "color": "grey",
      "linestyle": "dashed",
      "overlay": false
    }
  }
}
```

### `plot`

```json
{
  "event_id": 23537,
  "event_ts": "2026-01-31 16:00:00.000000",
  "bar_ts": 1769875200000,
  "event_type": "plot",
  "source": "strategy",
  "payload": {
    "handle": "plot_1",
    "value": 2534.2,
    "series": "buy_pipe",
    "color": "rgba(0, 0, 0, 0)",
    "style": "line"
  }
}
```

### `plotcandle`

```json
{
  "event_id": 23534,
  "event_ts": "2026-01-31 16:00:00.000000",
  "bar_ts": 1769875200000,
  "event_type": "plotcandle",
  "source": "strategy",
  "payload": {
    "open": 2680.06,
    "high": 2683.49,
    "low": 2510.01,
    "close": 2534.2,
    "name": "Candle"
  }
}
```

### `plotshape`

```json
{
  "event_id": 23535,
  "event_ts": "2026-01-31 16:00:00.000000",
  "bar_ts": 1769875200000,
  "event_type": "plotshape",
  "source": "strategy",
  "payload": {
    "value": 2455.644841283581,
    "location": "absolute",
    "style": "circle",
    "color": "rgba(0,0,0,0.2)"
  }
}
```

### `signal`

```json
{
  "event_id": 23573,
  "event_ts": "2026-02-01 08:44:40.000000",
  "bar_ts": 1769935480000,
  "event_type": "signal",
  "source": "strategy",
  "payload": {
    "kind": "long",
    "price": 2411.22,
    "value": 50,
    "id": "Buy%"
  }
}
```
