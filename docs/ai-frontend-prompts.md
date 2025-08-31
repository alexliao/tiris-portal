# AI Frontend Generation Prompts for Tiris Portal

This document contains comprehensive, optimized prompts for AI-driven frontend development tools (v0.dev, Lovable.ai, Claude Artifacts, etc.) to generate visual mockups and React components for Tiris Portal based on our UX specification and technical architecture.

## Overview

These prompts follow a structured four-part framework:
1. **High-Level Goal** - Clear objective statement
2. **Detailed Step-by-Step Instructions** - Granular, numbered implementation steps
3. **Code Examples, Data Structures & Constraints** - Technical specifications and boundaries
4. **Define Strict Scope** - Explicit boundaries to prevent unintended changes

## Prompt 1: Landing Page Hero Section

```
## High-Level Goal
Create a professional, mobile-first landing page hero section for Tiris Portal - an ML-powered quantitative cryptocurrency trading platform targeting non-technical investors. The hero must immediately communicate ML trading value proposition while building credibility and trust.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript component named `HeroSection.tsx` using modern React patterns
2. Build mobile-first responsive layout that adapts to tablet (768px+) and desktop (1024px+)
3. Add compelling headline: "ML-Powered Quantitative Trading Made Simple" with subheading about education-first approach
4. Include interactive demo visualization showing profitable ML trading decisions (can be mock data)
5. Add prominent "Start Learning" CTA button (not "Sign Up") that emphasizes education first
6. Include trust indicators: backtesting performance metrics, verification badges, and social proof
7. Add smooth scroll-reveal animations for credibility elements as user scrolls
8. Implement proper TypeScript interfaces for all props and data structures
9. Use Tailwind CSS utilities following the color palette and spacing defined below
10. Ensure WCAG 2.1 AA accessibility compliance with proper alt text and keyboard navigation

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 3+, Lucide React icons
**Color Palette**: 
- Primary: #3B82F6 (blue-500)
- Success: #22C55E (green-500) for profits
- Error: #EF4444 (red-500) for losses
- Neutral: #6B7280 (gray-500)

**Component Structure**:
```typescript
interface HeroSectionProps {
  onCtaClick?: () => void;
  className?: string;
}

interface TradingMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  period: string;
}
```

**Mock Trading Performance Data**:
- ROI: +34.7% (12 months)
- Sharpe Ratio: 2.1 
- Win Rate: 73%
- Total Trades: 1,247

**DO NOT**: Include any actual financial advice, real API calls, or investment promises. Use educational language only.
**DO**: Focus on ML algorithm transparency, backtesting verification, and education-first messaging.

## Define Strict Scope
- Create ONLY the HeroSection component and any necessary sub-components (like MetricCard)
- Component should be self-contained with no external dependencies beyond specified tech stack
- Include proper TypeScript interfaces but no API integration
- Do NOT create routing, navigation, or authentication logic
- Use placeholder/mock data for all trading metrics and performance visualizations
```

## Prompt 2: Simulation Trading Interface

```
## High-Level Goal
Create an educational simulation trading interface that builds user confidence in ML trading strategies through risk-free practice. Users must understand ML recommendations before executing virtual trades, with clear "practice money" indicators throughout.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript component named `SimulationInterface.tsx` with comprehensive state management
2. Design mobile-first layout with collapsible sections for different data types
3. Add prominent "Virtual Portfolio" header with current balance and "PRACTICE MONEY" indicators
4. Include ML recommendation panel with confidence level (High/Medium/Low) and expandable explanation
5. Create current market conditions widget with educational context tooltips
6. Add simple "Execute Trade" and "Learn More" action buttons with loading states
7. Implement progress tracker showing simulation milestones (trades completed, concepts learned)
8. Include trade confirmation modal with educational summary of what just happened
9. Add celebratory micro-animations for successful learning moments (subtle, professional)
10. Ensure all ML explanations use progressive disclosure (summary → details → full explanation)

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 3+, Zustand for state management, Recharts for visualization

**Component Interfaces**:
```typescript
interface SimulationState {
  virtualBalance: number;
  currentPosition: 'long' | 'short' | 'none';
  tradesCompleted: number;
  totalReturn: number;
  mlRecommendation: MLRecommendation;
}

interface MLRecommendation {
  action: 'buy' | 'sell' | 'hold';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  detailedExplanation: string;
  riskLevel: number;
}
```

**Educational Requirements**:
- Every ML recommendation includes "Why?" explanation
- Progress tracker celebrates milestones: "Great! You've completed 5 practice trades"
- Clear distinction between simulation and real trading throughout
- Educational tooltips for all financial terms (ROI, Sharpe ratio, etc.)

**DO NOT**: Allow users to skip educational explanations, use real market data, or suggest actual investment actions
**DO**: Focus on building confidence through understanding, use encouraging educational copy, maintain clear "practice" context

## Define Strict Scope
- Create simulation interface component and necessary sub-components (RecommendationPanel, ProgressTracker, etc.)
- Include mock ML recommendation engine with educational responses
- Implement virtual trading logic with practice money only
- Do NOT integrate with real trading APIs or authentication systems
- Use placeholder cryptocurrency data (BTC/ETH prices can be realistic but static)
```

