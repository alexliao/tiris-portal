import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Zap, TrendingUp } from 'lucide-react';

interface PaperStep3Props {
  selectedFrequency: '5m' | '8h';
  setSelectedFrequency: (frequency: '5m' | '8h') => void;
}

export const PaperStep3: React.FC<PaperStep3Props> = ({
  selectedFrequency,
  setSelectedFrequency,
}) => {
  const { t } = useTranslation();

  const frequencyOptions = [
    {
      value: '5m' as const,
      label: t('trading.wizard.paperStep3.5mLabel'),
      description: t('trading.wizard.paperStep3.5mDescription'),
      icon: Zap,
      strategy: 'TirisML.5m',
      details: [
        t('trading.wizard.paperStep3.5mDetail1'),
        t('trading.wizard.paperStep3.5mDetail2'),
        t('trading.wizard.paperStep3.5mDetail3'),
      ],
    },
    {
      value: '8h' as const,
      label: t('trading.wizard.paperStep3.8hLabel'),
      description: t('trading.wizard.paperStep3.8hDescription'),
      icon: TrendingUp,
      strategy: 'TirisML',
      details: [
        t('trading.wizard.paperStep3.8hDetail1'),
        t('trading.wizard.paperStep3.8hDetail2'),
        t('trading.wizard.paperStep3.8hDetail3'),
      ],
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.paperStep3.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.paperStep3.description')}
      </p>

      {/* Frequency Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {frequencyOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedFrequency === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setSelectedFrequency(option.value)}
              className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Header with Icon and Label */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg ${isSelected ? 'bg-blue-200' : 'bg-gray-100'}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>

              {/* Details List */}
              <ul className="space-y-2">
                {option.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaperStep3;
