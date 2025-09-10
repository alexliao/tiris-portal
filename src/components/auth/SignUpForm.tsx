import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from 'react-i18next';

interface SignUpFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { signUpWithEmailPassword, isLoading } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = t('auth.fullNameRequired');
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = t('auth.fullNameMinLength');
    } else if (formData.fullName.trim().length > 255) {
      errors.fullName = t('auth.fullNameMaxLength');
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('auth.validEmailRequired');
    }

    // Password validation
    if (!formData.password) {
      errors.password = t('auth.passwordRequired');
    } else if (formData.password.length < 8) {
      errors.password = t('auth.passwordMinLength');
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('auth.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.passwordsDoNotMatch');
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
      await signUpWithEmailPassword(formData.email, formData.password, formData.fullName);
      toast.success(t('auth.accountCreated'), t('auth.welcomeMessage'));
      onSuccess();
    } catch (error) {
      console.error('Signup failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('auth.signUpFailedError');
      toast.error(t('auth.signUpFailed'), errorMessage);
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
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.fullName', 'Full Name')}
          </label>
          <input
            type="text"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.fullName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={t('auth.enterFullName')}
            disabled={isLoading}
          />
          {formErrors.fullName && (
            <p className="mt-1 text-sm text-red-600">{formErrors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.email', 'Email Address')}
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={t('auth.enterEmail')}
            disabled={isLoading}
          />
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.password', 'Password')}
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={t('auth.enterPassword')}
            disabled={isLoading}
          />
          {formErrors.password && (
            <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.confirmPassword', 'Confirm Password')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            disabled={isLoading}
          />
          {formErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
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
              {t('auth.creatingAccount', 'Creating Account...')}
            </>
          ) : (
            t('auth.createAccount', 'Create Account')
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            {t('auth.signIn', 'Sign In')}
          </button>
        </p>
      </div>

      {/* Terms and Privacy */}
      <div className="text-xs text-center text-gray-500">
        <p>
          {t('auth.termsText', 'By creating an account, you agree to our')}{' '}
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