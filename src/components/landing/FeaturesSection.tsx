import React from 'react';
import { useTranslation } from 'react-i18next';

interface FeaturesSectionProps {
  className?: string;
}

interface Feature {
  titleKey: string;
  descriptionKey: string;
  bgColor: string;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ 
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
      id="features"
      className={`bg-white ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${feature.bgColor} p-8 text-center min-h-[300px] flex flex-col justify-start`}
          >
            <h3 className="font-['Raleway'] font-bold text-2xl text-white mb-6 mt-4">
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

export default FeaturesSection;