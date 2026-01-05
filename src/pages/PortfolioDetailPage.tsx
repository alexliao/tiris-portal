import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Copy, Pencil, Trash2 } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import TradingPerformanceWidget from '../components/trading/TradingPerformanceWidget';
import { useAuth } from '../hooks/useAuth';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { deletePortfolio, getPortfolioById, type Portfolio, type PortfolioTradingSummary, type Trading } from '../utils/api';
import { THEME_COLORS } from '../config/theme';
import { createDateTimeFormatter, DateTimeFormatOption } from '../utils/locale';

export const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tradings, setTradings] = useState<PortfolioTradingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    isDeleting: boolean;
  }>({
    isOpen: false,
    isDeleting: false,
  });

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const dateTimeFormatter = useMemo(
    () => createDateTimeFormatter(DateTimeFormatOption),
    [i18n.language]
  );

  const fetchPortfolio = useCallback(async () => {
    if (!id) {
      setError(t('portfolios.detail.notFound'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let response = await getPortfolioById(id, false);
      if (!response && isAuthenticated) {
        response = await getPortfolioById(id, true);
      }

      if (!response) {
        setError(t('portfolios.detail.notFound'));
        return;
      }

      setPortfolio(response.portfolio);
      setTradings(response.tradings || []);

    } catch (err) {
      console.error('Failed to load portfolio:', err);
      setError(t('portfolios.detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, t]);

  useEffect(() => {
    if (!authLoading) {
      fetchPortfolio();
    }
  }, [authLoading, fetchPortfolio]);

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

  const handleDeleteClick = () => {
    setDeleteConfirmation({
      isOpen: true,
      isDeleting: false,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      isOpen: false,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!portfolio) {
      return;
    }

    try {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));
      await deletePortfolio(portfolio.id);
      navigate('/portfolios');
    } catch (err) {
      console.error('Failed to delete portfolio:', err);
      setError(t('portfolios.deleteFailed', { error: err instanceof Error ? err.message : 'Unknown error' }));
      setDeleteConfirmation({
        isOpen: false,
        isDeleting: false,
      });
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

  const portfolioInfo = useMemo(() => (portfolio?.info ?? {}) as Record<string, unknown>, [portfolio]);

  const parseNumeric = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const getDateLike = (value: unknown): string | number | null => {
    if (typeof value === 'string' || typeof value === 'number') return value;
    return null;
  };

  const parseDateValue = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const portfolioTrading = useMemo<Trading | null>(() => {
    if (!portfolio) return null;
    const startDate = getDateLike(portfolioInfo.start_date) ?? undefined;
    return {
      id: portfolio.id,
      name: portfolio.name,
      exchange_binding_id: '',
      type: 'real',
      status: portfolio.status,
      created_at: portfolio.created_at ?? new Date().toISOString(),
      info: {
        ...portfolioInfo,
        ...(startDate ? { start_date: startDate } : {}),
      },
    };
  }, [portfolio, portfolioInfo]);

  const portfolioDayCount = useMemo(() => {
    const start = parseDateValue(portfolioInfo.start_date);
    if (!start) return null;
    const end = parseDateValue(portfolioInfo.end_date) ?? new Date();
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return null;
    return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
  }, [portfolioInfo]);
  const portfolioDayCountLabel =
    portfolioDayCount !== null ? t('trading.detail.dayCount', { count: portfolioDayCount }) : null;

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
  const infoInitialFunds = parseNumeric(portfolioInfo.initial_funds);
  const infoBaselinePrice = parseNumeric(portfolioInfo.baseline_price);
  const quoteCurrency = typeof portfolioInfo.quote_currency === 'string' ? portfolioInfo.quote_currency : undefined;
  const initialFunds = infoInitialFunds;
  const baselinePrice = infoBaselinePrice;
  const startDateDisplay = formatDateTime(getDateLike(portfolioInfo.start_date));
  const endDateDisplay = formatDateTime(getDateLike(portfolioInfo.end_date));
  const hasEndDate = portfolioInfo.end_date !== null && portfolioInfo.end_date !== undefined;
  const formatFunds = (value: number): string => {
    const formatted = Math.floor(value).toLocaleString();
    if (quoteCurrency === 'USD' || quoteCurrency === 'USDT') {
      return `$${formatted}`;
    }
    if (quoteCurrency) {
      return `${formatted} ${quoteCurrency}`;
    }
    return formatted;
  };

  const formatPrice = (value: number): string => {
    const formatted = value.toFixed(2);
    if (quoteCurrency === 'USD' || quoteCurrency === 'USDT') {
      return `$${formatted}`;
    }
    if (quoteCurrency) {
      return `${formatted} ${quoteCurrency}`;
    }
    return formatted;
  };

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
                  <button
                    onClick={() => navigate(`/portfolios/${portfolio.id}/edit`)}
                    className="ml-auto shrink-0 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    title={t('common.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="shrink-0 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                  {portfolioDayCountLabel && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/80">
                      {portfolioDayCountLabel}
                    </span>
                  )}
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
                      {typeof initialFunds === 'number' ? formatFunds(initialFunds) : '—'}
                    </span>
                  </div>
                  {baselinePrice !== undefined && (
                    <div className="flex mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-600">{t('trading.detail.initialPrice')}:&nbsp;</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {typeof baselinePrice === 'number' ? formatPrice(baselinePrice) : '—'}
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

      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('portfolios.deleteTitle')}
        message={t('portfolios.deleteMessage', { name: portfolio.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDestructive={true}
        isLoading={deleteConfirmation.isDeleting}
      />
    </div>
  );
};

export default PortfolioDetailPage;
