import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/landing/LandingPage';
import PerformancePage from './pages/PerformancePage';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import { AuthStatus } from './components/auth/AuthStatus';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
        </Routes>
        <AuthStatus />
      </Router>
    </AuthProvider>
  );
}

export default App;
