/**
 * Invitation Store - React Context + Reducer State Management
 * Manages invitation state, actions, and real-time updates
 */

import React, {
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import { invitationService, InvitationServiceError } from '../services/invitationService';
import type {
  Invitation,
  CreateInvitationRequest,
  BulkCreateInvitationRequest,
  InvitationListState,
  InvitationStatsResponse,
} from '../types/invitation.types';
import { InvitationStatus } from '../types/invitation.types';
import {
  InvitationContext,
  type InvitationContextType,
  type InvitationState,
} from '../contexts/InvitationContext';

// Actions
type InvitationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PENDING_INVITATIONS'; payload: Invitation[] }
  | { type: 'SET_SPACE_INVITATIONS'; payload: { spaceId: string; invitations: Invitation[] } }
  | { type: 'ADD_INVITATION'; payload: Invitation }
  | { type: 'UPDATE_INVITATION'; payload: Invitation }
  | { type: 'REMOVE_INVITATION'; payload: string }
  | { type: 'SET_STATS'; payload: { spaceId: string; stats: InvitationStatsResponse } }
  | { type: 'SET_FILTER'; payload: Partial<InvitationListState['filter']> }
  | { type: 'SET_PAGINATION'; payload: Partial<InvitationListState['pagination']> }
  | { type: 'CLEAR_ERROR' }
  | { type: 'OPTIMISTIC_UPDATE_STATUS'; payload: { id: string; status: InvitationStatus } }
  | { type: 'REVERT_OPTIMISTIC_UPDATE'; payload: string };


// Initial state
const initialState: InvitationState = {
  isLoading: false,
  isCreating: false,
  isActioning: false,
  error: null,

  pendingInvitations: [],
  spaceInvitations: {},
  invitationStats: {},

  filter: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },

  lastUpdated: Date.now(),
  optimisticUpdates: {},
};

// Reducer
const invitationReducer = (state: InvitationState, action: InvitationAction): InvitationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isCreating: false,
        isActioning: false,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_PENDING_INVITATIONS':
      return {
        ...state,
        pendingInvitations: action.payload,
        isLoading: false,
        lastUpdated: Date.now(),
      };

    case 'SET_SPACE_INVITATIONS':
      return {
        ...state,
        spaceInvitations: {
          ...state.spaceInvitations,
          [action.payload.spaceId]: action.payload.invitations,
        },
        isLoading: false,
        lastUpdated: Date.now(),
      };

    case 'ADD_INVITATION':
      return {
        ...state,
        pendingInvitations: [action.payload, ...state.pendingInvitations],
        isCreating: false,
      };

    case 'UPDATE_INVITATION': {
      const invitation = action.payload;
      const updateInvitationInList = (invitations: Invitation[]) =>
        invitations.map(inv => inv.invitationId === invitation.invitationId ? invitation : inv);

      return {
        ...state,
        pendingInvitations: updateInvitationInList(state.pendingInvitations),
        spaceInvitations: Object.fromEntries(
          Object.entries(state.spaceInvitations).map(([spaceId, invitations]) => [
            spaceId,
            updateInvitationInList(invitations),
          ])
        ),
        isActioning: false,
        optimisticUpdates: Object.fromEntries(
          Object.entries(state.optimisticUpdates).filter(([key]) => key !== invitation.invitationId)
        ),
      };
    }

    case 'REMOVE_INVITATION': {
      const invitationId = action.payload;
      const filterOut = (invitations: Invitation[]) =>
        invitations.filter(inv => inv.invitationId !== invitationId);

      return {
        ...state,
        pendingInvitations: filterOut(state.pendingInvitations),
        spaceInvitations: Object.fromEntries(
          Object.entries(state.spaceInvitations).map(([spaceId, invitations]) => [
            spaceId,
            filterOut(invitations),
          ])
        ),
      };
    }

    case 'SET_STATS':
      return {
        ...state,
        invitationStats: {
          ...state.invitationStats,
          [action.payload.spaceId]: action.payload.stats,
        },
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: { ...state.filter, ...action.payload },
      };

    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };

    case 'OPTIMISTIC_UPDATE_STATUS': {
      const { id, status } = action.payload;
      const optimisticInvitation = state.pendingInvitations.find(inv => inv.invitationId === id);

      if (optimisticInvitation) {
        return {
          ...state,
          optimisticUpdates: {
            ...state.optimisticUpdates,
            [id]: { ...optimisticInvitation, status },
          },
          isActioning: true,
        };
      }
      return state;
    }

    case 'REVERT_OPTIMISTIC_UPDATE':
      return {
        ...state,
        optimisticUpdates: Object.fromEntries(
          Object.entries(state.optimisticUpdates).filter(([key]) => key !== action.payload)
        ),
        isActioning: false,
      };

    default:
      return state;
  }
};


