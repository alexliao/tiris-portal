import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage(
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
      // Send success data to parent window
      window.opener?.postMessage(
        {
          type: 'OAUTH_CALLBACK',
          code,
          state,
        },
        window.location.origin
      );
      window.close();
    } else {
      // Send error for missing parameters
      window.opener?.postMessage(
        {
          type: 'OAUTH_CALLBACK',
          error: 'missing_parameters',
          error_description: 'Missing code or state parameter',
        },
        window.location.origin
      );
      window.close();
    }
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