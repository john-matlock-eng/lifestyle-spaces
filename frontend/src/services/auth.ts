import { signUp as amplifySignUp, signIn as amplifySignIn, signOut as amplifySignOut, getCurrentUser as amplifyGetCurrentUser, fetchAuthSession, fetchUserAttributes } from '@aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import type { SignUpData, SignInData, AuthResponse, TokenRefreshResponse, User } from '../types';

/**
 * Configure AWS Amplify Auth with Cognito settings
 */
export const configureAmplify = (_region: string, userPoolId: string, userPoolClientId: string): void => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
};

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Sign up a new user
 */
export const signUp = async (signUpData: SignUpData): Promise<{ isSignUpComplete: boolean; nextStep: { signUpStep: string } }> => {
  const { email, password, username, displayName } = signUpData;

  // Validate required fields
  if (!email || !password || !username || !displayName) {
    throw new Error('All fields are required');
  }

  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password strength
  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters long');
  }

  const response = await amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        'custom:username': username,
        'custom:displayName': displayName,
        'custom:userId': crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      },
    },
  });

  return response;
};

/**
 * Sign in an existing user
 */
export const signIn = async (signInData: SignInData): Promise<AuthResponse> => {
  const { email, password } = signInData;

  // Validate required fields
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const signInResponse = await amplifySignIn({
    username: email,
    password,
  });

  if (signInResponse.isSignedIn) {
    // Get auth session for tokens
    const session = await fetchAuthSession();
    const currentUser = await amplifyGetCurrentUser();
    const userAttributes = await fetchUserAttributes();

    const user: User = {
      userId: userAttributes['custom:userId'] || currentUser.userId,
      email: userAttributes.email || email,
      username: userAttributes['custom:username'] || currentUser.username,
      displayName: userAttributes['custom:displayName'] || currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      user,
      accessToken: session.tokens?.accessToken?.toString() || '',
      idToken: session.tokens?.idToken?.toString() || '',
      refreshToken: '', // Refresh token is handled automatically by Amplify
    };
  } else {
    throw new Error('Sign in incomplete');
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  await amplifySignOut();
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const currentUser = await amplifyGetCurrentUser();
    const userAttributes = await fetchUserAttributes();

    // IMPORTANT: Use 'sub' as userId to match backend
    // The backend uses Cognito 'sub' as the primary user identifier
    return {
      userId: userAttributes.sub || currentUser.userId,
      email: userAttributes.email || currentUser.username,
      username: userAttributes['custom:username'] || currentUser.username,
      displayName: userAttributes['custom:displayName'] || currentUser.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

/**
 * Refresh authentication tokens
 */
export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  const session = await fetchAuthSession();
  
  return {
    accessToken: session.tokens?.accessToken?.toString() || '',
    idToken: session.tokens?.idToken?.toString() || '',
  };
};