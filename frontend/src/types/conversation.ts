/**
 * Types for the Conversations feature - thread-level conversation data
 */

/**
 * A conversation thread - either a highlight with comments or a journal discussion.
 */
export interface ConversationThread {
  // Thread identification
  threadId: string;
  threadType: 'highlight' | 'journal_discussion';

  // Journal context
  journalId: string;
  journalTitle: string;
  journalAuthorId: string;
  journalAuthorName: string;

  // Thread-specific content (for highlights)
  highlightText: string | null;
  highlightColor: string | null;

  // Activity timestamps
  lastActivity: string;
  createdAt: string;

  // Comment stats
  commentCount: number;

  // Participation tracking
  participants: string[];
  participantIds: string[];

  // Current user's relationship to this thread
  userParticipated: boolean;
  userStarted: boolean;
  userLastSeen: string | null;
  userLastComment: string | null;

  // Unread status
  isUnread: boolean;
  unreadCount: number;
  hasReplyToUser: boolean;

  // Latest comment preview
  latestCommentText: string | null;
  latestCommentAuthor: string | null;
  latestCommentAuthorId: string | null;
  latestCommentTime: string | null;
}

export interface ThreadsResponse {
  threads: ConversationThread[];
  totalUnread: number;
  threadsWithReplies: number;
  totalCount: number;
  hasMore: boolean;
  nextToken: string | null;
}

export interface UnreadCountResponse {
  totalUnread: number;
  threadsWithReplies: number;
  spaceId: string;
}

export interface MarkReadResponse {
  success: boolean;
  journalId: string;
  spaceId: string;
  threadId?: string;
}

export interface GetThreadsOptions {
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'unread' | 'replies';
  type?: 'highlight' | 'journal_discussion';
  filter?: 'all' | 'participated' | 'unread';
  timeFilter?: 'today' | 'week' | 'month';
  search?: string;
}

/**
 * A journal with its conversation threads grouped together.
 * Used for the grouped card view in ConversationsTab.
 */
export interface GroupedJournalConversations {
  journalId: string;
  journalTitle: string;
  journalAuthorId: string;
  journalAuthorName: string;
  lastActivity: string; // Most recent activity across all threads
  totalCommentCount: number;
  totalUnreadCount: number;
  hasReplyToUser: boolean;
  threads: ConversationThread[];
}

// ========== Legacy types (deprecated) ==========

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

export interface GetConversationsOptions {
  limit?: number;
  sort?: 'recent' | 'unread';
}
