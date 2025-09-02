import React from 'react';
import { useTranslation } from 'react-i18next';

interface HighlightsSectionProps {
  className?: string;
}

interface Feature {
  titleKey: string;
  descriptionKey: string;
  bgColor: string;
}

export const HighlightsSection: React.FC<HighlightsSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  
  const features: Feature[] = [
    {
      titleKey: 'features.profitable.title',
      descriptionKey: 'features.profitable.description',
      bgColor: 'bg-[#8B6914]'
    },
    {
      titleKey: 'features.secure.title',
      descriptionKey: 'features.secure.description',
      bgColor: 'bg-[#7A1F3D]'
    },
    {
      titleKey: 'features.automatic.title',
      descriptionKey: 'features.automatic.description',
      bgColor: 'bg-[#2E3A59]'
    },
    {
      titleKey: 'features.simple.title',
      descriptionKey: 'features.simple.description',
      bgColor: 'bg-[#1B4D3E]'
    }
  ];

  return (
    <section 
      id="highlights"
      className={`bg-white ${className}`}
    >
      {/* About Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-['Bebas_Neue'] font-bold text-[#080404] leading-none mb-6">
            {t('about.title')}
          </h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-base font-['Nunito'] text-[#080404] leading-relaxed">
              {t('about.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${feature.bgColor} p-8 text-center min-h-[300px] flex flex-col justify-start`}
          >
            <h3 className="font-['Bebas_Neue'] font-bold text-2xl text-white mb-6 mt-4">
              {t(feature.titleKey)}
            </h3>
            <p className="font-['Nunito'] text-base text-white leading-relaxed">
              {t(feature.descriptionKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HighlightsSection;