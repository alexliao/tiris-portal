# Project Brief: Tiris Portal

## Executive Summary

Tiris Portal is a user-facing web application that democratizes quantitative cryptocurrency trading by providing non-technical investors with access to pre-verified, profitable trading strategies through an intuitive, education-first interface. The platform addresses the significant barrier that prevents cryptocurrency-interested individuals from accessing institutional-grade quantitative trading due to lack of programming, finance, or statistical expertise.

## Problem Statement

### Current State and Pain Points
- **High Barrier to Entry**: Quantitative cryptocurrency trading requires specialized knowledge in programming, finance, and statistics that most interested investors lack
- **Trust Issues**: Existing trading bots offer little transparency, making users hesitant to trust automated systems with their investments
- **Risk Without Education**: Most platforms push users directly into live trading without proper education or risk-free learning opportunities
- **Complex Interfaces**: Current solutions are built for technical users, creating intimidating experiences for everyday investors

### Impact of the Problem
- Massive untapped market of cryptocurrency-interested individuals who cannot access sophisticated trading strategies
- Retail investors missing out on potentially profitable automated trading opportunities
- Market dominated by solutions that serve only technically-savvy users
- High user abandonment rates due to complexity and lack of education

### Why Existing Solutions Fall Short
- Most trading platforms assume technical expertise
- Limited transparency in strategy performance and decision-making
- No comprehensive education-first onboarding
- Lack of risk-free simulation environments
- Complex user interfaces designed for professional traders

### Urgency and Importance
The cryptocurrency market continues to grow rapidly, but the tools remain inaccessible to mainstream users. There's a critical window to capture this underserved market before it becomes saturated with technical solutions.

## Proposed Solution

### Core Concept and Approach
Tiris Portal serves as the frontend gateway to a comprehensive quantitative trading ecosystem, featuring:
- **Education-First Journey**: Users start with risk-free simulation trading before any real investment
- **ML-Powered Strategies**: Advanced machine learning algorithms that continuously learn and adapt to market conditions
- **Rigorously Verified Performance**: All strategies undergo extensive backtesting across multiple market cycles and real trading validation
- **Transparent Black-Box**: While users don't see algorithm internals, they have full visibility into buy/sell decisions and performance metrics
- **Professional Visualization**: Complex financial metrics (Sharpe ratio, net value, etc.) presented in user-friendly formats

### Key Differentiators
1. **Machine Learning Excellence**: Advanced ML algorithms that continuously learn and adapt, unlike static rule-based trading bots
2. **Rigorous Validation Process**: Multiple rounds of backtesting across different market conditions plus real trading verification
3. **Non-Custodial Architecture**: Unlike hedge funds, users maintain complete control of their assets in their own exchange accounts
4. **Education-Before-Investment**: Mandatory simulation environment prevents uninformed trading
5. **Proven Performance Track Record**: Only strategies with extensively verified profitability are offered to users
6. **User-Centric Design**: Built specifically for non-technical users with intuitive interfaces

### Why This Solution Will Succeed
- **Superior Technology**: Machine learning algorithms provide adaptive intelligence that outperforms static trading bots
- **Proven Excellence**: Extensive backtesting and real trading validation creates unmatched credibility
- **Trust Through Transparency**: Users can see exactly how ML strategies perform across different market conditions
- **Risk Mitigation**: Education and simulation reduce user losses and increase confidence
- **Market Gap**: No existing solution combines ML excellence, rigorous validation, education, and user-friendly design
- **Scalable Architecture**: Microservice design allows for rapid feature expansion

## Target Users

### Primary User Segment: Crypto-Curious Non-Technical Investors

**Demographic Profile:**
- Age: 25-55 years old
- Income: Middle to upper-middle class with discretionary investment capital
- Education: College-educated but not in technical fields
- Tech Comfort: Comfortable with apps and websites but not with programming

**Current Behaviors:**
- Interested in cryptocurrency investment opportunities
- Currently use simple buy-and-hold strategies or basic trading platforms
- Research investment opportunities online but struggle with technical complexity
- May have tried other trading platforms but abandoned due to confusion or losses

