import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { getOHLCV, type OHLCVCandle } from '../../../utils/api';
import { resolveLocale } from '../../../utils/locale';

interface BacktestStep2Props {
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  originalData: OHLCVCandle;
}

type LocalizedChartDataPoint = ChartDataPoint & { date: string };

interface BrushChangeState {
  startIndex?: number;
  endIndex?: number;
}

export const BacktestStep2: React.FC<BacktestStep2Props> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) => {
  const { t, i18n } = useTranslation();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brushStartIndex, setBrushStartIndex] = useState(0);
  const [brushEndIndex, setBrushEndIndex] = useState(100);

  const resolvedLocale = useMemo(() => resolveLocale(i18n.language), [i18n.language]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }),
    [resolvedLocale]
  );

  const localizedChartData: LocalizedChartDataPoint[] = useMemo(
    () =>
      chartData.map((dataPoint) => ({
        ...dataPoint,
        date: dateFormatter.format(new Date(dataPoint.timestamp))
      })),
    [chartData, dateFormatter]
  );

  // Fetch OHLCV data on component mount
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Set date range: from 2024-01-01 to now
        const startDate2024 = new Date('2024-01-01');
        const endDateNow = new Date();

        const startTime = startDate2024.getTime();
        const endTime = endDateNow.getTime();

        // Fetch OHLCV data for ETH_USDT with 1d timeframe from binance
        const ohlcvData = await getOHLCV(
          'binance',
          'ETH_USDT',
          startTime,
          endTime,
          '1d',
          'warmup'
        );

        // Transform OHLCV data to chart data
        const transformedData: ChartDataPoint[] = ohlcvData.map((candle) => ({
          timestamp: new Date(candle.ts).getTime(),
          price: candle.c, // Close price
          originalData: candle
        }));

        // Sort by timestamp
        transformedData.sort((a, b) => a.timestamp - b.timestamp);

        setChartData(transformedData);

        // Set initial dates to the first and last candle if no dates are set
        if (transformedData.length > 0) {
          if (!startDate) {
            setStartDate(new Date(transformedData[0].timestamp));
          }
          if (!endDate) {
            setEndDate(new Date(transformedData[transformedData.length - 1].timestamp));
          }
          // Set initial brush to show full range
          setBrushStartIndex(0);
          setBrushEndIndex(transformedData.length - 1);
        }
      } catch (err) {
        console.error('Failed to fetch OHLCV data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch market data. Please try again later.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
    // We intentionally run this only once on mount to bootstrap chart data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrushChange = (state: BrushChangeState | null) => {
    if (state && state.startIndex !== undefined && state.endIndex !== undefined) {
      const startIndex = Math.max(0, state.startIndex);
      const endIndex = Math.min(chartData.length - 1, state.endIndex);

      if (startIndex >= 0 && endIndex < chartData.length && startIndex <= endIndex) {
        setBrushStartIndex(startIndex);
        setBrushEndIndex(endIndex);

        const newStartDate = new Date(chartData[startIndex].timestamp);
        const newEndDate = new Date(chartData[endIndex].timestamp);

        setStartDate(newStartDate);
        setEndDate(newEndDate);
      }
    }
  };

  const setPresetDateRange = (days: number) => {
    if (chartData.length === 0) return;

    const endDate = new Date(chartData[chartData.length - 1].timestamp);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    // Find the closest indices in chartData
    let startIndex = 0;
    const endIndex = chartData.length - 1;

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].timestamp >= startDate.getTime()) {
        startIndex = i;
        break;
      }
    }

    // Update brush position and dates
    setBrushStartIndex(startIndex);
    setBrushEndIndex(endIndex);
    setStartDate(new Date(chartData[startIndex].timestamp));
    setEndDate(endDate);
  };

  const setPresetDateRangeThisYear = () => {
    if (chartData.length === 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const startDate = new Date(year, 0, 1); // Jan 1 of current year
    const endDate = new Date(year, 11, 31); // Dec 31 of current year

    // Find the closest indices in chartData
    let startIndex = 0;
    let endIndex = chartData.length - 1;

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].timestamp >= startDate.getTime()) {
        startIndex = i;
        break;
      }
    }

    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].timestamp <= endDate.getTime()) {
        endIndex = i;
        break;
      }
    }

    // Update brush position and dates
    setBrushStartIndex(startIndex);
    setBrushEndIndex(endIndex);
    setStartDate(new Date(chartData[startIndex].timestamp));
    setEndDate(new Date(chartData[endIndex].timestamp));
  };

  const setPresetDateRangeLastYear = () => {
    if (chartData.length === 0) return;

    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    const startDate = new Date(lastYear, 0, 1); // Jan 1 of last year
    const endDate = new Date(lastYear, 11, 31); // Dec 31 of last year

    // Find the closest indices in chartData
    let startIndex = 0;
    let endIndex = chartData.length - 1;

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].timestamp >= startDate.getTime()) {
        startIndex = i;
        break;
      }
    }

    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].timestamp <= endDate.getTime()) {
        endIndex = i;
        break;
      }
    }

    // Update brush position and dates
    setBrushStartIndex(startIndex);
    setBrushEndIndex(endIndex);
    setStartDate(new Date(chartData[startIndex].timestamp));
    setEndDate(new Date(chartData[endIndex].timestamp));
  };

  const setPresetDateRangeAll = () => {
    if (chartData.length === 0) return;

    const startDate = new Date('2024-01-01'); // Jan 1, 2024
    const endDate = new Date(); // Today's date

    // Find the closest indices in chartData
    let startIndex = 0;
    let endIndex = chartData.length - 1;

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].timestamp >= startDate.getTime()) {
        startIndex = i;
        break;
      }
    }

    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].timestamp <= endDate.getTime()) {
        endIndex = i;
        break;
      }
    }

    // Update brush position and dates
    setBrushStartIndex(startIndex);
    setBrushEndIndex(endIndex);
    setStartDate(new Date(chartData[startIndex].timestamp));
    setEndDate(new Date(chartData[endIndex].timestamp));
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return dateFormatter.format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('trading.wizard.backtestStep2.title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {t('trading.wizard.backtestStep2.description')}
      </p>

      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tiris-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('common.loading')}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {!isLoading && chartData.length > 0 && (
          <>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-tiris-primary-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">{t('trading.wizard.backtestStep2.chartTitle')}</h3>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={localizedChartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={Math.floor(chartData.length / 10) || 0}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={['dataMin - 100', 'dataMax + 100']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    formatter={(value) => [
                      value instanceof Number
                        ? value.toFixed(2)
                        : typeof value === 'number'
                        ? value.toFixed(2)
                        : value,
                      t('trading.wizard.backtestStep2.chartPriceLabel')
                    ]}
                    labelFormatter={(label, payload) => {
                      if (Array.isArray(payload) && payload.length > 0) {
                        const dataPoint = payload[0]?.payload as LocalizedChartDataPoint | undefined;
                        if (dataPoint) {
                          return `${t('trading.wizard.backtestStep2.chartDateLabel')}: ${dateFormatter.format(
                            new Date(dataPoint.timestamp)
                          )}`;
                        }
                      }
                      return `${t('trading.wizard.backtestStep2.chartDateLabel')}: ${label}`;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Brush
                    dataKey="date"
                    height={40}
                    stroke="#3b82f6"
                    fill="#e0f2fe"
                    travellerWidth={8}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onChange={handleBrushChange}
                  />
                </LineChart>
              </ResponsiveContainer>

              <p className="text-xs text-gray-500 mt-4 text-center mb-4">
                {t('trading.wizard.backtestStep2.brushInstruction')}
              </p>

              {/* Preset Date Range Buttons */}
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setPresetDateRangeAll()}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  {t('trading.wizard.backtestStep2.presetAll')}
                </button>
                <button
                  onClick={() => setPresetDateRangeLastYear()}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  {t('trading.wizard.backtestStep2.presetLastYear')}
                </button>
                <button
                  onClick={() => setPresetDateRangeThisYear()}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  {t('trading.wizard.backtestStep2.presetThisYear')}
                </button>
                <button
                  onClick={() => setPresetDateRange(90)}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  {t('trading.wizard.backtestStep2.preset3Months')}
                </button>
                <button
                  onClick={() => setPresetDateRange(30)}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  {t('trading.wizard.backtestStep2.preset1Month')}
                </button>
              </div>
            </div>

            {/* Date Range Summary */}
            {startDate && endDate && (
              <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-tiris-primary-900">{t('trading.wizard.backtestStep2.selectedRange')}:</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-tiris-primary-600 text-white text-sm font-semibold rounded-full">
                    {formatDate(startDate)}
                  </span>
                  <span className="text-sm text-tiris-primary-900">{t('trading.wizard.backtestStep2.to')}</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-tiris-primary-600 text-white text-sm font-semibold rounded-full">
                    {formatDate(endDate)}
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-tiris-primary-500 text-white text-sm font-semibold rounded-full">
                    {t('trading.wizard.backtestStep2.dayCount', {
                      count: Math.ceil(
                        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                      )
                    })}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && chartData.length === 0 && !error && (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('common.noData')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestStep2;
