import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getTradings, type Trading, ApiError, getBots, type Bot, getExchangeBindings, type ExchangeBinding } from '../utils/api';
import { AlertCircle, ChevronRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { THEME_COLORS, getTradingTheme } from '../config/theme';
import { useRequireAuthRedirect } from '../hooks/useRequireAuthRedirect';
import TradingCardMetrics from '../components/trading/TradingCardMetrics';
import { getTradingDayCount } from '../utils/tradingDates';

const ICON_SERVICE_BASE_URL = import.meta.env.VITE_ICON_SERVICE_BASE_URL;

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tradings, setTradings] = useState<Trading[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeBinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTradings();
      setTradings(data);

      // Try to fetch bots for strategy information
      try {
        const botsData = await getBots();
        setBots(botsData.bots || []);
      } catch (botErr) {
        console.warn('Failed to fetch bots:', botErr);
        setBots([]);
      }

      // Try to fetch exchange bindings
      try {
        const exchangesData = await getExchangeBindings();
        setExchanges(exchangesData);
      } catch (exchangeErr) {
        console.warn('Failed to fetch exchanges:', exchangeErr);
        setExchanges([]);
      }
    } catch (err) {
      console.error('Failed to fetch tradings:', err);
      if (err instanceof ApiError) {
        setError(t('dashboard.failedToLoadWithError', { error: err.message }));
      } else {
        setError(`${t('dashboard.failedToLoad')}. ${t('common.tryAgain')}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchTradings();
    }
  }, [isAuthenticated, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useRequireAuthRedirect({ isAuthenticated, isLoading: authLoading });

  const getFilteredTradings = (type: string) => {
    return tradings.filter(trading => trading.type.toLowerCase() === type.toLowerCase());
  };

  // Helper function to get bot status for a trading
  const getBotForTrading = (trading: Trading): Bot | null => {
    return bots.find(b => b.record.spec.trading.id === trading.id) || null;
  };

  // Calculate statistics for each trading type
  const getTradingTypeStats = (type: string) => {
    const filtered = getFilteredTradings(type);
    const total = filtered.length;
    const active = filtered.filter(t => {
      const bot = getBotForTrading(t);
      return bot?.alive === true;
    }).length;
    return { total, active };
  };

  // Calculate exchange statistics
  const getExchangeStats = () => {
    const total = exchanges.length;
    const active = exchanges.filter(e => e.status === 'active').length;
    return { total, active };
  };

  const renderExchangeIcons = (bindings: ExchangeBinding[]) => {
    const ExchangeFallbackIcon = THEME_COLORS.exchanges.icon;
    const { total } = getExchangeStats();
    return (
      <div className="flex items-center flex-wrap gap-2 mt-2" aria-label={`${t('dashboard.totalExchanges')}: ${total}`}>
        <span className="sr-only">{`${t('dashboard.totalExchanges')}: ${total}`}</span>
        {bindings.map((binding, idx) => {
          const iconUrl = ICON_SERVICE_BASE_URL && binding.exchange_type
            ? `${ICON_SERVICE_BASE_URL}/icons/${binding.exchange_type}.png`
            : null;
          return iconUrl ? (
            <img
              key={`exchange-icon-${binding.id}-${idx}`}
              src={iconUrl}
              alt={binding.exchange_type}
              className="w-7 h-7 rounded-full bg-white/10 p-0.5"
            />
          ) : (
            <ExchangeFallbackIcon key={`exchange-icon-fallback-${binding.id}-${idx}`} className="w-6 h-6 text-white" />
          );
        })}
      </div>
    );
  };

  const renderIconRow = (goldCount: number, grayCount: number, keyPrefix: string, ariaLabel: string) => (
    <div className="flex items-center flex-wrap gap-2 mt-2" aria-label={ariaLabel}>
      {Array.from({ length: goldCount }).map((_, idx) => (
        <img
          key={`${keyPrefix}-gold-${idx}`}
          src="/tiris-gold.png"
          alt={t('dashboard.activeTradings')}
          className="w-8 h-8"
        />
      ))}
      {Array.from({ length: grayCount }).map((_, idx) => (
        <img
          key={`${keyPrefix}-gray-${idx}`}
          src="/tiris-gray.png"
          alt={t('dashboard.totalTradings')}
          className="w-8 h-8 opacity-30"
        />
      ))}
    </div>
  );

  const tradingTypes = [
    {
      key: 'backtest' as const,
      label: t('trading.type.backtest') || 'Backtest',
      icon: THEME_COLORS.backtest.icon,
      colors: THEME_COLORS.backtest,
      description: t('dashboard.backtestDescription') || 'Test strategies on historical data'
    },
    {
      key: 'paper' as const,
      label: t('trading.type.paper') || 'Paper Trading',
      icon: THEME_COLORS.paper.icon,
      colors: THEME_COLORS.paper,
      description: t('dashboard.paperDescription') || 'Simulated trading with virtual funds'
    },
    {
      key: 'real' as const,
      label: t('trading.type.real') || 'Real Trading',
      icon: THEME_COLORS.real.icon,
      colors: THEME_COLORS.real,
      description: t('dashboard.realDescription') || 'Live trading with real funds'
    }
  ];

  const onlineTradings = useMemo(() => {
    return bots
      .filter(bot => bot.alive)
      .map(bot => {
        const trading = tradings.find(t => t.id === bot.record.spec.trading.id);
        if (!trading) return null;
        return {
          trading,
          bot,
          updatedAt: bot.record.updated_at ?? ''
        };
      })
      .filter((entry): entry is { trading: Trading; bot: Bot; updatedAt: string } => entry !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [bots, tradings]);

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
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 bg-tiris-primary-600 text-white rounded-md hover:bg-tiris-primary-700 transition-colors"
          >
            {t('common.goToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20"> {/* Add padding to account for fixed navigation */}
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                <p className="text-gray-600">{t('dashboard.welcome', { name: user?.name })}</p>
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 px-6 py-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('dashboard.loadingTradings')}</p>
          </div>
        ) : (
          <>
            {onlineTradings.length > 0 && (
              <div className="mb-8">
                {/* <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.activeTradings')}</h2>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                    {onlineTradings.length}
                  </span>
                </div> */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {onlineTradings.map(({ trading, bot }) => {
                    const colors = THEME_COLORS[getTradingTheme(trading.type)];
                    const dayCount = getTradingDayCount(trading);
                    const dayCountLabel = dayCount !== null ? t('trading.detail.dayCount', { count: dayCount }) : null;
                    const exchangeType = (trading.type === 'paper' || trading.type === 'backtest')
                      ? (trading.info as { exchange_type?: string; exchange_ccxt_id?: string; exchange_name?: string })?.exchange_type
                      : trading.exchange_binding?.exchange_type;
                    const exchangeName = (trading.type === 'paper' || trading.type === 'backtest')
                      ? (trading.info as { exchange_name?: string })?.exchange_name
                      : trading.exchange_binding?.name;
                    const exchangeIconUrl = exchangeType && ICON_SERVICE_BASE_URL
                      ? `${ICON_SERVICE_BASE_URL}/icons/${exchangeType}.png`
                      : null;

                    return (
                      <div
                        key={trading.id}
                        onClick={() => navigate(`/trading/${trading.id}`)}
                        className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
                      >
                        {/* Card Header */}
                        <div
                          style={{
                            background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                          }}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-white truncate">
                                {trading.name}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                                {(exchangeName) && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 gap-1.5">
                                    {exchangeType && exchangeIconUrl && (
                                      <img
                                        src={exchangeIconUrl}
                                        alt={exchangeType}
                                        className="w-4 h-4 rounded"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    {exchangeName}
                                  </span>
                                )}
                                {dayCountLabel && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90">
                                    {dayCountLabel}
                                  </span>
                                )}
                                {(bot?.record.spec.params?.timeframe || trading.info?.timeframe) === '5m' && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-white/20 text-white/90 cursor-help"
                                    title={t('trading.badges.minuteLevelTooltip')}
                                  >
                                    <Zap className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-200 text-green-900">
                                  {t('dashboard.botStatus.online')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Body - Metrics */}
                        <TradingCardMetrics trading={trading} />
                      </div>
                    );
                  })}
                </div>
                <hr className="my-8 border-gray-300" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tradingTypes.map((type, index) => {
              const Icon = type.icon;
              const stats = getTradingTypeStats(type.key);
              const colors = type.colors;
              const activeCount = Math.max(0, Math.min(stats.active, stats.total));
              const remainingCount = Math.max(0, stats.total - activeCount);

              return (
                <React.Fragment key={type.key}>
                  <div
                    onClick={() => navigate(`/tradings/${type.key}`)}
                    className="py-6 rounded-lg shadow hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-200"
                    style={{
                      background: `linear-gradient(90deg, ${colors.primary}, ${colors.hover})`
                    }}
                >
                    {/* Colored Header */}
                    <div
                      className="px-6 pb-6 text-white"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Icon className="w-10 h-10" />
                        <ChevronRight className="w-5 h-5 opacity-80" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{type.label}</h3>
                      <p className="text-sm text-white/80">{type.description}</p>
                    </div>

                    {/* Icon Row */}
                    <div
                      className="px-6 text-white"
                    >
                      {renderIconRow(
                        activeCount,
                        remainingCount,
                        `${type.key}-total`,
                        `${type.label} ${t('dashboard.totalTradings')}: ${stats.total}`
                      )}
                    </div>
                  </div>

                  {/* Exchanges Card after paper (index 1) */}
                  {index === 1 && (
                    <div
                      onClick={() => navigate('/exchanges')}
                      className="py-6 rounded-lg shadow hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-200"
                      style={{
                        background: `linear-gradient(90deg, ${THEME_COLORS.exchanges.primary}, ${THEME_COLORS.exchanges.hover})`
                      }}
                    >
                      <div
                        className="px-6 pb-6 text-white"
                      >
                        <div className="flex items-center justify-between mb-3">
                          {React.createElement(THEME_COLORS.exchanges.icon, { className: "w-10 h-10" })}
                          <ChevronRight className="w-5 h-5 opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">{t('dashboard.exchanges')}</h3>
                        <p className="text-sm text-white/80">{t('dashboard.manageExchanges')}</p>
                      </div>
                      <div className="px-6 text-white">
                        {renderExchangeIcons(exchanges)}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            </div>
          </>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default DashboardPage;
