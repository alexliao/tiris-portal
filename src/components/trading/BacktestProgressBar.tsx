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
  isRunning?: boolean;
}

export const BacktestProgressBar: React.FC<BacktestProgressBarProps> = ({
  progressPct = 0,
  status = 'pending',
  completed = false,
  pointerTs,
  pointerIso,
  isRunning = false,
}) => {
  const { t } = useTranslation();
  const [elapsedTime, setElapsedTime] = useState<string>('0s');
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const isTimerActive = isRunning && !completed;

  useEffect(() => {
    if (isTimerActive && timerStart === null) {
      setTimerStart(Date.now());
    }
    if (!isTimerActive && !completed) {
      setTimerStart(null);
      setElapsedTime('0s');
    }
  }, [isTimerActive, timerStart, completed]);

  // Update elapsed time every second
  useEffect(() => {
    if (completed || !isTimerActive || timerStart === null) {
      return; // Stop updating after completion
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
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
  }, [timerStart, completed, isTimerActive]);

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

  const pointerTimestamp = useMemo(() => {
    if (pointerIso) {
      const ts = new Date(pointerIso).getTime();
      if (Number.isFinite(ts)) {
        return ts;
      }
    }
    if (typeof pointerTs === 'number' && Number.isFinite(pointerTs)) {
      return pointerTs > 1_000_000_000_000 ? pointerTs : pointerTs * 1000;
    }
    return null;
  }, [pointerIso, pointerTs]);

  const pointerLabel = useMemo(() => {
    if (!pointerTimestamp) {
      return null;
    }
    return new Date(pointerTimestamp).toLocaleDateString();
  }, [pointerTimestamp]);

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
    if (status === 'pending') {
      return {
        text: t('trading.detail.backtestPending') || 'Pending',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200'
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
          <span className="text-sm font-semibold text-gray-700">
            {clampedProgress.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${progressBarColor} transition-all duration-300`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <div
          className="absolute"
          style={{
            left: `${clampedProgress}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-3 h-3 rounded-full border-2 border-white bg-tiris-primary-500 shadow" />
        </div>
      </div>

      {(pointerLabel || elapsedTime) && (
        <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
          <div className="font-semibold text-gray-900">{elapsedTime}</div>
          {pointerLabel && (
            <div>
              <span className="font-semibold text-gray-900">{pointerLabel}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default BacktestProgressBar;
