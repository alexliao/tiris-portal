import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SignUpForm } from './SignUpForm';
import { SignInForm } from './SignInForm';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { loginWithGoogle, loginWithWeChat, isLoading } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('auth.googleAuthFailed');
      toast.error(t('auth.authenticationFailed'), errorMessage);
    }
  };

  const handleWeChatLogin = async () => {
    try {
      await loginWithWeChat();
      onClose();
      navigate('/dashboard');
    } catch (error) {
      console.error('WeChat login failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('auth.wechatAuthFailed');
      toast.error(t('auth.authenticationFailed'), errorMessage);
    }
  };

  const handleSignUpSuccess = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleSignInSuccess = () => {
    onClose();
    navigate('/dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="signin-modal-backdrop">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" data-testid="signin-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'login' ? t('auth.signIn', 'Sign In to TIRIS') : t('auth.signUp', 'Join TIRIS')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'signup' ? (
            <SignUpForm 
              onSuccess={handleSignUpSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          ) : (
            <>
              <SignInForm 
                onSuccess={handleSignInSuccess}
                onSwitchToSignUp={() => setMode('signup')}
              />
              
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {t('auth.or', 'or')}
                  </span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {t('auth.signInWithGoogle', 'Sign in with Google')}
              </button>

              {/* WeChat Sign In - Hidden but keeping code for future use */}
              {false && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        {t('auth.or', 'or')}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleWeChatLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    ) : (
                      <img 
                        src="/wechat-96.png"
                        alt="WeChat"
                        className="w-5 h-5 mr-3"
                      />
                    )}
                    {t('auth.signInWithWeChat', 'Sign in with WeChat')}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};