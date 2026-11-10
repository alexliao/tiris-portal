import { expect, test } from '@playwright/test';

test('renders portfolio curves independently of account fallback and reuses logs across timeframes', async ({ page }) => {
  // Provides different curve and snapshot values so the account field priorities are observable.
  const portfolioId = '00000000-0000-4000-8000-000000000001';
  const start = '2026-01-01T00:00:00Z';
  const recordedAt = '2026-01-03T00:00:00Z';
  const firstLog = { id: 'first', type: 'long', timestamp: recordedAt, event_time: start, info: {} };
  const lateLog = { id: 'late', type: 'short', timestamp: recordedAt, event_time: start, info: {} };
  await page.clock.setFixedTime(new Date('2026-01-04T00:00:00Z'));

  await page.route(`**/v1/portfolios/${portfolioId}`, route => route.fulfill({
    json: {
      success: true,
      data: {
        portfolio: { id: portfolioId, name: 'Portfolio loading test', info: { initial_funds: 1000 }, created_at: start },
        tradings: [],
      },
    },
  }));

  const timeframes = {
    '1h': { quote: 600, stock: 2, price: null, assets: '$850' },
    '8h': { quote: 700, stock: 3, price: 140, assets: '$1,120' },
    '1d': { quote: 800, stock: 4, price: 150, assets: '$1,400' },
    '1w': { quote: 900, stock: 5, price: 160, assets: '$1,700' },
  };

  let releaseSnapshot!: () => void;
  const heldSnapshot = new Promise<void>(resolve => { releaseSnapshot = resolve; });
  let snapshots = 0;
  await page.route(`**/v1/portfolios/${portfolioId}/equity-curve?*`, async route => {
    const timeframe = new URL(route.request().url()).searchParams.get('timeframe') as keyof typeof timeframes | '1m';
    if (timeframe === '1m') {
      snapshots += 1;
      await heldSnapshot;
    }
    const point = timeframe === '1m' ? { quote: 999, stock: 9, price: 125 } : timeframes[timeframe];
    await route.fulfill({
      json: {
        success: true,
        data: {
          trading_id: portfolioId,
          timeframe,
          initial_funds: 1000,
          baseline_price: 100,
          data_points: [start, '2026-01-02T00:00:00Z'].map(timestamp => ({
            timestamp, equity: 1000, quote_balance: point.quote,
            stock_balance: point.stock, stock_price: point.price, benchmark_return: 0,
          })),
        },
      },
    });
  });

  const logQueries: URLSearchParams[] = [];
  await page.route(`**/trading-logs/portfolio/${portfolioId}?*`, route => {
    const query = new URL(route.request().url()).searchParams;
    logQueries.push(query);
    return route.fulfill({
      json: { success: true, data: { trading_logs: query.has('start_date') ? [firstLog, lateLog] : [firstLog] } },
    });
  });

  const assets = page.getByText('Assets Value', { exact: true }).locator('..').locator('div').first();
  const trades = page.getByText('Trades', { exact: true }).locator('..');
  try {
    await page.goto(`/portfolios/${portfolioId}`);
    await expect(page.getByTestId('candlestick-chart-container').locator('canvas').first()).toBeVisible();
    await expect(trades).toHaveText('1Trades');
    expect(snapshots).toBe(1);
  } finally {
    releaseSnapshot();
  }
  await expect(assets).toHaveText(timeframes['1h'].assets);

  const selector = page.locator('#timeframe-select');
  for (const timeframe of ['8h', '1d', '1w'] as const) {
    const incrementalLogs = page.waitForResponse(response =>
      response.url().includes(`/trading-logs/portfolio/${portfolioId}`) &&
      new URL(response.url()).searchParams.has('start_date')
    );
    if (await selector.isVisible()) {
      await selector.selectOption(timeframe);
    } else {
      await page.getByRole('button', { name: timeframe, exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp(`[?&]timeframe=${timeframe}$`));
    await expect(assets).toHaveText(timeframes[timeframe].assets);
    await incrementalLogs;
    await expect(trades).toHaveText('2Trades');
  }

  await page.goBack();
  await expect(selector).toHaveValue('1d');
  await expect(assets).toHaveText(timeframes['1d'].assets);

  expect(snapshots).toBe(1);
  expect(logQueries.filter(query => !query.has('start_date'))).toHaveLength(1);
  for (const query of logQueries.filter(query => query.has('start_date'))) {
    expect(Date.parse(query.get('start_date')!)).toBe(Date.parse(recordedAt));
  }
});
