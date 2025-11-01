import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

interface ExchangeStep3Props {
  connectionName: string;
  setConnectionName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export const ExchangeStep3: React.FC<ExchangeStep3Props> = ({
  connectionName,
  setConnectionName,
  description,
  setDescription,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('exchanges.wizard.step3.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('exchanges.wizard.step3.description')}
      </p>

      <div className="space-y-6">
        {/* Connection Name */}
        <div>
          <label htmlFor="connectionName" className="block text-sm font-medium text-gray-900 mb-2">
            {t('exchanges.name')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="connectionName"
            type="text"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder={t('exchanges.namePlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('exchanges.wizard.step3.nameHelp')}
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
            {t('exchanges.connectionDescription')}
            <span className="text-gray-500 text-xs ml-1">{t('common.optional')}</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('exchanges.connectionDescriptionPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
            rows={4}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('exchanges.wizard.step3.descriptionHelp')}
          </p>
        </div>

        {/* Info */}
        <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-tiris-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-tiris-primary-900 mb-1">
                {t('exchanges.wizard.step3.infoTitle')}
              </h3>
              <p className="text-sm text-tiris-primary-800">
                {t('exchanges.wizard.step3.info')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeStep3;
