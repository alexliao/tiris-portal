import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type Trading, getSubAccountsByTrading } from '../../utils/api';
import { fetchLightweightMetrics, type LightweightTradingMetrics, formatROI, formatCurrency } from '../../utils/tradingMetrics';

interface TradingCardMetricsProps {
  trading: Trading;
}

/**
 * Displays lightweight metrics for a trading card.
 * Fetches only the latest equity curve data point for minimal overhead.
 */
export const TradingCardMetrics: React.FC<TradingCardMetricsProps> = ({ trading }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<LightweightTradingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        do {
          const endTimeMs =
            trading.type === 'backtest'
              ? Date.parse((trading.info as { end_date?: string })?.end_date ?? '') || Date.now()
              : Date.now();

          // Fetch sub-accounts to determine stock and quote symbols
          const subAccounts = await getSubAccountsByTrading(trading.id);

          // Identify stock and quote sub-accounts
          const stockSubAccount = subAccounts.find(account =>
            account.info?.account_type === 'stock' ||
            ['ETH', 'BTC'].includes(account.symbol)
          );
          const quoteSubAccount = subAccounts.find(account =>
            account.info?.account_type === 'balance' ||
            ['USDT', 'USD', 'USDC'].includes(account.symbol)
          );

          // Fallback to defaults if not found
          const stockSymbol = stockSubAccount?.symbol || 'ETH';
          const quoteSymbol = quoteSubAccount?.symbol || 'USDT';

          const stockBal = typeof stockSubAccount?.balance === 'number'
            ? stockSubAccount.balance
            : stockSubAccount?.balance
              ? parseFloat(stockSubAccount.balance) || 0
              : 0;

          const quoteBal = typeof quoteSubAccount?.balance === 'number'
            ? quoteSubAccount.balance
            : quoteSubAccount?.balance
              ? parseFloat(quoteSubAccount.balance) || 0
              : 0;

          const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';
          const exchangeType = trading.exchange_binding?.exchange_type;

          const result = await fetchLightweightMetrics(
            trading,
            stockSymbol,
            quoteSymbol,
            '1m',
            {
              stockBalance: stockBal,
              quoteBalance: quoteBal,
              requireAuth,
              exchangeType,
              endTimeMs,
            }
          );

          if (!isMounted) {
            return;
          }

          setMetrics(result);
          setIsWarmingUp(Boolean(result.warmingUp));

          if (result.warmingUp) {
            await delay(2000);
          } else {
            setIsLoading(false); // Only show metrics once backend is ready (200)
            break;
          }
        } while (isMounted);
      } catch (error) {
        console.error('Failed to fetch trading card metrics:', error);
        if (isMounted) {
          setMetrics({
            currentEquity: null,
            currentROI: 0,
            unrealizedPnL: 0,
            quoteBalance: 0,
            stockBalance: null,
            stockPrice: null,
            benchmarkReturn: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
            warmingUp: false,
          });
          setIsWarmingUp(false);
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [trading]);

  if (!metrics && !isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm h-20 flex items-center justify-center">
        No metrics available
      </div>
    );
  }

  return (
    <div className="relative p-6">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center space-x-3 text-gray-500">
            <div className="h-6 w-6 border-2 border-gray-200 border-tiris-primary-500 border-t-2 rounded-full animate-spin" aria-label="Loading metrics" />
            <span className="text-sm font-medium">{t('common.loading')}</span>
          </div>
        </div>
      )}
      <div className={`grid grid-cols-2 gap-6 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
        {/* Current Assets Value */}
        {metrics?.currentEquity !== null && (
          <div className="text-left">
            <p className={`text-2xl font-bold text-gray-900 mb-2 ${isWarmingUp ? 'animate-pulse' : ''}`}>
              {formatCurrency(metrics?.currentEquity ?? 0, '$', 0)}
            </p>
            <p className="text-xs text-gray-500 font-medium">{t('performance.chart.assetsValue')}</p>
          </div>
        )}

        {/* Current ROI */}
        <div className="text-right">
          <p className={`text-2xl font-bold mb-2 ${metrics && metrics.currentROI > 0 ? 'text-green-600' : metrics && metrics.currentROI < 0 ? 'text-red-600' : 'text-gray-900'} ${isWarmingUp ? 'animate-pulse' : ''}`}>
            {formatROI(metrics?.currentROI ?? 0)}
          </p>
          <p className="text-xs text-gray-500 font-medium">{t('performance.metrics.totalROI')}</p>
        </div>
      </div>
    </div>
  );
};

export default TradingCardMetrics;
