import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService, type BackendUser } from '../services/auth';

export type AuthProvider = 'google' | 'wechat';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: AuthProvider;
  settings?: {
    timezone: string;
    currency: string;
    notifications: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  justSignedIn: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithWeChat: () => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const convertBackendUserToUser = (backendUser: BackendUser): User => {
  return {
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.username,
    picture: backendUser.avatar,
    provider: backendUser.info.oauth_provider as AuthProvider,
    settings: backendUser.settings,
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Token management
  const getTokens = () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const expiresAt = localStorage.getItem('token_expires_at');
    
    return { accessToken, refreshToken, expiresAt };
  };

  const setTokens = (accessToken: string, refreshToken: string, expiresIn: number) => {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('token_expires_at', expiresAt.toString());
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
  };

  // Check if token needs refresh
  const isTokenExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt) - 60000; // Refresh 1 minute before expiry
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<void> => {
    const { refreshToken } = getTokens();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const { access_token, expires_in } = await authService.refreshToken(refreshToken);
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('token_expires_at', (Date.now() + expires_in * 1000).toString());
      
      // Get updated user profile
      const backendUser = await authService.getCurrentUser(access_token);
      setUser(convertBackendUserToUser(backendUser));
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  // Restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { accessToken, refreshToken, expiresAt } = getTokens();
        
        if (!accessToken || !refreshToken) {
          setIsLoading(false);
          return;
        }

        // Check if token needs refresh
        if (isTokenExpired(expiresAt)) {
          await refreshAuth();
        } else {
          // Token is still valid, get user profile
          const backendUser = await authService.getCurrentUser(accessToken);
          setUser(convertBackendUserToUser(backendUser));
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Auto refresh token before expiry
  useEffect(() => {
    if (!user) return;

    const checkAndRefreshToken = async () => {
      const { expiresAt } = getTokens();
      if (isTokenExpired(expiresAt)) {
        try {
          await refreshAuth();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefreshToken, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Reset justSignedIn flag after showing status
  useEffect(() => {
    if (justSignedIn) {
      const timer = setTimeout(() => {
        setJustSignedIn(false);
      }, 5000); // Reset after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [justSignedIn]);

  const loginWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.loginWithGoogle();
      
      // Store tokens
      setTokens(authData.access_token, authData.refresh_token, authData.expires_in);
      
      // Set user
      setUser(convertBackendUserToUser(authData.user));
      
      // Mark as just signed in
      setJustSignedIn(true);
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWeChat = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.loginWithWeChat();
      
      // Store tokens
      setTokens(authData.access_token, authData.refresh_token, authData.expires_in);
      
      // Set user
      setUser(convertBackendUserToUser(authData.user));
      
      // Mark as just signed in
      setJustSignedIn(true);
    } catch (error) {
      console.error('WeChat login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, fullName: string): Promise<void> => {
    try {
      setIsLoading(true);
      const authData = await authService.signUpWithEmailPassword(email, password, fullName);
      
      // Store tokens
      setTokens(authData.access_token, authData.refresh_token, authData.expires_in);
      
      // Set user
      setUser(convertBackendUserToUser(authData.user));
      
      // Mark as just signed in
      setJustSignedIn(true);
    } catch (error) {
      console.error('Email/Password signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const { accessToken } = getTokens();
    
    if (accessToken) {
      try {
        await authService.logout(accessToken);
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    // Clear local state and tokens
    setUser(null);
    clearTokens();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    justSignedIn,
    loginWithGoogle,
    loginWithWeChat,
    signUpWithEmailPassword,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};