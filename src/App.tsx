import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import PerformancePage from './pages/PerformancePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/performance" element={<PerformancePage />} />
      </Routes>
    </Router>
  );
}

export default App;
