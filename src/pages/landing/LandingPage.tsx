import React from 'react';
import Header from '../../components/layout/Header';
import HeroSection from '../../components/landing/HeroSection';

export const LandingPage: React.FC = () => {
  const handleCtaClick = () => {
    // Future: Navigate to simulation/education section
    console.log('Start Learning clicked - will navigate to simulation');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection onCtaClick={handleCtaClick} />
    </div>
  );
};

export default LandingPage;