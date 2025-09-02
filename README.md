# TIRIS Portal

Landing page for TIRIS (Trading Intelligence and Research Information System) - an AI-powered cryptocurrency trading platform.

## About TIRIS

TIRIS is committed to utilizing artificial intelligence technology to implement quantitative trading strategies that can be consistently profitable. The platform makes the benefits of quantitative trading available to every trader, even if they are completely technically illiterate.

## Features

- **Multilingual Support**: Full internationalization with English and Chinese translations
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean, professional design with smooth animations
- **Component-based Architecture**: Modular React components for maintainability

### Key Sections

- **Hero Section**: Eye-catching introduction with TIRIS branding
- **About Section**: Overview of TIRIS mission and technology
- **Features Section**: Four key value propositions (Profitable, Secure, Automatic, Simple)
- **Navigation**: Fixed navigation with language selector

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety and development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first styling
- **react-i18next** - Internationalization framework
- **Lucide React** - Modern icon library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The development server will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx
│   │   ├── AboutSection.tsx
│   │   └── FeaturesSection.tsx
│   ├── layout/
│   │   └── Header.tsx
│   └── ui/
│       └── LanguageSelector.tsx
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       └── zh.json
├── pages/
│   └── landing/
│       └── LandingPage.tsx
├── utils/
│   └── cn.ts
├── App.tsx
└── main.tsx
```

## Internationalization

The portal supports English and Chinese languages using react-i18next:

- Language detection from browser/localStorage
- Language switcher in navigation
- All content fully localized
- RTL support ready

## Integration with TIRIS System

This portal serves as the public-facing landing page for the broader TIRIS ecosystem, which includes:

- **TIRIS Library**: Python ML prediction models
- **TIRIS API**: FastAPI service for predictions
- **FMZ Trading Scripts**: Automated trading strategies

## Contributing

1. Follow the existing code style and conventions
2. Use TypeScript for type safety
3. Add translations for new text content
4. Test responsive design on multiple screen sizes
5. Run linting before committing

## License

Part of the TIRIS Trading Intelligence System.
