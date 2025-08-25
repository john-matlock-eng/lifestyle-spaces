import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  createSpace, 
  listSpaces, 
  getSpace, 
  inviteMember, 
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
  getSpaceMembers
} from '../services/spaces';
import { 
  CreateSpaceData, 
  InvitationData, 
  Space, 
  Invitation, 
  SpaceMember, 
  SpaceState,
  SpaceFilters,
  PaginationParams
} from '../types';

// Space actions
type SpaceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SPACES'; payload: Space[] }
  | { type: 'ADD_SPACE'; payload: Space }
  | { type: 'UPDATE_SPACE'; payload: Space }
  | { type: 'SET_CURRENT_SPACE'; payload: Space | null }
  | { type: 'SET_MEMBERS'; payload: SpaceMember[] }
  | { type: 'ADD_MEMBER'; payload: SpaceMember }
  | { type: 'SET_INVITATIONS'; payload: Invitation[] }
  | { type: 'ADD_INVITATION'; payload: Invitation }
  | { type: 'UPDATE_INVITATION'; payload: Invitation }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Space context interface
interface SpaceContextType extends SpaceState {
  createSpace: (data: CreateSpaceData) => Promise<Space>;
  loadSpaces: (filters?: SpaceFilters, pagination?: PaginationParams) => Promise<void>;
  selectSpace: (spaceId: string) => Promise<void>;
  inviteMember: (data: InvitationData) => Promise<Invitation>;
  acceptInvitation: (invitationId: string) => Promise<Invitation>;
  declineInvitation: (invitationId: string) => Promise<Invitation>;
  loadPendingInvitations: () => Promise<void>;
  clearError: () => void;
}

// Initial state
const initialState: SpaceState = {
  spaces: [],
  currentSpace: null,
  members: [],
  invitations: [],
  isLoading: false,
  error: null,
};

// Space reducer
const spaceReducer = (state: SpaceState, action: SpaceAction): SpaceState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_SPACES':
      return {
        ...state,
        spaces: action.payload,
        isLoading: false,
        error: null,
      };
    case 'ADD_SPACE':
      return {
        ...state,
        spaces: [...state.spaces, action.payload],
        isLoading: false,
        error: null,
      };
    case 'UPDATE_SPACE':
      return {
        ...state,
        spaces: state.spaces.map(space =>
          space.spaceId === action.payload.spaceId ? action.payload : space
        ),
        currentSpace: state.currentSpace?.spaceId === action.payload.spaceId 
          ? action.payload 
          : state.currentSpace,
        isLoading: false,
        error: null,
      };
    case 'SET_CURRENT_SPACE':
      return {
        ...state,
        currentSpace: action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_MEMBERS':
      return {
        ...state,
        members: action.payload,
        isLoading: false,
        error: null,
      };
    case 'ADD_MEMBER':
      return {
        ...state,
        members: [...state.members, action.payload],
        isLoading: false,
        error: null,
      };
    case 'SET_INVITATIONS':
      return {
        ...state,
        invitations: action.payload,
        isLoading: false,
        error: null,
      };
    case 'ADD_INVITATION':
      return {
        ...state,
        invitations: [...state.invitations, action.payload],
        isLoading: false,
        error: null,
      };
    case 'UPDATE_INVITATION':
      return {
        ...state,
        invitations: state.invitations.map(invitation =>
          invitation.invitationId === action.payload.invitationId 
            ? action.payload 
            : invitation
        ),
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const SpaceContext = createContext<SpaceContextType | null>(null);

// Space provider props
interface SpaceProviderProps {
  children: ReactNode;
}

// Space provider component
export const SpaceProvider: React.FC<SpaceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(spaceReducer, initialState);

  const handleCreateSpace = async (data: CreateSpaceData): Promise<Space> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const space = await createSpace(data);
      dispatch({ type: 'ADD_SPACE', payload: space });
      return space;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create space';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleLoadSpaces = async (
    filters: SpaceFilters = {}, 
    pagination: PaginationParams = {}
  ): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const response = await listSpaces(filters, pagination);
      dispatch({ type: 'SET_SPACES', payload: response.spaces });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load spaces';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const handleSelectSpace = async (spaceId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const [space, membersResponse] = await Promise.all([
        getSpace(spaceId),
        getSpaceMembers(spaceId),
      ]);
      
      dispatch({ type: 'SET_CURRENT_SPACE', payload: space });
      dispatch({ type: 'SET_MEMBERS', payload: membersResponse.members || [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load space';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const handleInviteMember = async (data: InvitationData): Promise<Invitation> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const invitation = await inviteMember(data);
      dispatch({ type: 'ADD_INVITATION', payload: invitation });
      return invitation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleAcceptInvitation = async (invitationId: string): Promise<Invitation> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const invitation = await acceptInvitation(invitationId);
      dispatch({ type: 'UPDATE_INVITATION', payload: invitation });
      return invitation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleDeclineInvitation = async (invitationId: string): Promise<Invitation> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const invitation = await declineInvitation(invitationId);
      dispatch({ type: 'UPDATE_INVITATION', payload: invitation });
      return invitation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline invitation';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const handleLoadPendingInvitations = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const invitations = await getPendingInvitations();
      dispatch({ type: 'SET_INVITATIONS', payload: invitations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load invitations';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const handleClearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: SpaceContextType = {
    ...state,
    createSpace: handleCreateSpace,
    loadSpaces: handleLoadSpaces,
    selectSpace: handleSelectSpace,
    inviteMember: handleInviteMember,
    acceptInvitation: handleAcceptInvitation,
    declineInvitation: handleDeclineInvitation,
    loadPendingInvitations: handleLoadPendingInvitations,
    clearError: handleClearError,
  };

  // Add internal methods for testing
  if (process.env.NODE_ENV === 'test') {
    (contextValue as any)._setError = (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    };
    (contextValue as any)._setInvitations = (invitations: Invitation[]) => {
      dispatch({ type: 'SET_INVITATIONS', payload: invitations });
    };
  }

  return <SpaceContext.Provider value={contextValue}>{children}</SpaceContext.Provider>;
};

// Custom hook to use space context
export const useSpace = (): SpaceContextType => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  return context;
};