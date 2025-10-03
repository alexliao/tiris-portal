import React from 'react';
import { useTranslation } from 'react-i18next';

export const UnderConstruction: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="relative mb-6">
        <img
          src="/under-construction.png"
          alt={t('common.underConstruction')}
          className="w-24 h-24 object-contain"
        />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {t('common.underConstruction')}
      </h3>
      <p className="text-gray-600 max-w-md">
        {t('common.underConstructionMessage')}
      </p>
    </div>
  );
};

export default UnderConstruction;
