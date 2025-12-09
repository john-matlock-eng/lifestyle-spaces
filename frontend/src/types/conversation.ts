/**
 * Type definitions for Conversations feature (frontend)
 */

export interface Conversation {
  journalId: string;
  journalTitle: string;
  journalAuthor: string;
  journalAuthorName: string;
  lastActivity: string;
  lastActivityType: 'highlight_comment' | 'journal_comment' | 'highlight';
  lastActivityHighlightId: string | null;
  highlightCount: number;
  highlightCommentCount: number;
  journalCommentCount: number;
  unreadCount: number;
  participants: string[];
  previewText: string | null;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  totalUnread: number;
  nextToken: string | null;
}

export interface UnreadCountResponse {
  totalUnread: number;
  spaceId: string;
}

export interface MarkReadResponse {
  success: boolean;
  journalId: string;
  spaceId: string;
}

export interface GetConversationsOptions {
  limit?: number;
  sort?: 'recent' | 'unread';
}
