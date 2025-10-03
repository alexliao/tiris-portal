import React from 'react';
import { useTranslation } from 'react-i18next';
import UnderConstruction from '../common/UnderConstruction';

interface PerformanceSectionProps {
  className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <section
      id="performance"
      className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('performance.title')}
          </h2>
          <p className="text-lg font-['Nunito'] text-gray-600 max-w-3xl mx-auto">
            {t('performance.description')}
          </p>
        </div>

        {/* Under Construction Message */}
        <div className="bg-white rounded-lg shadow-lg">
          <UnderConstruction />
        </div>
      </div>
    </section>
  );
};

export default PerformanceSection;