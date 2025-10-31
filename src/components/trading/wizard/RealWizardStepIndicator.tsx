import React from 'react';
import { useTranslation } from 'react-i18next';

interface RealWizardStepIndicatorProps {
  currentStep: number;
}

export const RealWizardStepIndicator: React.FC<RealWizardStepIndicatorProps> = ({
  currentStep,
}) => {
  const { t } = useTranslation();

  const steps = [
    { number: 1, label: t('trading.wizard.realStep2.label') || 'Select Exchange' },
    { number: 2, label: t('trading.wizard.realStep3.label') || 'Allocate Funds' },
    { number: 3, label: t('trading.wizard.realStep1.label') || 'Trading Details' },
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all ${
                step.number <= currentStep
                  ? 'bg-white/30 text-white border-2 border-white'
                  : 'bg-white/10 text-white/60 border-2 border-white/20'
              }`}
            >
              {step.number}
            </div>
            <p
              className={`mt-2 text-xs font-medium text-center max-w-[80px] ${
                step.number <= currentStep ? 'text-white' : 'text-white/70'
              }`}
            >
              {step.label}
            </p>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 transition-all ${
                step.number < currentStep ? 'bg-white/30' : 'bg-white/10'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default RealWizardStepIndicator;
