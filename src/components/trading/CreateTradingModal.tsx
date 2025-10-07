import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';
import {
  createTrading,
  createPaperTrading,
  getPublicExchangeBindings,
  getExchangeBindings,
  getStrategies,
  type CreateTradingRequest,
  type ExchangeBinding,
  type Trading,
  ApiError
} from '../../utils/api';

interface CreateTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradingType: 'backtest' | 'paper' | 'real';
  onSuccess: (trading: Trading) => void;
}

export const CreateTradingModal: React.FC<CreateTradingModalProps> = ({
  isOpen,
  onClose,
  tradingType,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateTradingRequest>({
    name: '',
    exchange_binding_id: '',
    type: tradingType,
    info: {
      description: '',
    },
  });
  const [exchangeBindings, setExchangeBindings] = useState<ExchangeBinding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBindings, setIsLoadingBindings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [isLoadingBotData, setIsLoadingBotData] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [quoteCurrency, setQuoteCurrency] = useState<'USDT' | 'USDC'>('USDT');

  const generateDefaultName = (type: string): string => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = monthNames[now.getMonth()];
    const day = now.getDate();
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const typeNames = {
      backtest: 'Backtest',
      paper: 'Paper',
      real: 'Live Trading'
    };

    const typeName = typeNames[type as keyof typeof typeNames] || type;

    return `${typeName} ${month} ${day} ${time}`;
  };

  useEffect(() => {
    if (isOpen) {
      fetchExchangeBindings();
      // Set default name based on trading type with timestamp
      setFormData(prev => ({
        ...prev,
        name: generateDefaultName(tradingType),
        type: tradingType,
      }));

      // For paper and real trading, also fetch bot data
      if (tradingType === 'paper' || tradingType === 'real') {
        fetchBotData();
      }
    }
  }, [isOpen, tradingType]);

  const fetchExchangeBindings = async () => {
    try {
      setIsLoadingBindings(true);
      setError(null);

      // For paper trading, get public exchange bindings
      // For real trading, get user's private exchange bindings
      // For backtest, also use public exchange bindings
      const bindings = tradingType === 'real'
        ? await getExchangeBindings()
        : await getPublicExchangeBindings();

      setExchangeBindings(bindings);

      // Auto-select first binding if available
      if (bindings.length > 0) {
        setFormData(prev => ({
          ...prev,
          exchange_binding_id: bindings[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch exchange bindings:', err);
      if (err instanceof ApiError) {
        setError(t('trading.create.failedToLoadBindings', { error: err.message }));
      } else {
        setError(t('trading.create.failedToLoadBindings', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoadingBindings(false);
    }
  };

  const fetchBotData = async () => {
    try {
      setIsLoadingBotData(true);
      setError(null);

      const strategiesData = await getStrategies();
      setStrategies(strategiesData);

      // Auto-select first strategy if available
      if (strategiesData.length > 0) {
        setSelectedStrategy(strategiesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch bot data:', err);
      if (err instanceof ApiError) {
        setError(t('trading.botParams.failedToLoad', { error: err.message }));
      } else {
        setError(t('trading.botParams.failedToLoad', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoadingBotData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t('trading.create.nameRequired'));
      return;
    }

    if (!formData.exchange_binding_id) {
      setError(t('trading.create.exchangeBindingRequired'));
      return;
    }

    // For paper and real trading, validate bot parameters
    if (tradingType === 'paper' || tradingType === 'real') {
      if (!selectedStrategy) {
        setError(t('trading.create.selectStrategyError'));
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      let newTrading: Trading;
      const requestData = { ...formData };

      // Add bot parameters to info if this is paper trading
      if (tradingType === 'paper') {
        requestData.info = {
          ...requestData.info,
          strategy_name: selectedStrategy,
        };
      }

      // Add quote currency and strategy to info if this is real trading
      if (tradingType === 'real') {
        requestData.info = {
          ...requestData.info,
          quote_currency: quoteCurrency,
          strategy_name: selectedStrategy,
        };
      }

      console.log('🔍 [MODAL DEBUG] Final requestData being sent:', requestData);
      console.log('🔍 [MODAL DEBUG] Original formData.info:', formData.info);
      console.log('🔍 [MODAL DEBUG] Selected strategy:', selectedStrategy);

      // Use different creation methods based on trading type
      if (tradingType === 'paper') {
        console.log('Creating paper trading with business logic...');
        newTrading = await createPaperTrading(requestData);
      } else {
        console.log('Creating standard trading...');
        newTrading = await createTrading(requestData);
      }

      console.log('🔍 [MODAL DEBUG] Returned trading object:', newTrading);

      onSuccess(newTrading);
      onClose();

      // Reset form
      setFormData({
        name: '',
        exchange_binding_id: '',
        type: tradingType,
        info: {
          description: '',
        },
      });
      setSelectedStrategy('');
    } catch (err) {
      console.error('Failed to create trading:', err);
      if (err instanceof ApiError) {
        setError(t('trading.create.failedToCreate', { error: err.message }));
      } else {
        setError(t('trading.create.failedToCreate', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTradingRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInfoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      info: {
        ...prev.info,
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
      <div className="relative mx-auto p-6 border border-gray-200 w-96 shadow-2xl rounded-lg bg-white/95">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t('trading.create.title', { type: t(`trading.type.${tradingType}`) })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Paper Trading Info */}
        {tradingType === 'paper' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              {t('trading.create.paperInfo')}
            </p>
          </div>
        )}

        {/* Real Trading Info */}
        {tradingType === 'real' && !isLoadingBindings && exchangeBindings.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              No exchange connections found. Please add an exchange connection first in the{' '}
              <a href="/exchanges" className="underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/exchanges'; }}>
                Exchanges page
              </a>.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Trading Name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('trading.create.name')}
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('trading.create.namePlaceholder')}
              required
            />
          </div>

          {/* Exchange Binding */}
          <div className="mb-4">
            <label htmlFor="exchange_binding" className="block text-sm font-medium text-gray-700 mb-1">
              {t('trading.create.exchange')}
            </label>
            {isLoadingBindings ? (
              <div className="flex items-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">{t('common.loading')}</span>
              </div>
            ) : (
              <select
                id="exchange_binding"
                value={formData.exchange_binding_id}
                onChange={(e) => handleInputChange('exchange_binding_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">{t('trading.create.selectExchange')}</option>
                {exchangeBindings.map((binding) => (
                  <option key={binding.id} value={binding.id}>
                    {binding.name} ({binding.exchange})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quote Currency and Strategy for Real Trading */}
          {tradingType === 'real' && (
            <>
              <div className="mb-4">
                <label htmlFor="quote_currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Currency <span className="text-red-500">*</span>
                </label>
                <select
                  id="quote_currency"
                  value={quoteCurrency}
                  onChange={(e) => setQuoteCurrency(e.target.value as 'USDT' | 'USDC')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>

              {/* Strategy Selection */}
              <div className="mb-4">
                <label htmlFor="bot_strategy_real" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('trading.botParams.strategy')} <span className="text-red-500">*</span>
                </label>
                {isLoadingBotData ? (
                  <div className="flex items-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600">{t('common.loading')}</span>
                  </div>
                ) : (
                  <select
                    id="bot_strategy_real"
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('trading.botParams.selectStrategy')}</option>
                    {strategies.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          {/* Bot Parameters for Paper Trading */}
          {tradingType === 'paper' && (
            <>
              {/* Strategy Selection */}
              <div className="mb-4">
                <label htmlFor="bot_strategy" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('trading.botParams.strategy')} <span className="text-red-500">*</span>
                </label>
                {isLoadingBotData ? (
                  <div className="flex items-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600">{t('common.loading')}</span>
                  </div>
                ) : (
                  <select
                    id="bot_strategy"
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('trading.botParams.selectStrategy')}</option>
                    {strategies.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy}
                      </option>
                    ))}
                  </select>
                )}
              </div>

            </>
          )}

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              {t('trading.create.description')} {t('common.optional')}
            </label>
            <textarea
              id="description"
              value={formData.info.description}
              onChange={(e) => handleInfoChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder={t('trading.create.descriptionPlaceholder')}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingBindings || ((tradingType === 'paper' || tradingType === 'real') && isLoadingBotData)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.creating') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTradingModal;