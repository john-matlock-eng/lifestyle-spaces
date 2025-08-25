import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, signUp, refreshToken, configureAmplify } from '../services/auth';
import { SignInData, SignUpData, User, AuthState } from '../types';

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Auth context interface
interface AuthContextType extends AuthState {
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<any>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshTokens: () => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Configure Amplify on mount
  useEffect(() => {
    // Configure Amplify with environment variables or defaults
    const region = process.env.REACT_APP_AWS_REGION || 'us-east-1';
    const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID || '';
    const userPoolClientId = process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID || '';

    if (userPoolId && userPoolClientId) {
      configureAmplify(region, userPoolId, userPoolClientId);
    }
  }, []);

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const user = await getCurrentUser();
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  const handleSignIn = async (data: SignInData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const authResponse = await signIn(data);
      dispatch({ type: 'SET_USER', payload: authResponse.user });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleSignUp = async (data: SignUpData): Promise<any> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await signUp(data);
      dispatch({ type: 'SET_LOADING', payload: false });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      await signOut();
      dispatch({ type: 'SET_USER', payload: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleClearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const handleRefreshTokens = async (): Promise<void> => {
    try {
      await refreshToken();
      // Tokens are handled automatically by Amplify
    } catch (error) {
      // If refresh fails, sign out the user
      dispatch({ type: 'SET_USER', payload: null });
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    clearError: handleClearError,
    refreshTokens: handleRefreshTokens,
  };

  // Add internal methods for testing
  if (process.env.NODE_ENV === 'test') {
    (contextValue as any)._setUser = (user: User | null) => {
      dispatch({ type: 'SET_USER', payload: user });
    };
    (contextValue as any)._setError = (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    };
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};