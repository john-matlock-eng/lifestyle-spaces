/**
 * Invitation Context
 * React context for invitation state management
 */

import { createContext } from 'react';
import type {
  Invitation,
  CreateInvitationRequest,
  BulkCreateInvitationRequest,
  InvitationListState,
  InvitationStatsResponse,
} from '../types/invitation.types';

// State interface
export interface InvitationState {
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isActioning: boolean;
  error: string | null;

  // Data
  pendingInvitations: Invitation[];
  spaceInvitations: Record<string, Invitation[]>;
  invitationStats: Record<string, InvitationStatsResponse>;

  // UI state
  filter: InvitationListState['filter'];
  pagination: InvitationListState['pagination'];

  // Real-time updates
  lastUpdated: number;
  optimisticUpdates: Record<string, Invitation>;
}

// Context interface
export interface InvitationContextType extends InvitationState {
  // Single invitation actions
  createInvitation: (request: CreateInvitationRequest) => Promise<Invitation>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;

  // Bulk actions
  createBulkInvitations: (request: BulkCreateInvitationRequest) => Promise<void>;

  // Data fetching
  fetchPendingInvitations: () => Promise<void>;
  fetchSpaceInvitations: (spaceId: string) => Promise<void>;
  fetchInvitationStats: (spaceId: string) => Promise<void>;

  // Utility actions
  clearError: () => void;
  setFilter: (filter: Partial<InvitationListState['filter']>) => void;
  setPagination: (pagination: Partial<InvitationListState['pagination']>) => void;
  refreshData: () => Promise<void>;

  // Real-time helpers
  subscribeToUpdates: (spaceId?: string) => () => void;
}

// Create context
export const InvitationContext = createContext<InvitationContextType | undefined>(undefined);