import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle } from 'lucide-react';

interface BacktestProgressBarProps {
  progressPct?: number;
  status?: string;
  completed?: boolean;
  iterations?: number;
  loopIterations?: number;
  lastCandleTs?: number;
  pointerTs?: number;
  pointerIso?: string;
}

export const BacktestProgressBar: React.FC<BacktestProgressBarProps> = ({
  progressPct = 0,
  status = 'running',
  completed = false,
}) => {
  const { t } = useTranslation();
  const [startTime] = useState<number>(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  // Update elapsed time every second
  useEffect(() => {
    if (completed) {
      return; // Stop updating after completion
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds}s`);
      } else {
        setElapsedTime(`${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, completed]);

  // Calculate the progress percentage, clamped between 0 and 100
  const clampedProgress = useMemo(() => {
    const pct = Math.min(100, Math.max(0, progressPct || 0));
    return Math.round(pct * 100) / 100; // Round to 2 decimal places
  }, [progressPct]);

  // Determine the progress bar color based on status
  const progressBarColor = useMemo(() => {
    if (completed) return 'bg-green-500';
    if (status === 'stopped') return 'bg-yellow-500';
    if (status === 'error') return 'bg-red-500';
    return 'bg-tiris-primary-500';
  }, [status, completed]);

  // Determine the status text and styling
  const statusDisplay = useMemo(() => {
    if (completed) {
      return {
        text: t('trading.detail.backtestCompleted') || 'Completed',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
    if (status === 'stopped') {
      return {
        text: t('trading.detail.backtestStopped') || 'Stopped',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
    if (status === 'error') {
      return {
        text: t('trading.detail.backtestError') || 'Error',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    return {
      text: t('trading.detail.backtestRunning') || 'Running',
      color: 'text-tiris-primary-700',
      bgColor: 'bg-tiris-primary-50',
      borderColor: 'border-tiris-primary-200'
    };
  }, [status, completed, t]);

  return (
    <div className={`mt-4 p-4 rounded-lg border ${statusDisplay.borderColor} ${statusDisplay.bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Circle className="w-4 h-4 text-tiris-primary-600" />
          )}
          <span className={`text-sm font-medium ${statusDisplay.color}`}>
            {statusDisplay.text}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {t('trading.detail.elapsed') || 'Elapsed'}: <span className="font-semibold text-gray-900">{elapsedTime}</span>
          </span>
          <span className="text-sm font-semibold text-gray-700">
            {clampedProgress.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-3">
        <div
          className={`h-full ${progressBarColor} transition-all duration-300`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

    </div>
  );
};

export default BacktestProgressBar;
