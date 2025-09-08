import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithWeChat, isLoading } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      onClose();
    } catch (error) {
      console.error('Google login failed:', error);
      setError(error instanceof Error ? error.message : 'Google login failed');
    }
  };

  const handleWeChatLogin = async () => {
    try {
      setError(null);
      await loginWithWeChat();
      onClose();
    } catch (error) {
      console.error('WeChat login failed:', error);
      setError(error instanceof Error ? error.message : 'WeChat login failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="signin-modal-backdrop">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" data-testid="signin-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('auth.signIn', 'Sign In to TIRIS')}
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
          <p className="text-gray-600 mb-6 text-center">
            {t('auth.chooseProvider', 'Choose your preferred sign-in method')}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    {t('auth.authenticationFailed', 'Authentication Failed')}
                  </h3>
                  <div className="text-sm text-red-700 whitespace-pre-wrap">{error}</div>
                  {error.includes('Backend') && (
                    <div className="mt-3 text-xs text-red-600 bg-red-100 p-2 rounded border">
                      <strong>Debug Info:</strong> Check browser console for detailed error logs
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
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

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('auth.or', 'or')}
                </span>
              </div>
            </div>

            {/* WeChat Sign In */}
            <button
              onClick={handleWeChatLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-[#1aad19] hover:bg-[#179b16] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <svg
                  className="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.53-1.162-1.188 0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.53-1.162-1.188 0-.651.52-1.18 1.162-1.18zm7.278 5.99c0-3.169-2.892-5.738-6.463-5.738-3.57 0-6.462 2.569-6.462 5.738 0 1.719.937 3.269 2.434 4.315a.49.49 0 0 1 .181.553l-.334 1.219c-.015.055-.038.11-.038.165 0 .125.1.228.222.228a.264.264 0 0 0 .125-.042l1.577-.918a.681.681 0 0 1 .574-.077c.616.192 1.295.315 2.013.315 3.57 0 6.171-2.569 6.171-5.738zm-8.966-1.18c-.394 0-.713-.329-.713-.738 0-.408.319-.737.713-.737.394 0 .713.329.713.737 0 .409-.319.738-.713.738zm4.52 0c-.394 0-.713-.329-.713-.738 0-.408.319-.737.713-.737.394 0 .713.329.713.737 0 .409-.319.738-.713.738z"/>
                </svg>
              )}
              {t('auth.signInWithWeChat', 'Sign in with WeChat')}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-xs text-center text-gray-500">
            <p>
              {t('auth.termsText', 'By signing in, you agree to our')}{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t('auth.termsOfService', 'Terms of Service')}
              </a>{' '}
              {t('auth.and', 'and')}{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t('auth.privacyPolicy', 'Privacy Policy')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};