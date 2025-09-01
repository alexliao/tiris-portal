import React from 'react';
import Navigation from '../../components/layout/Header';
import HeroSection from '../../components/landing/HeroSection';
import AboutSection from '../../components/landing/AboutSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import Footer from '../../components/layout/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
};

export default LandingPage;