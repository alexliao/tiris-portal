import { useToastContext } from '../components/toast/useToastContext';

/**
 * Hook for easy toast notifications
 * 
 * @example
 * const toast = useToast();
 * 
 * // Show success toast
 * toast.success('Welcome!', 'You have successfully signed in');
 * 
 * // Show error toast
 * toast.error('Authentication failed', 'Please check your credentials');
 * 
 * // Show info toast
 * toast.info('Session restored', 'Welcome back!');
 */
export const useToast = () => {
  const {
    addToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    clearToasts,
    removeToast
  } = useToastContext();

  return {
    // Main methods
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    
    // Advanced methods
    show: addToast,
    clear: clearToasts,
    dismiss: removeToast,
  };
};