import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../ui/LanguageSelector';

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-[#1a1a1a] z-50 py-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => scrollToSection('home')} 
            className="flex items-center space-x-2 font-['Bebas_Neue'] text-2xl font-bold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
          >
            <img src="/tiris-gold.png" alt="Tiris Logo" width="36" height="36" />
            <span>TIRIS</span>
          </button>
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('home')} 
              className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
            >
              {t('nav.home')}
            </button>
            <button 
              onClick={() => scrollToSection('highlights')} 
              className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
            >
              {t('nav.highlights')}
            </button>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;