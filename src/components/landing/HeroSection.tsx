import React from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  
  return (
    <section 
      id="home"
      className={`min-h-screen flex items-center justify-center bg-cover bg-center ${className}`}
      style={{
        backgroundImage: 'url(/hero-bg.png)'
      }}
    >
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/tiris-gold.png" 
            alt="Tiris Logo" 
            className="w-16 h-16 md:w-20 md:h-20 mr-2"
          />
          <h1 className="text-[48px] md:text-[64px] font-['Bebas_Neue'] text-white leading-none">
            {t('hero.title')}
          </h1>
        </div>
        <p className="text-2xl font-['Nunito'] text-white font-bold">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
};

export default HeroSection;