# Smooth Timeframe Transition Fix

## Problem
When users clicked timeframe buttons (1m, 1h, 4h, etc.), the entire chart and info cards would disappear and then reappear, creating a jarring user experience.

## Root Cause
The `fetchTradingData` function had `selectedTimeframe` in its dependency array, causing it to be recreated when the timeframe changed. This triggered the initial load effect which set `loading = true`, hiding all content and showing the full-page loading spinner.

## Solution

### 1. Separated Initial Load from Timeframe Changes

**Before:**
```typescript
useEffect(() => {
  fetchTradingData(true); // Always marked as initial load
}, [fetchTradingData]); // Triggered whenever fetchTradingData changed (including timeframe)
```

**After:**
```typescript
// Initial data loading effect - only run once on mount
useEffect(() => {
  fetchTradingData(true); // Mark as initial load
}, []); // Empty dependency array - only run on mount

// Timeframe change effect - refetch without showing loading spinner
useEffect(() => {
  // Skip the initial render (handled by the effect above)
  if (chartState.data.length > 0) {
    fetchTradingData(false); // Don't show loading spinner
  }
}, [selectedTimeframe]); // Only when timeframe changes
```

### 2. Added Subtle Loading Indicator

Added a new state for tracking data refetching:
```typescript
const [isRefetchingData, setIsRefetchingData] = useState(false);
```

Updated `fetchTradingData` to use this state:
```typescript
if (isInitialLoad) {
  setLoading(true);  // Full page loading spinner
  setError(null);
} else {
  setIsRefetchingData(true);  // Subtle indicator only
}
```

### 3. Visual Feedback During Timeframe Change

Added a small loading indicator next to the timeframe buttons:
- Timeframe buttons are disabled during refetch
- Small spinner appears with "Loading..." text
- Buttons have reduced opacity to indicate they're disabled
- Charts and metrics remain visible throughout

## User Experience Improvements

### Before:
1. User clicks timeframe button
2. ❌ All charts disappear
3. ❌ Metrics cards disappear
4. ❌ Full-page loading spinner shows
5. ✅ New data loads
6. ✅ Charts reappear

### After:
1. User clicks timeframe button
2. ✅ Charts remain visible with old data
3. ✅ Metrics cards remain visible
4. ✅ Small "Loading..." indicator appears
5. ✅ Timeframe buttons are disabled
6. ✅ New data loads smoothly
7. ✅ Charts update in place
8. ✅ Loading indicator disappears

## Benefits

1. **No Content Flash**: Charts and metrics stay visible during transitions
2. **Better UX**: Users can still see their data while new data loads
3. **Clear Feedback**: Small loading indicator shows something is happening
4. **Prevents Double-Clicks**: Disabled buttons prevent multiple simultaneous requests
5. **Smooth Transitions**: Data updates in place without jarring disappear/reappear

## Technical Details

- Initial page load: Shows full loading spinner (appropriate for first load)
- Timeframe changes: Shows subtle indicator, keeps content visible
- Auto-refresh: Uses the same smooth update mechanism
- Error handling: Still shows errors appropriately without hiding content
