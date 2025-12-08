import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type Trading } from '../../utils/api';
import { formatROI, formatCurrency } from '../../utils/tradingMetrics';
import { fetchMarketSnapshot, type MarketSnapshot } from '../../utils/marketSnapshot';

interface TradingCardMetricsProps {
  trading: Trading;
}

/**
 * Displays lightweight metrics for a trading card.
 * Fetches only the latest equity curve data point for minimal overhead.
 */
export const TradingCardMetrics: React.FC<TradingCardMetricsProps> = ({ trading }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<{ currentEquity: number | null; currentROI: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const initialFunds = (trading.info?.initial_funds as number | undefined) ?? 0;

    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        do {
          // Only pass endTimeMs for backtest trades (to use specific historical end date).
          // Live/paper trades use the default (previous minute) from fetchMarketSnapshot.
          const backtestEndTime =
            trading.type === 'backtest'
              ? Date.parse((trading.info as { end_date?: string })?.end_date ?? '') || undefined
              : undefined;

          const snapshot: MarketSnapshot = await fetchMarketSnapshot(
            trading,
            backtestEndTime ? { endTimeMs: backtestEndTime } : {}
          );
          const price = typeof snapshot.price === 'number' ? snapshot.price : null;
          const assetsValue =
            price !== null
              ? snapshot.quoteBalance + snapshot.stockBalance * price
              : null;
          const roi =
            assetsValue !== null && initialFunds > 0
              ? ((assetsValue - initialFunds) / initialFunds) * 100
              : 0;

          if (!isMounted) {
            return;
          }

          setMetrics({ currentEquity: assetsValue, currentROI: roi });
          setIsWarmingUp(Boolean(snapshot.warmingUp));

          if (snapshot.warmingUp) {
            await delay(1000);
          } else {
            setIsLoading(false); // Only show metrics once backend is ready (200)
            break;
          }
        } while (isMounted);
      } catch (error) {
        console.error('Failed to fetch trading card metrics:', error);
        if (isMounted) {
          setMetrics({ currentEquity: null, currentROI: 0 });
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
