import { expect, test } from '@playwright/test';

test('renders the chart before logs and uses recording time for subsequent log requests', async ({ page }) => {
  // Holds back initial logs, then verifies the chart and an inclusive, deduplicated refresh.
  const tradingId = '00000000-0000-4000-8000-000000000001';
  const start = '2026-01-01T00:00:00Z';
  const recordedAt = '2026-01-03T00:00:00Z';
  const firstLog = { id: 'first', type: 'long', timestamp: recordedAt, event_time: start, info: {} };
  const lateLog = { id: 'late', type: 'short', timestamp: recordedAt, event_time: start, info: {} };
  await page.clock.setFixedTime(new Date('2026-01-04T00:00:00Z'));

  await page.route(`**/tradings/${tradingId}`, route => route.fulfill({
    json: {
      success: true,
      data: { id: tradingId, name: 'Chart loading test', type: 'paper', info: { initial_funds: 1000 }, created_at: start },
    },
  }));
  await page.route('**/sub-accounts?*', route => route.fulfill({ json: { success: true, data: { sub_accounts: [] } } }));
  await page.route('**/equity-curve?*', route => {
    const timeframe = new URL(route.request().url()).searchParams.get('timeframe');
    return route.fulfill({
      json: {
        success: true,
        data: {
          trading_id: tradingId,
          timeframe,
          initial_funds: 1000,
          baseline_price: 100,
          data_points: [start, '2026-01-02T00:00:00Z'].map(timestamp => ({
            timestamp, equity: 1000, quote_balance: 1000, stock_balance: 0, stock_price: 100, benchmark_return: 0,
          })),
        },
      },
    });
  });

  let releaseLogs!: () => void;
  const heldLogs = new Promise<void>(resolve => { releaseLogs = resolve; });
  const logQueries: URLSearchParams[] = [];
  await page.route('**/trading-logs/trading/**', async route => {
    const query = new URL(route.request().url()).searchParams;
    logQueries.push(query);
    if (!query.has('start_date')) {
      await heldLogs;
    }
    await route.fulfill({
      json: { success: true, data: { trading_logs: query.has('start_date') ? [firstLog, lateLog] : [firstLog], has_more: false } },
    });
  });

  const trades = page.getByText('Trades', { exact: true }).locator('..');
  try {
    await page.goto(`/trading/${tradingId}`);
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(trades).toHaveText('—Trades');
  } finally {
    releaseLogs();
  }

  await expect(trades).toHaveText('1Trades');
  const timeframeSelect = page.locator('#timeframe-select');
  if (await timeframeSelect.isVisible()) {
    await timeframeSelect.selectOption('8h');
  } else {
    await page.getByRole('button', { name: '8h', exact: true }).click();
  }
  await expect(timeframeSelect).toHaveValue('8h');
  await expect(trades).toHaveText('2Trades');
  expect(logQueries.filter(query => !query.has('start_date'))).toHaveLength(1);
  expect(Date.parse(logQueries.find(query => query.has('start_date'))!.get('start_date')!)).toBe(Date.parse(recordedAt));
});
