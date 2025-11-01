import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

interface BacktestStep3Props {
  tradingName: string;
  setTradingName: (value: string) => void;
}

export const BacktestStep3: React.FC<BacktestStep3Props> = ({
  tradingName,
  setTradingName,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.backtestStep3.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.backtestStep3.description')}
      </p>

      <div className="space-y-6">
        {/* Trading Name */}
        <div>
          <label htmlFor="tradingName" className="block text-sm font-medium text-gray-900 mb-2">
            {t('trading.wizard.backtestStep3.nameLabel')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="tradingName"
            type="text"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            placeholder={t('trading.wizard.backtestStep3.namePlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900 placeholder-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('trading.wizard.backtestStep3.nameHelp')} - {t('trading.wizard.backtestStep3.editableHint')}
          </p>
        </div>

        {/* Backtest Trading Info */}
        <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-tiris-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-tiris-primary-900 mb-1">
                {t('trading.wizard.backtestStep3.backtestInfoTitle')}
              </h3>
              <p className="text-sm text-tiris-primary-800">
                {t('trading.wizard.backtestStep3.backtestInfo')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestStep3;
