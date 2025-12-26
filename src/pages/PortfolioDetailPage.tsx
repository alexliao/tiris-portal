import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Copy } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import TradingPerformanceWidget from '../components/trading/TradingPerformanceWidget';
import { useAuth } from '../hooks/useAuth';
import { useRequireAuthRedirect } from '../hooks/useRequireAuthRedirect';
import { getPortfolioById, getPortfolioEquityCurve, type EquityCurveNewData, type Portfolio, type PortfolioTradingSummary, type Trading } from '../utils/api';
import { THEME_COLORS } from '../config/theme';
import { createDateTimeFormatter, DateTimeFormatOption } from '../utils/locale';

export const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tradings, setTradings] = useState<PortfolioTradingSummary[]>([]);
  const [portfolioCurve, setPortfolioCurve] = useState<EquityCurveNewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const dateTimeFormatter = useMemo(
    () => createDateTimeFormatter(DateTimeFormatOption),
    [i18n.language]
  );

  useRequireAuthRedirect({ isAuthenticated, isLoading: authLoading });

  const fetchPortfolio = useCallback(async () => {
    if (!id) {
      setError(t('portfolios.detail.notFound'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolioById(id);
      setPortfolio(response.portfolio);
      setTradings(response.tradings || []);

      try {
        const equityCurve = await getPortfolioEquityCurve(id, '1h', 1);
        setPortfolioCurve(equityCurve);
      } catch (curveError) {
        console.warn('Failed to fetch portfolio equity curve metadata:', curveError);
        setPortfolioCurve(null);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      setError(t('portfolios.detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPortfolio();
    }
  }, [authLoading, fetchPortfolio, isAuthenticated]);

  const handleCopyPortfolioId = async () => {
    if (!portfolio?.id) return;
    try {
      await navigator.clipboard.writeText(portfolio.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatDateTime = useCallback(
    (value?: string | number | null): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return dateTimeFormatter.format(date);
    },
    [dateTimeFormatter]
  );

  const portfolioTrading = useMemo<Trading | null>(() => {
    if (!portfolio) return null;
    return {
      id: portfolio.id,
      name: portfolio.name,
      exchange_binding_id: '',
      type: 'real',
      status: portfolio.status,
      created_at: portfolio.created_at ?? new Date().toISOString(),
      info: {
        start_date: portfolio.created_at ?? new Date().toISOString(),
      },
    };
  }, [portfolio]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('common.accessDenied')}</h1>
          <p className="text-gray-600 mb-4">{t('dashboard.needSignIn')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">{t('common.loading')}</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !portfolio || !portfolioTrading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('common.error')}</h1>
              <p className="text-red-600 mb-4">{error ?? t('portfolios.detail.notFound')}</p>
              <Link
                to="/portfolios"
                className="inline-flex items-center px-4 py-2 bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 transition-colors"
              >
                {t('portfolios.title')}
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const themeColors = THEME_COLORS.portfolio;
  const Icon = themeColors.icon;
  const tradingCount = portfolio.trading_count ?? tradings.length;
  const statusKey = portfolio.status?.toLowerCase() ?? 'active';
  const statusLabel = (statusKey === 'active' || statusKey === 'archived')
    ? t(`portfolios.status.${statusKey}`)
    : portfolio.status;
  const initialFunds = typeof portfolioCurve?.initial_funds === 'number' ? portfolioCurve.initial_funds : undefined;
  const baselinePrice = typeof portfolioCurve?.baseline_price === 'number' ? portfolioCurve.baseline_price : undefined;
  const startDateDisplay = formatDateTime(portfolioCurve?.start_time ?? portfolio.created_at);
  const endDateDisplay = formatDateTime(portfolioCurve?.end_time ?? portfolio.updated_at);
  const hasEndDate = Boolean(portfolioCurve?.end_time ?? portfolio.updated_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20">
        <div
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.hover})`
          }}
          className="shadow-sm text-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-start">
              <button
                onClick={() => navigate('/portfolios')}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                title={t('portfolios.backToList')}
              >
                <Icon className="w-8 h-8" />
              </button>
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="flex-1 min-w-0 truncate text-lg sm:text-2xl font-bold text-white">
                    {portfolio.name}
                  </h1>
                </div>
                {portfolio.memo && (
                  <p className="text-white/80 mt-1">{portfolio.memo}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <span>ID: {portfolio.id.substring(0, 4)}...</span>
                    <button
                      onClick={handleCopyPortfolioId}
                      className="p-1 rounded hover:bg-white/20 text-white/80 transition-colors hover:text-white"
                      title={t('portfolios.detail.copyId')}
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80">
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80">
                    {t('portfolios.detail.tradingCount', { count: tradingCount })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${(initialFunds !== undefined || baselinePrice !== undefined) ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              {(initialFunds !== undefined || baselinePrice !== undefined) && (
                <div>
                  <div className="flex mb-2">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.initialFunds')}:&nbsp;</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {typeof initialFunds === 'number' ? `$${Math.floor(initialFunds).toLocaleString()}` : '—'}
                    </span>
                  </div>
                  {baselinePrice !== undefined && (
                    <div className="flex mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.initialPrice')}:&nbsp;</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {typeof baselinePrice === 'number' ? `$${baselinePrice.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-1">
                  <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.startDate', 'Start Date')}:&nbsp;</span>
                  <span className="text-sm font-semibold text-gray-900">{startDateDisplay ?? '—'}</span>
                </div>
                {hasEndDate && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.endDate', 'End Date')}:&nbsp;</span>
                    <span className="text-sm font-semibold text-gray-900">{endDateDisplay ?? '—'}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-1">
                  <span className="text-xs md:text-sm font-medium text-gray-600">{t('portfolios.memberTradings')}:&nbsp;</span>
                  <span className="text-sm font-semibold text-gray-900">{tradingCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs md:text-sm font-medium text-gray-600">{t('portfolios.detail.createdAt')}:&nbsp;</span>
                  <span className="text-sm font-semibold text-gray-900">{formatDateTime(portfolio.created_at) ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <TradingPerformanceWidget
            trading={portfolioTrading}
            entityType="portfolio"
            entityId={portfolio.id}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PortfolioDetailPage;
