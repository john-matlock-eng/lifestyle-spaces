/**
 * Chat API Service
 */

import { apiService } from '../../services/api';
import { fetchAuthSession } from '@aws-amplify/auth';
import { getValidatedConfig } from '../../config';
import type {
  Conversation,
  ConversationListItem,
  ChatMessage,
  JournalCitation,
  SendMessageRequest,
  StreamChunk,
} from './types';

const CHAT_BASE = '/api/chat';

export const chatApi = {
  /**
   * Create a new conversation
   */
  async createConversation(spaceId: string): Promise<{ conversationId: string }> {
    return apiService.post<{ conversationId: string }>(
      `${CHAT_BASE}/spaces/${spaceId}/conversations`
    );
  },

  /**
   * List conversations in a space
   */
  async listConversations(spaceId: string, limit = 20): Promise<{
    conversations: ConversationListItem[];
    total: number;
  }> {
    return apiService.get<{
      conversations: ConversationListItem[];
      total: number;
    }>(`${CHAT_BASE}/spaces/${spaceId}/conversations?limit=${limit}`);
  },

  /**
   * Get a conversation with full history
   */
  async getConversation(spaceId: string, conversationId: string): Promise<{
    conversation: Conversation;
  }> {
    return apiService.get<{ conversation: Conversation }>(
      `${CHAT_BASE}/spaces/${spaceId}/conversations/${conversationId}`
    );
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(spaceId: string, conversationId: string): Promise<void> {
    await apiService.delete(
      `${CHAT_BASE}/spaces/${spaceId}/conversations/${conversationId}`
    );
  },

  /**
   * Send a message (non-streaming)
   */
  async sendMessage(
    spaceId: string,
    conversationId: string,
    request: SendMessageRequest
  ): Promise<{
    message: ChatMessage;
    citations: JournalCitation[];
    modelUsed: string;
  }> {
    return apiService.post<{
      message: ChatMessage;
      citations: JournalCitation[];
      modelUsed: string;
    }>(
      `${CHAT_BASE}/spaces/${spaceId}/conversations/${conversationId}/messages`,
      request
    );
  },

  /**
   * Send a message with streaming response
   */
  async sendMessageStreaming(
    spaceId: string,
    conversationId: string,
    request: SendMessageRequest,
    onChunk: (chunk: StreamChunk) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    const config = getValidatedConfig();

    // Get auth token from Amplify
    let accessToken = '';
    try {
      const session = await fetchAuthSession();
      accessToken = session.tokens?.accessToken?.toString() || '';
    } catch {
      // Continue without auth if not available
    }

    const response = await fetch(
      `${config.apiUrl}${CHAT_BASE}/spaces/${spaceId}/conversations/${conversationId}/messages/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE format: "data: {...}\n\n"
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const chunk = JSON.parse(jsonStr) as StreamChunk;
              onChunk(chunk);
            } catch {
              console.error('Failed to parse chunk:', jsonStr);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  },
};
