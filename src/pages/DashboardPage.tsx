import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getTradings, type Trading, ApiError, getBots, type Bot, getExchangeBindings, type ExchangeBinding } from '../utils/api';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { THEME_COLORS } from '../config/theme';

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
  }, [isAuthenticated, authLoading]);

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

  const tradingTypes = [
    {
      key: 'paper' as const,
      label: t('trading.type.paper') || 'Paper Trading',
      icon: THEME_COLORS.paper.icon,
      colors: THEME_COLORS.paper,
      description: t('dashboard.paperDescription') || 'Simulated trading with virtual funds'
    },
    {
      key: 'backtest' as const,
      label: t('trading.type.backtest') || 'Backtest',
      icon: THEME_COLORS.backtest.icon,
      colors: THEME_COLORS.backtest,
      description: t('dashboard.backtestDescription') || 'Test strategies on historical data'
    },
    {
      key: 'real' as const,
      label: t('trading.type.real') || 'Real Trading',
      icon: THEME_COLORS.real.icon,
      colors: THEME_COLORS.real,
      description: t('dashboard.realDescription') || 'Live trading with real funds'
    }
  ];

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tradingTypes.map((type) => {
              const Icon = type.icon;
              const stats = getTradingTypeStats(type.key);
              const colors = type.colors;

              return (
                <div
                  key={type.key}
                  onClick={() => navigate(`/tradings/${type.key}`)}
                  className="bg-white rounded-lg shadow hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-200"
                >
                  {/* Colored Header */}
                  <div 
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.hover})` 
                    }}
                    className="p-6 text-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-10 h-10" />
                      <ChevronRight className="w-5 h-5 opacity-80" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{type.label}</h3>
                    <p className="text-sm text-white/80">{type.description}</p>
                  </div>

                  {/* White Body with Stats */}
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('dashboard.totalTradings')}</p>
                      </div>
                      <div className="text-right">
                        <p style={{ color: colors.primary }} className="text-3xl font-bold">{stats.active}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('dashboard.activeTradings')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Exchanges Card */}
            <div
              onClick={() => navigate('/exchanges')}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-gray-200"
            >
              {/* Colored Header */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${THEME_COLORS.exchanges.primary}, ${THEME_COLORS.exchanges.hover})`
                }}
                className="p-6 text-white"
              >
                <div className="flex items-center justify-between mb-3">
                  {React.createElement(THEME_COLORS.exchanges.icon, { className: "w-10 h-10" })}
                  <ChevronRight className="w-5 h-5 opacity-80" />
                </div>
                <h3 className="text-xl font-bold mb-1">{t('dashboard.exchanges')}</h3>
                <p className="text-sm text-white/80">{t('dashboard.manageExchanges')}</p>
              </div>

              {/* White Body with Stats */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{getExchangeStats().total}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('dashboard.totalExchanges')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default DashboardPage;