import React from 'react';

export const Navigation: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-white z-50 py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => scrollToSection('home')} 
            className="flex items-center space-x-2 font-['Bebas_Neue'] text-2xl font-bold text-[#080404] hover:bg-[#f4f6f8] transition-colors px-3 py-1 rounded"
          >
            <img src="/tiris-light.png" alt="Tiris Logo" width="36" height="36" />
            <span>TIRIS</span>
          </button>
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('home')} 
              className="font-['Raleway'] text-[#080404] hover:bg-[#f4f6f8] transition-colors px-3 py-1 rounded"
            >
              HOME
            </button>
            <button 
              onClick={() => scrollToSection('about')} 
              className="font-['Raleway'] text-[#080404] hover:bg-[#f4f6f8] transition-colors px-3 py-1 rounded"
            >
              ABOUT
            </button>
            <button 
              onClick={() => scrollToSection('features')} 
              className="font-['Raleway'] text-[#080404] hover:bg-[#f4f6f8] transition-colors px-3 py-1 rounded"
            >
              FEATURES
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;