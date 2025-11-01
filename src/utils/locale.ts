export const resolveLocale = (language?: string): string => {
  if (!language) return 'en-US';

  const normalized = language.replace('_', '-');

  if (normalized === 'en') return 'en-US';
  if (normalized === 'zh') return 'zh-CN';

  return normalized;
};

export const createDateTimeFormatter = (
  language: string | undefined,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
  return new Intl.DateTimeFormat(resolveLocale(language), options);
};
