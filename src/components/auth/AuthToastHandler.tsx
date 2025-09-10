import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * Component that handles showing toast notifications for authentication events
 * This component listens to auth state changes and shows appropriate toasts
 */
export const AuthToastHandler: React.FC = () => {
  const { t } = useTranslation();
  const { user, justSignedIn } = useAuth();
  const toast = useToast();
  const hasShownToast = useRef(false);

  // Show success toast when user just signed in (only once)
  useEffect(() => {
    if (user && justSignedIn && !hasShownToast.current) {
      const getProviderName = (provider: string) => {
        switch (provider) {
          case 'google': return 'Google';
          case 'wechat': return 'WeChat';
          case 'email': return 'email';
          default: return 'email';
        }
      };
      
      const providerName = getProviderName(user.provider);
      toast.success(
        t('auth.welcomeBack'), 
        t('auth.signedInWith', { provider: providerName })
      );
      hasShownToast.current = true;
    }

    // Reset the flag when justSignedIn becomes false
    if (!justSignedIn) {
      hasShownToast.current = false;
    }
  }, [user, justSignedIn]); // Removed toast from dependencies

  return null; // This component doesn't render anything
};