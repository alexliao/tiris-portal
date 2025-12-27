import { test, expect } from '@playwright/test';
import { isTradingActive } from '../src/utils/tradingStatus';

test('isTradingActive respects end_date relative to now', () => {
  const now = new Date('2025-01-02T00:00:00Z');

  expect(isTradingActive({ info: {} }, now)).toBe(true);
  expect(isTradingActive({ info: { end_date: null } }, now)).toBe(true);
  expect(isTradingActive({ info: { end_date: 'not-a-date' } }, now)).toBe(true);
  expect(isTradingActive({ info: { end_date: '2025-01-01T00:00:00Z' } }, now)).toBe(false);
  expect(isTradingActive({ info: { end_date: '2025-01-02T00:00:00Z' } }, now)).toBe(true);
  expect(isTradingActive({ info: { end_date: '2025-01-03T00:00:00Z' } }, now)).toBe(true);
});
