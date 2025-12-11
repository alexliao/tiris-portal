import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, CheckCircle, AlertCircle, BookOpen, X } from 'lucide-react';
import { validateExchangeCredentials } from '../../../utils/api';
import { StaticMarkdownDocument } from '../../legal/StaticMarkdownDocument';

interface ExchangeStep2Props {
  apiKey: string;
  setApiKey: (value: string) => void;
  apiSecret: string;
  setApiSecret: (value: string) => void;
  passphrase: string;
  setPassphrase: (value: string) => void;
  exchangeName: string;
  exchangeType: string;
  onValidationSuccess?: () => void;
  onValidationResult?: (result: { isValid: boolean; timestamp: string }) => void;
}

export const ExchangeStep2: React.FC<ExchangeStep2Props> = ({
  apiKey,
  setApiKey,
  apiSecret,
  setApiSecret,
  passphrase,
  setPassphrase,
  exchangeName,
  exchangeType,
  onValidationSuccess,
  onValidationResult,
}) => {
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const tutorialSlugMap: Record<string, string> = {
    binance: 'tutorials/binance',
    gate: 'tutorials/gate',
    coinbase: 'tutorials/coinbase',
    kraken: 'tutorials/kraken',
    okx: 'tutorials/okx',
    okx_demo: 'tutorials/okx',
  };
  const tutorialSlug = tutorialSlugMap[exchangeType?.toLowerCase?.() || ''];

  const handleValidateCredentials = async () => {
    setIsValidating(true);
    setValidationError(null);
    setValidationStatus('idle');

    try {
      const response = await validateExchangeCredentials(
        exchangeType,
        apiKey,
        apiSecret,
        passphrase.trim() || undefined
      );

      if (response.read) {
        setValidationStatus('success');
        const timestamp = new Date().toISOString();
        onValidationResult?.({ isValid: true, timestamp });
        onValidationSuccess?.();
      } else {
        setValidationStatus('error');
        setValidationError(t('exchanges.wizard.step2.validationFailed'));
        const timestamp = new Date().toISOString();
        onValidationResult?.({ isValid: false, timestamp });
      }
    } catch (error) {
      setValidationStatus('error');
      if (error instanceof Error) {
        setValidationError(error.message);
      } else {
        setValidationError(t('exchanges.wizard.step2.validationError'));
      }
      const timestamp = new Date().toISOString();
      onValidationResult?.({ isValid: false, timestamp });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {t('exchanges.wizard.step2.title')}
          </h2>
          <p className="text-gray-600">
            {t('exchanges.wizard.step2.description', { exchange: exchangeName })}
          </p>
        </div>
        {tutorialSlug && (
          <button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-tiris-primary-700 hover:text-tiris-primary-800 px-3 py-2 rounded-md border border-tiris-primary-100 bg-tiris-primary-50"
          >
            <BookOpen className="w-4 h-4" />
            {t('exchanges.wizard.step2.viewTutorial', { exchange: exchangeName })}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row mt-4">
        <div className="flex-1">
          <div className="flex flex-col gap-6">
            {/* API Key */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-900 mb-2">
                {t('exchanges.apiKey')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('exchanges.apiKeyPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('exchanges.wizard.step2.apiKeyHelp', { exchange: exchangeName })}
              </p>
            </div>

            {/* API Secret */}
            <div>
              <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-900 mb-2">
                {t('exchanges.apiSecret')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="apiSecret"
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={t('exchanges.apiSecretPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('exchanges.wizard.step2.apiSecretHelp')}
              </p>
            </div>

            {/* API Passphrase */}
            <div>
              <label htmlFor="passphrase" className="block text-sm font-medium text-gray-900 mb-2">
                {t('exchanges.passphrase')}
                <span className="text-gray-500 text-xs ml-1">{t('common.optional')}</span>
              </label>
              <input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t('exchanges.passphrasePlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('exchanges.wizard.step2.passphraseHelp')}
              </p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="lg:w-96 flex flex-col gap-4">
          <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4 h-full">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-tiris-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-tiris-primary-900 mb-1">
                  {t('exchanges.wizard.step2.securityTitle')}
                </h3>
                <p className="text-sm text-tiris-primary-800">
                  {t('exchanges.wizard.step2.securityInfo')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleValidateCredentials}
              disabled={isValidating || !apiKey.trim() || !apiSecret.trim()}
              style={{
                background: isValidating || !apiKey.trim() || !apiSecret.trim()
                  ? '#d1d5db'
                  : '#3F5E98'
              }}
              className="w-full px-4 py-2 text-white rounded-md disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 hover:opacity-90"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('exchanges.wizard.step2.validating')}
                </>
              ) : (
                <>
                  {validationStatus === 'success' && (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {t('exchanges.wizard.step2.validationSuccess')}
                    </>
                  )}
                  {validationStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      {t('exchanges.wizard.step2.retryValidation')}
                    </>
                  )}
                  {validationStatus === 'idle' && t('exchanges.wizard.step2.validateCredentials')}
                </>
              )}
            </button>
            {validationError && (
              <p className="mt-2 text-sm text-red-600">{validationError}</p>
            )}
          </div>
        </div>
      </div>

      {isTutorialOpen && tutorialSlug && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mt-16 mb-10 mx-4 sm:mx-6">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <BookOpen className="w-5 h-5 text-tiris-primary-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {t('exchanges.wizard.step2.tutorialTitle', { exchange: exchangeName })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTutorialOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <StaticMarkdownDocument slug={tutorialSlug} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeStep2;
