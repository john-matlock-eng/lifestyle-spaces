/**
 * AI Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from './ai';
import * as apiModule from './api';

// Mock the apiRequest function
vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}));

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should call apiRequest with correct parameters', async () => {
      const mockResponse = {
        response: 'Test response',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      const result = await aiService.generateResponse(
        'Test prompt',
        'System prompt',
        1024,
        0.7
      );

      expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/llm/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test prompt',
          systemPrompt: 'System prompt',
          maxTokens: 1024,
          temperature: 0.7,
        }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should use default parameters when not provided', async () => {
      const mockResponse = {
        response: 'Test response',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      await aiService.generateResponse('Test prompt');

      expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/llm/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test prompt',
          systemPrompt: undefined,
          maxTokens: 1024,
          temperature: 0.7,
        }),
      });
    });
  });

  describe('generateJournalInsights', () => {
    it('should call apiRequest with journal insights endpoint', async () => {
      const mockResponse = {
        response: 'Insights about your journal',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 50,
          outputTokens: 100,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      const result = await aiService.generateJournalInsights(
        'Journal content',
        'Journal title',
        ['happy', 'grateful']
      );

      expect(apiModule.apiRequest).toHaveBeenCalledWith('/api/llm/journal-insights', {
        method: 'POST',
        body: JSON.stringify({
          journalContent: 'Journal content',
          journalTitle: 'Journal title',
          emotions: ['happy', 'grateful'],
        }),
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateReflectionQuestions', () => {
    it('should generate questions from journal content', async () => {
      const mockResponse = {
        response: 'What did you learn today?\nHow did this make you feel?\nWhat would you do differently?',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 30,
          outputTokens: 40,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      const result = await aiService.generateReflectionQuestions(
        'Journal content'
      );

      expect(result).toEqual([
        'What did you learn today?',
        'How did this make you feel?',
        'What would you do differently?',
      ]);
    });

    it('should filter out non-question lines', async () => {
      const mockResponse = {
        response: 'What did you learn?\nSome text without a question mark\nHow do you feel?',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 30,
          outputTokens: 40,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      const result = await aiService.generateReflectionQuestions(
        'Journal content'
      );

      // Should only include lines with question marks
      expect(result).toEqual([
        'What did you learn?',
        'How do you feel?',
      ]);
    });
  });

  describe('chatAboutJournal', () => {
    it('should build conversation context correctly', async () => {
      const mockResponse = {
        response: 'AI response to your question',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          inputTokens: 60,
          outputTokens: 80,
        },
      };

      vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(mockResponse);

      const conversationHistory = [
        { role: 'user' as const, content: 'Previous question' },
        { role: 'assistant' as const, content: 'Previous answer' },
      ];

      const result = await aiService.chatAboutJournal(
        'Journal content',
        'New question',
        conversationHistory
      );

      const mockFn = vi.mocked(apiModule.apiRequest);
      const callArgs = mockFn.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);

      expect(body.prompt).toContain('Journal content');
      expect(body.prompt).toContain('Previous question');
      expect(body.prompt).toContain('Previous answer');
      expect(body.prompt).toContain('New question');

      expect(result).toBe('AI response to your question');
    });
  });
});
