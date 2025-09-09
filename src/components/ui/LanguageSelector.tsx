import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: t('language.english') },
    { code: 'zh', name: t('language.chinese') },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-[#080404] hover:bg-gray-100 transition-colors rounded font-['Nunito'] text-sm"
        aria-label={t('language.select')}
      >
        {currentLanguage.name}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full px-4 py-2 text-left hover:bg-[#f4f6f8] transition-colors font-['Nunito'] text-sm ${
                i18n.language === language.code ? 'bg-[#f4f6f8]' : ''
              }`}
            >
              {language.name}
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};