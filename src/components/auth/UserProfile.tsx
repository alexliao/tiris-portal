import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, LayoutDashboard } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative" data-testid="user-profile">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center hover:bg-white/10 transition-colors px-3 py-2 rounded"
        aria-label="User menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <User className="w-8 h-8 text-white" />
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center mt-1">
              <span className="text-xs text-gray-400 mr-1">via</span>
              <span className="text-xs font-medium text-blue-600 capitalize">
                {user.provider}
              </span>
            </div>
          </div>
          <Link
            to="/dashboard"
            onClick={() => setIsDropdownOpen(false)}
            className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <button
            onClick={() => {
              logout();
              setIsDropdownOpen(false);
            }}
            className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};