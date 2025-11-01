import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    console.log('ConfirmDialog: Confirm button clicked');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
      <div className="relative mx-auto p-6 border border-gray-200 w-96 shadow-2xl rounded-lg bg-white/95">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {isDestructive && (
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            )}
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tiris-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-tiris-primary-600 hover:bg-tiris-primary-700 focus:ring-tiris-primary-500'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.loading')}
              </div>
            ) : (
              confirmText || t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;