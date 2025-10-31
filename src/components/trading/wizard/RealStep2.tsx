import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import type { ExchangeBinding } from '../../../utils/api';
import ExchangeBindingCard from '../ExchangeBindingCard';

interface RealStep2Props {
  exchangeBindings: ExchangeBinding[];
  selectedExchangeBinding: ExchangeBinding | null;
  setSelectedExchangeBinding: (binding: ExchangeBinding) => void;
  iconServiceBaseUrl: string;
}

export const RealStep2: React.FC<RealStep2Props> = ({
  exchangeBindings,
  selectedExchangeBinding,
  setSelectedExchangeBinding,
  iconServiceBaseUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.realStep2.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.realStep2.description')}
      </p>

      {/* Exchange Bindings Grid */}
      {exchangeBindings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exchangeBindings.map((binding) => (
            <ExchangeBindingCard
              key={binding.id}
              exchange={binding}
              mode="select"
              isSelected={selectedExchangeBinding?.id === binding.id}
              iconServiceBaseUrl={iconServiceBaseUrl}
              headerSubtitle={binding.created_at ? new Date(binding.created_at).toLocaleDateString() : undefined}
              onSelect={setSelectedExchangeBinding}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">{t('trading.wizard.realStep2.noBindings')}</p>
          <a
            href="/exchanges"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t('trading.wizard.realStep2.addExchange')}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
};

export default RealStep2;
