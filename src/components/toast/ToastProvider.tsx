import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Toast, ToastOptions } from './types';
import { ToastContext } from './ToastContext';

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }, []);

  const addToast = useCallback((
    title: string, 
    message?: string, 
    options: ToastOptions = {}
  ) => {
    const {
      type = 'info',
      duration = 4000,
      dismissible = true
    } = options;

    const id = generateId();
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration,
      dismissible
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, [generateId]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, duration = 4000) => {
    addToast(title, message, { type: 'success', duration });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string, duration = 6000) => {
    addToast(title, message, { type: 'error', duration });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string, duration = 4000) => {
    addToast(title, message, { type: 'info', duration });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string, duration = 5000) => {
    addToast(title, message, { type: 'warning', duration });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};