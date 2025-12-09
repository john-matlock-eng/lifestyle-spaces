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
    const { limit = 50, sort = 'recent', type } = options;
    const params = new URLSearchParams({
      limit: limit.toString(),
      sort,
    });
    if (type) {
      params.append('type', type);
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
