import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getTradings, deleteTrading, type Trading, ApiError, getBots, type Bot } from '../utils/api';
import { TrendingUp, Calendar, Activity, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CreateTradingModal from '../components/trading/CreateTradingModal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tradings, setTradings] = useState<Trading[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'backtest' | 'paper' | 'real'>('paper');
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
        // Don't show error for bot fetch failure, just log it
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

  const getFilteredTradings = (type: string) => {
    return tradings.filter(trading => trading.type.toLowerCase() === type.toLowerCase());
  };

  const handleCreateTrading = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = (newTrading: Trading) => {
    // Add the new trading to the list and refresh the data
    setTradings(prev => [newTrading, ...prev]);
    // Optionally switch to the tab of the newly created trading
    setActiveTab(newTrading.type as 'backtest' | 'paper' | 'real');
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
    console.log('handleDeleteConfirm called');

    if (!deleteConfirmation.trading) {
      console.error('No trading selected for deletion');
      return;
    }

    console.log('Starting deletion for trading:', deleteConfirmation.trading.id, deleteConfirmation.trading.name);

    // Check authentication
    const token = localStorage.getItem('access_token');
    console.log('Access token present:', !!token);
    if (!token) {
      console.error('No access token found');
      setError('You must be signed in to delete tradings');
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
      return;
    }

    try {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));

      console.log('Calling deleteTrading API...');
      await deleteTrading(deleteConfirmation.trading.id, deleteConfirmation.trading.type);
      console.log('Trading deleted successfully');

      // Remove trading from the list
      setTradings(prev => prev.filter(t => t.id !== deleteConfirmation.trading?.id));

      // Close confirmation dialog
      setDeleteConfirmation({
        isOpen: false,
        trading: null,
        isDeleting: false,
      });

      // Clear any previous errors
      setError(null);

      // Show success message
      console.log(t('dashboard.deleteSuccess'));
    } catch (err) {
      console.error('Failed to delete trading:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        err
      });

      let errorMessage = 'Unknown error';
      if (err instanceof ApiError) {
        errorMessage = err.message;
        console.error('API Error details:', {
          code: err.code,
          message: err.message,
          details: err.details,
          status: err.status
        });
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Close dialog and show error in main page
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

  // Helper function to get strategy name from bot data
  const getStrategyForTrading = (trading: Trading): string => {
    const bot = bots.find(b => b.record.spec.trading.id === trading.id);
    return bot?.record.spec.params?.strategy_name || trading.info?.strategy || 'N/A';
  };

  // Helper function to get bot status for a trading
  const getBotForTrading = (trading: Trading): Bot | null => {
    return bots.find(b => b.record.spec.trading.id === trading.id) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'stopped':
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'backtest':
        return <Activity className="w-5 h-5" />;
      case 'live':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

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
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.activeTradings')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tradings.filter(t => ['active', 'running'].includes(t.status.toLowerCase())).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('dashboard.totalTradings')}</p>
                <p className="text-2xl font-bold text-gray-900">{tradings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trading List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">{t('dashboard.yourTradings')}</h2>
              <button
                onClick={fetchTradings}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'paper', label: t('trading.type.paper') || 'Paper', icon: Calendar },
                { key: 'backtest', label: t('trading.type.backtest') || 'Backtest', icon: Activity },
                { key: 'real', label: t('trading.type.real') || 'Real', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'backtest' | 'paper' | 'real')}
                    className={`${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getFilteredTradings(tab.key).length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('dashboard.loadingTradings')}</p>
            </div>
          ) : getFilteredTradings(activeTab).length === 0 ? (
            <div className="px-6 py-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{t('dashboard.noTradingsFound')}</p>
              <p className="text-sm text-gray-500">{t('dashboard.noTradingsDescription')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.strategy')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bot Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.created')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('dashboard.tableHeaders.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredTradings(activeTab).map((trading) => (
                    <tr key={trading.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/trading/${trading.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(trading.type)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                              {trading.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {trading.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                          {t(`trading.type.${trading.type.toLowerCase()}`) || trading.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(trading.status)}`}>
                          {t(`trading.status.${trading.status.toLowerCase()}`) || trading.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStrategyForTrading(trading)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const bot = getBotForTrading(trading);
                          if (!bot) {
                            return (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                No Bot
                              </span>
                            );
                          }
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              bot.alive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bot.alive ? 'Online' : 'Offline'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(trading.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => handleDeleteClick(trading, e)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Button */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={handleCreateTrading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.createNew', { type: t(`trading.type.${activeTab}`) || activeTab })}
            </button>
          </div>
        </div>
      </div>
      </div>
      <Footer />

      {/* Create Trading Modal */}
      <CreateTradingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tradingType={activeTab}
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
    </div>
  );
};

export default DashboardPage;