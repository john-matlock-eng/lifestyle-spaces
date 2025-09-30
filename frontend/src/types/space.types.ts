// Space and invitation related types
import type { SpaceMemberRole } from './invitation.types';

export interface Space {
  spaceId: string;
  name: string;
  description: string;
  type?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  isPublic: boolean;
  isOwner?: boolean;
  inviteCode?: string;
}

export interface SpaceMember {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: SpaceMemberRole;
  joinedAt: string;
}

export interface CreateSpaceData {
  name: string;
  description: string;
  isPublic?: boolean;
}

export interface InvitationData {
  email: string;
  spaceId: string;
  role?: SpaceMemberRole;
}

export interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  members: SpaceMember[];
  isLoading: boolean;
  error: string | null;
}


export interface SpaceFilters {
  search?: string;
  isPublic?: boolean;
  role?: SpaceMemberRole;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SpaceListResponse {
  spaces: Space[];
  total: number;
  hasMore: boolean;
}

export interface MembersListResponse {
  members: SpaceMember[];
  total: number;
  hasMore: boolean;
}