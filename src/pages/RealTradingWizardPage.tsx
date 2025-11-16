import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { createRealTrading, type CreateTradingRequest, ApiError, getExchangeBindings, fetchExchangeBalanceForBinding, type ExchangeBinding, validateInvitationCode } from '../utils/api';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Shield } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { THEME_COLORS } from '../config/theme';
import RealStep1 from '../components/trading/wizard/RealStep1';
import RealStep2 from '../components/trading/wizard/RealStep2';
import RealStep3 from '../components/trading/wizard/RealStep3';
import RealWizardStepIndicator from '../components/trading/wizard/RealWizardStepIndicator';
import { useRequireAuthRedirect } from '../hooks/useRequireAuthRedirect';

const ICON_SERVICE_BASE_URL = import.meta.env.VITE_ICON_SERVICE_BASE_URL;

export const RealTradingWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user, updateUserInfo } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const exchangeIdParam = searchParams.get('exchangeId');

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Form data
  const [tradingName, setTradingName] = useState('');
  const [selectedExchangeBinding, setSelectedExchangeBinding] = useState<ExchangeBinding | null>(null);
  const [quoteCurrency, setQuoteCurrency] = useState<'USDT' | 'USDC'>('USDT');
  const [initialFunds, setInitialFunds] = useState<number>(0);
  const [maxBalance, setMaxBalance] = useState<number>(0);

  // Available data
  const [exchangeBindings, setExchangeBindings] = useState<ExchangeBinding[]>([]);
  const [hasRealTradingAccess, setHasRealTradingAccess] = useState<boolean>(() => Boolean(user?.info?.real_trading_enabled));
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isValidatingInvitation, setIsValidatingInvitation] = useState(false);

  const colors = THEME_COLORS.real;
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

  useEffect(() => {
    setHasRealTradingAccess(Boolean(user?.info?.real_trading_enabled));
  }, [user?.info?.real_trading_enabled]);

  // Initialize form data on component mount
  useEffect(() => {
    if (isAuthenticated && !authLoading && hasRealTradingAccess) {
      // Set default trading name with timestamp
      setTradingName(generateDefaultName('real'));
      fetchInitialData();
    }
  }, [isAuthenticated, authLoading, exchangeIdParam, hasRealTradingAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useRequireAuthRedirect({ isAuthenticated, isLoading: authLoading });

  // Fetch exchange balance when exchange binding or quote currency changes
  useEffect(() => {
    if (selectedExchangeBinding && currentStep === 2) {
      fetchExchangeBalance(selectedExchangeBinding.id, quoteCurrency);
    }
  }, [selectedExchangeBinding, quoteCurrency, currentStep]);

  const fetchInitialData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Fetch user's exchange bindings
      const bindings = await getExchangeBindings();
      setExchangeBindings(bindings);

      // If an exchange ID is provided as a query parameter, pre-select it
      if (exchangeIdParam) {
        const selectedBinding = bindings.find(b => b.id === exchangeIdParam);
        if (selectedBinding) {
          setSelectedExchangeBinding(selectedBinding);
        } else if (bindings.length > 0) {
          // Fallback to first binding if the specified one is not found
          setSelectedExchangeBinding(bindings[0]);
        }
      } else if (bindings.length > 0) {
        // Auto-select first binding if available and no exchange ID provided
        setSelectedExchangeBinding(bindings[0]);
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

  const fetchExchangeBalance = async (exchangeBindingId: string, currency: 'USDT' | 'USDC') => {
    try {
      setIsLoadingBalance(true);
      setError(null);

      const accountData = await fetchExchangeBalanceForBinding(exchangeBindingId, currency);

      if (accountData) {
        const roundedBalance = Math.floor(accountData.balance);
        setMaxBalance(roundedBalance);
        setInitialFunds(roundedBalance); // Default to max balance, rounded to integer
      } else {
        setMaxBalance(0);
        setInitialFunds(0);
      }
    } catch (err) {
      console.error('Failed to fetch exchange balance:', err);
      // Don't show error to user, just reset values
      setMaxBalance(0);
      setInitialFunds(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 1) {
      if (!selectedExchangeBinding) {
        setError(t('trading.create.exchangeBindingRequired'));
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (maxBalance < 10) {
        setError(t('trading.create.insufficientFunds', { balance: maxBalance, currency: quoteCurrency, minimum: 10 }));
        return false;
      }
      if (initialFunds < 10) {
        setError(t('trading.create.minimumFundsRequired', { minimum: 10, currency: quoteCurrency }));
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

      // Prepare request data for real trading
      const requestData = {
        name: tradingName,
        exchange_binding_id: selectedExchangeBinding!.id,
        type: 'real',
        info: {
          quote_currency: quoteCurrency,
          initial_funds: initialFunds,
          start_date: new Date().toISOString(),
          end_date: null,
        },
      } as unknown as CreateTradingRequest;

      console.log('📝 [WIZARD DEBUG] Creating real trading with:', requestData);

      // Use createRealTrading which handles the business logic
      const newTrading = await createRealTrading(requestData);

      console.log('✅ [WIZARD DEBUG] Real trading created:', newTrading);

      // Navigate to the newly created trading's details page
      navigate(`/trading/${newTrading.id}`);
    } catch (err) {
      console.error('Failed to create real trading:', err);
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

  const handleInvitationSubmit = async () => {
    const code = invitationCode.trim();
    if (!code) {
      setInvitationError(t('realTrading.invitation.codeRequired'));
      return;
    }

    try {
      setIsValidatingInvitation(true);
      setInvitationError(null);
      await validateInvitationCode(code);
      await updateUserInfo({ real_trading_enabled: true });
      setInvitationCode('');
      toast.success(t('common.success'), t('realTrading.invitation.success'));
      setHasRealTradingAccess(true);
    } catch (invitationErr) {
      let message = t('realTrading.invitation.genericError');
      if (invitationErr instanceof ApiError) {
        switch (invitationErr.code) {
          case 'INVITATION_CODE_INVALID':
            message = t('realTrading.invitation.invalid');
            break;
          case 'INVITATION_CODE_EXPIRED':
            message = t('realTrading.invitation.expired');
            break;
          case 'INVITATION_CODE_NOT_FOUND':
            message = t('realTrading.invitation.notFound');
            break;
          default:
            message = invitationErr.message || message;
        }
      } else if (invitationErr instanceof Error) {
        message = invitationErr.message;
      }
      setInvitationError(message);
    } finally {
      setIsValidatingInvitation(false);
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

  if (!hasRealTradingAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-36 pb-16 px-4">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-8">
            <div className="">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="text-center text-2xl font-semibold text-gray-900 mb-2">{t('realTrading.invitation.requirementTitle')}</h1>
              <p className="text-gray-600 mb-6">{t('realTrading.invitation.requirementDescription')}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInvitationSubmit();
              }}
              className="mt-6"
            >
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={invitationCode}
                      maxLength={32}
                      onChange={(event) => setInvitationCode(event.target.value.replace(/\s+/g, ''))}
                      placeholder={t('realTrading.invitation.placeholder')}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-tiris-primary-500 focus:outline-none focus:ring-2 focus:ring-tiris-primary-100"
                      disabled={isValidatingInvitation}
                      autoFocus
                    />
                    <Shield className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    type="submit"
                    disabled={isValidatingInvitation}
                    className="inline-flex items-center justify-center rounded-lg bg-tiris-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-tiris-primary-700 disabled:opacity-60"
                  >
                    {isValidatingInvitation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('realTrading.invitation.validating')}
                      </>
                    ) : (
                      t('realTrading.invitation.submit')
                    )}
                  </button>
                </div>
              {invitationError ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {invitationError}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  {t('realTrading.invitation.helper')}
                </p>
              )}
            </form>
          </div>
        </div>
        <Footer />
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
                  onClick={() => navigate('/tradings/real')}
                  className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                  title={t('common.back')}
                >
                  <Icon className="w-8 h-8" />
                </button>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold">{t('trading.wizard.realTitle')}</h1>
                  <p className="text-white/90 mt-1">{t('trading.wizard.realSubtitle')}</p>
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
                onClick={() => navigate('/tradings/real')}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                title={t('common.back')}
              >
                <Icon className="w-8 h-8" />
              </button>
              <div className="ml-4">
                <h1 className="text-2xl font-bold">{t('trading.wizard.realTitle')}</h1>
                <p className="text-white/90 mt-1">{t('trading.wizard.realSubtitle')}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <RealWizardStepIndicator currentStep={currentStep} />
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
              <RealStep2
                exchangeBindings={exchangeBindings}
                selectedExchangeBinding={selectedExchangeBinding}
                setSelectedExchangeBinding={setSelectedExchangeBinding}
                iconServiceBaseUrl={ICON_SERVICE_BASE_URL}
              />
            )}

            {currentStep === 2 && (
              <RealStep3
                quoteCurrency={quoteCurrency}
                setQuoteCurrency={setQuoteCurrency}
                initialFunds={initialFunds}
                setInitialFunds={setInitialFunds}
                maxBalance={maxBalance}
                isLoadingBalance={isLoadingBalance}
              />
            )}

            {currentStep === 3 && (
              <RealStep1
                tradingName={tradingName}
                setTradingName={setTradingName}
              />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={currentStep === 1 ? () => navigate('/tradings/real') : handlePreviousStep}
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

export default RealTradingWizardPage;
