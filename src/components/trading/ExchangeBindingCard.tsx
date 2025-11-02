import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle, Edit2, HelpCircle, Trash2, AlertTriangle } from 'lucide-react';
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
  onRefreshValidation?: (exchange: ExchangeBinding) => Promise<unknown> | unknown;
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
  onRefreshValidation,
}) => {
  const { t } = useTranslation();
  const colors = THEME_COLORS.real;
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tiris-primary-500'
    : '';

  const validatedAtString = exchange.info?.validated_at;
  let validatedAtDate: Date | null = null;
  if (validatedAtString) {
    const parsed = new Date(validatedAtString);
    if (!Number.isNaN(parsed.getTime())) {
      validatedAtDate = parsed;
    }
  }

  type ValidationState = {
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    iconClasses: string;
  };

  const validationState: ValidationState = (() => {
    if (exchange.info?.is_credential_valid === true) {
      return {
        label: t('exchanges.validation.valid'),
        Icon: CheckCircle,
        iconClasses: 'text-emerald-100',
      };
    }
    if (exchange.info?.is_credential_valid === false) {
      return {
        label: t('exchanges.validation.invalid'),
        Icon: AlertTriangle,
        iconClasses: 'text-amber-200',
      };
    }
    return {
      label: t('exchanges.validation.unknown'),
      Icon: HelpCircle,
      iconClasses: 'text-white/70',
    };
  })();

  const getRelativeTimeLabel = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();

    if (diffMs <= 0) {
      return t('exchanges.validation.relative.justNow');
    }

    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      const safeSeconds = Math.max(diffSeconds, 1);
      return t('exchanges.validation.relative.secondsAgo', { count: safeSeconds });
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return t('exchanges.validation.relative.minutesAgo', { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t('exchanges.validation.relative.hoursAgo', { count: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return t('exchanges.validation.relative.daysAgo', { count: diffDays });
    }

    return date.toLocaleDateString();
  };

  const relativeValidatedAt = validatedAtDate ? getRelativeTimeLabel(validatedAtDate) : null;
  const tooltip = relativeValidatedAt
    ? `${validationState.label} • ${t('exchanges.validation.lastChecked', { time: relativeValidatedAt })}`
    : validationState.label;

  const refreshingLabel = t('exchanges.validation.refreshing');

  const handleValidationRefresh = async (event: React.MouseEvent) => {
    if (!onRefreshValidation || isRefreshing) {
      return;
    }

    event.stopPropagation();
    setIsRefreshing(true);

    try {
      await Promise.resolve(onRefreshValidation(exchange));
    } catch (error) {
      console.error('Failed to refresh exchange binding validation', exchange.id, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const iconTooltip = isRefreshing ? refreshingLabel : tooltip;
  const iconContent = isRefreshing ? (
    <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
  ) : (
    <validationState.Icon className={`w-4 h-4 ${validationState.iconClasses}`} />
  );

  const iconWrapper = onRefreshValidation ? (
    <button
      type="button"
      onClick={handleValidationRefresh}
      disabled={isRefreshing}
      title={iconTooltip}
      aria-label={iconTooltip}
      aria-busy={isRefreshing}
      className={`flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-white transition-opacity ${isRefreshing ? 'cursor-wait opacity-80' : 'hover:bg-white/25 hover:opacity-90'}`}
    >
      {iconContent}
    </button>
  ) : (
    <span
      title={iconTooltip}
      aria-label={iconTooltip}
      className="flex items-center justify-center w-6 h-6"
    >
      {iconContent}
    </span>
  );

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
                <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
                  <span className="truncate">{headerSubtitle}</span>
                  {iconWrapper}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons or Selected Indicator */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {mode === 'select' ? (
              // Selection Mode - Show checkmark when selected
              isSelected && (
                <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full">
                  <Check className="w-4 h-4 text-tiris-primary-600" />
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
