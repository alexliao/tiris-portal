import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { SignInButton } from '../auth/SignInButton';
import { UserProfile } from '../auth/UserProfile';
import { useAuth } from '../../hooks/useAuth';

export const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const scrollToSection = (sectionId: string) => {
    // Only scroll if we're on the landing page
    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Close mobile menu after navigation
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 w-full bg-[#1a1a1a] z-50 h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 font-['Bebas_Neue'] text-2xl font-bold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
          >
            <img src="/tiris-gold.png" alt={t('common.tirisLogo')} width="36" height="36" />
            <span>TIRIS</span>
          </Link>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {location.pathname === '/' ? (
              <button 
                onClick={() => scrollToSection('home')} 
                className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
              >
                {t('nav.home')}
              </button>
            ) : (
              <Link 
                to="/" 
                className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
              >
                {t('nav.home')}
              </Link>
            )}
            <Link 
              to="/performance" 
              className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
            >
              {t('nav.performance')}
            </Link>
            {isAuthenticated && (
              <Link 
                to="/dashboard" 
                className="font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-1 rounded"
              >
                {t('dashboard.title')}
              </Link>
            )}
            {isAuthenticated ? <UserProfile /> : <SignInButton testId="signin-button-desktop" />}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-4">
            {isAuthenticated ? <UserProfile /> : <SignInButton testId="signin-button-mobile" />}
            <button
              onClick={toggleMobileMenu}
              className="text-white hover:bg-white/10 transition-colors p-2 rounded"
              aria-label={t('common.toggleMobileMenu')}
            >
              {/* Hamburger Menu Icon */}
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <span 
                  className={`block h-0.5 bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                />
                <span 
                  className={`block h-0.5 bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span 
                  className={`block h-0.5 bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#1a1a1a] border-t border-gray-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
              {location.pathname === '/' ? (
                <button 
                  onClick={() => scrollToSection('home')} 
                  className="block w-full text-left font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-2 rounded"
                >
                  {t('nav.home')}
                </button>
              ) : (
                <Link 
                  to="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-2 rounded"
                >
                  {t('nav.home')}
                </Link>
              )}
              <Link 
                to="/performance" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-2 rounded"
              >
                {t('nav.performance')}
              </Link>
              {isAuthenticated && (
                <Link 
                  to="/dashboard" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block font-['Nunito'] font-semibold text-white hover:bg-white/10 transition-colors px-3 py-2 rounded"
                >
                  {t('dashboard.title')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;