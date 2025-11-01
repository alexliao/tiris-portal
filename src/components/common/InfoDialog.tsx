import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info } from 'lucide-react';

interface InfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export const InfoDialog: React.FC<InfoDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
      <div className="relative mx-auto p-6 border border-gray-200 w-96 shadow-2xl rounded-lg bg-white/95">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Info className="w-6 h-6 text-tiris-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-tiris-primary-600 border border-transparent rounded-md hover:bg-tiris-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tiris-primary-500"
          >
            {buttonText || t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoDialog;
