import React from 'react';
import Navigation from '../components/layout/Header';
import PerformanceSection from '../components/landing/PerformanceSection';
import Footer from '../components/layout/Footer';

export const PerformancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="pt-20"> {/* Add padding to account for fixed navigation */}
        <PerformanceSection />
      </div>
      <Footer />
    </div>
  );
};

export default PerformancePage;