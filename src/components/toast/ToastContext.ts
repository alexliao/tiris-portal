import { createContext } from 'react';
import type { Toast, ToastOptions } from './types';

export interface ToastContextType {
  toasts: Toast[];
  addToast: (title: string, message?: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
