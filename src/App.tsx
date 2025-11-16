import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider, ToastContainer } from './components/toast';
import { AuthToastHandler } from './components/auth/AuthToastHandler';
import LandingPage from './pages/landing/LandingPage';
import PerformancePage from './pages/PerformancePage';
import DashboardPage from './pages/DashboardPage';
import TradingsListPage from './pages/TradingsListPage';
import TradingDetailPage from './pages/TradingDetailPage';
import ExchangesPage from './pages/ExchangesPage';
import ExchangeBindingWizardPage from './pages/ExchangeBindingWizardPage';
import PaperTradingWizardPage from './pages/PaperTradingWizardPage';
import BacktestTradingWizardPage from './pages/BacktestTradingWizardPage';
import RealTradingWizardPage from './pages/RealTradingWizardPage';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import SignInPage from './pages/SignInPage';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <AuthToastHandler />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tradings/:type" element={<TradingsListPage />} />
            <Route path="/trading/:id" element={<TradingDetailPage />} />
            <Route path="/paper-trading/create" element={<PaperTradingWizardPage />} />
            <Route path="/backtest-trading/create" element={<BacktestTradingWizardPage />} />
            <Route path="/real-trading/create" element={<RealTradingWizardPage />} />
            <Route path="/exchanges" element={<ExchangesPage />} />
            <Route path="/exchanges/create" element={<ExchangeBindingWizardPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
          <ToastContainer />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
