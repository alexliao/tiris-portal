import React from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import { useToastContext } from './ToastProvider';

export const ToastContainer: React.FC = () => {
  const { toasts } = useToastContext();

  if (toasts.length === 0) {
    return null;
  }

  // Render toasts in a portal to ensure they appear above all other content
  return createPortal(
    <div 
      className="fixed top-4 right-4 z-[9999] pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <div className="flex flex-col-reverse space-y-reverse space-y-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>,
    document.body
  );
};