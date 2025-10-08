import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getExchangeBindings, createExchangeBinding, deleteExchangeBinding, updateExchangeBinding, getTradings, getExchanges, type ExchangeBinding, type CreateExchangeBindingRequest, type UpdateExchangeBindingRequest, type Trading, ApiError } from '../utils/api';
import { Building2, Plus, Trash2, Edit2, AlertCircle, Shield } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ConfirmDialog from '../components/common/ConfirmDialog';

export const ExchangesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [exchanges, setExchanges] = useState<ExchangeBinding[]>([]);
  const [tradings, setTradings] = useState<Trading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referencingTradings, setReferencingTradings] = useState<Trading[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExchange, setEditingExchange] = useState<ExchangeBinding | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    exchange: ExchangeBinding | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    exchange: null,
    isDeleting: false,
  });

  const fetchExchanges = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getExchangeBindings();
      setExchanges(data);

      // Also fetch tradings to check for references
      try {
        const tradingsData = await getTradings();
        setTradings(tradingsData);
      } catch (tradingErr) {
        console.warn('Failed to fetch tradings for validation:', tradingErr);
        // Don't fail the whole page if tradings can't be fetched
        setTradings([]);
      }
    } catch (err) {
      console.error('Failed to fetch exchanges:', err);
      if (err instanceof ApiError) {
        setError(t('exchanges.loadFailed', { error: err.message }));
      } else {
        setError(t('exchanges.loadFailed', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchExchanges();
    }
  }, [isAuthenticated, authLoading]);

  const handleCreateExchange = () => {
    setEditingExchange(null);
    setIsCreateModalOpen(true);
  };

  const handleEditExchange = (exchange: ExchangeBinding) => {
    setEditingExchange(exchange);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (exchange: ExchangeBinding) => {
    // Check if this exchange is referenced by any trading
    // The API returns exchange_binding as an embedded object, so we need to check both fields
    const referenced = tradings.filter(t =>
      t.exchange_binding_id === exchange.id ||
      t.exchange_binding?.id === exchange.id
    );

    if (referenced.length > 0) {
      setReferencingTradings(referenced);
      setError(t('exchanges.cannotDeleteInUse', {
        count: referenced.length,
        tradingNames: referenced.map(t => t.name).join(', ')
      }));
      return;
    }

    // Clear any previous errors
    setError(null);
    setReferencingTradings([]);

    setDeleteConfirmation({
      isOpen: true,
      exchange,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.exchange) return;

    setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));

    try {
      await deleteExchangeBinding(deleteConfirmation.exchange.id);
      await fetchExchanges();
      setDeleteConfirmation({ isOpen: false, exchange: null, isDeleting: false });
    } catch (err) {
      console.error('Failed to delete exchange:', err);
      if (err instanceof ApiError) {
        setError(`Failed to delete exchange: ${err.message}`);
      } else {
        setError('Failed to delete exchange. Please try again.');
      }
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingExchange(null);
  };

  const handleExchangeSuccess = async () => {
    await fetchExchanges();
    handleModalClose();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to manage your exchanges.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('exchanges.title')}</h1>
              <p className="text-gray-600">{t('exchanges.description')}</p>
            </div>
            <button
              onClick={handleCreateExchange}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('exchanges.addExchange')}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 mb-2">{error}</p>
              {referencingTradings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {referencingTradings.map(trading => (
                    <div key={trading.id}>
                      <Link
                        to={`/trading/${trading.id}`}
                        className="text-sm text-blue-700 hover:text-blue-900 underline font-medium"
                      >
                        → {trading.name}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Exchanges List */}
            {exchanges.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('exchanges.noExchanges')}</h3>
                <p className="text-gray-600 mb-6">{t('exchanges.noExchangesDescription')}</p>
                <button
                  onClick={handleCreateExchange}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('exchanges.addExchange')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exchanges.map((exchange) => (
                  <div
                    key={exchange.id}
                    className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{exchange.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{exchange.exchange}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditExchange(exchange)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('exchanges.edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(exchange)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('exchanges.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {t('exchanges.status')}: <span className={`font-medium ${exchange.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                            {exchange.status}
                          </span>
                        </span>
                      </div>
                      {exchange.info?.description && (
                        <p className="text-sm text-gray-600 mt-2">{exchange.info.description}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {t('exchanges.created')} {new Date(exchange.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Create/Edit Exchange Modal */}
      {isCreateModalOpen && (
        <ExchangeModal
          isOpen={isCreateModalOpen}
          onClose={handleModalClose}
          onSuccess={handleExchangeSuccess}
          exchange={editingExchange}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, exchange: null, isDeleting: false })}
        onConfirm={handleDeleteConfirm}
        title={t('exchanges.deleteTitle')}
        message={t('exchanges.deleteMessage', { name: deleteConfirmation.exchange?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isLoading={deleteConfirmation.isDeleting}
        isDestructive={true}
      />
    </div>
  );
};

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exchange?: ExchangeBinding | null;
}

const ExchangeModal: React.FC<ExchangeModalProps> = ({ isOpen, onClose, onSuccess, exchange }) => {
  const { t } = useTranslation();
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(true);

  // Helper function to generate default name based on exchange type
  const getDefaultName = (exchangeType: string) => {
    const exchangeNames: { [key: string]: string } = {
      binance: 'Binance',
      okx: 'OKX',
      bybit: 'Bybit',
      kraken: 'Kraken',
      gate: 'Gate.io',
      coinbase: 'Coinbase',
    };
    return `My ${exchangeNames[exchangeType] || exchangeType}`;
  };

  const [formData, setFormData] = useState({
    name: exchange?.name || getDefaultName(availableExchanges[0] || 'binance'),
    exchange: exchange?.exchange || availableExchanges[0] || 'binance',
    api_key: '',
    api_secret: '',
    description: exchange?.info?.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available exchanges from the API
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setLoadingExchanges(true);
        const exchanges = await getExchanges();
        setAvailableExchanges(exchanges);

        // If this is a new exchange (not editing), set the first exchange as default
        if (!exchange && exchanges.length > 0) {
          setFormData(prev => ({
            ...prev,
            exchange: exchanges[0],
            name: getDefaultName(exchanges[0]),
          }));
        }
      } catch (err) {
        console.error('Failed to fetch exchanges:', err);
        setError('Failed to load available exchanges');
      } finally {
        setLoadingExchanges(false);
      }
    };

    if (isOpen) {
      fetchExchanges();
    }
  }, [isOpen, exchange]);

  // Update default name when exchange type changes (only for new exchanges)
  useEffect(() => {
    if (!exchange && isOpen) {
      setFormData(prev => ({
        ...prev,
        name: getDefaultName(prev.exchange),
      }));
    }
  }, [formData.exchange, exchange, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t('exchanges.nameRequired'));
      return;
    }

    if (!exchange && !formData.api_key.trim()) {
      setError(t('exchanges.apiKeyRequired'));
      return;
    }

    if (!exchange && !formData.api_secret.trim()) {
      setError(t('exchanges.apiSecretRequired'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (exchange) {
        // Update existing exchange
        const updateData: UpdateExchangeBindingRequest = {
          name: formData.name,
        };

        // Only include API credentials if they were changed
        if (formData.api_key) {
          updateData.api_key = formData.api_key;
        }
        if (formData.api_secret) {
          updateData.api_secret = formData.api_secret;
        }

        updateData.info = {
          ...exchange.info,
          description: formData.description,
        };

        await updateExchangeBinding(exchange.id, updateData);
      } else {
        // Create new exchange
        const request: CreateExchangeBindingRequest = {
          name: formData.name,
          exchange: formData.exchange,
          type: 'private',
          api_key: formData.api_key,
          api_secret: formData.api_secret,
          info: {
            testnet: false,
            description: formData.description,
          },
        };

        await createExchangeBinding(request);
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to save exchange:', err);
      if (err instanceof ApiError) {
        setError(exchange ? t('exchanges.updateFailed', { error: err.message }) : t('exchanges.createFailed', { error: err.message }));
      } else {
        setError(exchange ? t('exchanges.updateFailed', { error: 'Unknown error' }) : t('exchanges.createFailed', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
      <div className="relative mx-auto p-6 border border-gray-200 w-full max-w-md shadow-2xl rounded-lg bg-white/95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {exchange ? t('exchanges.editExchange') : t('exchanges.createExchange')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exchange Selection (only for new exchanges) - Moved to top */}
          {!exchange ? (
            <div>
              <label htmlFor="exchange" className="block text-sm font-medium text-gray-700 mb-1">
                {t('exchanges.exchange')} <span className="text-red-500">*</span>
              </label>
              <select
                id="exchange"
                value={formData.exchange}
                onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loadingExchanges}
              >
                {loadingExchanges ? (
                  <option value="">Loading exchanges...</option>
                ) : availableExchanges.length > 0 ? (
                  availableExchanges.map((exchangeName) => (
                    <option key={exchangeName} value={exchangeName}>
                      {exchangeName.charAt(0).toUpperCase() + exchangeName.slice(1)}
                    </option>
                  ))
                ) : (
                  <option value="">No exchanges available</option>
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exchanges.exchange')}
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 capitalize">
                {exchange.exchange}
              </div>
            </div>
          )}

          {/* Exchange Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('exchanges.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('exchanges.namePlaceholder')}
              required
            />
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="api_key" className="block text-sm font-medium text-gray-700 mb-1">
              {t('exchanges.apiKey')} {!exchange && <span className="text-red-500">*</span>}
              {exchange && <span className="text-gray-500 text-xs ml-1">(leave empty to keep current)</span>}
            </label>
            <input
              type="text"
              id="api_key"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('exchanges.apiKeyPlaceholder')}
              required={!exchange}
            />
          </div>

          {/* API Secret */}
          <div>
            <label htmlFor="api_secret" className="block text-sm font-medium text-gray-700 mb-1">
              {t('exchanges.apiSecret')} {!exchange && <span className="text-red-500">*</span>}
              {exchange && <span className="text-gray-500 text-xs ml-1">(leave empty to keep current)</span>}
            </label>
            <input
              type="password"
              id="api_secret"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('exchanges.apiSecretPlaceholder')}
              required={!exchange}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('exchanges.description')} <span className="text-gray-500 text-xs">{t('common.optional')}</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder={t('exchanges.descriptionPlaceholder')}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.creating') : exchange ? t('common.create') : t('exchanges.addExchange')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExchangesPage;
