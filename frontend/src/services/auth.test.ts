import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUp, signIn, signOut, refreshToken, getCurrentUser, configureAmplify } from './auth';
import { SignUpData, SignInData } from '../types';
import * as AmplifyAuth from '@aws-amplify/auth';
import { Amplify } from 'aws-amplify';

// Mock AWS Amplify Auth
vi.mock('@aws-amplify/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  fetchUserAttributes: vi.fn(),
}));

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

const mockAmplifyAuth = AmplifyAuth as typeof AmplifyAuth & {
  signUp: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
  fetchAuthSession: ReturnType<typeof vi.fn>;
  fetchUserAttributes: ReturnType<typeof vi.fn>;
};

const mockAmplify = Amplify as typeof Amplify & {
  configure: ReturnType<typeof vi.fn>;
};

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('configureAmplify', () => {
    it('should configure Amplify with correct parameters', () => {
      const mockConfig = {
        region: 'us-east-1',
        userPoolId: 'us-east-1_test123',
        userPoolClientId: 'test-client-id',
      };

      configureAmplify(mockConfig.region, mockConfig.userPoolId, mockConfig.userPoolClientId);

      expect(mockAmplify.configure).toHaveBeenCalledWith({
        Auth: {
          Cognito: {
            userPoolId: mockConfig.userPoolId,
            userPoolClientId: mockConfig.userPoolClientId,
          },
        },
      });
    });
  });

  describe('signUp', () => {
    const mockSignUpData: SignUpData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser',
      displayName: 'Test User',
    };

    it('should successfully sign up a new user', async () => {
      const mockResponse = {
        isSignUpComplete: true,
        userId: 'test-user-id',
      };
      mockAmplifyAuth.signUp.mockResolvedValue(mockResponse);

      const result = await signUp(mockSignUpData);

      expect(mockAmplifyAuth.signUp).toHaveBeenCalledWith({
        username: mockSignUpData.email,
        password: mockSignUpData.password,
        options: {
          userAttributes: {
            email: mockSignUpData.email,
            'custom:username': mockSignUpData.username,
            'custom:displayName': mockSignUpData.displayName,
            'custom:userId': expect.any(String),
          },
        },
      });

      expect(result).toEqual({
        isSignUpComplete: true,
        userId: 'test-user-id',
      });
    });

    it('should handle sign up errors', async () => {
      const mockError = new Error('User already exists');
      mockAmplifyAuth.signUp.mockRejectedValue(mockError);

      await expect(signUp(mockSignUpData)).rejects.toThrow('User already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: '',
        password: 'test',
        username: '',
        displayName: '',
      };

      await expect(signUp(invalidData)).rejects.toThrow('All fields are required');
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...mockSignUpData,
        email: 'invalid-email',
      };

      await expect(signUp(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      const invalidData = {
        ...mockSignUpData,
        password: '123',
      };

      await expect(signUp(invalidData)).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('signIn', () => {
    const mockSignInData: SignInData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    it('should successfully sign in a user', async () => {
      const mockSignInResponse = {
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      };
      
      const mockSession = {
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
          },
          idToken: {
            toString: () => 'mock-id-token',
          },
        },
      };

      const mockUser = {
        userId: 'test-user-id',
        username: 'testuser',
      };

      const mockUserAttributes = {
        email: 'test@example.com',
        'custom:userId': 'test-user-id',
        'custom:username': 'testuser',
        'custom:displayName': 'Test User',
      };

      mockAmplifyAuth.signIn.mockResolvedValue(mockSignInResponse);
      mockAmplifyAuth.fetchAuthSession.mockResolvedValue(mockSession);
      mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);
      mockAmplifyAuth.fetchUserAttributes.mockResolvedValue(mockUserAttributes);

      const result = await signIn(mockSignInData);

      expect(mockAmplifyAuth.signIn).toHaveBeenCalledWith({
        username: mockSignInData.email,
        password: mockSignInData.password,
      });

      expect(result).toEqual({
        user: {
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        refreshToken: '',
      });
    });

    it('should handle sign in errors', async () => {
      const mockError = new Error('Invalid credentials');
      mockAmplifyAuth.signIn.mockRejectedValue(mockError);

      await expect(signIn(mockSignInData)).rejects.toThrow('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const invalidData = { email: '', password: '' };

      await expect(signIn(invalidData)).rejects.toThrow('Email and password are required');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      mockAmplifyAuth.signOut.mockResolvedValue(undefined);

      await signOut();

      expect(mockAmplifyAuth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed');
      mockAmplifyAuth.signOut.mockRejectedValue(mockError);

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      const mockUser = {
        userId: 'test-user-id',
        username: 'testuser',
      };

      const mockUserAttributes = {
        email: 'test@example.com',
        'custom:userId': 'test-user-id',
        'custom:username': 'testuser',
        'custom:displayName': 'Test User',
      };

      mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);
      mockAmplifyAuth.fetchUserAttributes.mockResolvedValue(mockUserAttributes);

      const result = await getCurrentUser();

      expect(result).toEqual({
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return null if no user is authenticated', async () => {
      mockAmplifyAuth.getCurrentUser.mockRejectedValue(new Error('No user'));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle missing user attributes with fallbacks', async () => {
      const mockUser = {
        userId: 'fallback-user-id',
        username: 'fallback-username',
      };

      // Mock user attributes that are missing some custom fields (lines 129-132)
      const mockUserAttributes = {
        email: 'user@example.com',
        // Missing custom:userId, custom:username, custom:displayName
      };

      mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);
      mockAmplifyAuth.fetchUserAttributes.mockResolvedValue(mockUserAttributes);

      const result = await getCurrentUser();

      // Should use fallbacks when custom attributes are missing (lines 129-132)
      expect(result).toEqual({
        userId: 'fallback-user-id', // Falls back to currentUser.userId
        email: 'user@example.com',
        username: 'fallback-username', // Falls back to currentUser.username
        displayName: 'fallback-username', // Falls back to currentUser.username
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const mockSession = {
        tokens: {
          accessToken: {
            toString: () => 'new-access-token',
          },
          idToken: {
            toString: () => 'new-id-token',
          },
        },
      };

      mockAmplifyAuth.fetchAuthSession.mockResolvedValue(mockSession);

      const result = await refreshToken();

      expect(result).toEqual({
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
      });
    });

    it('should handle refresh token errors', async () => {
      mockAmplifyAuth.fetchAuthSession.mockRejectedValue(new Error('Token refresh failed'));

      await expect(refreshToken()).rejects.toThrow('Token refresh failed');
    });

    it('should handle missing tokens with empty string fallbacks', async () => {
      const mockSession = {
        tokens: null, // No tokens available (lines 148-149)
      };

      mockAmplifyAuth.fetchAuthSession.mockResolvedValue(mockSession);

      const result = await refreshToken();

      // Should return empty strings as fallbacks (lines 148-149)
      expect(result).toEqual({
        accessToken: '',
        idToken: '',
      });
    });
  });

  it('should handle sign in incomplete error', async () => {
    // Mock sign in returning a response that is not fully signed in
    mockAmplifyAuth.signIn.mockResolvedValue({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_UP' },
    });

    const signInData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    // This covers lines 109-110 - the "Sign in incomplete" error
    await expect(signIn(signInData)).rejects.toThrow('Sign in incomplete');
    
    expect(mockAmplifyAuth.signIn).toHaveBeenCalledWith({
      username: signInData.email,
      password: signInData.password,
    });
  });

  it('should handle crypto.randomUUID fallback in signUp', async () => {
    // Mock crypto.randomUUID to be undefined to test fallback (line 63)
    const originalRandomUUID = global.crypto?.randomUUID;
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: undefined },
      configurable: true,
    });

    const mockResponse = {
      isSignUpComplete: false,
      nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
    };

    mockAmplifyAuth.signUp.mockResolvedValue(mockResponse);

    const signUpData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      displayName: 'Test User',
    };

    await signUp(signUpData);

    // Verify signUp was called and would use Date.now().toString() fallback
    expect(mockAmplifyAuth.signUp).toHaveBeenCalledWith({
      username: signUpData.email,
      password: signUpData.password,
      options: {
        userAttributes: {
          email: signUpData.email,
          'custom:username': signUpData.username,
          'custom:displayName': signUpData.displayName,
          'custom:userId': expect.any(String), // Will be Date.now().toString()
        },
      },
    });

    // Restore original crypto.randomUUID
    if (originalRandomUUID) {
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: originalRandomUUID },
        configurable: true,
      });
    }
  });

  it('should handle missing user attributes with fallbacks in signIn', async () => {
    const mockSignInResponse = {
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    };
    
    const mockSession = {
      tokens: {
        accessToken: {
          toString: () => 'mock-access-token',
        },
        idToken: {
          toString: () => 'mock-id-token',
        },
      },
    };

    const mockUser = {
      userId: 'test-user-id',
      username: 'testuser',
    };

    // Return empty attributes to test fallbacks (lines 94-105)
    const mockUserAttributes = {};

    mockAmplifyAuth.signIn.mockResolvedValue(mockSignInResponse);
    mockAmplifyAuth.fetchAuthSession.mockResolvedValue(mockSession);
    mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);
    mockAmplifyAuth.fetchUserAttributes.mockResolvedValue(mockUserAttributes);

    const signInData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    const result = await signIn(signInData);

    // Should use fallback values from currentUser when attributes are missing
    expect(result.user).toEqual({
      userId: 'test-user-id', // Falls back to currentUser.userId
      email: 'test@example.com', // Falls back to email parameter
      username: 'testuser', // Falls back to currentUser.username  
      displayName: 'testuser', // Falls back to currentUser.username
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should handle missing email in getCurrentUser with username fallback', async () => {
    const mockUser = {
      userId: 'test-user-id', 
      username: 'testuser',
    };

    // Return attributes without email to test fallback (line 130)
    const mockUserAttributes = {
      'custom:userId': 'test-user-id',
      'custom:username': 'testuser',
      'custom:displayName': 'Test User',
      // No email attribute
    };

    mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);
    mockAmplifyAuth.fetchUserAttributes.mockResolvedValue(mockUserAttributes);

    const result = await getCurrentUser();

    // Should use currentUser.username as fallback for missing email (line 130)
    expect(result.email).toBe('testuser');
  });
});
