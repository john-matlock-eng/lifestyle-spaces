/**
 * Conversation service for fetching aggregated discussion data.
 */

import type {
  ConversationsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  GetConversationsOptions,
} from '../types/conversation';
import { apiService } from './api';

export const conversationService = {
  /**
   * Get conversations (journals with discussions) for a space.
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

  /**
   * Get the total unread count for a space.
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
};
