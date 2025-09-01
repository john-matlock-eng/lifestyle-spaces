// Space and invitation related types

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

export interface Invitation {
  invitationId: string;
  spaceId: string;
  spaceName: string;
  inviterEmail: string;
  inviterDisplayName: string;
  inviteeEmail: string;
  role: SpaceMemberRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  members: SpaceMember[];
  invitations: Invitation[];
  isLoading: boolean;
  error: string | null;
}

export type SpaceMemberRole = 'owner' | 'admin' | 'member';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

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