## Prompt 3: ML Performance Dashboard

```
## High-Level Goal
Create a comprehensive performance dashboard that demonstrates ML algorithm credibility through transparent backtesting results and performance metrics. Must make complex financial data accessible to non-technical users while maintaining professional credibility.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript dashboard component named `PerformanceDashboard.tsx` with responsive grid layout
2. Build multi-column layout that adapts from single column (mobile) to 3-column (desktop)
3. Add performance charts showing ROI over multiple time periods (1M, 3M, 6M, 1Y) using Recharts
4. Include key metrics cards: Sharpe ratio, win rate, max drawdown with user-friendly explanations
5. Create backtesting results section showing performance across different market conditions
6. Add recent trading decisions panel with ML explanations and outcomes
7. Implement interactive chart controls (zoom, filter, time period selection)
8. Include educational tooltips for all financial metrics with clear, simple explanations
9. Add loading skeleton states for all data visualizations
10. Ensure all charts include proper accessibility features and alternative text descriptions

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 3+, Recharts 2+, Lucide React icons

**Data Structures**:
```typescript
interface PerformanceData {
  period: string;
  roi: number;
  sharpeRatio: number;
  winRate: number;
  maxDrawdown: number;
  totalTrades: number;
}

interface BacktestResult {
  marketCondition: 'bull' | 'bear' | 'sideways';
  period: string;
  performance: number;
  trades: number;
}

interface RecentDecision {
  timestamp: Date;
  action: 'buy' | 'sell';
  asset: string;
  reasoning: string;
  outcome: 'profit' | 'loss' | 'pending';
  value: number;
}
```

**Chart Configuration**:
- Use consistent color coding: green for profits, red for losses, blue for neutral
- All charts must include loading states and error boundaries
- Performance data should span realistic backtesting periods (2+ years)
- Include confidence intervals and statistical significance indicators

**Educational Requirements**:
- Every metric includes tooltip with simple explanation
- Backtesting section explains what backtesting means and why it matters
- Clear distinction between historical performance and future predictions
- Professional disclaimers about past performance not guaranteeing future results

**DO NOT**: Make investment predictions, guarantee returns, or hide risk information
**DO**: Focus on transparency, education, and building trust through comprehensive data presentation

## Define Strict Scope
- Create dashboard component with modular chart and metric sub-components
- Include comprehensive mock backtesting data spanning multiple market cycles
- Implement interactive chart features with proper state management
- Do NOT integrate with real trading APIs or live data feeds
- Use realistic but static performance data for all visualizations
```

## Usage Instructions

### Getting Started
1. **Choose Your AI Tool**: These prompts work with:
   - [v0.dev](https://v0.dev) - Vercel's React component generator
   - [Lovable.ai](https://lovable.ai) - Full application generator
   - Claude Artifacts - Component generation in Claude
   - Similar AI frontend development tools

2. **Sequential Development**: Start with Prompt 1 (Hero Section) to establish the visual foundation, then proceed to Prompts 2 and 3

3. **Iterative Refinement**: Use each generated component as a starting point, then refine based on your specific needs

### Best Practices
- **Copy-paste each prompt entirely** into your chosen AI tool
- **Provide feedback and iterate** - no AI tool generates perfect code on first try
- **Test components individually** before integrating into larger application
- **Review TypeScript interfaces** and ensure they match your data structures

### Integration Notes
- All components are designed to work with the React + TypeScript + Tailwind CSS + Vite architecture defined in `docs/ui-architecture.md`
- Components follow the design system specified in `docs/front-end-spec.md`
- Mock data structures align with the user flows and requirements from project documentation

## Technical Specifications

### Required Dependencies
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "lucide-react": "^0.2.0",
  "recharts": "^2.0.0",
  "zustand": "^4.0.0"
}
```

### File Organization
Place generated components in the following structure:
```
src/
├── components/
│   ├── landing/
│   │   └── HeroSection.tsx
│   ├── simulation/
│   │   └── SimulationInterface.tsx
│   └── dashboard/
│       └── PerformanceDashboard.tsx
```

## Important Disclaimers

⚠️ **All AI-generated code requires careful human review, testing, and refinement to be considered production-ready.**

### Required Review Areas:
- **TypeScript Type Safety**: Ensure all interfaces are properly implemented
- **Accessibility Compliance**: Verify WCAG 2.1 AA standards are met
- **Responsive Design**: Test behavior across mobile, tablet, and desktop
- **Error Handling**: Add proper error boundaries and loading states  
- **Performance**: Validate with realistic data loads
- **Educational Content**: Review all financial explanations for accuracy
- **Security**: Ensure no sensitive data exposure in mock components

### Next Steps After Generation:
1. Review and test each component individually
2. Integrate components into your React application structure
3. Connect components with your state management system
4. Add proper error handling and loading states
5. Conduct accessibility and usability testing
6. Refine based on user feedback and testing results

The structured prompting approach ensures high-quality output while the detailed constraints prevent common AI generation pitfalls in financial applications.