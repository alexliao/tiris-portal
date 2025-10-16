import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Brush } from 'recharts';
import { getEquityCurve, getTradingLogs, ApiError, type Trading } from '../../utils/api';
import { transformEquityCurveToChartData, type TradingDataPoint, type TradingMetrics } from '../../utils/chartData';
import CandlestickChart from './CandlestickChart';

type TimeRange = '1h' | '1d' | '1M' | '1y' | 'all';

interface TradingPerformanceWidgetProps {
  trading: Trading;
  className?: string;
  showHeader?: boolean;
  showHighlights?: boolean;
  height?: string;
  refreshTrigger?: number;
  autoRefreshEnabled?: boolean;
  onAutoRefreshToggle?: (enabled: boolean) => void;
}

const areTradingPointsEqual = (a: TradingDataPoint, b: TradingDataPoint): boolean => {
  if (a.timestampNum !== b.timestampNum) return false;
  if (a.netValue !== b.netValue) return false;
  if (a.roi !== b.roi) return false;
  if ((a.benchmark ?? null) !== (b.benchmark ?? null)) return false;
  if ((a.benchmarkPrice ?? null) !== (b.benchmarkPrice ?? null)) return false;
  if ((a.position ?? null) !== (b.position ?? null)) return false;

  const aEventType = a.event?.type ?? null;
  const bEventType = b.event?.type ?? null;
  if (aEventType !== bEventType) return false;

  const aEventDescription = a.event?.description ?? null;
  const bEventDescription = b.event?.description ?? null;
  if (aEventDescription !== bEventDescription) return false;

  return true;
};

const areMetricsEqual = (prev: TradingMetrics, next: TradingMetrics): boolean => {
  return (
    prev.totalROI === next.totalROI &&
    prev.winRate === next.winRate &&
    prev.sharpeRatio === next.sharpeRatio &&
    prev.maxDrawdown === next.maxDrawdown &&
    prev.totalTrades === next.totalTrades &&
    prev.initialPrice === next.initialPrice
  );
};

const mergeTradingDataSets = (
  prev: TradingDataPoint[],
  next: TradingDataPoint[]
): { value: TradingDataPoint[]; changed: boolean } => {
  if (prev.length === 0) {
    return { value: next, changed: true };
  }

  const prevByTimestamp = new Map<number, TradingDataPoint>();
  prev.forEach(point => {
    prevByTimestamp.set(point.timestampNum, point);
  });

  let changed = prev.length !== next.length;
  const merged = next.map(point => {
    const previousPoint = prevByTimestamp.get(point.timestampNum);
    if (previousPoint && areTradingPointsEqual(previousPoint, point)) {
      return previousPoint;
    }

    changed = true;
    return point;
  });

  if (!changed) {
    return { value: prev, changed: false };
  }

  return { value: merged, changed: true };
};

type ChartState = {
  data: TradingDataPoint[];
  metrics: TradingMetrics;
};

