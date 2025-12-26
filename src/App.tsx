import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContainer } from './components/toast';
import { AuthToastHandler } from './components/auth/AuthToastHandler';
import LandingPage from './pages/landing/LandingPage';
import PerformancePage from './pages/PerformancePage';
import DashboardPage from './pages/DashboardPage';
import TradingsListPage from './pages/TradingsListPage';
import TradingDetailPage from './pages/TradingDetailPage';
import PortfoliosListPage from './pages/PortfoliosListPage';
import ExchangesPage from './pages/ExchangesPage';
import ExchangeBindingWizardPage from './pages/ExchangeBindingWizardPage';
import PaperTradingWizardPage from './pages/PaperTradingWizardPage';
import BacktestTradingWizardPage from './pages/BacktestTradingWizardPage';
import RealTradingWizardPage from './pages/RealTradingWizardPage';
import GetStartedGuidePage from './pages/GetStartedGuidePage';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import SignInPage from './pages/SignInPage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <AuthToastHandler />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/guide" element={<GetStartedGuidePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tradings/:type" element={<TradingsListPage />} />
            <Route path="/trading/:id" element={<TradingDetailPage />} />
            <Route path="/portfolios" element={<PortfoliosListPage />} />
            <Route path="/paper-trading/create" element={<PaperTradingWizardPage />} />
            <Route path="/backtest-trading/create" element={<BacktestTradingWizardPage />} />
            <Route path="/real-trading/create" element={<RealTradingWizardPage />} />
            <Route path="/exchanges" element={<ExchangesPage />} />
            <Route path="/exchanges/create" element={<ExchangeBindingWizardPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/legal/terms" element={<TermsPage />} />
            <Route path="/legal/privacy" element={<PrivacyPage />} />
          </Routes>
          <ToastContainer />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
