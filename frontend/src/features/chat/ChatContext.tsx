/**
 * Chat Context Provider
 *
 * Manages chat state and provides methods for chat operations.
 */

import {
  createContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { chatApi, type ChatContextResponse } from './api';
import type {
  ChatState,
  ChatMode,
  ModeData,
  Conversation,
  ConversationListItem,
  ChatMessage,
  JournalCitation,
  StreamChunk,
} from './types';

// =============================================================================
// STATE
// =============================================================================

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  streamingCitations: [],
  error: null,
  isOpen: false,
  isExpanded: false,
  chatMode: null,
  authorName: null,
  suggestions: [],
  welcomeMessage: null,
  isLoadingContext: false,
};

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERSATIONS'; payload: ConversationListItem[] }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: Conversation | null }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_STREAMING_CONTENT'; payload: string }
  | { type: 'SET_STREAMING_CITATIONS'; payload: JournalCitation[] }
  | { type: 'FINISH_STREAMING'; payload: ChatMessage }
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_EXPANDED'; payload: boolean }
  | { type: 'CLEAR_ACTIVE_CONVERSATION' }
  | { type: 'SET_MODE'; payload: { mode: ChatMode; authorName?: string } }
  | { type: 'SET_CONTEXT'; payload: ChatContextResponse }
  | { type: 'SET_LOADING_CONTEXT'; payload: boolean };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: action.payload };

    case 'ADD_MESSAGE':
      if (!state.activeConversation) return state;
      return {
        ...state,
        activeConversation: {
          ...state.activeConversation,
          messages: [...state.activeConversation.messages, action.payload],
        },
      };

    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true,
        streamingContent: '',
        streamingCitations: [],
      };

    case 'APPEND_STREAMING_CONTENT':
      return {
        ...state,
        streamingContent: state.streamingContent + action.payload,
      };

    case 'SET_STREAMING_CITATIONS':
      return {
        ...state,
        streamingCitations: action.payload,
      };

    case 'FINISH_STREAMING':
      if (!state.activeConversation) return { ...state, isStreaming: false };
      return {
        ...state,
        isStreaming: false,
        streamingContent: '',
        streamingCitations: [],
        activeConversation: {
          ...state.activeConversation,
          messages: [...state.activeConversation.messages, action.payload],
        },
      };

    case 'SET_OPEN':
      return { ...state, isOpen: action.payload };

    case 'SET_EXPANDED':
      return { ...state, isExpanded: action.payload };

    case 'CLEAR_ACTIVE_CONVERSATION':
      return { ...state, activeConversation: null };

    case 'SET_MODE':
      return {
        ...state,
        chatMode: action.payload.mode,
        authorName: action.payload.authorName || null,
      };

    case 'SET_CONTEXT':
      return {
        ...state,
        chatMode: action.payload.mode,
        authorName: action.payload.authorName,
        suggestions: action.payload.suggestions,
        welcomeMessage: action.payload.welcomeMessage,
        isLoadingContext: false,
      };

    case 'SET_LOADING_CONTEXT':
      return {
        ...state,
        isLoadingContext: action.payload,
      };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface ChatContextValue extends ChatState {
  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  expandChat: () => void;
  collapseChat: () => void;

  // Conversation management
  loadConversations: (spaceId: string) => Promise<void>;
  startNewConversation: (spaceId: string) => Promise<void>;
  loadConversation: (spaceId: string, conversationId: string) => Promise<void>;
  deleteConversation: (spaceId: string, conversationId: string) => Promise<void>;

  // Messaging
  sendMessage: (spaceId: string, content: string, useStreaming?: boolean) => Promise<void>;

  // Context (mode and suggestions)
  loadChatContext: (spaceId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Refs to track streaming content (for closure issues)
  const streamingContentRef = useRef('');
  const streamingCitationsRef = useRef<JournalCitation[]>([]);

  // Set CSS custom property for sidebar width to enable layout adjustment
  useEffect(() => {
    const root = document.documentElement;

    if (state.isOpen) {
      root.style.setProperty('--chat-sidebar-width', '380px');
      document.body.setAttribute('data-chat-open', 'true');
    } else {
      root.style.setProperty('--chat-sidebar-width', '0px');
      document.body.removeAttribute('data-chat-open');
    }

    // Cleanup on unmount
    return () => {
      root.style.setProperty('--chat-sidebar-width', '0px');
      document.body.removeAttribute('data-chat-open');
    };
  }, [state.isOpen]);

  // UI Actions
  const openChat = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: true });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: false });
    dispatch({ type: 'SET_EXPANDED', payload: false });
  }, []);

  const toggleChat = useCallback(() => {
    dispatch({ type: 'SET_OPEN', payload: !state.isOpen });
  }, [state.isOpen]);

  const expandChat = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED', payload: true });
  }, []);

  const collapseChat = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED', payload: false });
  }, []);

  // Load conversations for a space
  const loadConversations = useCallback(async (spaceId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { conversations } = await chatApi.listConversations(spaceId);
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Start a new conversation
  const startNewConversation = useCallback(async (spaceId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { conversationId } = await chatApi.createConversation(spaceId);
      const { conversation } = await chatApi.getConversation(spaceId, conversationId);
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start conversation' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load existing conversation
  const loadConversation = useCallback(async (spaceId: string, conversationId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { conversation } = await chatApi.getConversation(spaceId, conversationId);
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversation' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(
    async (spaceId: string, conversationId: string) => {
      try {
        await chatApi.deleteConversation(spaceId, conversationId);
        dispatch({
          type: 'SET_CONVERSATIONS',
          payload: state.conversations.filter((c) => c.conversationId !== conversationId),
        });
        if (state.activeConversation?.conversationId === conversationId) {
          dispatch({ type: 'CLEAR_ACTIVE_CONVERSATION' });
        }
      } catch {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to delete conversation' });
      }
    },
    [state.conversations, state.activeConversation]
  );

  // Send message with streaming
  const sendMessage = useCallback(
    async (spaceId: string, content: string, useStreaming = true) => {
      if (!state.activeConversation) {
        dispatch({ type: 'SET_ERROR', payload: 'No active conversation' });
        return;
      }

      const conversationId = state.activeConversation.conversationId;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        citations: [],
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      if (useStreaming) {
        dispatch({ type: 'START_STREAMING' });

        // Reset refs
        streamingContentRef.current = '';
        streamingCitationsRef.current = [];

        let messageId = '';

        await chatApi.sendMessageStreaming(
          spaceId,
          conversationId,
          { content },
          // onChunk
          (chunk: StreamChunk) => {
            switch (chunk.type) {
              case 'mode':
                // Chat mode detected (author/supporter)
                {
                  const modeData = chunk.data as ModeData;
                  dispatch({
                    type: 'SET_MODE',
                    payload: {
                      mode: modeData.mode,
                      authorName: modeData.authorName,
                    },
                  });
                }
                break;
              case 'model':
                // Model info received
                break;
              case 'citations':
                streamingCitationsRef.current = chunk.data as JournalCitation[];
                dispatch({
                  type: 'SET_STREAMING_CITATIONS',
                  payload: streamingCitationsRef.current,
                });
                break;
              case 'content':
                streamingContentRef.current += chunk.data as string;
                dispatch({
                  type: 'APPEND_STREAMING_CONTENT',
                  payload: chunk.data as string,
                });
                break;
              case 'done':
                messageId = chunk.messageId || '';
                break;
              case 'error':
                // Handle conversation ownership mismatch with auto-recovery
                if (chunk.code === 'CONVERSATION_OWNERSHIP_MISMATCH') {
                  console.warn('[Chat] Conversation ownership mismatch, creating new conversation');
                  dispatch({ type: 'CLEAR_ACTIVE_CONVERSATION' });
                  dispatch({
                    type: 'SET_ERROR',
                    payload: 'Starting a fresh conversation for you. Please resend your message.',
                  });
                } else {
                  dispatch({ type: 'SET_ERROR', payload: chunk.message || 'Stream error' });
                }
                break;
            }
          },
          // onError
          (error: Error) => {
            dispatch({ type: 'SET_ERROR', payload: error.message });
          },
          // onComplete
          () => {
            const assistantMessage: ChatMessage = {
              id: messageId || `msg-${Date.now()}`,
              role: 'assistant',
              content: streamingContentRef.current,
              citations: streamingCitationsRef.current,
              createdAt: new Date().toISOString(),
            };
            dispatch({ type: 'FINISH_STREAMING', payload: assistantMessage });
          }
        );
      } else {
        // Non-streaming
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const { message } = await chatApi.sendMessage(spaceId, conversationId, {
            content,
          });
          dispatch({ type: 'ADD_MESSAGE', payload: message });
        } catch {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    },
    [state.activeConversation]
  );

  // Load chat context (mode, suggestions, welcome message)
  const loadChatContext = useCallback(async (spaceId: string) => {
    dispatch({ type: 'SET_LOADING_CONTEXT', payload: true });
    try {
      const context = await chatApi.getChatContext(spaceId);
      dispatch({ type: 'SET_CONTEXT', payload: context });
    } catch (error) {
      console.error('Failed to load chat context:', error);
      // Don't set error - context is enhancement, not critical
      dispatch({ type: 'SET_LOADING_CONTEXT', payload: false });
    }
  }, []);

  const value: ChatContextValue = {
    ...state,
    openChat,
    closeChat,
    toggleChat,
    expandChat,
    collapseChat,
    loadConversations,
    startNewConversation,
    loadConversation,
    deleteConversation,
    sendMessage,
    loadChatContext,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Export context for use by useChat hook
export { ChatContext };
