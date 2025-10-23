import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTradings, deleteTrading, type Trading, ApiError, getBots, type Bot } from '../utils/api';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CreateTradingModal from '../components/trading/CreateTradingModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import UnderConstruction from '../components/common/UnderConstruction';
import { THEME_COLORS } from '../config/theme';

export const TradingsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tradings, setTradings] = useState<Trading[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    trading: Trading | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    trading: null,
    isDeleting: false,
  });
  const [showUnderConstructionDialog, setShowUnderConstructionDialog] = useState(false);

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

  const getFilteredTradings = () => {
    return tradings.filter(trading => trading.type.toLowerCase() === type?.toLowerCase());
  };

  // Helper function to get bot status for a trading
  const getBotForTrading = (trading: Trading): Bot | null => {
    return bots.find(b => b.record.spec.trading.id === trading.id) || null;
  };

  // Helper function to get strategy name from bot data
  const getStrategyForTrading = (trading: Trading): string => {
    const bot = bots.find(b => b.record.spec.trading.id === trading.id);
    return String(bot?.record.spec.params?.strategy_name || trading.info?.strategy || t('trading.tradingDetail.notAvailable'));
  };

  const handleCreateTrading = () => {
    // Show "under construction" message for backtest trading
    if (type === 'backtest') {
      setShowUnderConstructionDialog(true);
      return;
    }

    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = (newTrading: Trading) => {
    // Add the new trading to the list and refresh the data
    setTradings(prev => [newTrading, ...prev]);
  };

  const handleDeleteClick = (trading: Trading, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to trading detail
    setDeleteConfirmation({
      isOpen: true,
      trading,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.trading) {
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError(t('trading.tradingDetail.notSignedIn'));
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
      return;
    }

    try {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));
      await deleteTrading(deleteConfirmation.trading.id, deleteConfirmation.trading.type);

      // Remove trading from the list
      setTradings(prev => prev.filter(t => t.id !== deleteConfirmation.trading?.id));

      // Close confirmation dialog
      setDeleteConfirmation({
        isOpen: false,
        trading: null,
        isDeleting: false,
      });

      setError(null);
    } catch (err) {
      console.error('Failed to delete trading:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setDeleteConfirmation({
        isOpen: false,
        trading: null,
        isDeleting: false,
      });
      setError(t('dashboard.deleteFailed', { error: errorMessage }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({
      isOpen: false,
      trading: null,
      isDeleting: false,
    });
  };

  const getTradingTypeInfo = () => {
    const types = {
      paper: {
        label: t('trading.type.paper') || 'Paper Trading',
        icon: THEME_COLORS.paper.icon,
        colors: THEME_COLORS.paper,
        description: t('dashboard.paperDescription') || 'Simulated trading with virtual funds'
      },
      backtest: {
        label: t('trading.type.backtest') || 'Backtest',
        icon: THEME_COLORS.backtest.icon,
        colors: THEME_COLORS.backtest,
        description: t('dashboard.backtestDescription') || 'Test strategies on historical data'
      },
      real: {
        label: t('trading.type.real') || 'Real Trading',
        icon: THEME_COLORS.real.icon,
        colors: THEME_COLORS.real,
        description: t('dashboard.realDescription') || 'Live trading with real funds'
      }
    };
    return types[type as keyof typeof types] || types.paper;
  };

  const typeInfo = getTradingTypeInfo();
  const Icon = typeInfo.icon;
  const colors = typeInfo.colors;
  const filteredTradings = getFilteredTradings();

  // Calculate statistics
  const totalTradings = filteredTradings.length;
  const activeTradings = filteredTradings.filter(t => {
    const bot = getBotForTrading(t);
    return bot?.alive === true;
  }).length;
  const offlineTradings = filteredTradings.filter(t => {
    const bot = getBotForTrading(t);
    return bot && !bot.alive;
  }).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
        {/* Header with Statistics */}
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
                <h1 className="text-2xl font-bold">{typeInfo.label}</h1>
                <p className="text-white/90 mt-1">{typeInfo.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('dashboard.totalTradings')}</p>
                <p className="text-3xl font-bold mt-1">{totalTradings}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('dashboard.activeTradings')}</p>
                <p className="text-3xl font-bold mt-1">{activeTradings}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-white/80 text-sm">{t('dashboard.offlineTradings')}</p>
                <p className="text-3xl font-bold mt-1">{offlineTradings}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.allTradings')}
            </h2>
            <button
              onClick={handleCreateTrading}
              style={{
                background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.createNew', { type: typeInfo.label })}
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('dashboard.loadingTradings')}</p>
            </div>
          ) : filteredTradings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noTradingsFound')}</h3>
              <p className="text-gray-600 mb-6">{t('dashboard.noTradingsDescription')}</p>
              <button
                onClick={handleCreateTrading}
                style={{ 
                  background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})` 
                }}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.createNew', { type: typeInfo.label })}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTradings.map((trading) => {
                const bot = getBotForTrading(trading);
                const strategy = getStrategyForTrading(trading);

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
                          <p className="text-white/80 text-xs mt-1">
                            ID: {trading.id.substring(0, 8)}...
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteClick(trading, e)}
                          className="ml-2 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('dashboard.tableHeaders.strategy')}</p>
                          <p className="text-sm font-medium text-gray-900">{strategy}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('dashboard.tableHeaders.botStatus')}</p>
                          {!bot ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {t('dashboard.botStatus.noBot')}
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              bot.alive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bot.alive ? t('dashboard.botStatus.online') : t('dashboard.botStatus.offline')}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('dashboard.tableHeaders.created')}</p>
                          <p className="text-sm text-gray-900">
                            {new Date(trading.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Create Trading Modal */}
      <CreateTradingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tradingType={type as 'backtest' | 'paper' | 'real'}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('dashboard.deleteTradingTitle')}
        message={
          deleteConfirmation.trading?.type === 'real'
            ? t('dashboard.deleteTradingMessageReal', {
                name: deleteConfirmation.trading?.name || ''
              })
            : t('dashboard.deleteTradingMessage', {
                name: deleteConfirmation.trading?.name || ''
              })
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDestructive={true}
        isLoading={deleteConfirmation.isDeleting}
      />

      {/* Under Construction Dialog */}
      {showUnderConstructionDialog && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
          <div className="relative mx-auto p-6 border border-gray-200 w-96 shadow-2xl rounded-lg bg-white/95">
            <button
              onClick={() => setShowUnderConstructionDialog(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <UnderConstruction />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingsListPage;
