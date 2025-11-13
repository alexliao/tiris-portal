import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../ui/LanguageSelector';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  return (
    <footer className={`bg-white py-8 border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6 mb-4 md:mb-0">
            <div className="text-sm text-[#080404] font-['Nunito']">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </div>
            <a 
              href="mailto:alexliao@tiris.ai" 
              className="inline-flex items-center text-[#080404] hover:opacity-70 transition-opacity font-['Nunito'] text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              {t('footer.contact')}
            </a>
          </div>
          <div className="footer-language-selector">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;