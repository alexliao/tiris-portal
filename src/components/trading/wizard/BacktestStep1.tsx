import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ExchangeConfigResponse } from '../../../utils/api';

interface BacktestStep1Props {
  exchanges: ExchangeConfigResponse[];
  selectedExchange: ExchangeConfigResponse | null;
  setSelectedExchange: (exchange: ExchangeConfigResponse) => void;
  iconServiceBaseUrl: string;
}

export const BacktestStep1: React.FC<BacktestStep1Props> = ({
  exchanges,
  selectedExchange,
  setSelectedExchange,
  iconServiceBaseUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.backtestStep1.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.backtestStep1.description')}
      </p>

      {/* Exchange Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exchanges.map((exchange) => (
          <button
            key={exchange.type}
            onClick={() => setSelectedExchange(exchange)}
            className={`relative p-6 rounded-lg border-2 transition-all text-left ${
              selectedExchange?.type === exchange.type
                ? 'border-tiris-primary-500 bg-tiris-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {/* Selected Indicator */}
            {selectedExchange?.type === exchange.type && (
              <div className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 bg-tiris-primary-500 rounded-full">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="flex items-start gap-3">
              {/* Exchange Icon */}
              <div className="flex-shrink-0">
                {exchange.type && (
                  <img
                    src={`${iconServiceBaseUrl}/icons/${exchange.type}.png`}
                    alt={exchange.name}
                    className="w-12 h-12 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>

              {/* Exchange Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base">
                  {exchange.name}
                </h3>

                {/* Fee info if available */}
                {exchange.virtual_exchange_fee !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('trading.wizard.backtestStep1.feeLabel')}: {(exchange.virtual_exchange_fee * 100).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {exchanges.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>{t('trading.wizard.backtestStep1.noExchanges')}</p>
        </div>
      )}
    </div>
  );
};

export default BacktestStep1;
