import { apiService } from './api';
import type { 
  CreateSpaceData, 
  InvitationData, 
  Space, 
  Invitation, 
  SpaceListResponse, 
  SpaceFilters, 
  PaginationParams,
  SpaceMemberRole,
  MembersListResponse
} from '../types';

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate space member role
 */
const isValidRole = (role: string): role is SpaceMemberRole => {
  return ['owner', 'admin', 'member'].includes(role);
};

/**
 * Create a new space
 */
export const createSpace = async (spaceData: CreateSpaceData): Promise<Space> => {
  const { name, description, isPublic } = spaceData;

  // Validate required fields
  if (!name || name.trim() === '') {
    throw new Error('Space name is required');
  }

  // Validate field lengths
  if (name.length > 100) {
    throw new Error('Space name must be 100 characters or less');
  }

  if (description && description.length > 500) {
    throw new Error('Space description must be 500 characters or less');
  }

  const response = await apiService.post('/api/spaces', {
    name: name.trim(),
    description: description?.trim() || '',
    isPublic: isPublic || false,
  });

  // Validate response has expected Space properties
  if (!response || typeof response !== 'object' || !('spaceId' in response)) {
    throw new Error('Invalid space data received from API');
  }
  return response as Space;
};

/**
 * List spaces for the current user
 */
export const listSpaces = async (
  filters: SpaceFilters = {}, 
  pagination: PaginationParams = {}
): Promise<SpaceListResponse> => {
  const params = {
    ...filters,
    ...pagination,
  };

  // Build query string for GET request
  const queryString = Object.keys(params).length > 0 
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  const response = await apiService.get(`/api/users/spaces${queryString}`);

  // Validate response has expected SpaceListResponse structure
  if (!response || typeof response !== 'object' || !('spaces' in response)) {
    throw new Error('Invalid space list data received from API');
  }
  return response as SpaceListResponse;
};

/**
 * Get a specific space by ID
 */
export const getSpace = async (spaceId: string): Promise<Space> => {
  if (!spaceId || spaceId.trim() === '') {
    throw new Error('Space ID is required');
  }

  const response = await apiService.get(`/api/spaces/${spaceId}`);
  // Validate response has expected Space properties
  if (!response || typeof response !== 'object' || !('spaceId' in response)) {
    throw new Error('Invalid space data received from API');
  }
  return response as Space;
};

/**
 * Invite a member to a space
 */
export const inviteMember = async (invitationData: InvitationData): Promise<Invitation> => {
  const { email, spaceId, role } = invitationData;

  // Validate required fields
  if (!email || !spaceId) {
    throw new Error('Email and space ID are required');
  }

  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate role if provided
  if (role && !isValidRole(role)) {
    throw new Error('Invalid role. Must be one of: owner, admin, member');
  }

  const response = await apiService.post('/api/invitations', {
    email: email.trim().toLowerCase(),
    spaceId: spaceId.trim(),
    role: role || 'member',
  });

  // Validate response has expected Invitation properties
  if (!response || typeof response !== 'object' || !('invitationId' in response)) {
    throw new Error('Invalid invitation data received from API');
  }
  return response as Invitation;
};

/**
 * Accept an invitation to join a space
 */
export const acceptInvitation = async (invitationId: string): Promise<Invitation> => {
  if (!invitationId || invitationId.trim() === '') {
    throw new Error('Invitation ID is required');
  }

  const response = await apiService.put(`/api/invitations/${invitationId}/accept`, {});
  // Validate response has expected Invitation properties
  if (!response || typeof response !== 'object' || !('invitationId' in response)) {
    throw new Error('Invalid invitation data received from API');
  }
  return response as Invitation;
};

/**
 * Decline an invitation to join a space
 */
export const declineInvitation = async (invitationId: string): Promise<Invitation> => {
  if (!invitationId || invitationId.trim() === '') {
    throw new Error('Invitation ID is required');
  }

  const response = await apiService.put(`/api/invitations/${invitationId}/decline`, {});
  // Validate response has expected Invitation properties
  if (!response || typeof response !== 'object' || !('invitationId' in response)) {
    throw new Error('Invalid invitation data received from API');
  }
  return response as Invitation;
};

/**
 * Get pending invitations for the current user
 */
export const getPendingInvitations = async (): Promise<Invitation[]> => {
  const response = await apiService.get('/api/invitations/pending') as { invitations?: Invitation[] };
  return response.invitations || [];
};

/**
 * Get members of a space
 */
export const getSpaceMembers = async (spaceId: string): Promise<MembersListResponse> => {
  if (!spaceId || spaceId.trim() === '') {
    throw new Error('Space ID is required');
  }

  const response = await apiService.get(`/api/spaces/${spaceId}/members`);
  // Validate response has expected MembersListResponse structure
  if (!response || typeof response !== 'object' || !('members' in response)) {
    throw new Error('Invalid members list data received from API');
  }
  return response as MembersListResponse;
};