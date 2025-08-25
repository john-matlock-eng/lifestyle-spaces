import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './authStore';
import { signIn, signOut, getCurrentUser, signUp, refreshToken } from '../services/auth';
import { SignInData, SignUpData, User, AuthResponse } from '../types';
import React from 'react';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  signUp: vi.fn(),
  refreshToken: vi.fn(),
  configureAmplify: vi.fn(),
}));

const mockAuthService = {
  signIn: signIn as ReturnType<typeof vi.fn>,
  signOut: signOut as ReturnType<typeof vi.fn>,
  getCurrentUser: getCurrentUser as ReturnType<typeof vi.fn>,
  signUp: signUp as ReturnType<typeof vi.fn>,
  refreshToken: refreshToken as ReturnType<typeof vi.fn>,
};

describe('AuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getCurrentUser to prevent unhandled promises
    mockAuthService.getCurrentUser.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initial State', () => {
    it('should have initial state with no user', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true); // Loading on mount to check existing session
      expect(result.current.error).toBeNull();

      // Wait for the auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Sign Up', () => {
    const mockSignUpData: SignUpData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser',
      displayName: 'Test User',
    };

    it('should successfully sign up a user', async () => {
      const mockResponse = {
        isSignUpComplete: true,
        userId: 'test-user-id',
      };
      mockAuthService.signUp.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const response = await result.current.signUp(mockSignUpData);
        expect(response).toEqual(mockResponse);
      });

      expect(mockAuthService.signUp).toHaveBeenCalledWith(mockSignUpData);
    });

    it('should handle sign up errors', async () => {
      const mockError = new Error('Sign up failed');
      mockAuthService.signUp.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signUp(mockSignUpData)).rejects.toThrow('Sign up failed');
      });

      expect(result.current.error).toBe('Sign up failed');
    });
  });

  describe('Sign In', () => {
    const mockSignInData: SignInData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    const mockUser: User = {
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z',
    };

    const mockAuthResponse: AuthResponse = {
      user: mockUser,
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
    };

    it('should successfully sign in a user', async () => {
      mockAuthService.signIn.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn(mockSignInData);
      });

      expect(mockAuthService.signIn).toHaveBeenCalledWith(mockSignInData);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign in errors', async () => {
      const mockError = new Error('Invalid credentials');
      mockAuthService.signIn.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn(mockSignInData)).rejects.toThrow('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during sign in', async () => {
      let resolvePromise: (value: AuthResponse) => void;
      const promise = new Promise<AuthResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockAuthService.signIn.mockReturnValue(promise);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start sign in
      act(() => {
        result.current.signIn(mockSignInData);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete sign in
      await act(async () => {
        resolvePromise!(mockAuthResponse);
        await promise;
      });

      // Should not be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Sign Out', () => {
    it('should successfully sign out a user', async () => {
      mockAuthService.signOut.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First set a user
      act(() => {
        (result.current as { _setUser: (user: User) => void })._setUser({
          userId: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          createdAt: '2023-12-01T00:00:00Z',
          updatedAt: '2023-12-01T00:00:00Z',
        });
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed');
      mockAuthService.signOut.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signOut()).rejects.toThrow('Sign out failed');
      });

      expect(result.current.error).toBe('Sign out failed');
    });
  });

  describe('Check Authentication', () => {
    it('should check for existing authentication on mount', async () => {
      const mockUser: User = {
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
      };
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for the effect to run
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle no existing authentication', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for the effect to run
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when signing in after an error', async () => {
      const mockError = new Error('Initial error');
      const mockUser: User = {
        userId: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
      };
      const mockAuthResponse: AuthResponse = {
        user: mockUser,
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.signIn
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First sign in fails
      await act(async () => {
        await expect(result.current.signIn({ email: 'test@example.com', password: 'wrong' }))
          .rejects.toThrow('Initial error');
      });

      expect(result.current.error).toBe('Initial error');

      // Second sign in succeeds
      await act(async () => {
        await result.current.signIn({ email: 'test@example.com', password: 'correct' });
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should provide clearError function', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set an error
      act(() => {
        (result.current as { _setError: (error: string) => void })._setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});