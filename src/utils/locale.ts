import i18n from '../i18n';

export const resolveLocale = (language?: string): string => {
  if (!language) return 'en-US';

  const normalized = language.replace('_', '-');

  if (normalized === 'en') return 'en-US';
  if (normalized === 'zh') return 'zh-CN';

  return normalized;
};

export const DateFormatOption = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions;

export const DateTimeFormatOption = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
} as const satisfies Intl.DateTimeFormatOptions;

export const AxisDateTimeFormatOption = {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
} as const satisfies Intl.DateTimeFormatOptions;

type FormatterOverrides = {
  language?: string;
  timeZone?: string;
};

export const createDateTimeFormatter = (
  options: Intl.DateTimeFormatOptions = DateFormatOption,
  overrides?: FormatterOverrides
): Intl.DateTimeFormat => {
  const resolvedLocale = resolveLocale(overrides?.language ?? i18n.language);
  const resolvedTimeZone =
    overrides?.timeZone ??
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined);

  const mergedOptions = resolvedTimeZone ? { ...options, timeZone: resolvedTimeZone } : options;
  return new Intl.DateTimeFormat(resolvedLocale, mergedOptions);
};
