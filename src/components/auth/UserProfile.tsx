import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { LogOut, User, Mail, Loader2, ShieldAlert, BadgeCheck, Coins } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, requestEmailVerification, confirmEmailVerification } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
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

  useEffect(() => {
    if (user?.emailVerified) {
      setShowVerificationInput(false);
      setVerificationCode('');
    }
  }, [user?.emailVerified]);

  if (!user) return null;

  const handleSendVerification = async () => {
    if (isSendingVerification) return;
    try {
      setIsSendingVerification(true);
      const message = await requestEmailVerification();
      toast.success(t('common.success'), message || t('auth.emailVerification.sendSuccess'));
      setShowVerificationInput(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.emailVerification.sendFailed');
      toast.error(t('common.failed'), errorMessage);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleConfirmVerification = async () => {
    const sanitizedCode = verificationCode.trim();
    if (sanitizedCode.length < 6) {
      toast.error(t('common.failed'), t('auth.emailVerification.codeRequired'));
      return;
    }

    try {
      setIsConfirmingVerification(true);
      const message = await confirmEmailVerification(sanitizedCode);
      toast.success(t('common.success'), message || t('auth.emailVerification.verifySuccess'));
      setShowVerificationInput(false);
      setVerificationCode('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.emailVerification.verifyFailed');
      toast.error(t('common.failed'), errorMessage);
    } finally {
      setIsConfirmingVerification(false);
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
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className="truncate">{user.name}</span>
                {user.info?.real_trading_enabled && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
                    <Coins className="h-3.5 w-3.5" />
                    {t('auth.realTradingBadge')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate max-w-[14rem]" title={user.email}>
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
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {t('auth.emailVerification.badgeVerified')}
                  </span>
                ) : (
                  <button
                    onClick={handleSendVerification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-yellow-300 text-yellow-800 bg-white hover:bg-yellow-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    disabled={isSendingVerification}
                    type="button"
                  >
                    {isSendingVerification ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {isSendingVerification ? t('auth.emailVerification.sending') : t('auth.emailVerification.cta')}
                  </button>
                )}
              </div>
              {!user.emailVerified && showVerificationInput && (
                <div className="mt-3" role="form" aria-label={t('auth.emailVerification.prompt')}>
                  <label className="block text-xs font-medium text-gray-700">
                    {t('auth.emailVerification.prompt')}
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      placeholder={t('auth.emailVerification.codePlaceholder')}
                      className="w-40 rounded border border-gray-200 px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-tiris-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmVerification}
                      disabled={isConfirmingVerification}
                      className="inline-flex items-center justify-center gap-2 rounded bg-tiris-primary-600 px-3 py-1 text-sm font-medium text-white hover:bg-tiris-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="relative inline-flex items-center justify-center">
                        {isConfirmingVerification && (
                          <Loader2 className="absolute w-4 h-4 animate-spin" />
                        )}
                        <span
                          className={`whitespace-nowrap transition-opacity ${isConfirmingVerification ? 'opacity-0' : 'opacity-100'}`}
                          aria-hidden={isConfirmingVerification}
                        >
                          {t('auth.emailVerification.confirm')}
                        </span>
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('auth.emailVerification.helper')}
                  </p>
                </div>
              )}
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
