# Tiris Portal Frontend Architecture Document

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2024-08-31 | 1.0 | Initial frontend architecture creation | Winston (Architect) |

## Template and Framework Selection

### Project Context
The Tiris Portal is a new ML-powered quantitative trading platform frontend designed for crypto-curious non-technical investors. The platform requires:
- Modern responsive web application
- Future integration with tiris-backend REST APIs  
- Education-first user journey with paper trading
- Mobile-first design for cryptocurrency trading
- Professional appearance to build trust with financial users

### Framework Decision: React + TypeScript + Vite

**Selected Stack:**
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 4+
- **Starter Template**: Vite + React + TypeScript template

**Decision Rationale:**
Based on analysis of successful trading platforms (Coinbase Pro, Robinhood, TradingView) and comparison with Vue 3, Next.js, and SvelteKit alternatives:

- **Ecosystem Excellence**: Best-in-class financial/trading component libraries
- **Performance**: Vite provides fast development builds crucial for financial data visualization
- **Type Safety**: TypeScript essential for financial calculations and API integration reliability
- **Talent Pool**: Largest pool of React developers with fintech experience
- **Scalability**: Proven architecture for complex trading dashboard evolution
- **Component Reusability**: Perfect for trading widgets and dashboard components

## Frontend Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | React | 19+ | UI framework | Latest version with enhanced performance |
| Language | TypeScript | 5+ | Type safety | Essential for reliable development |
| Build Tool | Vite | 7+ | Development/bundling | Fast builds and hot reload |
| Styling | Tailwind CSS | 4+ | Utility-first CSS | Rapid development with design consistency |
| Icons | Lucide React | 0.5+ | Icon system | Clean, professional icons |
| Internationalization | react-i18next | 15+ | Translation management | Comprehensive i18n solution |
| i18n Core | i18next | 25+ | Internationalization | Industry standard i18n library |
| Language Detection | i18next-browser-languagedetector | 8+ | Auto language detection | Browser-based language detection |
| Form Handling | React Hook Form | 7+ | Form management | Performance and validation |
| Charts | Recharts | 3+ | Data visualization | React charting library |
| State Management | Zustand | 5+ | Lightweight state | Simple state management |
| Testing | Vitest + RTL | Latest | Testing framework | Fast testing aligned with Vite |

## Project Structure

```
tiris-portal/
├── public/
│   ├── index.html
│   └── tiris-light.png     # Favicon and logo
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # UI component wrappers
│   │   │   └── LanguageSelector.tsx  # Dropdown language switcher
│   │   ├── landing/        # Landing page specific components
│   │   │   ├── HeroSection.tsx       # Hero with TIRIS branding
│   │   │   └── HighlightsSection.tsx # Combined About + Features
│   │   └── layout/         # Layout components
│   │       ├── Header.tsx  # Navigation with language selector
│   │       └── Footer.tsx  # Footer component
│   ├── pages/              # Page components
│   │   └── landing/        # Landing page layout
│   │       └── LandingPage.tsx # Main landing page structure
│   ├── i18n/               # Internationalization
│   │   ├── index.ts        # i18next configuration
│   │   └── locales/        # Translation files
│   │       ├── en.json     # English translations
│   │       └── zh.json     # Chinese translations
│   ├── utils/              # Utility functions
│   │   └── cn.ts           # Tailwind class merging utility
│   ├── main.tsx            # Application entry point with i18n
│   └── App.tsx             # Root component
├── docs/                   # Documentation
│   ├── front-end-spec.md   # UI/UX specifications
│   ├── ui-architecture.md  # Technical architecture
│   └── stories/            # User stories and epics
├── index.html              # HTML template with favicon
├── tailwind.config.js      # Tailwind configuration
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Internationalization (i18n)

### i18n Architecture

The TIRIS Portal implements comprehensive internationalization using react-i18next for seamless English/Chinese language support.

**Supported Languages:**
- **English (en)** - Primary language
- **Chinese (zh)** - Secondary language with full UI/content translation

### i18n Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      zh: { translation: zhTranslations },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });
```

### Translation File Structure

```json
// Example structure for locales/en.json and locales/zh.json
{
  "nav": {
    "home": "HOME",
    "highlights": "HIGHLIGHTS"
  },
  "hero": {
    "title": "TIRIS",
    "subtitle": "Profitable Crypto Trading Bot"
  },
  "about": {
    "title": "WHAT TIRIS DOES",
    "description": "Company description..."
  },
  "features": {
    "profitable": {
      "title": "Profitable",
      "description": "Feature description..."
    }
  },
  "language": {
    "select": "Language",
    "english": "English",
    "chinese": "中文"
  }
}
```

