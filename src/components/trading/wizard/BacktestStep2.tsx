import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';

interface BacktestStep2Props {
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
}

export const BacktestStep2: React.FC<BacktestStep2Props> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) => {
  const { t } = useTranslation();
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Get the current year and month for calendar display
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleDateInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (date: Date | null) => void
  ) => {
    const value = e.target.value;
    if (!value) {
      setter(null);
      return;
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(p => parseInt(p, 10));
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        setter(date);
      }
    }
  };

  const DatePicker = ({
    date,
    setDate,
    showCalendar,
    setShowCalendar,
    minDate,
    maxDate,
    label
  }: {
    date: Date | null;
    setDate: (date: Date | null) => void;
    showCalendar: boolean;
    setShowCalendar: (show: boolean) => void;
    minDate?: Date | null;
    maxDate?: Date | null;
    label: string;
  }) => {
    const displayDate = date || new Date();
    const { daysInMonth, startingDayOfWeek, year, month } = getMonthDays(displayDate);
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });

    const canGoBack = !minDate || new Date(year, month, 1) > minDate;
    const canGoForward = !maxDate || new Date(year, month + 1, 1) < maxDate;

    const handlePrevMonth = () => {
      const newDate = new Date(displayDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setDate(newDate);
    };

    const handleNextMonth = () => {
      const newDate = new Date(displayDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setDate(newDate);
    };

    const handleDayClick = (day: number) => {
      const newDate = new Date(year, month, day);
      setDate(newDate);
      setShowCalendar(false);
    };

    const isDateDisabled = (day: number) => {
      const checkDate = new Date(year, month, day);
      if (minDate && checkDate < minDate) return true;
      if (maxDate && checkDate > maxDate) return true;
      return false;
    };

    const isDateInRange = (day: number) => {
      const checkDate = new Date(year, month, day);
      if (!startDate || !endDate) return false;
      return checkDate >= startDate && checkDate <= endDate;
    };

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="date"
            value={date ? date.toISOString().split('T')[0] : ''}
            onChange={(e) => handleDateInputChange(e, setDate)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tiris-primary-500 focus:border-tiris-primary-500 text-gray-900"
          />
          <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {showCalendar && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50" style={{ minWidth: '320px' }}>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                disabled={!canGoBack}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <div className="text-center font-semibold text-gray-900">
                {monthName} {year}
              </div>
              <button
                onClick={handleNextMonth}
                disabled={!canGoForward}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {/* Day headers */}
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 h-8 flex items-center justify-center">
                  {day}
                </div>
              ))}
              {/* Day cells */}
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => day && handleDayClick(day)}
                  disabled={!day || isDateDisabled(day!)}
                  className={`h-8 rounded text-sm font-medium transition-colors ${
                    !day
                      ? ''
                      : isDateDisabled(day)
                      ? 'text-gray-300 cursor-not-allowed'
                      : isDateInRange(day)
                      ? 'bg-tiris-primary-200 text-tiris-primary-900'
                      : day === date?.getDate() && month === date?.getMonth() && year === date?.getFullYear()
                      ? 'bg-tiris-primary-500 text-white'
                      : 'hover:bg-gray-100 text-gray-900'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowCalendar(false)}
              className="w-full mt-2 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              {t('common.done')}
            </button>
          </div>
        )}
      </div>
    );
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
        {/* Start Date Picker */}
        <div className="relative">
          <button
            onClick={() => setShowStartCalendar(!showStartCalendar)}
            className="w-full text-left"
          >
            <DatePicker
              date={startDate}
              setDate={setStartDate}
              showCalendar={showStartCalendar}
              setShowCalendar={setShowStartCalendar}
              maxDate={endDate}
              label={t('trading.wizard.backtestStep2.startDateLabel')}
            />
          </button>
        </div>

        {/* End Date Picker */}
        <div className="relative">
          <button
            onClick={() => setShowEndCalendar(!showEndCalendar)}
            className="w-full text-left"
          >
            <DatePicker
              date={endDate}
              setDate={setEndDate}
              showCalendar={showEndCalendar}
              setShowCalendar={setShowEndCalendar}
              minDate={startDate}
              label={t('trading.wizard.backtestStep2.endDateLabel')}
            />
          </button>
        </div>

        {/* Date Range Summary */}
        {startDate && endDate && (
          <div className="bg-tiris-primary-50 border border-tiris-primary-200 rounded-lg p-4">
            <p className="text-sm text-tiris-primary-900">
              {t('trading.wizard.backtestStep2.selectedRange')}: <strong>{formatDate(startDate)}</strong> {' '}
              {t('trading.wizard.backtestStep2.to')} <strong>{formatDate(endDate)}</strong>
            </p>
            <p className="text-xs text-tiris-primary-800 mt-2">
              {t('trading.wizard.backtestStep2.dayCount', { count: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestStep2;
