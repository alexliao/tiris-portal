import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../hooks/useAuth';
import { useRequireAuthRedirect } from '../hooks/useRequireAuthRedirect';
import { ApiError, getPortfolios, type Portfolio } from '../utils/api';
import { THEME_COLORS } from '../config/theme';

export const PortfoliosListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPortfolios();
      setPortfolios(data);
    } catch (err) {
      console.error('Failed to fetch portfolios:', err);
      if (err instanceof ApiError) {
        setError(t('portfolios.failedToLoadWithError', { error: err.message }));
      } else {
        setError(`${t('portfolios.failedToLoad')}. ${t('common.tryAgain')}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPortfolios();
    }
  }, [isAuthenticated, authLoading]);

  useRequireAuthRedirect({ isAuthenticated, isLoading: authLoading });

  const colors = THEME_COLORS.portfolio;
  const Icon = colors.icon;

  const stats = useMemo(() => {
    const total = portfolios.length;
    const active = portfolios.filter(portfolio => portfolio.status?.toLowerCase() === 'active').length;
    const archived = total - active;
    return { total, active, archived };
  }, [portfolios]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20">
        <div
          style={{
            background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
          }}
          className="text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                title={t('common.backToDashboard')}
              >
                <Icon className="w-8 h-8" />
              </button>
              <div className="ml-4">
                <h1 className="text-2xl font-bold">{t('portfolios.title')}</h1>
                <p className="text-white/90 mt-1">{t('portfolios.description')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('portfolios.totalPortfolios')}</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('portfolios.activePortfolios')}</p>
                <p className="text-3xl font-bold mt-1">{stats.active}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('portfolios.archivedPortfolios')}</p>
                <p className="text-3xl font-bold mt-1">{stats.archived}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('portfolios.allPortfolios')}
            </h2>
            <button
              onClick={() => navigate('/portfolios/create')}
              style={{
                background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('portfolios.createPortfolio')}
            </button>
          </div>

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
              <p className="text-gray-600">{t('portfolios.loadingPortfolios')}</p>
            </div>
          ) : portfolios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('portfolios.noPortfoliosFound')}</h3>
              <p className="text-gray-600">{t('portfolios.noPortfoliosDescription')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((portfolio) => {
                const status = portfolio.status?.toLowerCase() || 'active';
                const statusBadgeClass = status === 'active'
                  ? 'bg-green-200 text-green-900'
                  : 'bg-gray-200 text-gray-900';
                const statusLabel = (status === 'active' || status === 'archived')
                  ? t(`portfolios.status.${status}`)
                  : portfolio.status;

                return (
                  <div
                    key={portfolio.id}
                    onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                    className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden cursor-pointer"
                  >
                    <div
                      style={{
                        background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                      }}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {portfolio.name}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadgeClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 text-right">
                          <p className="text-xs text-white/80">{t('portfolios.memberTradings')}</p>
                          <p className="text-2xl font-bold text-white">{portfolio.trading_count ?? 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white">
                      {portfolio.memo && (
                        <p className="text-sm text-gray-600">{portfolio.memo}</p>
                      )}
                      {portfolio.updated_at && (
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <span>{t('portfolios.lastUpdated')}</span>
                          <span>{new Date(portfolio.updated_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PortfoliosListPage;
