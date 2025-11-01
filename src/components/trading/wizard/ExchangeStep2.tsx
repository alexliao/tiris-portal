import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

interface ExchangeStep2Props {
  apiKey: string;
  setApiKey: (value: string) => void;
  apiSecret: string;
  setApiSecret: (value: string) => void;
  passphrase: string;
  setPassphrase: (value: string) => void;
  exchangeName: string;
}

export const ExchangeStep2: React.FC<ExchangeStep2Props> = ({
  apiKey,
  setApiKey,
  apiSecret,
  setApiSecret,
  passphrase,
  setPassphrase,
  exchangeName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('exchanges.wizard.step2.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('exchanges.wizard.step2.description', { exchange: exchangeName })}
      </p>

      <div className="space-y-6">
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

        {/* Security Info */}
        <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4">
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
      </div>
    </div>
  );
};

export default ExchangeStep2;
