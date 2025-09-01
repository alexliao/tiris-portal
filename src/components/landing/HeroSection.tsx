import React from 'react';
import { TrendingUp, Shield, GraduationCap, Brain } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HeroSectionProps {
  onCtaClick?: () => void;
  className?: string;
}

interface TradingMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  period: string;
}

const mockTradingMetrics: TradingMetric[] = [
  { label: 'ROI', value: '+34.7%', trend: 'up', period: '12 months' },
  { label: 'Sharpe Ratio', value: '2.1', trend: 'up', period: 'Risk-adjusted' },
  { label: 'Win Rate', value: '73%', trend: 'up', period: 'Success rate' },
  { label: 'Total Trades', value: '1,247', trend: 'neutral', period: 'Backtested' }
];

const MetricCard: React.FC<{ metric: TradingMetric }> = ({ metric }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.label}</p>
        <p className={cn(
          "text-2xl font-bold",
          metric.trend === 'up' && "text-green-500",
          metric.trend === 'down' && "text-red-500",
          metric.trend === 'neutral' && "text-gray-900 dark:text-gray-100"
        )}>
          {metric.value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{metric.period}</p>
      </div>
      {metric.trend === 'up' && (
        <TrendingUp className="h-6 w-6 text-green-500" aria-hidden="true" />
      )}
    </div>
  </div>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onCtaClick,
  className 
}) => {
  return (
    <section className={cn("relative overflow-hidden bg-white dark:bg-gray-900", className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content Section */}
          <div className="text-center lg:text-left">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              <span className="text-blue-600">ML-Powered</span>
              <br />
              Quantitative Trading
              <br />
              <span className="text-gray-600 dark:text-gray-300">Made Simple</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0">
              Access institutional-grade cryptocurrency trading strategies through our education-first platform. 
              No programming knowledge required—just proven ML algorithms and transparent performance.
            </p>

            {/* Key Differentiators */}
            <div className="flex flex-col sm:flex-row gap-6 mb-10 justify-center lg:justify-start">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Machine Learning Excellence</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Rigorous Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-purple-600" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Education-First</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onCtaClick}
                className="tiris-button-primary text-lg"
                aria-label="Start learning about ML-powered trading"
              >
                Start Learning
              </button>
              <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                View Performance
              </button>
            </div>
          </div>

          {/* Performance Metrics Section */}
          <div className="space-y-6">
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Proven ML Strategy Performance
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Extensively backtested across multiple market cycles with real trading verification
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {mockTradingMetrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Verified Strategy</span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Performance verified through 2+ years of backtesting across bull, bear, and sideways markets, 
                plus 6 months of live trading validation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;