import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SignInModal } from './SignInModal';

interface SignInButtonProps {
  testId?: string;
}

export const SignInButton: React.FC<SignInButtonProps> = ({ testId = 'signin-button' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="font-['Nunito'] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-md"
        data-testid={testId}
      >
        {t('auth.signIn', 'Sign In')}
      </button>
      
      <SignInModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};