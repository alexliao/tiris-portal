import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { LogOut, User, LayoutDashboard, Copy, Check, Mail } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  if (!user) return null;

  // Close on outside click / Escape
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!isDropdownOpen) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isDropdownOpen]);

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success('Copied', 'Email address copied to clipboard.');
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error('Copy Failed', 'Unable to copy email address.');
    }
  };

  return (
    <div className="relative" data-testid="user-profile" ref={containerRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 hover:bg-white/10 transition-colors px-3 py-2 rounded"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
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
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl ring-1 ring-black/5 py-2 z-50"
        >
          {/* Caret */}
          <div className="absolute -top-2 right-6 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />

          {/* Header */}
          <div className="px-4 pb-3 border-b">
            <div className="flex items-center gap-3 pt-1">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[11rem]" title={user.email}>
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={handleCopyEmail}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    title="Copy email"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 capitalize">
                    {user.provider}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Link
            to="/dashboard"
            onClick={() => setIsDropdownOpen(false)}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            role="menuitem"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <button
            onClick={async () => {
              try {
                setIsDropdownOpen(false);
                await logout();
                toast.success('Logged Out', 'You have been successfully signed out.');
                navigate('/');
              } catch (error) {
                // Logout should always succeed locally even if API fails
                console.error('Logout error:', error);
                toast.success('Logged Out', 'You have been successfully signed out.');
                navigate('/');
              }
            }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
