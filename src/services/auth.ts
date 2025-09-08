import type { AuthProvider } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend.dev.tiris.ai/v1';
const DEBUG_MODE = import.meta.env.DEV; // Enable detailed logging in development

export interface BackendUser {
  id: string;
  username: string;
  email: string;
  avatar: string;
  settings: {
    timezone: string;
    currency: string;
    notifications: boolean;
  };
  info: {
    oauth_provider: string;
    last_login: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: BackendUser;
}

export interface LoginResponse {
  auth_url: string;
  state: string;
}

class AuthService {
  private static instance: AuthService;
  
  private constructor() {}
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Step 1: Initiate OAuth login
  async initiateLogin(provider: AuthProvider, redirectUri?: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          redirect_uri: redirectUri || `${window.location.origin}/auth/callback`,
        }),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error('TIRIS backend server is currently unavailable. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('Authentication service not found. Please check backend configuration.');
        } else {
          throw new Error(`Authentication service error (${response.status}). Please contact support.`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        const errorMessage = data.error?.message || 'Login initiation failed';
        const errorCode = data.error?.code;
        const errorDetails = data.error?.details;
        
        // Enhanced error reporting for debugging
        console.error('Backend OAuth Login Error:', {
          status: response.status,
          statusText: response.statusText,
          errorCode,
          errorMessage,
          errorDetails,
          fullResponse: data
        });
        
        // Provide detailed error messages
        if (errorMessage.toLowerCase().includes('client_id')) {
          throw new Error(`OAuth Configuration Error: ${errorMessage}. Check GOOGLE_CLIENT_ID in backend environment.`);
        } else if (errorMessage.toLowerCase().includes('redirect_uri')) {
          throw new Error(`Redirect URI Error: ${errorMessage}. Check GOOGLE_REDIRECT_URL matches frontend callback URL.`);
        } else if (errorCode === 'INVALID_PROVIDER') {
          throw new Error(`Provider Error: ${provider} is not configured in backend. Check OAuth provider settings.`);
        } else {
          throw new Error(`Backend OAuth Error (${response.status}): ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }
      }

      return data.data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to TIRIS backend. Please check your internet connection or contact support.');
      }
      throw error;
    }
  }

  // Step 2: Handle OAuth callback
  async handleCallback(provider: AuthProvider, code: string, state: string): Promise<AuthResponse> {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      const response = await fetch(`${API_BASE_URL}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          code,
          state,
          redirect_uri: redirectUri, // ✅ FIXED: Added required redirect_uri field
        }),
      });

      if (!response.ok) {
        // Try to get error details from response body
        let errorBody: any = {};
        try {
          errorBody = await response.json();
        } catch (e) {
          // Response body is not JSON
        }
        
        console.error('Backend OAuth Callback Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorBody,
          requestBody: { provider, code: code.substring(0, 20) + '...', state, redirect_uri: redirectUri }
        });

