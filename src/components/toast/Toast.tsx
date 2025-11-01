import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Toast as ToastType } from './types';
import { useToastContext } from './useToastContext';

interface ToastProps {
  toast: ToastType;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { t } = useTranslation();
  const { removeToast } = useToastContext();
  const [isVisible, setIsVisible] = useState(false);

  // Animation: slide in from right
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete before removing from state
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = 'border-l-4 shadow-lg';
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-400 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-400 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case 'info':
      default:
        return `${baseStyles} bg-tiris-primary-50 border-tiris-primary-400 text-tiris-primary-800`;
    }
  };

  const getIcon = () => {
    const iconProps = { className: 'w-5 h-5 flex-shrink-0' };
    switch (toast.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-green-500" />;
      case 'error':
        return <XCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-red-500" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 flex-shrink-0 text-yellow-500" />;
      case 'info':
      default:
        return <Info {...iconProps} className="w-5 h-5 flex-shrink-0 text-tiris-primary-500" />;
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full rounded-lg p-4 mb-3 transition-all duration-300 ease-out transform
        ${getToastStyles()}
        ${isVisible 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
        hover:shadow-xl cursor-pointer
      `}
      onClick={toast.dismissible ? handleDismiss : undefined}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-5">
            {toast.title}
          </div>
          {toast.message && (
            <div className="mt-1 text-sm opacity-90 leading-5">
              {toast.message}
            </div>
          )}
        </div>
        
        {toast.dismissible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors duration-200"
            aria-label={t('common.dismissNotification')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
