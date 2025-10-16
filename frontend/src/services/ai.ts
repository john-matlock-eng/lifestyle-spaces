/**
 * AI Service - Integration with Claude LLM API
 */

import { apiRequest } from './api';

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
  role: 'user' | 'assistant';
  content: string;
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
    const response = await apiRequest<AIResponse>('/api/llm/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        systemPrompt,
        maxTokens,
        temperature,
      }),
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
    const response = await apiRequest<JournalInsights>('/api/llm/journal-insights', {
      method: 'POST',
      body: JSON.stringify({
        journalContent,
        journalTitle,
        emotions,
      }),
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
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    // Build context with conversation history
    let prompt = `I'm reflecting on my journal entry:\n\n${journalContent}\n\n`;

    if (conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'Me' : 'You';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `My question: ${message}`;

    const response = await this.generateResponse(
      prompt,
      'You are a supportive journal companion that helps people reflect on their experiences. Provide thoughtful, encouraging responses that promote self-awareness and growth.',
      600,
      0.7
    );

    return response.response;
  }
}

// Export singleton instance
export const aiService = new AIService();