### Component Usage Pattern

```typescript
import { useTranslation } from 'react-i18next';

export const Component: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('hero.subtitle')}</p>
    </div>
  );
};
```

### Language Selector Implementation

The LanguageSelector component provides flag-based language switching with persistent storage:

- **Visual**: Flag indicators (🇺🇸/🇨🇳) with dropdown
- **Functionality**: Smooth language switching with localStorage persistence
- **UX**: Immediate UI update without page reload
- **Integration**: Embedded in main navigation header

## Component Standards

### Component Template

```typescript
import React from 'react';
import { cn } from '@/utils/cn';

interface ComponentNameProps {
  className?: string;
  children?: React.ReactNode;
  // Add specific props here
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('base-styles', className)} {...props}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### Naming Conventions

- **Components**: PascalCase (`HeroSection`, `TradingChart`)
- **Files**: kebab-case (`hero-section.tsx`, `trading-chart.tsx`)
- **Directories**: kebab-case (`landing/`, `ui/`)
- **Types**: PascalCase with suffix (`UserProps`, `TradingData`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Functions**: camelCase (`calculateROI`, `formatCurrency`)
- **CSS Classes**: Tailwind utilities + custom classes prefixed with `tiris-`

## State Management

### Store Structure

```
src/stores/
├── index.ts              # Export all stores
├── auth-store.ts         # Future: Authentication state
├── trading-store.ts      # Future: Trading data state
├── ui-store.ts          # UI state (modals, themes, etc.)
└── types.ts             # Store type definitions
```

### State Management Template

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
    }),
    { name: 'ui-store' }
  )
);
```

## API Integration

### Service Template

```typescript
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend.tiris.ai';

// API Client Configuration
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle auth errors
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Service example
export interface TradingStrategy {
  id: string;
  name: string;
  performance: number;
  risk_level: string;
}

export const tradingService = {
  async getStrategies(): Promise<TradingStrategy[]> {
    const response: AxiosResponse<{ data: TradingStrategy[] }> = 
      await apiClient.get('/trading-strategies');
    return response.data.data;
  },
};
```

### API Client Configuration

```typescript
// Error handling utility
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error?.message || 'An error occurred';
    throw new Error(message);
  } else if (error.request) {
    // Network error
    throw new Error('Network error - please check your connection');
  } else {
    // Other error
    throw new Error('An unexpected error occurred');
  }
};

// Custom hook for API calls
export const useApiCall = <T>(
  apiCall: () => Promise<T>
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute };
};
```

## Routing

### Route Configuration

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LandingPage } from '@/pages/landing/landing-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { LoginPage } from '@/pages/auth/login-page';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { RootLayout } from '@/components/layout/root-layout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
```

## Styling Guidelines

### Styling Approach

**Hybrid Approach: Tailwind CSS + Headless UI Components**

- **Primary**: Tailwind utility classes for rapid development
- **Components**: Headless UI (Radix) for accessible, unstyled components  
- **Custom**: Custom CSS only for complex financial visualizations
- **Icons**: Lucide React for consistent icon system

**Benefits:**
- Rapid landing page development with Tailwind utilities
- Built-in accessibility from Headless UI components
- Professional, consistent design language
- Excellent mobile-first responsive design

### Global Theme Variables

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand Colors */
    --tiris-primary: 59 130 246;      /* Blue-500 for primary actions */
    --tiris-secondary: 99 102 241;    /* Indigo-500 for secondary */
    --tiris-success: 34 197 94;       /* Green-500 for profits */
    --tiris-danger: 239 68 68;        /* Red-500 for losses */
    --tiris-warning: 245 158 11;      /* Amber-500 for warnings */
    
    /* Neutral Colors */
    --tiris-background: 255 255 255;  /* White background */
    --tiris-surface: 249 250 251;     /* Gray-50 for cards */
    --tiris-text: 17 24 39;           /* Gray-900 for text */
    --tiris-text-muted: 107 114 128;  /* Gray-500 for muted text */
    --tiris-border: 229 231 235;      /* Gray-200 for borders */
    
    /* Financial Data Colors */
    --profit-color: var(--tiris-success);
    --loss-color: var(--tiris-danger);
    --neutral-color: var(--tiris-text-muted);
  }

  .dark {
    --tiris-background: 17 24 39;     /* Gray-900 background */
    --tiris-surface: 31 41 55;        /* Gray-800 for cards */
    --tiris-text: 249 250 251;        /* Gray-50 for text */
    --tiris-text-muted: 156 163 175;  /* Gray-400 for muted */
    --tiris-border: 75 85 99;         /* Gray-600 for borders */
  }
}

@layer components {
  .tiris-card {
    @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm;
  }
  
  .tiris-button-primary {
    @apply bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors;
  }
  
  .profit-text {
    @apply text-green-500;
  }
  
  .loss-text {
    @apply text-red-500;
  }
}
```