const TradingPerformanceWidgetComponent: React.FC<TradingPerformanceWidgetProps> = ({
  trading,
  className = '',
  showHeader = true,
  showHighlights = true,
  height = 'h-screen',
  refreshTrigger = 0,
  autoRefreshEnabled = true,
  onAutoRefreshToggle
}) => {
  const { t } = useTranslation();
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    metrics: {} as TradingMetrics
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradingDots, setShowTradingDots] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all');

  // Extract trading data fetching logic into reusable function
  const fetchTradingData = useCallback(async (isInitialLoad = false) => {
    try {
      // Only show loading state during initial load, not during refresh
      if (isInitialLoad) {
        setLoading(true);
        setError(null);
      }

      // Determine if authentication is required based on trading type
      const requireAuth = trading.type !== 'paper' && trading.type !== 'backtest';

      const [equityCurve, tradingLogs] = await Promise.all([
        getEquityCurve(trading.id, true, 'ETH', requireAuth), // Get equity curve with breakdown data and ETH benchmark
        getTradingLogs(trading.id, requireAuth)
      ]);

      const { data, metrics: calculatedMetrics } = transformEquityCurveToChartData(equityCurve, tradingLogs);

      setChartState((previous) => {
        const mergedData = mergeTradingDataSets(previous.data, data);
        const metricsChanged = !areMetricsEqual(previous.metrics, calculatedMetrics);

        if (!mergedData.changed && !metricsChanged) {
          return previous;
        }

        return {
          data: mergedData.changed ? mergedData.value : previous.data,
          metrics: metricsChanged ? calculatedMetrics : previous.metrics
        };
      });
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
  }, [trading.id]);

  // Initial data loading effect
  useEffect(() => {
    fetchTradingData(true); // Mark as initial load
  }, [fetchTradingData]);

  // Refresh trigger effect - refetch data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && autoRefreshEnabled) {
      fetchTradingData(false); // Refresh without showing loading state
    }
  }, [refreshTrigger, autoRefreshEnabled, fetchTradingData]);

  // Auto-refresh state change effect - refresh immediately when turned back on
  useEffect(() => {
    if (autoRefreshEnabled && refreshTrigger > 0) {
      fetchTradingData(false); // Refresh without showing loading state
    }
  }, [autoRefreshEnabled, fetchTradingData, refreshTrigger]);

  // Effect to restore brush domain after data refresh when auto-refresh is disabled
  useEffect(() => {
    if (chartState.data.length > 0 && brushDomain && !autoRefreshEnabled) {
      // When auto-refresh is disabled and we have brush domain and new data,
      // ensure the brush domain is maintained
      setTimeout(() => {
        setBrushDomain(brushDomain);
      }, 50);
    }
  }, [chartState.data, brushDomain, autoRefreshEnabled]);

  // Function to filter data based on selected time range
  const filteredData = useMemo(() => {
    if (selectedTimeRange === 'all' || chartState.data.length === 0) {
      return chartState.data;
    }

    const now = chartState.data[chartState.data.length - 1]?.timestampNum || Date.now();
    let cutoffTime: number;

    switch (selectedTimeRange) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000); // 1 hour
        break;
      case '1d':
        cutoffTime = now - (24 * 60 * 60 * 1000); // 1 day
        break;
      case '1M':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000); // 1 month (30 days)
        break;
      case '1y':
        cutoffTime = now - (365 * 24 * 60 * 60 * 1000); // 1 year
        break;
      default:
        return chartState.data;
    }

    const filtered = chartState.data.filter(point => point.timestampNum >= cutoffTime);
    return filtered.length > 0 ? filtered : chartState.data;
  }, [chartState.data, selectedTimeRange]);

  // Handle time range selection
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setBrushDomain(null); // Reset brush when changing time range
  };

  // Handle brush change to synchronize both charts
  const handleBrushChange = (domain: { startIndex?: number; endIndex?: number } | null) => {
    if (domain && domain.startIndex !== undefined && domain.endIndex !== undefined) {
      const startTime = filteredData[domain.startIndex]?.timestampNum;
      const endTime = filteredData[domain.endIndex]?.timestampNum;
      if (startTime && endTime) {
        setBrushDomain([startTime, endTime]);
        // Automatically turn off auto-refresh when user manually adjusts brush
        if (onAutoRefreshToggle && autoRefreshEnabled) {
          onAutoRefreshToggle(false);
        }
      }
    } else {
      setBrushDomain(null);
    }
  };

  // Calculate the domain for both charts
  const chartDomain = useMemo<[number, number] | ['dataMin', 'dataMax']>(() => {
    // If brush is active, use brush domain
    if (brushDomain) {
      return brushDomain;
    }

    // If a time range is selected (not 'all'), fix the domain to that time range
    if (selectedTimeRange !== 'all' && chartState.data.length > 0) {
      const now = chartState.data[chartState.data.length - 1]?.timestampNum || Date.now();
      let cutoffTime: number;

      switch (selectedTimeRange) {
        case '1h':
          cutoffTime = now - (60 * 60 * 1000); // 1 hour
          break;
        case '1d':
          cutoffTime = now - (24 * 60 * 60 * 1000); // 1 day
          break;
        case '1M':
          cutoffTime = now - (30 * 24 * 60 * 60 * 1000); // 1 month (30 days)
          break;
        case '1y':
          cutoffTime = now - (365 * 24 * 60 * 60 * 1000); // 1 year
          break;
        default:
          return ['dataMin', 'dataMax'];
      }

      return [cutoffTime, now];
    }

    // For 'all' time range, use dynamic domain
    return ['dataMin', 'dataMax'];
  }, [brushDomain, chartState.data, selectedTimeRange]);


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
      const data = payload[0]?.payload as TradingDataPoint | undefined;
      if (!data) {
        return null;
      }

      // Calculate benchmark price (assuming initial ETH price and benchmark return)
      const benchmarkPrice = data.benchmark !== undefined ?
        chartState.metrics.initialPrice ? chartState.metrics.initialPrice * (1 + data.benchmark / 100) : null : null;

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
          {benchmarkPrice && (
            <p className="font-['Nunito'] text-xs text-amber-600 ml-6">
              {`${t('trading.chart.ethPrice')}: ${formatCurrency(benchmarkPrice)}`}
            </p>
          )}
          {data.benchmark !== undefined && (
            <p className="font-['Nunito'] text-xs text-gray-500 mt-2 text-center border-t pt-2">
              {`${t('trading.chart.excessReturn')}: ${formatPercentage(data.roi - data.benchmark)}`}
            </p>
          )}
          {data.position !== undefined && (
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
              <p className="font-['Nunito'] text-sm text-blue-600 font-semibold">
              {`${t('trading.chart.ethPosition')}: ${data.position.toFixed(4)} ETH`}
              </p>
            </div>
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
  if (chartState.data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
            {formatCurrency(filteredData[filteredData.length - 1]?.netValue ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.chart.portfolioValue')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-green-600">
            {formatPercentage(chartState.metrics.totalROI ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalROI')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-blue-600">
            {formatPercentage(chartState.metrics.winRate ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.winRate')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-purple-600">
            {(chartState.metrics.sharpeRatio ?? 0).toFixed(1)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.sharpeRatio')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-orange-600">
            {formatPercentage(chartState.metrics.maxDrawdown ?? 0)}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.maxDrawdown')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-['Bebas_Neue'] font-bold text-gray-700">
            {chartState.metrics.totalTrades ?? 0}
          </div>
          <div className="text-sm font-['Nunito'] text-gray-600">{t('trading.metrics.totalTrades')}</div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            {showHeader && (
              <h3 className="text-xl font-['Bebas_Neue'] font-bold text-[#080404]">
                {trading.name} - {t('trading.detail.performanceChart')}
              </h3>
            )}
            <div className="flex items-center justify-between flex-1 ml-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
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
                {/* Time Range Selector Buttons */}
                <div className="flex items-center gap-1">
                  {(['1h', '1d', '1M', '1y', 'all'] as TimeRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range)}
                      className={`px-3 py-1 rounded-md text-sm font-['Nunito'] transition-colors ${
                        selectedTimeRange === range
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t(`trading.chart.timeRange.${range}`)}
                    </button>
                  ))}
                </div>
              </div>
              {onAutoRefreshToggle && (
                <div className="flex items-center space-x-2 text-sm font-['Nunito']">
                  <span className="text-gray-600">{t('common.autoRefresh')}:</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={autoRefreshEnabled}
                      onChange={(e) => onAutoRefreshToggle(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex items-center ${
                        autoRefreshEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAutoRefreshToggle(!autoRefreshEnabled);
                      }}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ml-0.5 pointer-events-none ${
                          autoRefreshEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div
          className={`${height} flex flex-col`}
          style={{
            outline: 'none',
            overflow: 'visible'
          }}
          onFocus={(e) => e.preventDefault()}
          tabIndex={-1}
        >
          {/* Main Chart - Performance and Benchmark */}
          <div style={{ flex: '0 0 30%', marginBottom: '10px', outline: 'none' }} tabIndex={-1}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <ComposedChart
                data={filteredData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                style={{ outline: 'none' }}
                tabIndex={-1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  scale="time"
                  domain={chartDomain}
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={() => ''} // Hide tick labels on main chart
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#F59E0B"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={['dataMin', 'dataMax']}
                  width={60}
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
                  yAxisId="left"
                  type="linear"
                  dataKey="roi"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="#10B981"
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                  name={t('trading.chart.portfolioReturn')}
                  isAnimationActive={false}
                />

                {/* ETH Benchmark Line */}
                <Line
                  yAxisId="left"
                  type="linear"
                  dataKey="benchmark"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
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
                  activeDot={{ r: 4, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 2 }}
                  name={t('trading.chart.ethBenchmark')}
                  isAnimationActive={false}
                />

                {/* ETH Price Line (Invisible - Just for Y-axis scaling) */}
                <Line
                  yAxisId="right"
                  type="linear"
                  dataKey="benchmarkPrice"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={false}
                  name="ETH Price"
                  isAnimationActive={false}
                />

                {/* Dotted Lines Connecting Signals to Position Area */}
                {showTradingDots && filteredData.filter(point => point.event).map((point, index) => (
                  <ReferenceLine
                    key={`signal-line-${index}`}
                    x={point.timestampNum}
                    stroke="#94A3B8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-Chart - Position Area */}
          <div style={{ flex: '0 0 20%', marginBottom: '10px', outline: 'none', minHeight: '0' }} tabIndex={-1}>
            <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              <ComposedChart
                data={filteredData}
                margin={{ top: 20, right: 5, left: 5, bottom: 50 }}
                style={{ outline: 'none' }}
                tabIndex={-1}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestampNum"
                  type="number"
                  scale="time"
                  domain={chartDomain}
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="left"
                  stroke="transparent"
                  fontSize={12}
                  tickFormatter={() => ''}
                  tick={false}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <YAxis
                  yAxisId="position"
                  orientation="right"
                  stroke="#60A5FA"
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(2)} ETH`}
                  domain={[0, 'dataMax']}
                />

                {/* Position Area Chart */}
                <Area
                  yAxisId="position"
                  type="linear"
                  dataKey="position"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  fill="#60A5FA"
                  fillOpacity={0.3}
                  dot={false}
                  activeDot={{ r: 4, fill: '#60A5FA', stroke: '#ffffff', strokeWidth: 2 }}
                  name="ETH Position"
                  isAnimationActive={false}
                />

                {/* Trading Signal Dots on Position Chart */}
                {showTradingDots && filteredData.filter(point => point.event).map((point, index) => (
                  <ReferenceLine
                    key={`position-signal-line-${index}`}
                    x={point.timestampNum}
                    stroke="#94A3B8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    opacity={0.7}
                  />
                ))}

                {/* Zoom Brush for the sub-chart - only show when 'all' time range is selected */}
                {selectedTimeRange === 'all' && (
                  <Brush
                    dataKey="timestampNum"
                    height={30}
                    stroke="#8884d8"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    onChange={handleBrushChange}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Candlestick Chart */}
          <div style={{ flex: '1 1 auto', outline: 'none', minHeight: '200px', display: 'flex', flexDirection: 'column' }} tabIndex={-1}>
            <div className="mb-2">
              <h4 className="text-sm font-['Nunito'] font-semibold text-gray-700">
                {t('trading.chart.priceChart')} (ETH/USDT)
              </h4>
            </div>
            <div style={{ flex: '1 1 auto', minHeight: '200px' }}>
              <CandlestickChart
                exchange="binance"
                market="ETH/USDT"
                startTime={
                  Array.isArray(chartDomain) && typeof chartDomain[0] === 'number'
                    ? chartDomain[0]
                    : filteredData[0]?.timestampNum || Date.now() - 86400000
                }
                endTime={
                  Array.isArray(chartDomain) && typeof chartDomain[1] === 'number'
                    ? chartDomain[1]
                    : filteredData[filteredData.length - 1]?.timestampNum || Date.now()
                }
                height={200}
              />
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 space-y-3">
          {/* Main Chart Legend */}
          <div className="flex items-center justify-center space-x-4 text-sm font-['Nunito'] flex-wrap">
            <div className="flex items-center">
              <div
                className="w-4 h-3 rounded mr-2"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid #10B981'
                }}
              ></div>
              <span>{t('trading.chart.portfolioReturn')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-amber-500 mr-2" style={{borderTop: '2px dashed #F59E0B', backgroundColor: 'transparent'}}></div>
              <span>{t('trading.chart.ethBenchmark')}</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-3 rounded mr-2"
                style={{
                  backgroundColor: 'rgba(96, 165, 250, 0.3)',
                  border: '2px solid #60A5FA'
                }}
              ></div>
              <span>{t('trading.chart.ethPosition')}</span>
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
      </div>


      {/* Performance Highlights */}
      {showHighlights && (
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-['Bebas_Neue'] font-bold text-[#080404] mb-4">
            {t('trading.chart.performanceHighlights')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm font-['Nunito']">
            <div>
              {t('trading.chart.highlight1')}
            </div>
            <div>
              {t('trading.chart.highlight2')}
            </div>
            <div>
              {t('trading.chart.highlight3')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const arePropsEqual = (
  prev: TradingPerformanceWidgetProps,
  next: TradingPerformanceWidgetProps
): boolean => {
  return (
    prev.trading.id === next.trading.id &&
    prev.trading.name === next.trading.name &&
    prev.className === next.className &&
    prev.showHeader === next.showHeader &&
    prev.showHighlights === next.showHighlights &&
    prev.height === next.height &&
    prev.refreshTrigger === next.refreshTrigger &&
    prev.autoRefreshEnabled === next.autoRefreshEnabled &&
    prev.onAutoRefreshToggle === next.onAutoRefreshToggle
  );
};

const TradingPerformanceWidget = memo(TradingPerformanceWidgetComponent, arePropsEqual);

export { TradingPerformanceWidget };
export default TradingPerformanceWidget;
