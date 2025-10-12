/**
 * Unified Color Theme Configuration
 * 
 * These colors are used consistently across the entire application
 * to represent the four main elements: Paper, Backtest, Real, and Exchanges
 */

export const THEME_COLORS = {
  paper: {
    name: 'Paper Trading',
    primary: '#7A1F3D',      // Burgundy - Secure
    light: '#F7E8ED',        // Very light burgundy
    medium: '#B04A6E',       // Medium burgundy
    border: '#E0B3C5',       // Light burgundy border
    hover: '#5A1729',        // Darker burgundy for hover
  },
  backtest: {
    name: 'Backtest',
    primary: '#8B6914',      // Gold - Profitable
    light: '#FFF8E7',        // Very light gold
    medium: '#C4A04A',       // Medium gold
    border: '#E5D4A0',       // Light gold border
    hover: '#6B5010',        // Darker gold for hover
  },
  real: {
    name: 'Real Trading',
    primary: '#1B4D3E',      // Dark Green - Simple
    light: '#E7F2EF',        // Very light green
    medium: '#4A8A75',       // Medium green
    border: '#A8D4C3',       // Light green border
    hover: '#0F3329',        // Darker green for hover
  },
  exchanges: {
    name: 'Exchanges',
    primary: '#2E3A59',      // Dark Blue - Automatic
    light: '#E8EAF0',        // Very light blue
    medium: '#6B7A9E',       // Medium blue
    border: '#B8C1D9',       // Light blue border
    hover: '#1F2A3F',        // Darker blue for hover
  },
} as const;

export type ThemeType = keyof typeof THEME_COLORS;

/**
 * Get Tailwind CSS classes for a specific theme
 */
export const getThemeClasses = (theme: ThemeType) => {
  const colors = THEME_COLORS[theme];
  
  return {
    // Background colors
    bgPrimary: `bg-[${colors.primary}]`,
    bgLight: `bg-[${colors.light}]`,
    bgMedium: `bg-[${colors.medium}]`,
    
    // Text colors
    textPrimary: `text-[${colors.primary}]`,
    textLight: `text-[${colors.light}]`,
    textMedium: `text-[${colors.medium}]`,
    
    // Border colors
    borderPrimary: `border-[${colors.border}]`,
    
    // Hover states
    hoverBg: `hover:bg-[${colors.hover}]`,
    hoverBorder: `hover:border-[${colors.primary}]`,
    
    // Gradient
    gradient: `from-[${colors.primary}] to-[${colors.hover}]`,
  };
};

/**
 * Map trading type to theme
 */
export const getTradingTheme = (type: string): ThemeType => {
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'paper') return 'paper';
  if (normalizedType === 'backtest') return 'backtest';
  if (normalizedType === 'real' || normalizedType === 'live') return 'real';
  return 'paper'; // default
};
