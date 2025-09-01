# AI Frontend Generation Prompts for Tiris Portal

This document contains comprehensive, optimized prompts for AI-driven frontend development tools (v0.dev, Lovable.ai, Claude Artifacts, etc.) to generate visual mockups and React components for Tiris Portal based on our UX specification and technical architecture.

## Overview

These prompts follow a structured four-part framework:
1. **High-Level Goal** - Clear objective statement
2. **Detailed Step-by-Step Instructions** - Granular, numbered implementation steps
3. **Code Examples, Data Structures & Constraints** - Technical specifications and boundaries
4. **Define Strict Scope** - Explicit boundaries to prevent unintended changes

## Prompt 1: Minimal Hero Section (Match Strikingly Design)

```
## High-Level Goal
Create a minimal, typography-focused hero section for Tiris Portal that exactly matches the Strikingly design at https://buff-lion-1bsbdk.mystrikingly.com. Ultra-minimal design with just the large "tiris" title and "Profitable Crypto Trading Bot" subtitle.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript component named `HeroSection.tsx` with minimal design
2. Center content vertically and horizontally on full viewport height
3. Add large "tiris" title using Bebas Neue font at 120px+ size
4. Add subtitle "Profitable Crypto Trading Bot" using Nunito font at 24px
5. Use deep black (#080404) for all text on white background
6. Implement responsive typography scaling for mobile devices
7. Remove all complex elements: no metrics, no cards, no graphics
8. Add proper TypeScript interfaces for props
9. Ensure clean, minimal aesthetic matches reference design exactly
10. Include Google Fonts integration for Bebas Neue and Nunito

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 4+, Google Fonts
**Color Palette**: 
- Primary Text: #080404 (deep black)
- Background: #FFFFFF (pure white)
- No additional colors needed

**Typography**:
- Hero Title: Bebas Neue, 120px+, Bold, #080404
- Subtitle: Nunito, 24px, Regular, #080404

**Component Structure**:
```typescript
interface HeroSectionProps {
  className?: string;
}
```

**Required Fonts**: 
- Bebas Neue (for main title)
- Nunito (for subtitle)

**Layout**: Full viewport height with centered content, no additional sections or complexity

**DO NOT**: Include any performance metrics, complex layouts, multiple colors, or additional content
**DO**: Match the exact minimalist aesthetic of the Strikingly reference design

## Define Strict Scope
- Create ONLY a simple Hero Section with title and subtitle
- No additional components, cards, or complex elements
- No navigation, buttons, or interactive elements beyond basic hover states
- Focus entirely on typography and minimal layout
- Must exactly match the Strikingly design aesthetic
```

## Prompt 2: Features Section (4-Column Grid with Pastels)

```
## High-Level Goal
Create a features section with 4-column grid layout that exactly matches the Strikingly design. Features are: "Profitable", "Secure", "Automatic", "Simple" with subtle pastel background colors and clean typography.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript component named `FeaturesSection.tsx` with 4-column grid
2. Use full viewport height section with centered content
3. Create 4 feature cards with titles: "Profitable", "Secure", "Automatic", "Simple"
4. Apply exact pastel background colors for each card
5. Use Raleway font for feature titles (bold, 20px)
6. Use Nunito font for feature descriptions (regular, 16px)
7. Implement responsive grid: 4-col desktop, 2-col tablet, 1-col mobile
8. Add rounded corners and consistent padding to feature cards
9. Center-align text within each feature card
10. Ensure proper spacing and visual hierarchy matches reference design

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 4+, Google Fonts
**Color Palette**: 
- Profitable: #f0f4ff (light blue background)
- Secure: #fff0f4 (light pink background)  
- Automatic: #f0fff4 (light green background)
- Simple: #fff8f0 (light orange background)
- Text: #080404 (titles), #666666 (descriptions)

**Typography**:
- Feature Titles: Raleway, 20px, Bold, #080404
- Feature Descriptions: Nunito, 16px, Regular, #666666

**Component Structure**:
```typescript
interface FeaturesSectionProps {
  className?: string;
}

interface Feature {
  title: string;
  description: string;
  bgColor: string;
}
```

**Required Fonts**: 
- Raleway (for titles)
- Nunito (for descriptions)

**Layout**: Full viewport height with 4-column responsive grid

**DO NOT**: Include icons, complex animations, or additional visual elements beyond text
**DO**: Match exact pastel color scheme and typography from Strikingly design

## Define Strict Scope
- Create ONLY the 4-column features grid section
- Focus on clean typography and subtle pastel backgrounds
- No additional components beyond the feature cards
- Must exactly match the Strikingly reference design layout and colors
```

## Prompt 3: Minimal Navigation Bar

```
## High-Level Goal
Create a minimal, sticky navigation bar that matches the Strikingly design with simple HOME, ABOUT, FEATURES links and smooth scrolling behavior.

## Detailed Step-by-Step Instructions
1. Create a React TypeScript component named `Navigation.tsx` with fixed positioning
2. Position navbar at top of viewport with sticky/fixed behavior
3. Add semi-transparent white background with backdrop blur effect
4. Create centered navigation menu with HOME, ABOUT, FEATURES links
5. Use Raleway font for navigation links
6. Implement smooth scrolling to corresponding page sections
7. Add hover opacity transitions for navigation links
8. Use deep black (#080404) text color matching the design
9. Ensure navigation stays visible during page scroll
10. Add proper spacing and clean minimal aesthetic

## Code Examples, Data Structures & Constraints
**Tech Stack**: React 18+ with TypeScript, Tailwind CSS 4+, Google Fonts
**Color Palette**: 
- Text: #080404 (deep black)
- Background: rgba(255,255,255,0.95) (semi-transparent white)
- No additional colors needed

**Typography**:
- Navigation Links: Raleway, 16px, Regular, #080404

**Component Structure**:
```typescript
interface NavigationProps {
  className?: string;
}
```

**Navigation Links**:
- HOME (scrolls to hero section)
- ABOUT (scrolls to about section) 
- FEATURES (scrolls to features section)

**Behavior**:
- Fixed position at top of viewport
- Semi-transparent background with backdrop blur
- Smooth scroll animation to sections when clicked
- Hover opacity transition effects

**DO NOT**: Include complex branding, logos, or additional navigation elements
**DO**: Match the exact minimal navigation from the Strikingly reference design

## Define Strict Scope
- Create ONLY the minimal navigation bar component
- Focus on simple link-based navigation with smooth scrolling
- No authentication states, dropdowns, or complex interactions
- Must exactly match the clean navigation aesthetic from Strikingly
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