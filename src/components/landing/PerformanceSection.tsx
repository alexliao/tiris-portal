import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Brush } from 'recharts';
import { getLatestBacktestTrading, getEquityCurve, getTradingLogs, ApiError } from '../../utils/api';
import { transformEquityCurveToChartData, type TradingDataPoint, type TradingMetrics } from '../../utils/chartData';

interface PerformanceSectionProps {
  className?: string;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ 
  className = ''
}) => {
  const { t } = useTranslation();
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [tradingData, setTradingData] = useState<TradingDataPoint[]>([]);
  const [metrics, setMetrics] = useState<TradingMetrics>({} as TradingMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradingDots, setShowTradingDots] = useState(false);

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

        const [equityCurve, tradingLogs] = await Promise.all([
          getEquityCurve(latestTrading.id, false, 'ETH'), // Get equity curve with ETH benchmark for comparison
          getTradingLogs(latestTrading.id)
        ]);

        const { data, metrics: calculatedMetrics } = transformEquityCurveToChartData(equityCurve, tradingLogs);
        
        setTradingData(data);
        setMetrics(calculatedMetrics);
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

  const displayData = animationComplete ? tradingData : tradingData.slice(0, currentDataIndex);

  // Animation effect to show chart building over time
  useEffect(() => {
    if (!loading && tradingData.length > 0 && currentDataIndex < tradingData.length) {
      const timer = setTimeout(() => {
        setCurrentDataIndex(prev => prev + Math.max(10, Math.floor(tradingData.length / 20)));
      }, 10);
      return () => clearTimeout(timer);
    } else if (!loading && currentDataIndex >= tradingData.length) {
      setAnimationComplete(true);
    }
  }, [currentDataIndex, tradingData.length, loading]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-['Nunito'] text-sm text-gray-600">
            {`${t('performance.tooltip.time')}: ${formatDateTime(data.timestamp)}`}
          </p>
          <p className="font-['Nunito'] text-sm text-[#080404] font-semibold">
            {`${t('performance.tooltip.portfolioValue')}: ${formatCurrency(data.netValue)}`}
          </p>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="font-['Nunito'] text-sm text-green-600 font-semibold">
              {`${t('performance.tooltip.portfolioReturn')}: ${formatPercentage(data.roi)}`}
            </p>
          </div>
          {data.benchmark !== undefined && (
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
              <p className="font-['Nunito'] text-sm text-amber-600 font-semibold">
                {`${t('performance.tooltip.ethBenchmark')}: ${formatPercentage(data.benchmark)}`}
              </p>
            </div>
          )}
          {data.benchmark !== undefined && (
            <p className="font-['Nunito'] text-xs text-gray-500 mt-2 text-center border-t pt-2">
              {`${t('performance.tooltip.excessReturn')}: ${formatPercentage(data.roi - data.benchmark)}`}
            </p>
          )}
          {data.event && (
            <p className="font-['Nunito'] text-xs text-blue-600 mt-2 border-t pt-2">
              {`${t(`performance.tooltip.${data.event.type}`)}: ${data.event.description}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

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
  if (tradingData.length === 0) {
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

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-['Bebas_Neue'] font-bold text-green-600">
              {formatPercentage(metrics.totalROI)}
            </div>
            <div className="text-sm font-['Nunito'] text-gray-600">{t('performance.metrics.totalROI')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-['Bebas_Neue'] font-bold text-blue-600">
              {formatPercentage(metrics.winRate)}
            </div>
            <div className="text-sm font-['Nunito'] text-gray-600">{t('performance.metrics.winRate')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-['Bebas_Neue'] font-bold text-purple-600">
              {metrics.sharpeRatio.toFixed(1)}
            </div>
            <div className="text-sm font-['Nunito'] text-gray-600">{t('performance.metrics.sharpeRatio')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-['Bebas_Neue'] font-bold text-orange-600">
              {formatPercentage(metrics.maxDrawdown)}
            </div>
            <div className="text-sm font-['Nunito'] text-gray-600">{t('performance.metrics.maxDrawdown')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
              {metrics.totalTrades}
            </div>
            <div className="text-sm font-['Nunito'] text-gray-600">{t('performance.metrics.totalTrades')}</div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404]">
                {t('performance.chart.title')}
              </h3>
              <button
                onClick={() => setShowTradingDots(!showTradingDots)}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-['Nunito'] transition-colors ${
                  showTradingDots 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  showTradingDots ? 'bg-blue-600' : 'bg-gray-400'
                }`}></div>
                {showTradingDots ? t('performance.chart.toggleHide') : t('performance.chart.toggleShow')}
              </button>
            </div>
            <p className="text-sm font-['Nunito'] text-gray-600">
              {t('performance.chart.portfolioValue')}: {formatCurrency(displayData[displayData.length - 1]?.netValue || 0)} | 
              {t('performance.chart.return')}: {formatPercentage(displayData[displayData.length - 1]?.roi || 0)} | 
              {t('performance.chart.ethReturn')}: {formatPercentage(displayData[displayData.length - 1]?.benchmark || 0)}
            </p>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Zero Reference Line */}
                <ReferenceLine 
                  y={0} 
                  stroke="#94A3B8" 
                  strokeDasharray="2 2" 
                  strokeWidth={1}
                />
                
                {/* Portfolio Return Area Chart */}
                <Area 
                  type="monotone" 
                  dataKey="roi" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.1}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (showTradingDots && payload && payload.event) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.event.type === 'buy' ? '#3B82F6' : '#EF4444'}
                          stroke="white"
                          strokeWidth={2}
                          opacity={0.9}
                        />
                      );
                    }
                    return <></>;
                  }}
                  activeDot={{ r: 4, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                  name="Portfolio Return"
                />
                
                {/* ETH Benchmark Line */}
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 2 }}
                  name="ETH Benchmark"
                />
                
                {/* Zoom Brush */}
                <Brush 
                  dataKey="timestamp" 
                  height={30}
                  stroke="#8884d8"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center mt-4 space-x-4 text-sm font-['Nunito'] flex-wrap">
            <div className="flex items-center">
              <div className="w-4 h-3 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded mr-2"></div>
              <span>{t('performance.legend.portfolioReturn')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-amber-500 mr-2"></div>
              <span>{t('performance.legend.ethBenchmark')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t mr-2" style={{borderStyle: 'dashed'}}></div>
              <span>{t('performance.legend.zeroLine')}</span>
            </div>
            {showTradingDots && (
              <>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>{t('performance.legend.buySignals')}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>{t('performance.legend.sellSignals')}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Performance Highlights */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('performance.highlights.title')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm font-['Nunito']">
            <div>
              {t('performance.highlights.outperforming')}
            </div>
            <div>
              {t('performance.highlights.riskManagement')}
            </div>
            <div>
              {t('performance.highlights.realTimeAnalysis')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PerformanceSection;