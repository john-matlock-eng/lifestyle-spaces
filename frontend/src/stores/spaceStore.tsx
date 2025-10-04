import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import {
  createSpace,
  listSpaces,
  getSpace,
  getSpaceMembers
} from '../services/spaces';
import {
  type CreateSpaceData,
  type Space,
  type SpaceMember,
  type SpaceState,
  type SpaceFilters,
  type PaginationParams
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
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

// Space context interface
interface SpaceContextType extends SpaceState {
  createSpace: (data: CreateSpaceData) => Promise<Space>;
  loadSpaces: (filters?: SpaceFilters, pagination?: PaginationParams) => Promise<void>;
  selectSpace: (spaceId: string) => Promise<void>;
  clearError: () => void;
}

// Extended interface for testing
interface SpaceContextTypeWithTestMethods extends SpaceContextType {
  _setError: (error: string | null) => void;
}

// Initial state
const initialState: SpaceState = {
  spaces: [],
  currentSpace: null,
  members: [],
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

  const handleLoadSpaces = useCallback(async (
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
  }, []);

  const handleSelectSpace = useCallback(async (spaceId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const [space, membersResponse] = await Promise.all([
        getSpace(spaceId),
        getSpaceMembers(spaceId),
      ]);

      console.log('[spaceStore] Received space from API:', space);
      console.log('[spaceStore] Space has inviteCode?', !!space.inviteCode, space.inviteCode);

      dispatch({ type: 'SET_CURRENT_SPACE', payload: space });
      dispatch({ type: 'SET_MEMBERS', payload: membersResponse.members || [] });

      console.log('[spaceStore] After dispatch, checking state will update...');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load space';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);


  const handleClearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const contextValue: SpaceContextType = {
    ...state,
    createSpace: handleCreateSpace,
    loadSpaces: handleLoadSpaces,
    selectSpace: handleSelectSpace,
    clearError: handleClearError,
  };

  // Add internal methods for testing
  if (process.env.NODE_ENV === 'test') {
    const testContextValue = contextValue as SpaceContextTypeWithTestMethods;
    testContextValue._setError = (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    };
  }

  return <SpaceContext.Provider value={contextValue}>{children}</SpaceContext.Provider>;
};

// Custom hook to use space context
// eslint-disable-next-line react-refresh/only-export-components
export const useSpace = (): SpaceContextType => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  return context;
};