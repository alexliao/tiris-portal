import React from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  
  const handleScrollDown = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById('highlights');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <section 
      id="home"
      className={`relative min-h-screen flex items-center justify-center bg-cover bg-center ${className}`}
      style={{
        backgroundImage: 'url(/hero-bg.png)'
      }}
    >
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <img
            src="/tiris-gold.png"
            alt={t('common.tirisLogo')}
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

      <a
        href="#highlights"
        aria-label={t('hero.scrollDown')}
        onClick={handleScrollDown}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex flex-col items-center text-white/80 hover:text-white transition-colors"
      >
        <svg
          className="w-8 h-8 animate-bounce"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 8l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 12l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </section>
  );
};

export default HeroSection;
