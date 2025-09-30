/**
 * Invitation System Type Definitions
 * Comprehensive types for the complete invitation lifecycle
 */

// Enums
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
} as const;

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus];

export const SpaceMemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
} as const;

export type SpaceMemberRole = typeof SpaceMemberRole[keyof typeof SpaceMemberRole];

// Core invitation interface
export interface Invitation {
  invitationId: string;
  spaceId: string;
  spaceName: string;
  inviterEmail: string;
  inviterDisplayName: string;
  inviteeEmail: string;
  role: SpaceMemberRole;
  status: InvitationStatus;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  acceptedAt?: string;
  declinedAt?: string;
}

// Request/Response types for API
export interface CreateInvitationRequest {
  email: string;
  spaceId: string;
  role?: SpaceMemberRole;
  customMessage?: string;
}

export interface BulkCreateInvitationRequest {
  spaceId: string;
  invitations: Array<{
    email: string;
    role?: SpaceMemberRole;
    customMessage?: string;
  }>;
}

export interface BulkInvitationResponse {
  successful: Invitation[];
  failed: Array<{
    email: string;
    error: string;
  }>;
  totalSent: number;
  totalFailed: number;
}

export interface JoinByCodeRequest {
  code: string;
}

export interface ValidateInviteCodeResponse {
  valid: boolean;
  spaceId?: string;
  spaceName?: string;
  expiresAt?: string;
  error?: string;
}

export interface InvitationStatsResponse {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptanceRate: number;
  averageResponseTime?: number; // in hours
}

// UI State types
export interface InvitationListState {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  filter: {
    status?: InvitationStatus;
    role?: SpaceMemberRole;
    searchTerm?: string;
    sortBy: 'createdAt' | 'expiresAt' | 'status';
    sortOrder: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Form types
export interface InvitationFormData {
  emails: string[];
  role: SpaceMemberRole;
  customMessage: string;
}

export interface BulkUploadData {
  file: File;
  defaultRole: SpaceMemberRole;
  skipDuplicates: boolean;
}

// Notification types for real-time updates
export interface InvitationNotification {
  type: 'new' | 'accepted' | 'declined' | 'expired';
  invitation: Invitation;
  timestamp: string;
}

// Analytics types
export interface InvitationAnalytics {
  spaceId: string;
  period: 'day' | 'week' | 'month' | 'all';
  data: {
    sent: number;
    accepted: number;
    declined: number;
    pending: number;
    expired: number;
    acceptanceRate: number;
    averageResponseTime: number;
    topInviters: Array<{
      userId: string;
      displayName: string;
      count: number;
    }>;
  };
}

// Error types specific to invitations
export interface InvitationError {
  code: 'INVALID_EMAIL' | 'ALREADY_MEMBER' | 'QUOTA_EXCEEDED' |
        'INVITATION_EXISTS' | 'INVALID_CODE' | 'CODE_EXPIRED' |
        'PERMISSION_DENIED' | 'SPACE_NOT_FOUND';
  message: string;
  details?: Record<string, unknown>;
}

// Validation helpers
export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface InvitationValidation {
  canInvite: boolean;
  remainingQuota: number;
  errors: string[];
}