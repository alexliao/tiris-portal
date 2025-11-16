import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

interface SignInButtonProps {
  testId?: string;
}

export const SignInButton: React.FC<SignInButtonProps> = ({ testId = 'signin-button' }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    const searchParams = new URLSearchParams(location.search);
    const explicitRedirect = searchParams.get('redirect');
    const redirectPath = explicitRedirect ?? `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams();
    if (redirectPath) {
      params.set('redirect', redirectPath);
    }
    navigate(`/signin?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClick}
      className="font-['Nunito'] font-semibold text-white bg-tiris-primary-600 hover:bg-tiris-primary-700 transition-colors px-4 py-2 rounded-md"
      data-testid={testId}
    >
      {t('auth.signIn', 'Sign In')}
    </button>
  );
};
