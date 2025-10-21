// Authentication related types

export interface User {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  idToken: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  idToken: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}