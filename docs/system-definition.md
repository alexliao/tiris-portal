# Tiris Portal System Definition

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Tiris Portal Specification](#2-tiris-portal-specification)
3. [Technical Architecture](#3-technical-architecture)
4. [Infrastructure & Resources](#4-infrastructure--resources)
5. [Development Strategy](#5-development-strategy)
6. [Success Metrics](#6-success-metrics)

## 1. System Overview

### 1.1 Background
Tiris is a democratized quantitative trading platform that enables users to create and deploy automated cryptocurrency trading bots without requiring expertise in programming or finance. The system empowers everyday investors to access institutional-grade trading strategies through an intuitive web interface.

### 1.2 Core Value Proposition
- **Automated Intelligence**: ML-powered trading strategies execute automatically on behalf of users
- **Non-Custodial Security**: Unlike traditional hedge funds, Tiris never controls user assets—all funds remain in users' own exchange accounts
- **Risk-Free Learning**: Comprehensive paper trading and backtesting environments before live trading
- **Universal Accessibility**: Complex quantitative trading made simple through user-friendly interfaces

### 1.3 Portal Context
The Tiris Portal is the frontend web application that serves as the primary user interface for the broader Tiris quantitative trading ecosystem. It integrates with backend services to provide users with a comprehensive trading management experience without requiring technical expertise.

### 1.4 Supported Markets
Currently supports cryptocurrency trading on major exchanges:
- Binance
- Kraken  
- Gate.io
- Coinbase
- Other mainstream cryptocurrency exchanges

## 2. Tiris Portal Specification

### 2.1 Purpose
The Tiris Portal serves as the primary user interface for the Tiris trading ecosystem, providing a comprehensive platform for users to:
- Discover and understand automated trading capabilities
- Manage exchange integrations and trading configurations
- Monitor real-time trading performance and analytics
- Access paper trading environments for risk-free strategy testing

### 2.2 Core Features

#### **Landing Experience**
- Engaging landing page with clear ML trading value proposition
- Dedicated performance demonstration page (`/performance`)
- Interactive real-time trading performance charts (2024-present)
- Key metrics display: ROI (+140%), Win Rate (68.5%), Sharpe Ratio (2.4)
- Educational content explaining quantitative trading concepts
- Clear value proposition and getting-started guidance

#### **Authentication & User Management**
- Single Sign-On (SSO) integration:
  - Google OAuth
  - WeChat authentication
- Secure user profile management
- Privacy-compliant data handling

#### **Exchange Integration**
- Multi-exchange account binding support
- Secure API credential management
- Exchange connection status monitoring
- Balance synchronization across platforms

#### **Trading Management**
- Create and configure trading sessions
- Switch between manual and automated operation modes
- Real-time performance monitoring and analytics
- Comprehensive trading history and audit logs

#### **Paper Trading Environment**
- Paper trading with virtual funds
- Historical backtesting capabilities
- Strategy performance validation
- Risk assessment tools

### 2.3 User Workflow
1. **Discovery**: User explores landing page and clear value proposition
2. **Performance Review**: Access dedicated `/performance` page to view ML bot performance data
3. **Trust Building**: Review interactive charts showing 68.5% win rate and +140% ROI
4. **Authentication**: Sign in via SSO provider (planned)
5. **Learning**: Access paper trading to understand system capabilities (planned)
6. **Integration**: Bind cryptocurrency exchange accounts (planned)
7. **Configuration**: Create and customize trading sessions (planned)
8. **Monitoring**: Track performance and manage active trades (planned)
9. **Optimization**: Analyze results and refine strategies (planned)

## 3. Technical Architecture

### 3.1 Application Requirements
- **Responsive Design**: Mobile-first, cross-device compatibility
- **Performance**: Fast loading times and real-time data updates
- **Security**: HTTPS, secure authentication, encrypted data transmission
- **Usability**: Intuitive interface design with minimal learning curve
- **Scalability**: Architecture designed for future platform expansion

### 3.2 Platform Strategy
- **Phase 1**: Responsive web application
- **Phase 2**: Cross-platform expansion to:
  - Android mobile application
  - iOS mobile application
  - Desktop applications (macOS, Windows, Linux)

### 3.3 Backend Integration
- **API Communication**: RESTful API integration with tiris-backend service
- **Authentication**: JWT token-based session management
- **Real-time Updates**: Live data synchronization for trading metrics
- **Error Handling**: User-friendly error messages and fallback states

### 3.4 Frontend Technology Stack
- **Framework**: React with TypeScript for type safety and component reusability
- **Routing**: React Router DOM for multi-page client-side navigation
- **Charts**: Recharts library for professional financial data visualization
- **Styling**: Tailwind CSS with responsive design framework
- **Internationalization**: i18next for multilingual support (English/Chinese)
- **State Management**: Client-side state management for user data
- **Build Tools**: Vite for fast development and optimized production builds
- **Testing**: Playwright for comprehensive end-to-end testing

## 4. Infrastructure & Resources

### 4.1 Domain Configuration
- **Production Environment**: 
  - Primary Domain: `tiris.ai`
  - Portal Service: Port 8081
- **Development Environment**: 
  - Development Domain: `dev.tiris.ai`
  - Portal Service: Port 8081

### 4.2 API Integration Endpoints
- **Production Backend**: `https://backend.tiris.ai`
- **Development Backend**: `https://backend.dev.tiris.ai`

### 4.3 Frontend Security
- **HTTPS**: Secure communication for all data transmission
- **Authentication**: Secure OAuth integration and session management
- **Data Validation**: Client-side input validation and sanitization
- **Privacy**: Compliant handling of user data and preferences

## 5. Development Strategy

### 5.1 Frontend Development Approach
- **Agile Development**: Iterative feature delivery with user feedback integration
- **Component-Based Architecture**: Reusable UI components for consistency
- **Responsive Design**: Mobile-first development for all screen sizes
- **User Experience Focus**: Intuitive design with extensive usability testing

### 5.2 Current Implementation Status
The following features are implemented and operational:

1. **Landing Page** ✅ COMPLETED
   - Compelling introduction to Tiris ML capabilities
   - Clear value proposition messaging
   - Professional branding and visual design
   - Multilingual support (English/Chinese)

2. **Performance Demonstration Page** ✅ COMPLETED
   - Dedicated `/performance` route with comprehensive trading chart
   - Interactive performance metrics (ROI, Win Rate, Sharpe Ratio, etc.)
   - Real-time visualization of ML bot performance (2024-present)
   - Trading event annotations with buy/sell signals
   - Mobile-responsive chart design

3. **Multi-Page Navigation** ✅ COMPLETED
   - React Router implementation for client-side routing
   - Smart context-aware navigation
   - Smooth scroll functionality for landing page sections

4. **Testing Infrastructure** ✅ COMPLETED
   - Playwright end-to-end testing framework
   - Multi-browser testing (Chrome, Firefox, Safari)
   - Mobile and responsive design testing
   - Automated test reporting

### 5.2.1 Planned Next Phase
1. **Google OAuth Integration** (Recommended Next Epic)
   - Secure user authentication
   - Streamlined registration process
   - Profile management capabilities

2. **User Dashboard**
   - Overview of user trading sessions
   - Exchange binding status and management
   - Quick access to key functionality

### 5.3 Development Roadmap
- **Sprint 1**: Landing page and authentication infrastructure
- **Sprint 2**: User dashboard and basic exchange integration
- **Sprint 3**: Paper trading environment
- **Sprint 4**: Live trading management interface
- **Sprint 5**: Performance analytics and monitoring tools

### 5.4 Frontend Quality Standards
- **Code Quality**: ESLint, Prettier, and code review processes
- **Testing**: Unit tests for components, integration tests for user flows
- **Performance**: Optimized bundle size, lazy loading, and caching strategies
- **Accessibility**: WCAG 2.1 compliance for inclusive user experience

## 6. Success Metrics
- **User Experience**: Page load times under 3 seconds, mobile responsiveness score
- **User Engagement**: Registration conversion rates, session duration, feature adoption
- **Usability**: User task completion rates, error recovery, accessibility compliance
- **Technical Performance**: Frontend bundle size, API integration success rates