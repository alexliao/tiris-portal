import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../hooks/useAuth';
import { useRequireAuthRedirect } from '../hooks/useRequireAuthRedirect';
import { ApiError, createPortfolio, addPortfolioTradings, getTradings, type Trading } from '../utils/api';
import { THEME_COLORS, getTradingTheme } from '../config/theme';
import PortfolioWizardStepIndicator from '../components/portfolio/PortfolioWizardStepIndicator';
import { getTradingDayCount } from '../utils/tradingDates';

const ICON_SERVICE_BASE_URL = import.meta.env.VITE_ICON_SERVICE_BASE_URL;

type TradingTab = 'real' | 'paper' | 'backtest';

type WizardStep = 1 | 2;

export const PortfolioWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [activeTab, setActiveTab] = useState<TradingTab>('real');
  const [tradings, setTradings] = useState<Trading[]>([]);
  const [selectedTradingIds, setSelectedTradingIds] = useState<string[]>([]);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioMemo, setPortfolioMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = THEME_COLORS.portfolio;
  const Icon = colors.icon;

  const tradingTabs = useMemo(
    () => [
      { key: 'real' as const, label: t('trading.type.real') || 'Real Trading' },
      { key: 'paper' as const, label: t('trading.type.paper') || 'Paper Trading' },
      { key: 'backtest' as const, label: t('trading.type.backtest') || 'Backtest' },
    ],
    [t]
  );

  const filteredTradings = useMemo(() => {
    return tradings.filter(trading => trading.type.toLowerCase() === activeTab);
  }, [tradings, activeTab]);

  const selectedCount = selectedTradingIds.length;

  const fetchTradings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTradings();
      setTradings(data);
    } catch (err) {
      console.error('Failed to fetch tradings:', err);
      if (err instanceof ApiError) {
        setError(t('portfolios.wizard.failedToLoadWithError', { error: err.message }));
      } else {
        setError(`${t('portfolios.wizard.failedToLoad')}. ${t('common.tryAgain')}`);
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

  useRequireAuthRedirect({ isAuthenticated, isLoading: authLoading });

  const toggleTradingSelection = (tradingId: string) => {
    setSelectedTradingIds(prev => {
      if (prev.includes(tradingId)) {
        return prev.filter(id => id !== tradingId);
      }
      return [...prev, tradingId];
    });
  };

  const validateStep = (step: WizardStep) => {
    if (step === 1 && selectedTradingIds.length === 0) {
      setError(t('portfolios.wizard.selectAtLeastOne'));
      return false;
    }

    if (step === 2 && !portfolioName.trim()) {
      setError(t('portfolios.wizard.nameRequired'));
      return false;
    }

    setError(null);
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const portfolio = await createPortfolio({
        name: portfolioName.trim(),
        memo: portfolioMemo.trim() || undefined,
      });

      if (selectedTradingIds.length > 0) {
        await addPortfolioTradings(portfolio.id, selectedTradingIds);
      }

      navigate('/portfolios');
    } catch (err) {
      console.error('Failed to create portfolio:', err);
      if (err instanceof ApiError) {
        setError(t('portfolios.wizard.createFailedWithError', { error: err.message }));
      } else {
        setError(`${t('portfolios.wizard.createFailed')}. ${t('common.tryAgain')}`);
      }
    } finally {
      setIsSubmitting(false);
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
                onClick={() => navigate('/portfolios')}
                className="p-3 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer"
                title={t('common.back')}
              >
                <Icon className="w-8 h-8" />
              </button>
              <div className="ml-4">
                <h1 className="text-2xl font-bold">{t('portfolios.wizard.title')}</h1>
                <p className="text-white/90 mt-1">{t('portfolios.wizard.subtitle')}</p>
              </div>
            </div>

            <PortfolioWizardStepIndicator currentStep={currentStep} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          <div className="w-full min-h-[500px]">
            {currentStep === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('portfolios.wizard.step1.title')}</h2>
                  <p className="text-gray-600 mt-1">{t('portfolios.wizard.step1.description')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {tradingTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <span className="ml-auto text-sm text-gray-600">
                    {t('portfolios.wizard.selectedCount', { count: selectedCount })}
                  </span>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('common.loading')}</p>
                  </div>
                ) : filteredTradings.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('portfolios.wizard.noTradingsInTab', {
                        type: tradingTabs.find(tab => tab.key === activeTab)?.label || ''
                      })}
                    </h3>
                    <p className="text-gray-600">{t('portfolios.wizard.noTradingsHint')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTradings.map(trading => {
                      const isSelected = selectedTradingIds.includes(trading.id);
                      const tradingTheme = THEME_COLORS[getTradingTheme(trading.type)];
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
                        <button
                          key={trading.id}
                          type="button"
                          onClick={() => toggleTradingSelection(trading.id)}
                          className={`text-left bg-white rounded-lg shadow hover:shadow-xl transition-shadow border overflow-hidden ${
                            isSelected ? 'border-tiris-primary-600 ring-2 ring-tiris-primary-200' : 'border-gray-200'
                          }`}
                        >
                          <div
                            style={{
                              background: `linear-gradient(to right, ${tradingTheme.primary}, ${tradingTheme.hover})`
                            }}
                            className="p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-white truncate">
                                  {trading.name}
                                </h3>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  {exchangeName && (
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
                                </div>
                              </div>
                              <div className="ml-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTradingSelection(trading.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  className="h-5 w-5 rounded border-white/40 text-white focus:ring-white/70"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-gray-600">{t(`trading.type.${trading.type.toLowerCase()}`)}</p>
                            <p className="text-xs text-gray-500 mt-1">{trading.status}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="max-w-2xl">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('portfolios.wizard.step2.title')}</h2>
                  <p className="text-gray-600 mt-1">{t('portfolios.wizard.step2.description')}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('portfolios.wizard.nameLabel')}
                    </label>
                    <input
                      type="text"
                      value={portfolioName}
                      onChange={(event) => setPortfolioName(event.target.value)}
                      placeholder={t('portfolios.wizard.namePlaceholder')}
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('portfolios.wizard.memoLabel')}
                    </label>
                    <textarea
                      value={portfolioMemo}
                      onChange={(event) => setPortfolioMemo(event.target.value)}
                      placeholder={t('portfolios.wizard.memoPlaceholder')}
                      rows={4}
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500"
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    {t('portfolios.wizard.selectedSummary', { count: selectedCount })}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={currentStep === 1 ? () => navigate('/portfolios') : handlePreviousStep}
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

              {currentStep === 2 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting
                      ? '#ccc'
                      : `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                  }}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('common.creating')}
                    </>
                  ) : (
                    <>{t('portfolios.wizard.create')}</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  style={{
                    background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
                  }}
                >
                  {t('common.next')}
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

export default PortfolioWizardPage;
