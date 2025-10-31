import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface RealStep3Props {
  quoteCurrency: 'USDT' | 'USDC';
  setQuoteCurrency: (currency: 'USDT' | 'USDC') => void;
  initialFunds: number;
  setInitialFunds: (funds: number) => void;
  maxBalance: number;
  isLoadingBalance: boolean;
}

export const RealStep3: React.FC<RealStep3Props> = ({
  quoteCurrency,
  setQuoteCurrency,
  initialFunds,
  setInitialFunds,
  maxBalance,
  isLoadingBalance,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.realStep3.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.realStep3.description')}
      </p>

      <div className="space-y-6">
        {/* Quote Currency Selection */}
        <div>
          <label htmlFor="quote_currency" className="block text-sm font-medium text-gray-900 mb-3">
            {t('trading.wizard.realStep3.currencyLabel')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['USDT', 'USDC'].map((currency) => (
              <button
                key={currency}
                onClick={() => setQuoteCurrency(currency as 'USDT' | 'USDC')}
                className={`relative p-4 rounded-lg border-2 transition-all text-center font-medium ${
                  quoteCurrency === currency
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                }`}
              >
                {currency}
                {quoteCurrency === currency && (
                  <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
                    <span className="text-white font-bold text-sm">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Funds Allocation */}
        <div>
          <label htmlFor="initial_funds" className="block text-sm font-medium text-gray-900 mb-3">
            {t('trading.wizard.realStep3.fundsLabel')} ({quoteCurrency})
            <span className="text-red-500 ml-1">*</span>
          </label>

          {isLoadingBalance ? (
            <div className="flex items-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-600">{t('trading.create.loadingBalance')}</span>
            </div>
          ) : (
            <>
              {maxBalance === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">
                      {t('trading.create.noAvailableFunds')}
                    </p>
                  </div>
                </div>
              )}

              {maxBalance > 0 && (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      {t('trading.wizard.realStep3.available')}: {maxBalance.toLocaleString()} {quoteCurrency}
                    </p>
                  </div>

                  {/* Funds Input */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        id="initial_funds"
                        value={initialFunds}
                        onChange={(e) => {
                          const value = Math.floor(Number(e.target.value));
                          setInitialFunds(Math.max(0, Math.min(maxBalance, value)));
                        }}
                        min="0"
                        max={maxBalance}
                        step="1"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      />
                      <span className="text-sm font-medium text-gray-700">{quoteCurrency}</span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="mb-4">
                    <input
                      type="range"
                      value={initialFunds}
                      onChange={(e) => setInitialFunds(Math.floor(Number(e.target.value)))}
                      min="0"
                      max={maxBalance}
                      step={Math.max(1, Math.floor(maxBalance * 0.1))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">0%</span>
                      <span className="text-xs font-medium text-blue-600">
                        {maxBalance > 0 ? Math.round((initialFunds / maxBalance) * 100) : 0}%
                      </span>
                      <span className="text-xs text-gray-500">100%</span>
                    </div>
                  </div>

                  {/* Allocation Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{t('trading.wizard.realStep3.allocated')}:</span>{' '}
                      <span className="text-blue-600 font-medium">{initialFunds.toLocaleString()} {quoteCurrency}</span>
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {t('trading.wizard.realStep3.info')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealStep3;
