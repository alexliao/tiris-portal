import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // If this page was loaded as a popup, keep legacy postMessage behavior
    if (window.opener) {
      if (error) {
        window.opener.postMessage(
          {
            type: 'OAUTH_CALLBACK',
            error: error,
            error_description: searchParams.get('error_description'),
          },
          window.location.origin
        );
        window.close();
        return;
      }

      if (code && state) {
        window.opener.postMessage(
          {
            type: 'OAUTH_CALLBACK',
            code,
            state,
          },
          window.location.origin
        );
        window.close();
        return;
      }

      window.opener.postMessage(
        {
          type: 'OAUTH_CALLBACK',
          error: 'missing_parameters',
          error_description: 'Missing code or state parameter',
        },
        window.location.origin
      );
      window.close();
      return;
    }

    // Redirect-in-place flow
    (async () => {
      try {
        if (error) {
          throw new Error(error);
        }
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }
        const provider = (sessionStorage.getItem('oauth_provider') || 'google') as 'google' | 'wechat';
        const authData = await authService.handleCallback(provider, code, state);

        // Persist tokens
        localStorage.setItem('access_token', authData.access_token);
        localStorage.setItem('refresh_token', authData.refresh_token);
        localStorage.setItem('token_expires_at', String(Date.now() + authData.expires_in * 1000));
        sessionStorage.removeItem('oauth_state');

        // Redirect back
        const target = sessionStorage.getItem('redirect_after_login') || '/dashboard';
        // Force full reload so AuthContext re-initializes from localStorage
        window.location.replace(target);
      } catch (error) {
        console.error('OAuth callback error:', error);
        window.location.replace('/');
      }
    })();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
};
