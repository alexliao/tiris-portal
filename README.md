# TIRIS Portal

A modern React application for the TIRIS cryptocurrency trading platform. Built with TypeScript, Vite, and Tailwind CSS, featuring backend-integrated authentication, multilingual support, and professional design.

## Overview

This is a React application that serves as the portal for TIRIS users. It features a marketing landing page with integrated backend authentication, supporting Google and WeChat sign-in through the TIRIS backend API. The application presents the platform's value proposition through a clean, minimalist design with multilingual support for English and Chinese users.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety and development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **react-i18next** - Internationalization
- **Lucide React** - Icon library
- **Backend Integration** - JWT authentication with TIRIS backend API

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Access to TIRIS backend API (for authentication features)

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

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local to set VITE_API_BASE_URL
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5174`

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run Playwright tests
```

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── SignInPage.tsx        # Dedicated sign-in/sign-up page
│   │   ├── SignInButton.tsx      # Sign-in button component
│   │   ├── UserProfile.tsx       # User profile dropdown
│   │   └── AuthStatus.tsx        # Authentication status indicator
│   ├── landing/
│   │   ├── HeroSection.tsx       # Main hero section
│   │   └── HighlightsSection.tsx # About + features combined
│   ├── layout/
│   │   ├── Header.tsx            # Navigation with auth integration
│   │   └── Footer.tsx
│   └── ui/
│       └── LanguageSelector.tsx  # Language switching component
├── contexts/
│   └── AuthContext.tsx           # Authentication context provider
├── hooks/
│   └── useAuth.ts                # Authentication hook
├── i18n/
│   ├── index.ts                  # i18next configuration
│   └── locales/
│       ├── en.json               # English translations (with auth)
│       └── zh.json               # Chinese translations (with auth)
├── pages/
│   ├── auth/
│   │   └── OAuthCallback.tsx     # OAuth callback handler
│   ├── landing/
│   │   └── LandingPage.tsx       # Main page layout
│   └── PerformancePage.tsx       # Performance analytics page
├── services/
│   └── auth.ts                   # Backend authentication service
├── utils/
│   ├── api.ts                    # API utilities with JWT support
│   └── cn.ts                     # Tailwind utility
├── App.tsx                       # App root with routing
└── main.tsx                      # Entry point
```

## Key Components

### Authentication System
- **SignInPage**: Dedicated authentication page with Google and (future) WeChat options
- **AuthContext**: Backend-integrated authentication state management
- **SignInButton**: Secure sign-in trigger with loading states
- **UserProfile**: User dropdown with provider info and logout
- **AuthStatus**: Simple authentication status indicator

### Landing Page
- **HeroSection**: Main TIRIS branding and value proposition with responsive typography
- **HighlightsSection**: Company description and feature grid with professional design
- **Header/Navigation**: Fixed navigation with authentication integration and language selector
- **LanguageSelector**: Persistent language switching with flag indicators

### Backend Integration
- **AuthService**: Complete OAuth flow integration with TIRIS backend API
- **API Utils**: JWT token management and authenticated requests
- **Error Handling**: Clear error messages when backend is unavailable

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

## Authentication

The application integrates with the TIRIS backend for secure authentication. See [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for complete implementation details.

**Features:**
- Google and WeChat OAuth through TIRIS backend
- JWT token management with automatic refresh
- Popup-based OAuth flow for security
- Clear error handling when backend is unavailable
- Multi-language authentication UI

**Requirements:**
- TIRIS backend API must be running and configured
- Backend OAuth endpoints properly set up for Google/WeChat
- Environment variable `VITE_API_BASE_URL` configured

## Docker Deployment

### Prerequisites
- Docker installed locally
- GitHub account with container registry access
- GitHub Personal Access Token (PAT) with `write:packages` and `read:packages` scopes

### Manual Deployment Flow

#### Step 1: Create GitHub Personal Access Token (One-time Setup)
1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Name: `GHCR_TOKEN`
4. Select scopes: `write:packages`, `read:packages`
5. Copy the token and save it securely

#### Step 2: Login to GitHub Container Registry (Local Machine)
```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u alexliao --password-stdin
```
Replace `YOUR_GITHUB_PAT` with your actual token.

#### Step 3: Build the Docker Image

**For Apple Silicon Mac (building for AMD64 production server):**
```bash
docker build --platform linux/amd64 -t ghcr.io/alexliao/tiris-portal:latest .
```

**For AMD64/Intel machines:**
```bash
docker build -t ghcr.io/alexliao/tiris-portal:latest .
```

Optional: Add version tags for releases:
```bash
docker build --platform linux/amd64 -t ghcr.io/alexliao/tiris-portal:v1.0.0 .
docker build --platform linux/amd64 -t ghcr.io/alexliao/tiris-portal:latest .
```

**Note:** If your production server uses a different architecture, replace `linux/amd64` with the appropriate platform (`linux/arm64` for ARM64, etc.)

#### Step 4: Push to GitHub Container Registry
```bash
docker push ghcr.io/alexliao/tiris-portal:latest
```
Or with version:
```bash
docker push ghcr.io/alexliao/tiris-portal:v1.0.0
docker push ghcr.io/alexliao/tiris-portal:latest
```

#### Step 5: On Production Server - Pull and Run
```bash
# Login to GHCR
echo YOUR_GITHUB_PAT | docker login ghcr.io -u alexliao --password-stdin

# Pull latest image
docker pull ghcr.io/alexliao/tiris-portal:latest

# Stop old container (if running)
docker stop tiris-portal

# Run new container
docker run -d --name tiris-portal -p 80:3000 ghcr.io/alexliao/tiris-portal:latest
```

### Using Docker Compose (Production)
Create `docker-compose.yml` on your production server:
```yaml
version: '3.8'
services:
  portal:
    image: ghcr.io/alexliao/tiris-portal:latest
    container_name: tiris-portal
    ports:
      - "80:3000"
    restart: always
    environment:
      - VITE_API_BASE_URL=https://your-api-domain.com
```

Then run:
```bash
docker-compose pull
docker-compose up -d
```

### Quick Reference Cheatsheet

**Build for AMD64 production (from Apple Silicon Mac):**
```bash
docker build --platform linux/amd64 -t ghcr.io/alexliao/tiris-portal:latest .
docker push ghcr.io/alexliao/tiris-portal:latest
docker pull ghcr.io/alexliao/tiris-portal:latest
docker run -d -p 80:3000 ghcr.io/alexliao/tiris-portal:latest
```

**Build for your current architecture:**
```bash
docker build -t ghcr.io/alexliao/tiris-portal:latest .
docker push ghcr.io/alexliao/tiris-portal:latest
docker pull ghcr.io/alexliao/tiris-portal:latest
docker run -d -p 80:3000 ghcr.io/alexliao/tiris-portal:latest
```

## Documentation

- **[Authentication Setup](AUTHENTICATION_SETUP.md)**: Complete authentication implementation guide
- **[Backend OAuth Integration](docs/backend/google-oauth-integration.md)**: Backend OAuth flow specification
- **[Technical Architecture](docs/ui-architecture.md)**: Detailed technical specifications
- **[Design Specification](docs/front-end-spec.md)**: UI/UX requirements and design system
- **[User Stories](docs/stories/)**: Product requirements and user flows
