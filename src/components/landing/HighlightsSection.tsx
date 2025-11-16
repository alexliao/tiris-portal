import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { THEME_COLORS } from '../../config/theme';

interface HighlightsSectionProps {
  className?: string;
}

interface Feature {
  titleKey: string;
  descriptionKey: string;
  bgColor: string;
  ctaKey?: string;
  ctaHref?: string;
}

export const HighlightsSection: React.FC<HighlightsSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  
  // Map features to trading types with consistent colors
  const features: Feature[] = [
    {
      titleKey: 'features.profitable.title',
      descriptionKey: 'features.profitable.description',
      bgColor: THEME_COLORS.backtest.primary,  // Backtest - Profitable
      ctaKey: 'features.profitable.cta',
      ctaHref: '/performance'
    },
    {
      titleKey: 'features.secure.title',
      descriptionKey: 'features.secure.description',
      bgColor: THEME_COLORS.exchanges.primary  // Exchanges - Secure
    },
    {
      titleKey: 'features.automatic.title',
      descriptionKey: 'features.automatic.description',
      bgColor: THEME_COLORS.paper.primary  // Paper - Automatic
    },
    {
      titleKey: 'features.simple.title',
      descriptionKey: 'features.simple.description',
      bgColor: THEME_COLORS.real.primary  // Real - Simple
    }
  ];

  return (
    <section 
      id="highlights"
      className={`bg-white ${className}`}
    >
      {/* About Section */}
      <div className="py-16">
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
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div
            key={index}
            style={{ backgroundColor: feature.bgColor }}
            className="p-8 text-center min-h-[300px] flex flex-col justify-start"
          >
            <h3 className="font-['Bebas_Neue'] font-bold text-2xl text-white mb-6 mt-4">
              {t(feature.titleKey)}
            </h3>
            <p className="font-['Nunito'] text-base text-white leading-relaxed">
              {t(feature.descriptionKey)}
            </p>
            {feature.ctaKey && feature.ctaHref && (
              <Link
                to={feature.ctaHref}
                className="mt-8 inline-flex items-center justify-center px-5 py-2 text-sm font-semibold font-['Nunito'] text-white border border-white rounded-full hover:bg-white/10 transition-colors"
              >
                {t(feature.ctaKey)}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default HighlightsSection;