// Provider props
interface InvitationProviderProps {
  children: ReactNode;
}

// Provider component
export const InvitationProvider: React.FC<InvitationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(invitationReducer, initialState);

  // Single invitation actions
  const createInvitation = useCallback(async (request: CreateInvitationRequest): Promise<Invitation> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const invitation = await invitationService.createInvitation(request);
      dispatch({ type: 'ADD_INVITATION', payload: invitation });
      return invitation;
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to create invitation';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const acceptInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      // Optimistic update
      dispatch({ type: 'OPTIMISTIC_UPDATE_STATUS', payload: { id: invitationId, status: InvitationStatus.ACCEPTED } });

      const invitation = await invitationService.acceptInvitation(invitationId);
      dispatch({ type: 'UPDATE_INVITATION', payload: invitation });
    } catch (error) {
      dispatch({ type: 'REVERT_OPTIMISTIC_UPDATE', payload: invitationId });
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to accept invitation';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const declineInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      // Optimistic update
      dispatch({ type: 'OPTIMISTIC_UPDATE_STATUS', payload: { id: invitationId, status: InvitationStatus.DECLINED } });

      const invitation = await invitationService.declineInvitation(invitationId);
      dispatch({ type: 'UPDATE_INVITATION', payload: invitation });
    } catch (error) {
      dispatch({ type: 'REVERT_OPTIMISTIC_UPDATE', payload: invitationId });
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to decline invitation';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const revokeInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await invitationService.revokeInvitation(invitationId);
      dispatch({ type: 'REMOVE_INVITATION', payload: invitationId });
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to revoke invitation';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  const resendInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const invitation = await invitationService.resendInvitation(invitationId);
      dispatch({ type: 'UPDATE_INVITATION', payload: invitation });
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to resend invitation';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  // Bulk actions
  const createBulkInvitations = useCallback(async (request: BulkCreateInvitationRequest): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await invitationService.createBulkInvitations(request);

      // Add successful invitations to state
      response.successful.forEach(invitation => {
        dispatch({ type: 'ADD_INVITATION', payload: invitation });
      });

      // Show error if some failed
      if (response.failed.length > 0) {
        const failedEmails = response.failed.map(f => f.email).join(', ');
        dispatch({ type: 'SET_ERROR', payload: `Failed to invite: ${failedEmails}` });
      }
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to create bulk invitations';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  // Data fetching
  const fetchPendingInvitations = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await invitationService.getPendingInvitations();
      dispatch({ type: 'SET_PENDING_INVITATIONS', payload: response.invitations });
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to fetch pending invitations';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  const fetchSpaceInvitations = useCallback(async (spaceId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await invitationService.getSpaceInvitations(spaceId);
      dispatch({
        type: 'SET_SPACE_INVITATIONS',
        payload: { spaceId, invitations: response.invitations },
      });
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to fetch space invitations';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  const fetchInvitationStats = useCallback(async (spaceId: string): Promise<void> => {
    try {
      const stats = await invitationService.getInvitationStats(spaceId);
      dispatch({ type: 'SET_STATS', payload: { spaceId, stats } });
    } catch (error) {
      const message = error instanceof InvitationServiceError
        ? error.message
        : 'Failed to fetch invitation stats';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Utility actions
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setFilter = useCallback((filter: Partial<InvitationListState['filter']>) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setPagination = useCallback((pagination: Partial<InvitationListState['pagination']>) => {
    dispatch({ type: 'SET_PAGINATION', payload: pagination });
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([
      fetchPendingInvitations(),
      // Add other refresh operations as needed
    ]);
  }, [fetchPendingInvitations]);

  // Real-time subscription (polling-based for now)
  const subscribeToUpdates = useCallback((spaceId?: string) => {
    const interval = setInterval(() => {
      if (spaceId) {
        fetchSpaceInvitations(spaceId);
      } else {
        fetchPendingInvitations();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchSpaceInvitations, fetchPendingInvitations]);

  // Context value
  const contextValue: InvitationContextType = {
    ...state,
    createInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    resendInvitation,
    createBulkInvitations,
    fetchPendingInvitations,
    fetchSpaceInvitations,
    fetchInvitationStats,
    clearError,
    setFilter,
    setPagination,
    refreshData,
    subscribeToUpdates,
  };

  return (
    <InvitationContext.Provider value={contextValue}>
      {children}
    </InvitationContext.Provider>
  );
};