**Specific Needs and Pain Points:**
- Want to access sophisticated trading strategies without learning programming
- Need confidence through education and proven results before investing
- Require simple, intuitive interfaces that don't overwhelm
- Desire transparency in how their investments are being managed

**Goals:**
- Generate passive income through automated cryptocurrency trading
- Learn about quantitative trading in a risk-free environment
- Maintain control and visibility over their investment strategies
- Access institutional-grade trading tools with personal-level usability

## Goals & Success Metrics

### Business Objectives
- **User Acquisition**: 10,000 registered users within 6 months of MVP launch
- **User Activation**: 70% of registered users complete simulation trading within first week
- **Conversion Rate**: 25% of simulation users progress to live trading within 30 days
- **User Retention**: 60% monthly active user retention rate after 3 months

### User Success Metrics
- **Education Completion**: Average user completes 5+ simulation trades before live trading
- **User Confidence**: 90% of users report feeling "confident" or "very confident" about trading after simulation
- **Performance Understanding**: 80% of users can correctly explain key performance metrics (ROI, Sharpe ratio)
- **Platform Satisfaction**: Net Promoter Score (NPS) of 50+ within first 6 months

### Key Performance Indicators (KPIs)
- **Time to First Simulation Trade**: < 10 minutes from registration
- **Simulation Engagement**: Average 15+ simulation trades per user before live trading
- **Live Trading Adoption**: 25% conversion rate from simulation to live trading
- **User Support Tickets**: < 5% of active users require support per month
- **Platform Uptime**: 99.9% availability during business hours

## Current Implementation Status

### Phase 1: Trust & Credibility Foundation ✅ COMPLETED

**Core Features Delivered:**

- **Engaging Landing Page:** ✅ Professional landing page with clear ML trading value proposition and multilingual support (English/Chinese)
- **Performance Demonstration Page:** ✅ Dedicated `/performance` route with comprehensive trading performance visualization
- **Real-Time Performance Charts:** ✅ Interactive charts showing ML bot performance from 2024-01-01 to present with key metrics
- **Key Performance Metrics:** ✅ ROI (+140%), Win Rate (68.5%), Sharpe Ratio (2.4), Max Drawdown (-8.2%), Total Trades (247)
- **Trading Event Annotations:** ✅ Buy/sell signals marked on timeline with explanatory tooltips
- **Multi-Page Navigation:** ✅ React Router implementation with smart context-aware navigation
- **Testing Infrastructure:** ✅ Comprehensive Playwright E2E testing across multiple browsers and devices
- **Professional Design:** ✅ Responsive design with consistent branding and mobile optimization

### Phase 2: User Onboarding & Authentication (PLANNED NEXT)

**Recommended Next Epic:**

- **Google OAuth Integration:** Seamless single sign-on authentication for quick and secure user onboarding
- **User Dashboard Foundation:** Basic dashboard structure for authenticated users
- **User Profile Management:** Secure user data handling and preferences
- **Onboarding Flow Design:** Post-authentication welcome experience leading to simulation

### Phase 3: Simulation & Education (FUTURE)

**Core Features Planned:**

- **Simulation Trading Environment:** Full-featured paper trading with virtual funds using real market data and actual trading strategies
- **Educational Content Integration:** Embedded explanations and guidance throughout the simulation experience
- **Progress Tracking:** Clear milestones and progress indicators for user advancement

### Out of Scope for MVP
- Real exchange integration and live trading
- WeChat authentication (Google OAuth only for MVP)
- Mobile applications (web responsive only)
- Advanced portfolio management features
- Social features or community elements
- Multiple trading strategies (focus on one proven strategy)
- Advanced charting and technical analysis tools

### Phase 1 Success Criteria ✅ ACHIEVED
The initial phase successfully establishes trust and credibility through compelling performance demonstration. Success criteria met:
- ✅ Professional landing page with clear value proposition 
- ✅ Performance proof through interactive charts and real trading data
- ✅ Multi-page navigation foundation for future expansion
- ✅ Comprehensive testing infrastructure ensuring quality
- ✅ Mobile-responsive design for broad accessibility

### Phase 2 Success Criteria (UPCOMING)
Authentication and onboarding phase will be successful when:
- 70%+ of landing page visitors who click "Performance" proceed to sign up
- 90%+ of authenticated users complete initial profile setup
- Users report understanding the performance metrics before requesting simulation access

