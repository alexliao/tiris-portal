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
        backgroundImage: 'url(https://user-images.strikinglycdn.com/res/hrscywv4p/image/upload/f_auto,q_auto,w_4096/unsplashcom/photo-1665602878676-219e01293b51)'
      }}
    >
      <div className="text-center">
        <h1 className="text-[48px] md:text-[64px] font-['Bebas_Neue'] font-bold text-white leading-none mb-4">
          {t('hero.title')}
        </h1>
        <p className="text-2xl font-['Nunito'] text-white font-bold">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
};

export default HeroSection;