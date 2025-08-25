import { apiService } from './api';
import { 
  CreateSpaceData, 
  InvitationData, 
  Space, 
  Invitation, 
  SpaceListResponse, 
  SpaceFilters, 
  PaginationParams,
  SpaceMemberRole
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

  try {
    const response = await apiService.post('/spaces', {
      name: name.trim(),
      description: description?.trim() || '',
      isPublic: isPublic || false,
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * List spaces for the current user
 */
export const listSpaces = async (
  filters: SpaceFilters = {}, 
  pagination: PaginationParams = {}
): Promise<SpaceListResponse> => {
  try {
    const params = {
      ...filters,
      ...pagination,
    };

    const response = await apiService.get('/spaces', 
      Object.keys(params).length > 0 ? { params } : undefined
    );

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a specific space by ID
 */
export const getSpace = async (spaceId: string): Promise<Space> => {
  if (!spaceId || spaceId.trim() === '') {
    throw new Error('Space ID is required');
  }

  try {
    const response = await apiService.get(`/spaces/${spaceId}`);
    return response;
  } catch (error) {
    throw error;
  }
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

  try {
    const response = await apiService.post('/invitations', {
      email: email.trim().toLowerCase(),
      spaceId: spaceId.trim(),
      role: role || 'member',
    });

    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Accept an invitation to join a space
 */
export const acceptInvitation = async (invitationId: string): Promise<Invitation> => {
  if (!invitationId || invitationId.trim() === '') {
    throw new Error('Invitation ID is required');
  }

  try {
    const response = await apiService.put(`/invitations/${invitationId}/accept`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Decline an invitation to join a space
 */
export const declineInvitation = async (invitationId: string): Promise<Invitation> => {
  if (!invitationId || invitationId.trim() === '') {
    throw new Error('Invitation ID is required');
  }

  try {
    const response = await apiService.put(`/invitations/${invitationId}/decline`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get pending invitations for the current user
 */
export const getPendingInvitations = async (): Promise<Invitation[]> => {
  try {
    const response = await apiService.get('/invitations/pending');
    return response.invitations || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get members of a space
 */
export const getSpaceMembers = async (spaceId: string): Promise<any> => {
  if (!spaceId || spaceId.trim() === '') {
    throw new Error('Space ID is required');
  }

  try {
    const response = await apiService.get(`/spaces/${spaceId}/members`);
    return response;
  } catch (error) {
    throw error;
  }
};