## Post-MVP Vision

### Phase 2 Features
- **Live Trading Integration:** Connect to major cryptocurrency exchanges (Binance, Kraken, Coinbase) for real trading
- **Multi-Strategy Platform:** Expand beyond single strategy to offer multiple proven trading algorithms
- **WeChat Authentication:** Add WeChat OAuth for broader market access
- **Enhanced Analytics:** Advanced performance reporting and portfolio tracking
- **Mobile Applications:** Native iOS and Android apps for on-the-go monitoring

### Long-term Vision
Within 1-2 years, Tiris Portal becomes the leading platform for democratized quantitative trading, serving as the gateway for everyday investors to access institutional-grade trading strategies. The platform evolves into a comprehensive financial education and investment platform, potentially expanding beyond cryptocurrency to traditional markets.

### Expansion Opportunities
- **Traditional Markets:** Extend trading strategies to stocks, forex, and commodities
- **Educational Marketplace:** Platform for trading strategy creators to offer their algorithms
- **Social Trading:** Community features for users to share results and insights
- **Financial Advisory Services:** Human advisor integration for personalized guidance
- **Institutional Partnerships:** White-label solutions for financial institutions

## Technical Considerations

### Platform Requirements
- **Target Platforms:** Responsive web application with mobile-first design
- **Browser/OS Support:** Modern browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile
- **Performance Requirements:** Page load times under 3 seconds, real-time data updates for trading simulation

### Technology Preferences
- **Frontend:** Modern JavaScript framework (React recommended) with responsive CSS framework
- **Backend:** Integration with existing tiris-backend microservice via RESTful APIs
- **Database:** No direct database access - all data operations through backend APIs
- **Hosting/Infrastructure:** Docker containerization with nginx reverse proxy

### Architecture Considerations
- **Repository Structure:** Monorepo for frontend application
- **Service Architecture:** Frontend-only application consuming microservices
- **Integration Requirements:** RESTful API integration with tiris-backend, JWT authentication
- **Security/Compliance:** HTTPS encryption, OAuth integration, client-side input validation

## Constraints & Assumptions

### Constraints
- **Budget:** Development within existing team resources and infrastructure
- **Timeline:** MVP delivery within 3-4 months using agile methodology
- **Resources:** Single frontend development team with PM and design support
- **Technical:** Must integrate with existing tiris-backend infrastructure

### Key Assumptions
- Users are willing to spend time in simulation before live trading
- Google OAuth provides sufficient authentication coverage for MVP
- Single proven trading strategy is adequate for initial validation
- Responsive web application meets user needs without native mobile apps
- Backend services will be stable and performant enough to support frontend needs
- Market demand exists for education-first trading platforms

## Risks & Open Questions

### Key Risks
- **User Adoption Risk:** Users may abandon the platform if simulation phase feels too lengthy or complex
- **Technical Integration Risk:** Dependency on backend services could cause delays if APIs are unstable
- **Market Competition Risk:** Established platforms may launch similar features before our MVP
- **User Education Risk:** Non-technical users may still find financial concepts too complex despite simplified presentation

### Open Questions
- What is the optimal number of simulation trades before users feel ready for live trading?
- How detailed should performance metrics be without overwhelming non-technical users?
- Should there be gamification elements to increase engagement during simulation?
- What specific educational content formats work best for our target audience?

### Areas Needing Further Research
- User testing on simulation interface complexity and engagement
- Market analysis of competing education-first trading platforms
- Technical performance benchmarking for real-time trading simulation
- User research on preferred authentication methods and privacy concerns

## Next Steps

### Immediate Actions
1. Finalize technical architecture and API specifications with backend team
2. Create detailed PRD based on this Project Brief
3. Conduct user research interviews with target demographic
4. Design wireframes and user flow for education-first journey
5. Set up development environment and CI/CD pipeline

### PM Handoff

This Project Brief provides the full context for Tiris Portal. Please start in 'PRD Generation Mode', review the brief thoroughly to work with the user to create the PRD section by section as the template indicates, asking for any necessary clarification or suggesting improvements.