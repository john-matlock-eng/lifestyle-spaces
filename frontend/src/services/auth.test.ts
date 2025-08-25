import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUp, signIn, signOut, refreshToken, getCurrentUser, configureAmplify } from './auth';
import { SignUpData, SignInData } from '../types';
import * as AmplifyAuth from '@aws-amplify/auth';

// Mock AWS Amplify Auth
vi.mock('@aws-amplify/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  configure: vi.fn(),
}));

const mockAmplifyAuth = AmplifyAuth as typeof AmplifyAuth & {
  signUp: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
  fetchAuthSession: ReturnType<typeof vi.fn>;
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

      expect(mockAmplifyAuth.configure).toHaveBeenCalledWith({
        Auth: {
          Cognito: {
            region: mockConfig.region,
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
            preferred_username: mockSignUpData.username,
            name: mockSignUpData.displayName,
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

      mockAmplifyAuth.signIn.mockResolvedValue(mockSignInResponse);
      mockAmplifyAuth.fetchAuthSession.mockResolvedValue(mockSession);
      mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);

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
          displayName: 'testuser',
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

      mockAmplifyAuth.getCurrentUser.mockResolvedValue(mockUser);

      const result = await getCurrentUser();

      expect(result).toEqual({
        userId: 'test-user-id',
        email: 'testuser',
        username: 'testuser',
        displayName: 'testuser',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return null if no user is authenticated', async () => {
      mockAmplifyAuth.getCurrentUser.mockRejectedValue(new Error('No user'));

      const result = await getCurrentUser();

      expect(result).toBeNull();
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
  });
});