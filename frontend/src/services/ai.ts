/**
 * AI Service - Integration with Claude LLM API
 */

import { apiService } from './api';

export interface AIResponse {
  response: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface JournalInsights {
  response: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date | string  // Allow both types for flexibility
  metadata?: {
    tokens?: number
    model?: string
    regenerated?: boolean
  }
}

/**
 * Type guard for safe timestamp handling
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Helper to ensure valid ChatMessage with all required fields
 */
export function ensureValidMessage(msg: Partial<ChatMessage>): ChatMessage {
  return {
    id: msg.id || `msg-${Date.now()}-${Math.random()}`,
    role: msg.role || 'assistant',
    content: msg.content || '',
    timestamp: msg.timestamp || new Date(),
    metadata: msg.metadata
  }
}

/**
 * Manages conversation context for AI chat
 */
export class ConversationManager {
  private static readonly MAX_MESSAGES = 10;

  /**
   * Prepare conversation context with smart truncation
   */
  static prepareContext(
    messages: ChatMessage[],
    maxTokens: number = 3000
  ): ChatMessage[] {
    // Start from most recent and work backwards
    const reversed = [...messages].reverse();
    const context: ChatMessage[] = [];
    let totalLength = 0;

    for (const msg of reversed) {
      const msgLength = msg.content.length;
      if (totalLength + msgLength > maxTokens) {
        // If this is the first message and it's too long, truncate it
        if (context.length === 0 && msg.role === 'user') {
          const truncated = msg.content.substring(msg.content.length - maxTokens + 100);
          context.unshift({
            ...msg,
            content: '...' + truncated
          });
        }
        break;
      }
      context.unshift(msg);
      totalLength += msgLength;
    }

    return context;
  }

  /**
   * Summarize older messages for context
   */
  static summarizeOldMessages(messages: ChatMessage[]): string {
    const oldMessages = messages.slice(0, -this.MAX_MESSAGES);
    if (oldMessages.length === 0) return '';

    const topics = new Set<string>();
    oldMessages.forEach(msg => {
      // Extract key topics (simple implementation)
      const words = msg.content.toLowerCase().split(/\s+/);
      words.filter(w => w.length > 5).forEach(w => topics.add(w));
    });

    return `Previous discussion touched on: ${Array.from(topics).slice(0, 5).join(', ')}`;
  }
}

class AIService {
  /**
   * Generate a response from Claude LLM
   */
  async generateResponse(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 1024,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    const response = await apiService.post<AIResponse>('/api/llm/generate', {
      prompt,
      systemPrompt,
      maxTokens,
      temperature,
    });

    return response;
  }

  /**
   * Generate AI-powered insights for a journal entry
   */
  async generateJournalInsights(
    journalContent: string,
    journalTitle?: string,
    emotions?: string[]
  ): Promise<JournalInsights> {
    const response = await apiService.post<JournalInsights>('/api/llm/journal-insights', {
      journalContent,
      journalTitle,
      emotions,
    });

    return response;
  }

  /**
   * Generate reflection questions from journal insights
   */
  async generateReflectionQuestions(
    journalContent: string,
    journalTitle?: string,
    emotions?: string[]
  ): Promise<string[]> {
    const prompt = `Based on this journal entry, generate 3-5 thoughtful reflection questions that would help deepen self-awareness.

${journalTitle ? `Title: ${journalTitle}` : ''}
${emotions ? `Emotions: ${emotions.join(', ')}` : ''}

Journal Entry:
${journalContent}

Please provide only the questions, one per line, without numbering or extra formatting.`;

    const response = await this.generateResponse(
      prompt,
      'You are a thoughtful journal companion. Generate reflection questions that encourage introspection and personal growth.',
      500,
      0.7
    );

    // Parse questions from response (split by newlines, filter empty)
    const questions = response.response
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && q.includes('?'));

    return questions;
  }

  /**
   * Chat about a journal entry with conversation history
   */
  async chatAboutJournal(
    journalContent: string,
    message: string,
    conversationHistory: ChatMessage[] = [],
    options: {
      includeEmotionalContext?: boolean;
      focusOnPatterns?: boolean;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const cleanContent = this.cleanJournalContent(journalContent);

    // Prepare context with smart truncation
    const contextMessages = ConversationManager.prepareContext(
      conversationHistory,
      2000 // Leave room for journal content
    );

    // Build enhanced system prompt
    let systemPrompt = `You are a supportive journal companion helping someone reflect on their journal entry.
    Be empathetic, ask thoughtful follow-up questions, and help them explore their thoughts and feelings deeper.
    Keep responses concise but meaningful (2-3 paragraphs max).`;

    if (options.includeEmotionalContext) {
      systemPrompt += `\nPay special attention to emotional patterns and feelings expressed.`;
    }

    if (options.focusOnPatterns) {
      systemPrompt += `\nHelp identify recurring themes and patterns in their thinking.`;
    }

    // Add summary of older conversation if applicable
    const oldSummary = ConversationManager.summarizeOldMessages(conversationHistory);

    const historyContext = contextMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `Journal Entry: ${cleanContent.substring(0, 2000)}

${oldSummary ? `Context: ${oldSummary}\n` : ''}
${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}
User: ${message}`;

    const response = await this.generateResponse(
      prompt,
      systemPrompt,
      600,
      options.temperature || 0.7
    );

    return response.response;
  }

  /**
   * Generate contextual follow-up question
   */
  async generateFollowUpQuestion(
    journalContent: string,
    lastResponse: string
  ): Promise<string> {
    const cleanContent = this.cleanJournalContent(journalContent);

    const systemPrompt = `Generate a single, thoughtful follow-up question based on the journal entry and previous response.
    The question should encourage deeper reflection and self-discovery.
    Return ONLY the question, no additional text.`;

    const prompt = `Journal excerpt: ${cleanContent.substring(0, 1000)}

Previous response: ${lastResponse.substring(0, 500)}

Generate a follow-up question:`;

    const response = await this.generateResponse(prompt, systemPrompt, 100, 0.8);
    return response.response.trim();
  }

  /**
   * Clean and truncate journal content
   */
  private cleanJournalContent(content: string): string {
    // Remove excessive whitespace while preserving structure
    return content.replace(/\n\n\n+/g, '\n\n').trim();
  }
}

// Export singleton instance
export const aiService = new AIService();
