/**
 * Conversation service for fetching thread-level discussion data.
 */

import type {
  ThreadsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  GetThreadsOptions,
  ConversationThread,
  // Legacy
  ConversationsResponse,
  GetConversationsOptions,
} from '../types/conversation';
import { apiService } from './api';

// Simple cache for unread threads
interface UnreadThreadsCache {
  threads: ConversationThread[];
  timestamp: number;
}
const unreadThreadsCache: Map<string, UnreadThreadsCache> = new Map();
const CACHE_TTL = 60000; // 1 minute cache

export const conversationService = {
  /**
   * Get conversation threads for a space.
   * Each thread is either a highlight with comments or a journal discussion.
   */
  async getThreads(
    spaceId: string,
    options: GetThreadsOptions = {}
  ): Promise<ThreadsResponse> {
    const { limit = 50, offset = 0, sort = 'recent', type, filter, timeFilter, search } = options;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      sort,
    });
    if (type) {
      params.append('type', type);
    }
    if (filter && filter !== 'all') {
      params.append('filter', filter);
    }
    if (timeFilter) {
      params.append('time_filter', timeFilter);
    }
    if (search) {
      params.append('search', search);
    }

    return apiService.get<ThreadsResponse>(
      `/api/spaces/${spaceId}/threads?${params.toString()}`
    );
  },

  /**
   * Get the total unread count and threads with replies for a space.
   */
  async getUnreadCount(spaceId: string): Promise<UnreadCountResponse> {
    return apiService.get<UnreadCountResponse>(
      `/api/spaces/${spaceId}/conversations/unread-count`
    );
  },

  /**
   * Mark a journal's comments as read.
   */
  async markJournalAsRead(
    spaceId: string,
    journalId: string,
    options?: { markHighlightComments?: boolean; markJournalComments?: boolean }
  ): Promise<MarkReadResponse> {
    return apiService.post<MarkReadResponse>(
      `/api/spaces/${spaceId}/journals/${journalId}/mark-read`,
      options || {}
    );
  },

  /**
   * Mark a specific thread as read.
   */
  async markThreadAsRead(
    spaceId: string,
    threadId: string,
    threadType: 'highlight' | 'journal_discussion'
  ): Promise<MarkReadResponse> {
    return apiService.post<MarkReadResponse>(
      `/api/spaces/${spaceId}/threads/${threadId}/mark-read`,
      { thread_type: threadType }  // snake_case for Pydantic backend
    );
  },

  /**
   * Mark all threads in a space as read.
   */
  async markAllAsRead(spaceId: string): Promise<{ success: boolean; markedCount: number }> {
    // Clear cache when marking all as read
    unreadThreadsCache.delete(spaceId);
    return apiService.post<{ success: boolean; markedCount: number }>(
      `/api/spaces/${spaceId}/threads/mark-all-read`,
      {}
    );
  },

  /**
   * Get only unread threads for navigation purposes.
   * Uses a local cache to avoid repeated API calls during navigation.
   */
  async getUnreadThreads(
    spaceId: string,
    options: { forceRefresh?: boolean } = {}
  ): Promise<ConversationThread[]> {
    const cached = unreadThreadsCache.get(spaceId);
    const now = Date.now();

    // Return cached if valid and not forcing refresh
    if (cached && !options.forceRefresh && now - cached.timestamp < CACHE_TTL) {
      return cached.threads;
    }

    // Fetch fresh data
    const response = await this.getThreads(spaceId, {
      filter: 'unread',
      sort: 'recent',
      limit: 100, // Get all unread for navigation
    });

    // Update cache
    unreadThreadsCache.set(spaceId, {
      threads: response.threads,
      timestamp: now,
    });

    return response.threads;
  },

  /**
   * Remove a thread from the unread cache (called after marking as read).
   */
  removeFromUnreadCache(spaceId: string, threadId: string): void {
    const cached = unreadThreadsCache.get(spaceId);
    if (cached) {
      cached.threads = cached.threads.filter((t) => t.threadId !== threadId);
    }
  },

  /**
   * Clear the unread cache for a space.
   */
  clearUnreadCache(spaceId: string): void {
    unreadThreadsCache.delete(spaceId);
  },

  // ========== Legacy methods (deprecated) ==========

  /**
   * @deprecated Use getThreads instead
   */
  async getSpaceConversations(
    spaceId: string,
    options: GetConversationsOptions = {}
  ): Promise<ConversationsResponse> {
    const { limit = 20, sort = 'recent' } = options;
    const params = new URLSearchParams({
      limit: limit.toString(),
      sort,
    });

    return apiService.get<ConversationsResponse>(
      `/api/spaces/${spaceId}/conversations?${params.toString()}`
    );
  },
};