        if (response.status >= 500) {
          throw new Error(`Backend server error (${response.status}): ${errorBody.error?.message || 'Please try again.'}`);
        } else if (response.status === 400) {
          const details = errorBody.error?.message || 'Invalid request';
          if (details.toLowerCase().includes('redirect_uri') || details.toLowerCase().includes('required')) {
            throw new Error(`OAuth validation failed (400): ${details}. Frontend is now sending redirect_uri: ${redirectUri}`);
          }
          throw new Error(`OAuth validation failed (400): ${details}. Check backend logs for details.`);
        } else if (response.status === 401) {
          throw new Error(`OAuth unauthorized (401): ${errorBody.error?.message || 'Invalid credentials or expired session'}`);
        } else {
          throw new Error(`Authentication failed (${response.status}): ${errorBody.error?.message || response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        const errorMessage = data.error?.message || 'Authentication failed';
        const errorCode = data.error?.code;
        const errorDetails = data.error?.details;
        
        // Enhanced error reporting for callback failures
        console.error('Backend OAuth Callback Failed:', {
          errorCode,
          errorMessage,
          errorDetails,
          provider,
          state,
          redirect_uri: redirectUri,
          fullResponse: data
        });
        
        if (errorMessage.toLowerCase().includes('invalid_code') || errorCode === 'INVALID_AUTHORIZATION_CODE') {
          throw new Error(`OAuth Code Error: ${errorMessage}. The authorization code may have expired or been used already.`);
        } else if (errorMessage.toLowerCase().includes('state') || errorCode === 'STATE_MISMATCH') {
          throw new Error(`Security Error: ${errorMessage}. State parameter validation failed - please try signing in again.`);
        } else if (errorMessage.toLowerCase().includes('redirect_uri') || errorCode === 'REDIRECT_URI_MISMATCH') {
          throw new Error(`Configuration Error: ${errorMessage}. Backend GOOGLE_REDIRECT_URL doesn't match the callback URL.`);
        } else if (errorCode === 'GOOGLE_TOKEN_EXCHANGE_FAILED') {
          throw new Error(`Google Token Exchange Failed: ${errorMessage}. Check GOOGLE_CLIENT_SECRET and redirect URI configuration.`);
        } else {
          throw new Error(`OAuth Callback Error (${errorCode || 'UNKNOWN'}): ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }
      }

      return data.data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Lost connection to TIRIS backend during authentication. Please try again.');
      }
      throw error;
    }
  }

  // Get current user profile
  async getCurrentUser(token: string): Promise<BackendUser> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to get user profile');
    }

    return data.data;
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Token refresh failed');
    }

    return data.data;
  }

  // Logout
  async logout(token: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }
  }

  // Google OAuth integration using backend flow only
  async loginWithGoogle(): Promise<AuthResponse> {
    return await this.backendGoogleLogin();
  }

  // Backend OAuth flow
  private async backendGoogleLogin(): Promise<AuthResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        if (DEBUG_MODE) {
          console.log('🔐 Starting Google OAuth flow...');
        }

        // Step 1: Get auth URL from backend
        const loginData = await this.initiateLogin('google');
        
        if (DEBUG_MODE) {
          console.log('✅ OAuth URL received from backend:', {
            auth_url: loginData.auth_url.substring(0, 80) + '...',
            state: loginData.state
          });
        }
        
        // Store state for validation
        sessionStorage.setItem('oauth_state', loginData.state);
        
        // Step 2: Open popup window
        const popup = window.open(
          loginData.auth_url,
          'oauth-login',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          reject(new Error('Popup blocked'));
          return;
        }

        // Step 3: Listen for callback
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            reject(new Error('Login cancelled'));
          }
        }, 1000);

        // Listen for messages from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'OAUTH_CALLBACK') {
            clearInterval(checkClosed);
            popup.close();
            window.removeEventListener('message', messageHandler);

            const { code, state } = event.data;
            const savedState = sessionStorage.getItem('oauth_state');
            
            if (state !== savedState) {
              reject(new Error('Invalid state parameter'));
              return;
            }

            try {
              // Step 4: Exchange code for tokens
              const authData = await this.handleCallback('google', code, state);
              sessionStorage.removeItem('oauth_state');
              resolve(authData);
            } catch (error) {
              reject(error);
            }
          }
        };

        window.addEventListener('message', messageHandler);
      } catch (error) {
        reject(error);
      }
    });
  }

  // WeChat OAuth integration using backend flow only
  async loginWithWeChat(): Promise<AuthResponse> {
    return await this.backendWeChatLogin();
  }

  // Backend WeChat OAuth flow
  private async backendWeChatLogin(): Promise<AuthResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        // Step 1: Get auth URL from backend
        const loginData = await this.initiateLogin('wechat');
        
        // Store state for validation
        sessionStorage.setItem('oauth_state', loginData.state);
        
        // Step 2: Open popup window
        const popup = window.open(
          loginData.auth_url,
          'oauth-login',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          reject(new Error('Popup blocked'));
          return;
        }

        // Step 3: Listen for callback
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            reject(new Error('Login cancelled'));
          }
        }, 1000);

        // Listen for messages from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'OAUTH_CALLBACK') {
            clearInterval(checkClosed);
            popup.close();
            window.removeEventListener('message', messageHandler);

            const { code, state } = event.data;
            const savedState = sessionStorage.getItem('oauth_state');
            
            if (state !== savedState) {
              reject(new Error('Invalid state parameter'));
              return;
            }

            try {
              // Step 4: Exchange code for tokens
              const authData = await this.handleCallback('wechat', code, state);
              sessionStorage.removeItem('oauth_state');
              resolve(authData);
            } catch (error) {
              reject(error);
            }
          }
        };

        window.addEventListener('message', messageHandler);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const authService = AuthService.getInstance();