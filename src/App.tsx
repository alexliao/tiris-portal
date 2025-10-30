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
import PaperTradingWizardPage from './pages/PaperTradingWizardPage';
import { OAuthCallback } from './pages/auth/OAuthCallback';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthToastHandler />
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tradings/:type" element={<TradingsListPage />} />
            <Route path="/trading/:id" element={<TradingDetailPage />} />
            <Route path="/paper-trading/create" element={<PaperTradingWizardPage />} />
            <Route path="/exchanges" element={<ExchangesPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
          <ToastContainer />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
