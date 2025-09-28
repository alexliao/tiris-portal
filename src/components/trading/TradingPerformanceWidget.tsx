import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Brush } from 'recharts';
import { getEquityCurve, getTradingLogs, ApiError, type Trading } from '../../utils/api';
import { transformEquityCurveToChartData, type TradingDataPoint, type TradingMetrics } from '../../utils/chartData';

interface TradingPerformanceWidgetProps {
  trading: Trading;
  className?: string;
  showHeader?: boolean;
  showHighlights?: boolean;
  height?: string;
  refreshTrigger?: number;
}

export const TradingPerformanceWidget: React.FC<TradingPerformanceWidgetProps> = ({
  trading,
  className = '',
  showHeader = true,
  showHighlights = true,
  height = 'h-96',
  refreshTrigger = 0
}) => {
  const { t } = useTranslation();
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [tradingData, setTradingData] = useState<TradingDataPoint[]>([]);
  const [metrics, setMetrics] = useState<TradingMetrics>({} as TradingMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradingDots, setShowTradingDots] = useState(false);

  // Extract trading data fetching logic into reusable function
  const fetchTradingData = async (isInitialLoad = false) => {
    try {
      // Only show loading state during initial load, not during refresh
      if (isInitialLoad) {
        setLoading(true);
        setError(null);
      }

      const [equityCurve, tradingLogs] = await Promise.all([
        getEquityCurve(trading.id, false, 'ETH'), // Get equity curve with ETH benchmark for comparison
        getTradingLogs(trading.id)
      ]);

      const { data, metrics: calculatedMetrics } = transformEquityCurveToChartData(equityCurve, tradingLogs);

      setTradingData(data);
      setMetrics(calculatedMetrics);
    } catch (err) {
      console.error('Failed to fetch trading data:', err);
      // Only show errors during initial load, silently handle refresh errors
      if (isInitialLoad) {
        if (err instanceof ApiError) {
          setError(`API Error (${err.code}): ${err.message}`);
        } else if (err instanceof Error) {
          setError(`Network Error: ${err.message}`);
        } else {
          setError('Failed to load trading data - Unknown error');
        }
      }
    } finally {
      // Only hide loading state if we showed it (initial load)
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  // Initial data loading effect
  useEffect(() => {
    fetchTradingData(true); // Mark as initial load
  }, [trading.id]);

  // Refresh trigger effect - refetch data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Performance widget: Refreshing data due to trigger change');
      fetchTradingData(false); // Refresh without showing loading state
    }
  }, [refreshTrigger]);

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
            {`${t('trading.chart.time')}: ${formatDateTime(data.timestamp)}`}
          </p>
          <p className="font-['Nunito'] text-sm text-[#080404] font-semibold">
            {`${t('trading.chart.portfolioValue')}: ${formatCurrency(data.netValue)}`}
          </p>
          <div className="flex items-center mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <p className="font-['Nunito'] text-sm text-green-600 font-semibold">
              {`${t('trading.chart.portfolioReturn')}: ${formatPercentage(data.roi)}`}
            </p>
          </div>
          {data.benchmark !== undefined && (
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
              <p className="font-['Nunito'] text-sm text-amber-600 font-semibold">
                {`${t('trading.chart.ethBenchmark')}: ${formatPercentage(data.benchmark)}`}
              </p>
            </div>
          )}
          {data.benchmark !== undefined && (
            <p className="font-['Nunito'] text-xs text-gray-500 mt-2 text-center border-t pt-2">
              {`${t('trading.chart.excessReturn')}: ${formatPercentage(data.roi - data.benchmark)}`}
            </p>
          )}
          {data.event && (
            <p className="font-['Nunito'] text-xs text-blue-600 mt-2 border-t pt-2">
              {`${t(`trading.events.${data.event.type.toLowerCase()}`) || data.event.type}: ${data.event.description}`}
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
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="text-center text-red-600 py-8">
          {error}
        </div>
      </div>
    );
  }

  // No data state
  if (tradingData.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg border p-6 ${className}`}>
        {showHeader && (
          <div className="mb-4">
            <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404] mb-2">
              {trading.name} - {t('trading.detail.performance')}
            </h3>
          </div>
        )}
        <div className="text-center text-gray-600 py-8">
          {t('trading.detail.noDataAvailable')}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-green-600">
            {formatPercentage(metrics.totalROI)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalROI')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-blue-600">
            {formatPercentage(metrics.winRate)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.winRate')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-purple-600">
            {metrics.sharpeRatio.toFixed(1)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.sharpeRatio')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-orange-600">
            {formatPercentage(metrics.maxDrawdown)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.maxDrawdown')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
            {metrics.totalTrades}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalTrades')}</div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-white p-6 rounded-lg shadow-lg border">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {showHeader && (
              <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404]">
                {trading.name} - {t('trading.detail.performance')} Chart
              </h3>
            )}
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
              {showTradingDots ? t('trading.chart.hideTradingSignals') : t('trading.chart.showTradingSignals')}
            </button>
          </div>
          <p className="text-sm font-['Nunito'] text-gray-600">
            {t('trading.chart.portfolioValue')}: {formatCurrency(displayData[displayData.length - 1]?.netValue || 0)} | 
            {t('trading.chart.return')}: {formatPercentage(displayData[displayData.length - 1]?.roi || 0)} | 
            {t('trading.chart.ethReturn')}: {formatPercentage(displayData[displayData.length - 1]?.benchmark || 0)}
          </p>
        </div>
        
        <div className={height}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestampNum"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
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
                name={t('trading.chart.portfolioReturn')}
              />
              
              {/* ETH Benchmark Line */}
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 2 }}
                name={t('trading.chart.ethBenchmark')}
              />
              
              {/* Zoom Brush */}
              <Brush 
                dataKey="timestampNum" 
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
            <span>{t('trading.chart.portfolioReturn')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-amber-500 mr-2"></div>
            <span>{t('trading.chart.ethBenchmark')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t mr-2" style={{borderStyle: 'dashed'}}></div>
            <span>{t('trading.chart.zeroLine')}</span>
          </div>
          {showTradingDots && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>{t('trading.chart.buySignals')}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span>{t('trading.chart.sellSignals')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Performance Highlights */}
      {showHighlights && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            Performance Highlights
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm font-['Nunito']">
            <div>
              Our AI strategy consistently outperforms ETH by analyzing market patterns and timing trades precisely.
            </div>
            <div>
              Advanced risk management keeps drawdowns minimal while maximizing return potential through diversified positions.
            </div>
            <div>
              Real-time market analysis and instant trade execution ensure you never miss profitable opportunities.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPerformanceWidget;