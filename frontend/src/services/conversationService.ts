/**
 * Conversation service for fetching thread-level discussion data.
 */

import type {
  ThreadsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  GetThreadsOptions,
  // Legacy
  ConversationsResponse,
  GetConversationsOptions,
} from '../types/conversation';
import { apiService } from './api';

export const conversationService = {
  /**
   * Get conversation threads for a space.
   * Each thread is either a highlight with comments or a journal discussion.
   */
  async getThreads(
    spaceId: string,
    options: GetThreadsOptions = {}
  ): Promise<ThreadsResponse> {
    const { limit = 50, offset = 0, sort = 'recent', type, filter, search } = options;
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
      { thread_type: threadType }
    );
  },

  /**
   * Mark all threads in a space as read.
   */
  async markAllAsRead(spaceId: string): Promise<{ success: boolean; markedCount: number }> {
    return apiService.post<{ success: boolean; markedCount: number }>(
      `/api/spaces/${spaceId}/threads/mark-all-read`,
      {}
    );
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
