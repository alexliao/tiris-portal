# Color Theme Guide

## Overview
This application uses a unified color scheme with **four primary theme colors** that represent the four main elements of the system. These colors are consistently applied across all UI components.

## Theme Colors

### 1. Paper Trading - Dark Blue (#2E3A59)
**Represents:** Automatic, Simulated Trading
- **Primary:** `#2E3A59` - Dark Blue
- **Light:** `#E8EAF0` - Very light blue (backgrounds)
- **Medium:** `#6B7A9E` - Medium blue (icons, accents)
- **Border:** `#B8C1D9` - Light blue border
- **Hover:** `#1F2A3F` - Darker blue for hover states

**Used in:**
- Paper trading cards and pages
- "Automatic" feature highlight on landing page
- Paper trading list headers
- Paper trading detail pages

### 2. Backtest - Gold (#8B6914)
**Represents:** Profitable, Historical Testing
- **Primary:** `#8B6914` - Gold/Brown
- **Light:** `#FFF8E7` - Very light gold (backgrounds)
- **Medium:** `#C4A04A` - Medium gold (icons, accents)
- **Border:** `#E5D4A0` - Light gold border
- **Hover:** `#6B5010` - Darker gold for hover states

**Used in:**
- Backtest cards and pages
- "Profitable" feature highlight on landing page
- Backtest list headers
- Backtest detail pages

### 3. Real Trading - Dark Green (#1B4D3E)
**Represents:** Simple, Live Trading
- **Primary:** `#1B4D3E` - Dark Green
- **Light:** `#E7F2EF` - Very light green (backgrounds)
- **Medium:** `#4A8A75` - Medium green (icons, accents)
- **Border:** `#A8D4C3` - Light green border
- **Hover:** `#0F3329` - Darker green for hover states

**Used in:**
- Real trading cards and pages
- "Simple" feature highlight on landing page
- Real trading list headers
- Real trading detail pages

### 4. Exchanges - Burgundy (#7A1F3D)
**Represents:** Secure, Exchange Connections
- **Primary:** `#7A1F3D` - Burgundy/Wine
- **Light:** `#F7E8ED` - Very light burgundy (backgrounds)
- **Medium:** `#B04A6E` - Medium burgundy (icons, accents)
- **Border:** `#E0B3C5` - Light burgundy border
- **Hover:** `#5A1729` - Darker burgundy for hover states

**Used in:**
- Exchange cards and pages
- "Secure" feature highlight on landing page
- Exchange management UI

## Usage

### Importing the Theme
```typescript
import { THEME_COLORS, getTradingTheme } from '../config/theme';
```

### Accessing Colors
```typescript
// Direct access
const paperColors = THEME_COLORS.paper;
const backtestColors = THEME_COLORS.backtest;
const realColors = THEME_COLORS.real;
const exchangeColors = THEME_COLORS.exchanges;

// Dynamic access based on trading type
const theme = getTradingTheme('paper'); // returns 'paper'
const colors = THEME_COLORS[theme];
```

### Applying Colors in Components

#### Inline Styles (Recommended for dynamic colors)
```tsx
<div 
  style={{ 
    backgroundColor: colors.light,
    borderColor: colors.border 
  }}
  className="p-4 rounded-lg border-2"
>
  <Icon style={{ color: colors.primary }} className="w-8 h-8" />
</div>
```

#### Gradients
```tsx
<div 
  style={{ 
    background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})` 
  }}
  className="p-4 text-white"
>
  Content
</div>
```

#### Hover States
```tsx
<div
  style={{ borderColor: colors.border }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = colors.primary;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = colors.border;
  }}
>
  Hoverable content
</div>
```

## Color Restrictions

### Allowed Colors
- **Theme Colors:** Only the four theme colors defined above
- **Neutrals:** Black, white, and gray shades for text and backgrounds
- **Status Colors:** 
  - Red for errors and destructive actions
  - Green for success states (use theme green when possible)

### Prohibited Colors
- No additional blue, purple, orange, or other colors beyond the four theme colors
- Avoid using arbitrary colors that don't match the theme

## Component Mapping

### Dashboard
- Paper Trading Card → Dark Blue (#2E3A59)
- Backtest Card → Gold (#8B6914)
- Real Trading Card → Dark Green (#1B4D3E)
- Exchanges Card → Burgundy (#7A1F3D)

### Landing Page Highlights
- Profitable → Gold (#8B6914) - Maps to Backtest
- Secure → Burgundy (#7A1F3D) - Maps to Exchanges
- Automatic → Dark Blue (#2E3A59) - Maps to Paper
- Simple → Dark Green (#1B4D3E) - Maps to Real

### Trading List Pages
- Header gradient uses the respective theme color
- Cards use the theme color for headers
- Action buttons use the theme color

### Trading Detail Pages
- Uses the theme color based on trading type
- Performance widgets inherit the theme color

## Best Practices

1. **Consistency:** Always use the theme colors from `THEME_COLORS` constant
2. **Semantic Meaning:** Use colors that match the context (e.g., paper trading = blue)
3. **Accessibility:** Ensure sufficient contrast between text and backgrounds
4. **Hover States:** Use the `hover` color variant for interactive elements
5. **Gradients:** Use `primary` to `hover` for gradient effects
6. **Borders:** Use the `border` color for subtle borders, `primary` for emphasis

## Migration Checklist

When updating existing components:
- [ ] Replace hardcoded color values with theme colors
- [ ] Import `THEME_COLORS` from `src/config/theme.ts`
- [ ] Use inline styles for dynamic theme colors
- [ ] Update hover states to use theme colors
- [ ] Test color consistency across light/dark modes (if applicable)
- [ ] Verify accessibility contrast ratios
