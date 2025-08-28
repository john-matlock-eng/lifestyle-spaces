import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpace, listSpaces, getSpace, inviteMember, acceptInvitation } from './spaces';
import type { CreateSpaceData, InvitationData, Space, Invitation, SpaceListResponse } from '../types';
import { apiService } from './api';

// Mock the API service
vi.mock('./api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiService = apiService as typeof apiService & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('Spaces Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createSpace', () => {
    const mockCreateSpaceData: CreateSpaceData = {
      name: 'Test Space',
      description: 'A test space for unit tests',
      isPublic: false,
    };

    const mockCreatedSpace: Space = {
      spaceId: 'space-123',
      name: 'Test Space',
      description: 'A test space for unit tests',
      ownerId: 'user-123',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z',
      memberCount: 1,
      isPublic: false,
    };

    it('should successfully create a new space', async () => {
      mockApiService.post.mockResolvedValue(mockCreatedSpace);

      const result = await createSpace(mockCreateSpaceData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/spaces', mockCreateSpaceData);
      expect(result).toEqual(mockCreatedSpace);
    });

    it('should handle create space errors', async () => {
      const mockError = new Error('Failed to create space');
      mockApiService.post.mockRejectedValue(mockError);

      await expect(createSpace(mockCreateSpaceData)).rejects.toThrow('Failed to create space');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        description: 'test',
      };

      await expect(createSpace(invalidData)).rejects.toThrow('Space name is required');
    });

    it('should validate name length', async () => {
      const invalidData = {
        name: 'a'.repeat(101),
        description: 'test',
      };

      await expect(createSpace(invalidData)).rejects.toThrow('Space name must be 100 characters or less');
    });

    it('should validate description length', async () => {
      const invalidData = {
        name: 'Test Space',
        description: 'a'.repeat(501),
      };

      await expect(createSpace(invalidData)).rejects.toThrow('Space description must be 500 characters or less');
    });
  });

  describe('listSpaces', () => {
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

    const mockResponse: SpaceListResponse = {
      spaces: mockSpaces,
      total: 2,
      hasMore: false,
    };

    it('should successfully list user spaces', async () => {
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await listSpaces();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/users/spaces');
      expect(result).toEqual(mockResponse);
    });

    it('should list spaces with filters', async () => {
      const filters = { search: 'Space 1', isPublic: true };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await listSpaces(filters);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/users/spaces?search=Space+1&isPublic=true');
      expect(result).toEqual(mockResponse);
    });

    it('should list spaces with pagination', async () => {
      const pagination = { limit: 10, offset: 0 };
      mockApiService.get.mockResolvedValue(mockResponse);

      const result = await listSpaces({}, pagination);

      expect(mockApiService.get).toHaveBeenCalledWith('/api/users/spaces?limit=10&offset=0');
      expect(result).toEqual(mockResponse);
    });

    it('should handle list spaces errors', async () => {
      const mockError = new Error('Failed to list spaces');
      mockApiService.get.mockRejectedValue(mockError);

      await expect(listSpaces()).rejects.toThrow('Failed to list spaces');
    });
  });

  describe('getSpace', () => {
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

    it('should successfully get a space by ID', async () => {
      mockApiService.get.mockResolvedValue(mockSpace);

      const result = await getSpace('space-123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/spaces/space-123');
      expect(result).toEqual(mockSpace);
    });

    it('should handle get space errors', async () => {
      const mockError = new Error('Space not found');
      mockApiService.get.mockRejectedValue(mockError);

      await expect(getSpace('nonexistent-space')).rejects.toThrow('Space not found');
    });

    it('should validate space ID', async () => {
      await expect(getSpace('')).rejects.toThrow('Space ID is required');
    });
  });

  describe('inviteMember', () => {
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

    it('should successfully invite a member to a space', async () => {
      mockApiService.post.mockResolvedValue(mockInvitation);

      const result = await inviteMember(mockInvitationData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/invitations', mockInvitationData);
      expect(result).toEqual(mockInvitation);
    });

    it('should handle invite member errors', async () => {
      const mockError = new Error('Failed to send invitation');
      mockApiService.post.mockRejectedValue(mockError);

      await expect(inviteMember(mockInvitationData)).rejects.toThrow('Failed to send invitation');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: '',
        spaceId: 'space-123',
      };

      await expect(inviteMember(invalidData)).rejects.toThrow('Email and space ID are required');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        spaceId: 'space-123',
      };

      await expect(inviteMember(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should validate role if provided', async () => {
      const invalidData = {
        email: 'test@example.com',
        spaceId: 'space-123',
        role: 'invalid-role' as 'admin',
      };

      await expect(inviteMember(invalidData)).rejects.toThrow('Invalid role. Must be one of: owner, admin, member');
    });
  });

  describe('acceptInvitation', () => {
    const mockAcceptedInvitation: Invitation = {
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
      mockApiService.put.mockResolvedValue(mockAcceptedInvitation);

      const result = await acceptInvitation('invitation-123');

      expect(mockApiService.put).toHaveBeenCalledWith('/api/invitations/invitation-123/accept', {});
      expect(result).toEqual(mockAcceptedInvitation);
    });

    it('should handle accept invitation errors', async () => {
      const mockError = new Error('Invitation not found or expired');
      mockApiService.put.mockRejectedValue(mockError);

      await expect(acceptInvitation('invalid-invitation')).rejects.toThrow('Invitation not found or expired');
    });

    it('should validate invitation ID', async () => {
      await expect(acceptInvitation('')).rejects.toThrow('Invitation ID is required');
    });
  });
});