import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
            <div className="flex items-center space-x-4 text-sm font-['Nunito']">
              <Link to="/legal/terms" className="text-[#080404] hover:opacity-70 transition-opacity">
                {t('footer.terms')}
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                •
              </span>
              <Link to="/legal/privacy" className="text-[#080404] hover:opacity-70 transition-opacity">
                {t('footer.privacy')}
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                •
              </span>
              <a 
                href="mailto:support@tiris.ai" 
                className="text-[#080404] hover:opacity-70 transition-opacity"
              >
                {t('footer.contact')}
              </a>
            </div>
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
