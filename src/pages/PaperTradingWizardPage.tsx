import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createPaperTrading, type CreateTradingRequest, ApiError, getPaperExchanges, type ExchangeConfigResponse } from '../utils/api';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { THEME_COLORS } from '../config/theme';
import PaperStep1 from '../components/trading/wizard/PaperStep1';
import PaperStep2 from '../components/trading/wizard/PaperStep2';
import PaperStep3 from '../components/trading/wizard/PaperStep3';
import PaperWizardStepIndicator from '../components/trading/wizard/PaperWizardStepIndicator';

const ICON_SERVICE_BASE_URL = import.meta.env.VITE_ICON_SERVICE_BASE_URL;

export const PaperTradingWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form data
  const [tradingName, setTradingName] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeConfigResponse | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<'5m' | '8h'>('5m');

  // Available data
  const [paperExchanges, setPaperExchanges] = useState<ExchangeConfigResponse[]>([]);

  const colors = THEME_COLORS.paper;
  const Icon = colors.icon;

  // Generate default trading name with timestamp
  const generateDefaultName = (type: string): string => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timestamp = t('trading.create.defaultNameTimestamp', {
      month,
      day,
      hours,
      minutes
    });

    return t(`trading.defaultName.${type}`, {
      timestamp
    });
  };

  // Initialize form data on component mount
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Set default trading name with timestamp
      setTradingName(generateDefaultName('paper'));
      fetchInitialData();
    }
  }, [isAuthenticated, authLoading]);

  const fetchInitialData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Fetch paper exchanges from tiris-bot API
      const exchanges = await getPaperExchanges();
      setPaperExchanges(exchanges);

      // Auto-select first exchange if available
      if (exchanges.length > 0) {
        setSelectedExchange(exchanges[0]);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      if (err instanceof ApiError) {
        setError(t('trading.create.failedToLoadData', { error: err.message }));
      } else {
        setError(t('trading.create.failedToLoadData', { error: 'Unknown error' }));
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 1) {
      if (!selectedExchange) {
        setError(t('trading.create.exchangeRequired'));
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!selectedFrequency) {
        setError(t('trading.create.frequencyRequired'));
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!tradingName.trim()) {
        setError(t('trading.create.nameRequired'));
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Determine strategy name based on frequency
      const strategyName = selectedFrequency === '5m' ? 'TirisML.5m' : 'TirisML';

      // Prepare request data for paper trading
      // Note: exchange_binding_id is omitted for paper trading per backend spec
      const requestData = {
        name: tradingName,
        type: 'paper',
        info: {
          strategy_name: strategyName,
          // Store exchange information from tiris-bot API
          exchange_type: selectedExchange?.type,
          exchange_name: selectedExchange?.name,
          exchange_ccxt_id: selectedExchange?.ccxt_id,
          exchange_sandbox: selectedExchange?.sandbox,
          exchange_virtual_fee: selectedExchange?.virtual_exchange_fee,
          timeframe: selectedFrequency,
          start_date: new Date().toISOString(),
          end_date: null,
        },
      } as unknown as CreateTradingRequest;

      console.log('📝 [WIZARD DEBUG] Creating paper trading with:', requestData);

      // Use createPaperTrading which handles the business logic:
      // - Creates trading record with exchange info from tiris-bot
      // - Creates two sub-accounts (ETH stock, USDT balance)
      // - Creates initial deposit trading log (10,000 USDT default)
      const newTrading = await createPaperTrading(requestData);

      console.log('✅ [WIZARD DEBUG] Paper trading created:', newTrading);

      // Navigate to the newly created trading's details page
      navigate(`/trading/${newTrading.id}`);
    } catch (err) {
      console.error('Failed to create paper trading:', err);
      let errorMessage = 'Unknown error';
      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(t('trading.create.failedToCreate', { error: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoadingData) {
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
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/tradings/paper')}
                  className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                  title={t('common.back')}
                >
                  <Icon className="w-8 h-8" />
                </button>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold">{t('trading.wizard.title')}</h1>
                  <p className="text-white/90 mt-1">{t('trading.wizard.subtitle')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20">
        {/* Header with Wizard Title */}
        <div
          style={{
            background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
          }}
          className="text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate('/tradings/paper')}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                title={t('common.back')}
              >
                <Icon className="w-8 h-8" />
              </button>
              <div className="ml-4">
                <h1 className="text-2xl font-bold">{t('trading.wizard.title')}</h1>
                <p className="text-white/90 mt-1">{t('trading.wizard.subtitle')}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <PaperWizardStepIndicator currentStep={currentStep} totalSteps={3} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 px-6 py-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Content */}
          <div className="w-full min-h-[500px]">
            {currentStep === 1 && (
              <PaperStep2
                exchanges={paperExchanges}
                selectedExchange={selectedExchange}
                setSelectedExchange={setSelectedExchange}
                iconServiceBaseUrl={ICON_SERVICE_BASE_URL}
              />
            )}

            {currentStep === 2 && (
              <PaperStep3
                selectedFrequency={selectedFrequency}
                setSelectedFrequency={setSelectedFrequency}
              />
            )}

            {currentStep === 3 && (
              <PaperStep1
                tradingName={tradingName}
                setTradingName={setTradingName}
                tradingDescription=""
                setTradingDescription={() => {}}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={currentStep === 1 ? () => navigate('/tradings/paper') : handlePreviousStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                {currentStep === 1 ? (
                  <>{t('common.cancel')}</>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {t('common.previous')}
                  </>
                )}
              </button>

              <div className="flex-1" />

              {currentStep === 3 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  style={{
                    background: isLoading
                      ? '#ccc'
                      : `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                  }}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('common.creating')}
                    </>
                  ) : (
                    <>{t('trading.wizard.create')}</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  style={{
                    background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaperTradingWizardPage;
