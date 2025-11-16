import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import TradingPerformanceWidget from '../trading/TradingPerformanceWidget';
import { getTradingById, type Trading } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { getTradingDayCount } from '../../utils/tradingDates';
import { THEME_COLORS } from '../../config/theme';

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

interface PerformanceSectionProps {
  className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const noDataMessage = t('performance.noData');
  const [demoTrading, setDemoTrading] = useState<Trading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const demoTradingId = useMemo(() => {
    const env = import.meta.env as Record<string, string | undefined>;
    const configuredId = env.VITE_DEMO_TRADING_ID?.trim();
    const legacyId = env.DEMO_TRADING_ID?.trim();
    return configuredId || legacyId || null;
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language || undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
    [i18n.language]
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        maximumFractionDigits: 0
      }),
    [i18n.language]
  );

  const overviewValues = useMemo(() => {
    const fallback = {
      startDate: 'N/A',
      initialFunds: 'N/A',
      days: 'N/A'
    };

    if (!demoTrading) {
      return fallback;
    }

    const fundsSources: unknown[] = [
      demoTrading.info?.initial_funds,
      demoTrading.info?.initial_balance,
      demoTrading.info?.initial_quote_balance,
      demoTrading.info?.quote_balance
    ];

    const initialFundsValue = fundsSources.reduce<number | null>((acc, candidate) => {
      if (acc !== null) {
        return acc;
      }
      return parseNumericValue(candidate);
    }, null);

    const formattedInitialFunds =
      initialFundsValue !== null
        ? numberFormatter.format(Math.round(initialFundsValue))
        : fallback.initialFunds;

    const startDateIso =
      (demoTrading.info?.start_date as string | undefined) ?? demoTrading.created_at;
    const startDate = startDateIso ? new Date(startDateIso) : null;
    const formattedStartDate =
      startDate && !Number.isNaN(startDate.getTime())
        ? dateFormatter.format(startDate)
        : fallback.startDate;

    const dayCount = getTradingDayCount(demoTrading);
    const formattedDayCount =
      dayCount !== null ? numberFormatter.format(dayCount) : fallback.days;

    return {
      startDate: formattedStartDate,
      initialFunds: formattedInitialFunds,
      days: formattedDayCount
    };
  }, [dateFormatter, demoTrading, numberFormatter]);

  useEffect(() => {
    let isMounted = true;

    const fetchTrading = async () => {
      if (!demoTradingId) {
        console.error('DEMO_TRADING_ID (or VITE_DEMO_TRADING_ID) is not configured.');
        if (isMounted) {
          setError(noDataMessage);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const publicTrading = await getTradingById(demoTradingId, false);
        if (!isMounted) {
          return;
        }

        if (publicTrading) {
          setDemoTrading(publicTrading);
          setIsLoading(false);
          return;
        }

        if (isAuthenticated) {
          const authedTrading = await getTradingById(demoTradingId, true);
          if (!isMounted) {
            return;
          }

          if (authedTrading) {
            setDemoTrading(authedTrading);
            setIsLoading(false);
            return;
          }
        }

        setError(noDataMessage);
      } catch (fetchError) {
        console.error('Failed to load demo trading', fetchError);
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : noDataMessage
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTrading();

    return () => {
      isMounted = false;
    };
  }, [demoTradingId, isAuthenticated, noDataMessage]);

  return (
    <section
      id="performance"
      className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-center text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('performance.title')}
          </h2>
          <p className="text-md font-['Nunito'] text-gray-600 mx-auto">
            <Trans
              i18nKey="performance.description"
              components={{ bold: <span className="font-bold text-black" /> }}
            />
          </p>
          <p className="text-md font-['Nunito'] text-gray-600 mx-auto">
            <Trans
              i18nKey="performance.overview"
              values={{
                start_date: overviewValues.startDate,
                initial_funds: overviewValues.initialFunds,
                days: overviewValues.days
              }}
              components={{ bold: <span className="font-bold text-black" /> }}
            />
          </p>
          <div className="mt-6 text-center">
            <Link
              to="/backtest-trading/create"
              className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold font-['Nunito'] text-white transition-colors hover:opacity-90"
              style={{
                backgroundColor: THEME_COLORS.backtest.primary
              }}
            >
              {t('performance.cta')}
            </Link>
          </div>
        </div>

        <div className="">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-tiris-primary-600 animate-spin" />
              <p className="mt-4 text-sm text-gray-500">
                {t('performance.loading')}
              </p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-base font-semibold text-gray-800">
                  {noDataMessage}
                </p>
                {error !== noDataMessage && (
                  <p className="mt-2 text-sm text-gray-500">{error}</p>
                )}
              </div>
            </div>
          )}

          {!isLoading && !error && demoTrading && (
            <TradingPerformanceWidget trading={demoTrading} 
              timeframe='1w'
              showSignals={false}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default PerformanceSection;
