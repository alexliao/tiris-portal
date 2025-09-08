import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLatestBacktestTrading, ApiError, type Trading } from '../../utils/api';
import TradingPerformanceWidget from '../trading/TradingPerformanceWidget';

interface PerformanceSectionProps {
  className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  const [trading, setTrading] = useState<Trading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real trading data from API
  useEffect(() => {
    console.log('PerformanceSection useEffect mounted');
    const fetchTradingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const latestTrading = await getLatestBacktestTrading();
        if (!latestTrading) {
          setError('No backtest trading data found');
          return;
        }

        setTrading(latestTrading);
      } catch (err) {
        console.error('Failed to fetch trading data:', err);
        if (err instanceof ApiError) {
          setError(`API Error (${err.code}): ${err.message}`);
        } else if (err instanceof Error) {
          setError(`Network Error: ${err.message}`);
        } else {
          setError('Failed to load trading data - Unknown error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTradingData();
  }, []);


  // Loading state
  if (loading) {
    return (
      <section 
        id="performance" 
        className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
              {t('performance.title')}
            </h2>
            <p className="text-lg font-['Nunito'] text-gray-600 max-w-3xl mx-auto">
              {t('performance.loading')}
            </p>
          </div>
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section 
        id="performance" 
        className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
              {t('performance.title')}
            </h2>
            <p className="text-lg font-['Nunito'] text-red-600 max-w-3xl mx-auto">
              {error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // No data state
  if (!trading) {
    return (
      <section 
        id="performance" 
        className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
              {t('performance.title')}
            </h2>
            <p className="text-lg font-['Nunito'] text-gray-600 max-w-3xl mx-auto">
              {t('performance.noData')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="performance" 
      className={`py-16 bg-gradient-to-b from-white to-gray-50 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('performance.title')}
          </h2>
          <p className="text-lg font-['Nunito'] text-gray-600 max-w-3xl mx-auto">
            {t('performance.description')}
          </p>
        </div>

        {/* Use the reusable trading performance widget */}
        <TradingPerformanceWidget 
          trading={trading}
          showHeader={false}
          showHighlights={true}
        />
      </div>
    </section>
  );
};

export default PerformanceSection;