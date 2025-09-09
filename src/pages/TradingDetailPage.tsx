import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTradings, type Trading, ApiError } from '../utils/api';
import { ArrowLeft, Calendar, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import TradingPerformanceWidget from '../components/trading/TradingPerformanceWidget';

export const TradingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [trading, setTrading] = useState<Trading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchTrading = async () => {
      if (!id) {
        setError('Trading ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get all tradings and find the one with matching ID
        const tradings = await getTradings();
        const foundTrading = tradings.find(t => t.id === id);
        
        if (!foundTrading) {
          setError('Trading not found');
          return;
        }
        
        setTrading(foundTrading);
      } catch (err) {
        console.error('Failed to fetch trading:', err);
        if (err instanceof ApiError) {
          setError(`Failed to load trading: ${err.message}`);
        } else {
          setError('Failed to load trading data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && !authLoading && id) {
      fetchTrading();
    } else if (!authLoading && !isAuthenticated) {
      // Not authenticated, stop loading
      setLoading(false);
    }
  }, [id, isAuthenticated, authLoading]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'stopped':
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'backtest':
        return <Activity className="w-5 h-5" />;
      case 'live':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You need to sign in to view trading details.</p>
            <Link 
              to="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading trading details...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </button>
                <Link 
                  to="/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!loading && !trading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Trading Not Found</h1>
              <p className="text-gray-600 mb-4">The requested trading could not be found.</p>
              <Link 
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Don't render the main content if we don't have a trading object
  if (!trading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-20">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading trading details...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-20">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <div className="flex items-center space-x-3">
                  {getTypeIcon(trading.type)}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{trading.name}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>ID: {trading.id.substring(0, 8)}...</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(trading.status)}`}>
                        {trading.status}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {trading.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Trading Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Trading Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Strategy</div>
                <div className="text-sm text-gray-900">{trading.info?.strategy || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Risk Level</div>
                <div className="text-sm text-gray-900">{trading.info?.risk_level || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Exchange Binding</div>
                <div className="text-sm text-gray-900">{trading.exchange_binding_id ? `${trading.exchange_binding_id.substring(0, 8)}...` : 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Created</div>
                <div className="text-sm text-gray-900">{new Date(trading.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Performance Widget */}
          <TradingPerformanceWidget 
            trading={trading}
            showHeader={false}
            showHighlights={false}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TradingDetailPage;