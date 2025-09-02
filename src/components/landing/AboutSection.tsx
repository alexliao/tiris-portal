import React from 'react';
import { useTranslation } from 'react-i18next';

interface AboutSectionProps {
  className?: string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  
  return (
    <section 
      id="about"
      className={`bg-white py-16 ${className}`}
    >
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
    </section>
  );
};

export default AboutSection;