import React from 'react';
import Navigation from '../../components/layout/Header';
import HeroSection from '../../components/landing/HeroSection';
import HighlightsSection from '../../components/landing/HighlightsSection';
import Footer from '../../components/layout/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <HighlightsSection />
      <Footer />
    </div>
  );
};

export default LandingPage;