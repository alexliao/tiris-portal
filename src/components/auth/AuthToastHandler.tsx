import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * Component that handles showing toast notifications for authentication events
 * This component listens to auth state changes and shows appropriate toasts
 */
export const AuthToastHandler: React.FC = () => {
  const { user, justSignedIn } = useAuth();
  const toast = useToast();
  const hasShownToast = useRef(false);

  // Show success toast when user just signed in (only once)
  useEffect(() => {
    if (user && justSignedIn && !hasShownToast.current) {
      const providerName = user.provider === 'google' ? 'Google' : 'WeChat';
      toast.success(
        `Welcome back!`, 
        `Successfully signed in with ${providerName}`
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