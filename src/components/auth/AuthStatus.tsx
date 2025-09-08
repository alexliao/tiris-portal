import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export const AuthStatus: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getProviderDisplay = () => {
    switch (user.provider) {
      case 'google':
        return '🔐 Google OAuth';
      case 'wechat':
        return '💬 WeChat OAuth';
      default:
        return '🔑 Authenticated';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 rounded-lg p-3 text-sm max-w-xs">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div>
          <div className="text-green-800 font-medium">{getProviderDisplay()}</div>
          <div className="text-green-600 text-xs">Welcome, {user.name}</div>
        </div>
      </div>
    </div>
  );
};