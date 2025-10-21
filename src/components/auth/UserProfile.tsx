import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { LogOut, User, Copy, Check, Mail } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Close on outside click / Escape
  useEffect(() => {
    if (!user) return;
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
  }, [isDropdownOpen, user]);

  if (!user) return null;

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success(t('common.success'), t('auth.copyEmail'));
    } catch (err) {
      console.error('Copy failed:', err);
      toast.error(t('common.failed'), t('auth.copyEmailFailed'));
    }
  };

  return (
    <div className="relative" data-testid="user-profile" ref={containerRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 hover:bg-white/10 transition-colors px-3 py-2 rounded"
        aria-label={t('common.userMenu')}
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
            <div className="pt-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[11rem]" title={user.email}>
                  {user.provider === 'google' ? (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  ) : (
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 flex-shrink-0"
                  title={t('auth.copyEmail')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                setIsDropdownOpen(false);
                await logout();
                toast.success(t('auth.logout'), t('auth.logoutSuccess'));
                navigate('/');
              } catch (error) {
                // Logout should always succeed locally even if API fails
                console.error('Logout error:', error);
                toast.success(t('auth.logout'), t('auth.logoutSuccess'));
                navigate('/');
              }
            }}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
