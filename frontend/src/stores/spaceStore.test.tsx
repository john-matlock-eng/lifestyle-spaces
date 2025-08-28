import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SpaceProvider, useSpace } from './spaceStore';
import { createSpace, listSpaces, getSpace, inviteMember, acceptInvitation, getSpaceMembers } from '../services/spaces';
import type { CreateSpaceData, InvitationData, Space, Invitation, SpaceMember } from '../types';
import React from 'react';

// Mock the spaces service
vi.mock('../services/spaces', () => ({
  createSpace: vi.fn(),
  listSpaces: vi.fn(),
  getSpace: vi.fn(),
  inviteMember: vi.fn(),
  acceptInvitation: vi.fn(),
  getSpaceMembers: vi.fn(),
}));

const mockSpacesService = {
  createSpace: createSpace as ReturnType<typeof vi.fn>,
  listSpaces: listSpaces as ReturnType<typeof vi.fn>,
  getSpace: getSpace as ReturnType<typeof vi.fn>,
  inviteMember: inviteMember as ReturnType<typeof vi.fn>,
  acceptInvitation: acceptInvitation as ReturnType<typeof vi.fn>,
  getSpaceMembers: getSpaceMembers as ReturnType<typeof vi.fn>,
};

describe('SpaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SpaceProvider>{children}</SpaceProvider>
  );

  describe('Initial State', () => {
    it('should have initial state with empty arrays', () => {
      const { result } = renderHook(() => useSpace(), { wrapper });

      expect(result.current.spaces).toEqual([]);
      expect(result.current.currentSpace).toBeNull();
      expect(result.current.members).toEqual([]);
      expect(result.current.invitations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Create Space', () => {
    const mockCreateSpaceData: CreateSpaceData = {
      name: 'Test Space',
      description: 'A test space',
      isPublic: false,
    };

    const mockCreatedSpace: Space = {
      spaceId: 'space-123',
      name: 'Test Space',
      description: 'A test space',
      ownerId: 'user-123',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z',
      memberCount: 1,
      isPublic: false,
    };

    it('should successfully create a new space', async () => {
      mockSpacesService.createSpace.mockResolvedValue(mockCreatedSpace);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        const space = await result.current.createSpace(mockCreateSpaceData);
        expect(space).toEqual(mockCreatedSpace);
      });

      expect(mockSpacesService.createSpace).toHaveBeenCalledWith(mockCreateSpaceData);
      expect(result.current.spaces).toContain(mockCreatedSpace);
    });

    it('should handle create space errors', async () => {
      const mockError = new Error('Failed to create space');
      mockSpacesService.createSpace.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await expect(result.current.createSpace(mockCreateSpaceData))
          .rejects.toThrow('Failed to create space');
      });

      expect(result.current.error).toBe('Failed to create space');
    });
  });

  describe('Load Spaces', () => {
    const mockSpaces: Space[] = [
      {
        spaceId: 'space-1',
        name: 'Space 1',
        description: 'First space',
        ownerId: 'user-123',
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
        memberCount: 5,
        isPublic: true,
      },
      {
        spaceId: 'space-2',
        name: 'Space 2',
        description: 'Second space',
        ownerId: 'user-456',
        createdAt: '2023-12-02T00:00:00Z',
        updatedAt: '2023-12-02T00:00:00Z',
        memberCount: 3,
        isPublic: false,
      },
    ];

    it('should successfully load spaces', async () => {
      const mockResponse = {
        spaces: mockSpaces,
        total: 2,
        hasMore: false,
      };
      mockSpacesService.listSpaces.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await result.current.loadSpaces();
      });

      expect(mockSpacesService.listSpaces).toHaveBeenCalled();
      expect(result.current.spaces).toEqual(mockSpaces);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle load spaces errors', async () => {
      const mockError = new Error('Failed to load spaces');
      mockSpacesService.listSpaces.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await result.current.loadSpaces();
      });

      expect(result.current.error).toBe('Failed to load spaces');
      expect(result.current.spaces).toEqual([]);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockSpacesService.listSpaces.mockReturnValue(promise);

      const { result } = renderHook(() => useSpace(), { wrapper });

      // Start loading
      act(() => {
        result.current.loadSpaces();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete loading
      await act(async () => {
        resolvePromise!({ spaces: mockSpaces, total: 2, hasMore: false });
        await promise;
      });

      // Should not be loading
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Select Space', () => {
    const mockSpace: Space = {
      spaceId: 'space-123',
      name: 'Test Space',
      description: 'A test space',
      ownerId: 'user-123',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z',
      memberCount: 5,
      isPublic: false,
    };

    const mockMembers: SpaceMember[] = [
      {
        userId: 'user-123',
        email: 'owner@example.com',
        username: 'owner',
        displayName: 'Space Owner',
        role: 'owner',
        joinedAt: '2023-12-01T00:00:00Z',
      },
      {
        userId: 'user-456',
        email: 'member@example.com',
        username: 'member',
        displayName: 'Space Member',
        role: 'member',
        joinedAt: '2023-12-02T00:00:00Z',
      },
    ];

    it('should successfully select a space and load its members', async () => {
      mockSpacesService.getSpace.mockResolvedValue(mockSpace);
      mockSpacesService.getSpaceMembers.mockResolvedValue({
        members: mockMembers,
        total: 2,
        hasMore: false,
      });

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await result.current.selectSpace('space-123');
      });

      expect(mockSpacesService.getSpace).toHaveBeenCalledWith('space-123');
      expect(mockSpacesService.getSpaceMembers).toHaveBeenCalledWith('space-123');
      expect(result.current.currentSpace).toEqual(mockSpace);
      expect(result.current.members).toEqual(mockMembers);
    });

    it('should handle select space errors', async () => {
      const mockError = new Error('Space not found');
      mockSpacesService.getSpace.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await result.current.selectSpace('nonexistent-space');
      });

      expect(result.current.error).toBe('Space not found');
      expect(result.current.currentSpace).toBeNull();
    });
  });

  describe('Invite Member', () => {
    const mockInvitationData: InvitationData = {
      email: 'newmember@example.com',
      spaceId: 'space-123',
      role: 'member',
    };

    const mockInvitation: Invitation = {
      invitationId: 'invitation-123',
      spaceId: 'space-123',
      spaceName: 'Test Space',
      inviterEmail: 'owner@example.com',
      inviterDisplayName: 'Space Owner',
      inviteeEmail: 'newmember@example.com',
      role: 'member',
      status: 'pending',
      createdAt: '2023-12-01T00:00:00Z',
      expiresAt: '2023-12-08T00:00:00Z',
    };

    it('should successfully invite a member', async () => {
      mockSpacesService.inviteMember.mockResolvedValue(mockInvitation);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        const invitation = await result.current.inviteMember(mockInvitationData);
        expect(invitation).toEqual(mockInvitation);
      });

      expect(mockSpacesService.inviteMember).toHaveBeenCalledWith(mockInvitationData);
      expect(result.current.invitations).toContain(mockInvitation);
    });

    it('should handle invite member errors', async () => {
      const mockError = new Error('Failed to send invitation');
      mockSpacesService.inviteMember.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await expect(result.current.inviteMember(mockInvitationData))
          .rejects.toThrow('Failed to send invitation');
      });

      expect(result.current.error).toBe('Failed to send invitation');
    });
  });

  describe('Accept Invitation', () => {
    const mockInvitation: Invitation = {
      invitationId: 'invitation-123',
      spaceId: 'space-123',
      spaceName: 'Test Space',
      inviterEmail: 'owner@example.com',
      inviterDisplayName: 'Space Owner',
      inviteeEmail: 'newmember@example.com',
      role: 'member',
      status: 'accepted',
      createdAt: '2023-12-01T00:00:00Z',
      expiresAt: '2023-12-08T00:00:00Z',
    };

    it('should successfully accept an invitation', async () => {
      mockSpacesService.acceptInvitation.mockResolvedValue(mockInvitation);

      const { result } = renderHook(() => useSpace(), { wrapper });

      // Set initial invitation
      act(() => {
        (result.current as { _setInvitations: (invitations: Invitation[]) => void })._setInvitations([{ ...mockInvitation, status: 'pending' }]);
      });

      await act(async () => {
        const invitation = await result.current.acceptInvitation('invitation-123');
        expect(invitation).toEqual(mockInvitation);
      });

      expect(mockSpacesService.acceptInvitation).toHaveBeenCalledWith('invitation-123');
      
      // Check that invitation status was updated
      const updatedInvitation = result.current.invitations.find(
        inv => inv.invitationId === 'invitation-123'
      );
      expect(updatedInvitation?.status).toBe('accepted');
    });

    it('should handle accept invitation errors', async () => {
      const mockError = new Error('Invitation not found');
      mockSpacesService.acceptInvitation.mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpace(), { wrapper });

      await act(async () => {
        await expect(result.current.acceptInvitation('invalid-invitation'))
          .rejects.toThrow('Invitation not found');
      });

      expect(result.current.error).toBe('Invitation not found');
    });
  });

  describe('Error Handling', () => {
    it('should provide clearError function', async () => {
      const { result } = renderHook(() => useSpace(), { wrapper });

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

    it('should clear error when performing successful operations', async () => {
      const mockSpace: Space = {
        spaceId: 'space-123',
        name: 'Test Space',
        description: 'A test space',
        ownerId: 'user-123',
        createdAt: '2023-12-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
        memberCount: 1,
        isPublic: false,
      };

      mockSpacesService.createSpace.mockResolvedValue(mockSpace);

      const { result } = renderHook(() => useSpace(), { wrapper });

      // Set initial error
      act(() => {
        (result.current as { _setError: (error: string) => void })._setError('Previous error');
      });

      expect(result.current.error).toBe('Previous error');

      // Perform successful operation
      await act(async () => {
        await result.current.createSpace({
          name: 'Test Space',
          description: 'A test space',
        });
      });

      expect(result.current.error).toBeNull();
    });
  });
});