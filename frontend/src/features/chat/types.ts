/**
 * Chat Feature Types
 */

export interface JournalCitation {
  journalId: string;
  title: string;
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

// API Types
export interface SendMessageRequest {
  content: string;
  model?: 'default' | 'premium';
}

export interface StreamChunk {
  type: 'model' | 'citations' | 'content' | 'done' | 'error';
  data?: string | JournalCitation[];
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
}
