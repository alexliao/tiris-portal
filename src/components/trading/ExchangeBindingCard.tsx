import React from 'react';
import { Check, Edit2, Trash2 } from 'lucide-react';
import type { ExchangeBinding } from '../../utils/api';
import { THEME_COLORS } from '../../config/theme';

type ExchangeBindingCardMode = 'edit' | 'select';

interface ExchangeBindingCardProps {
  exchange: ExchangeBinding;
  mode: ExchangeBindingCardMode;
  isSelected?: boolean;
  iconServiceBaseUrl: string;
  description?: React.ReactNode;
  tradings?: React.ReactNode;
  onSelect?: (exchange: ExchangeBinding) => void;
  onEdit?: (exchange: ExchangeBinding) => void;
  onDelete?: (exchange: ExchangeBinding) => void;
  displayName?: (exchangeType: string) => string;
  headerSubtitle?: string;
}

export const ExchangeBindingCard: React.FC<ExchangeBindingCardProps> = ({
  exchange,
  mode,
  isSelected = false,
  iconServiceBaseUrl,
  description,
  tradings,
  onSelect,
  onEdit,
  onDelete,
  displayName,
  headerSubtitle,
}) => {
  const colors = THEME_COLORS.real;

  const handleCardClick = () => {
    if (mode === 'select' && onSelect) {
      onSelect(exchange);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(exchange);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(exchange);
    }
  };

  const containerBaseClasses = 'w-full m-0 p-0 rounded-lg shadow hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden bg-white text-left';
  const selectableClasses = mode === 'select'
    ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
    : '';

  const content = (
    <>
      {/* Card Header with Gradient */}
      <div
        style={{
          background: `linear-gradient(to right, ${colors.primary}, ${colors.hover})`
        }}
        className="p-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center flex-1 min-w-0 gap-3">
            {/* Exchange Icon */}
            {exchange.exchange_type && (
              <img
                src={`${iconServiceBaseUrl}/icons/${exchange.exchange_type}.png`}
                alt={exchange.name}
                className="w-10 h-10 rounded-lg flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}

            {/* Exchange Type and Subtitle */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white truncate">
                {displayName ? displayName(exchange.exchange_type) : exchange.exchange_type}
              </h3>
              {headerSubtitle && (
                <p className="text-white/80 text-xs mt-1 truncate">
                  {headerSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons or Selected Indicator */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {mode === 'select' ? (
              // Selection Mode - Show checkmark when selected
              isSelected && (
                <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full">
                  <Check className="w-4 h-4 text-blue-600" />
                </div>
              )
            ) : (
              // Edit Mode - Show edit and delete buttons
              <>
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col items-start justify-start">
        <div className="w-full text-left">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 text-left">
            {exchange.name}
          </h4>

          {description && (
            <div className="mb-4">
              {description}
            </div>
          )}

          {tradings && (
            <div className="mt-4 pt-4 border-t border-gray-200 w-full">
              {tradings}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (mode === 'select') {
    return (
      <button
        type="button"
        onClick={handleCardClick}
        className={`${containerBaseClasses} ${selectableClasses}`.trim()}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={containerBaseClasses}>
      {content}
    </div>
  );
};

export default ExchangeBindingCard;
