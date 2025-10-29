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

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

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

        const result = await fetchLightweightMetrics(trading, stockSymbol, quoteSymbol, '1d');

        if (isMounted) {
          setMetrics(result);
        }
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
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [trading]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-20">
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm h-20 flex items-center justify-center">
        No metrics available
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Current Portfolio Value */}
        {metrics.currentEquity !== null && (
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(metrics.currentEquity, '$', 0)}
            </p>
            <p className="text-xs text-gray-500 font-medium">{t('performance.chart.portfolioValue')}</p>
          </div>
        )}

        {/* Current ROI */}
        <div className="text-right">
          <p className={`text-2xl font-bold mb-2 ${metrics.currentROI > 0 ? 'text-green-600' : metrics.currentROI < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatROI(metrics.currentROI)}
          </p>
          <p className="text-xs text-gray-500 font-medium">{t('performance.metrics.totalROI')}</p>
        </div>
      </div>
    </div>
  );
};

export default TradingCardMetrics;
