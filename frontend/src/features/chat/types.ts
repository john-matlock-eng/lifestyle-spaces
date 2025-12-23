/**
 * Chat Feature Types
 */

// Chat mode based on user's relationship to journal content
export type ChatMode = 'author' | 'supporter';

export interface ModeData {
  mode: ChatMode;
  authorName?: string;
  authorPercentage?: number;
}

export interface JournalCitation {
  journalId: string;
  title: string;
  sectionTitle?: string;
  sectionIndex?: number;
  relevanceScore: number;
  excerpt?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: JournalCitation[];
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  spaceId: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  conversationId: string;
  title?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Suggestion for conversation starters
export interface Suggestion {
  icon: string;
  text: string;
  category: string;
}

// API Types
export interface SendMessageRequest {
  content: string;
  model?: 'default' | 'premium';
}

export interface StreamChunk {
  type: 'mode' | 'model' | 'citations' | 'content' | 'done' | 'error';
  data?: string | JournalCitation[] | ModeData;
  messageId?: string;
  modelUsed?: string;
  message?: string;
}

// UI State
export interface ChatState {
  conversations: ConversationListItem[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingCitations: JournalCitation[];
  error: string | null;
  isOpen: boolean;
  isExpanded: boolean; // For mobile bottom sheet
  // Chat mode detection
  chatMode: ChatMode | null;
  authorName: string | null;
  // Mode-aware suggestions
  suggestions: Suggestion[];
  welcomeMessage: string | null;
  isLoadingContext: boolean;
}
