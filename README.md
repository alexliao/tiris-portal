# TIRIS Portal

A modern React landing page for the TIRIS cryptocurrency trading platform. Built with TypeScript, Vite, and Tailwind CSS, featuring multilingual support and professional design.

## Overview

This is a single-page application that serves as the marketing landing page for TIRIS. The page presents the platform's value proposition through a clean, minimalist design with multilingual support for English and Chinese users.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety and development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **react-i18next** - Internationalization
- **Lucide React** - Icon library

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tiris-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Project Structure

```
src/
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx       # Main hero section
│   │   └── HighlightsSection.tsx # About + features combined
│   ├── layout/
│   │   ├── Header.tsx            # Navigation with language selector
│   │   └── Footer.tsx
│   └── ui/
│       └── LanguageSelector.tsx  # Language switching component
├── i18n/
│   ├── index.ts                  # i18next configuration
│   └── locales/
│       ├── en.json               # English translations
│       └── zh.json               # Chinese translations
├── pages/
│   └── landing/
│       └── LandingPage.tsx       # Main page layout
├── utils/
│   └── cn.ts                     # Tailwind utility
├── App.tsx                       # App root
└── main.tsx                      # Entry point
```

## Key Components

### HeroSection
- Displays main TIRIS branding and value proposition
- Responsive typography using Bebas Neue and Nunito fonts
- Background image with overlay text

### HighlightsSection  
- Combined section with company description and feature grid
- Four feature cards: Profitable, Secure, Automatic, Simple
- Dark color scheme for professional appearance

### Header/Navigation
- Fixed navigation with smooth scrolling
- Integrated language selector with flag indicators
- TIRIS logo with branding

### LanguageSelector
- Dropdown component for English/Chinese switching
- Persistent language selection via localStorage
- Flag-based visual indicators

## Internationalization

The app supports English and Chinese through react-i18next:

- **Language files**: `src/i18n/locales/`
- **Configuration**: `src/i18n/index.ts`
- **Usage**: Import `useTranslation()` hook in components
- **Detection**: Auto-detects browser language, falls back to English

### Adding new translations

1. Add keys to both `en.json` and `zh.json`
2. Use the `t()` function in components:
   ```typescript
   const { t } = useTranslation();
   return <h1>{t('hero.title')}</h1>;
   ```

## Design System

### Typography
- **Bebas Neue**: Titles, headings, navigation
- **Nunito**: Body text, descriptions, UI elements

### Colors
- **Primary text**: `#080404`
- **Feature backgrounds**: Dark professional palette
  - Profitable: `#8B6914` (dark bronze)
  - Secure: `#7A1F3D` (deep burgundy)  
  - Automatic: `#2E3A59` (dark steel blue)
  - Simple: `#1B4D3E` (dark forest green)

### Layout
- Single-page design with smooth scroll navigation
- Responsive breakpoints for mobile, tablet, desktop
- Fixed header with transparent background

## Development Guidelines

### Code Style
- Use TypeScript for all new components
- Follow the existing component structure and naming conventions
- Use Tailwind classes for styling, avoid custom CSS when possible
- Implement proper TypeScript interfaces for props

### Component Pattern
```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ComponentProps {
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  
  return (
    <div className={`base-classes ${className}`}>
      {t('translation.key')}
    </div>
  );
};
```

### Adding New Features
1. Create component in appropriate directory
2. Add TypeScript interfaces for props
3. Include translations in both language files
4. Test responsive behavior
5. Run linting before committing

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory, ready for deployment to any static hosting service.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding guidelines
4. Add translations for any new text content
5. Test on multiple screen sizes
6. Run `npm run lint` to check code quality
7. Submit a pull request

## Documentation

- **[Technical Architecture](docs/ui-architecture.md)**: Detailed technical specifications
- **[Design Specification](docs/front-end-spec.md)**: UI/UX requirements and design system
- **[User Stories](docs/stories/)**: Product requirements and user flows
