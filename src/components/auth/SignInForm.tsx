import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from 'react-i18next';

interface SignInFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSuccess, onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { signInWithEmailPassword, isLoading } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await signInWithEmailPassword(formData.email, formData.password);
      onSuccess();
    } catch (error) {
      console.error('Signin failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      toast.error('Sign In Failed', errorMessage);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.email', 'Email Address')}
          </label>
          <input
            type="email"
            id="signin-email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
            disabled={isLoading}
          />
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.password', 'Password')}
          </label>
          <input
            type="password"
            id="signin-password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {formErrors.password && (
            <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              {t('auth.signingIn', 'Signing In...')}
            </>
          ) : (
            t('auth.signIn', 'Sign In')
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
          <button
            onClick={onSwitchToSignUp}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            {t('auth.signUp', 'Sign Up')}
          </button>
        </p>
      </div>

      {/* Terms and Privacy */}
      <div className="text-xs text-center text-gray-500">
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
  );
};