## Testing Requirements

### Component Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { HeroSection } from '../hero-section';

describe('HeroSection', () => {
  it('renders main heading correctly', () => {
    render(<HeroSection />);
    
    const heading = screen.getByRole('heading', { 
      name: /ML-powered quantitative trading/i 
    });
    expect(heading).toBeInTheDocument();
  });

  it('displays call-to-action button', () => {
    render(<HeroSection />);
    
    const ctaButton = screen.getByRole('button', { 
      name: /start paper trading/i 
    });
    expect(ctaButton).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockOnClick = vi.fn();
    render(<HeroSection onCtaClick={mockOnClick} />);
    
    const ctaButton = screen.getByRole('button', {
      name: /start paper trading/i
    });
    fireEvent.click(ctaButton);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Best Practices

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and data flow
3. **E2E Tests**: Test critical user flows using Playwright
4. **Coverage Goals**: Aim for 80% code coverage on business logic
5. **Test Structure**: Arrange-Act-Assert pattern
6. **Mock External Dependencies**: API calls, routing, state management
7. **Accessibility Testing**: Include accessibility assertions in component tests
8. **Financial Logic**: Comprehensive tests for calculation accuracy

## Environment Configuration

```typescript
// .env.local (development)
VITE_API_BASE_URL=https://backend.dev.tiris.ai
VITE_APP_ENV=development
VITE_GOOGLE_OAUTH_CLIENT_ID=your_dev_client_id

// .env.production
VITE_API_BASE_URL=https://backend.tiris.ai
VITE_APP_ENV=production  
VITE_GOOGLE_OAUTH_CLIENT_ID=your_prod_client_id

// Environment type definitions
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## Frontend Developer Standards

### Critical Coding Rules

1. **Type Safety**: All components must use TypeScript interfaces
2. **Error Boundaries**: Wrap route components with error boundaries
3. **Loading States**: All async operations must show loading indicators
4. **Error Handling**: All API calls must handle errors gracefully
5. **Accessibility**: All interactive elements must be keyboard accessible
6. **Performance**: Use React.memo for expensive components
7. **Security**: Sanitize all user inputs, never use dangerouslySetInnerHTML
8. **Financial Accuracy**: Use decimal.js for financial calculations
9. **Responsive Design**: All components must work on mobile devices
10. **Testing**: All business logic must have unit tests

### Quick Reference

**Common Commands:**
```bash
# Development server
npm run dev

# Build for production  
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type checking
npm run type-check
```

**Key Import Patterns:**
```typescript
// Component imports
import { ComponentName } from '@/components/ui/component-name';
import { useSomeHook } from '@/hooks/use-some-hook';

// Store imports  
import { useUIStore } from '@/stores/ui-store';

// Service imports
import { tradingService } from '@/services/trading-service';

// Type imports
import type { TradingData } from '@/types/trading';

// Utility imports
import { cn, formatCurrency } from '@/utils';
```

**File Naming Conventions:**
- Components: `hero-section.tsx`
- Hooks: `use-trading-data.ts`
- Services: `trading-service.ts`
- Types: `trading-types.ts`
- Utils: `format-utils.ts`

**Project-Specific Patterns:**
- Use `cn()` utility for conditional className merging
- Prefix custom CSS classes with `tiris-`
- Use Zustand stores for global state
- Use React Query for server state management
- Follow React Hook Form patterns for form handling
- Use Headless UI for accessible components

## Future Considerations

### AI-Adaptive Interface Integration
The architecture supports future AI-powered personalization:
- Component props designed for dynamic styling
- Flexible state management for AI-generated layouts  
- API integration ready for AI personalization endpoints
- Type-safe interfaces for AI-generated content

### Mobile App Extension
Architecture supports future React Native development:
- Shared business logic via custom hooks
- API services portable to React Native
- TypeScript types reusable across platforms
- Component patterns adaptable to native UI

This architecture provides a solid foundation for the Tiris Portal MVP while supporting future evolution into a comprehensive ML-powered trading platform.