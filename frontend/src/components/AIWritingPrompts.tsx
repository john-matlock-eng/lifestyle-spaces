/**
 * AIWritingPrompts Component - AI-powered writing prompts to help start journaling
 */

import React, { useState } from 'react';
import { aiService } from '../services/ai';
import './AIWritingPrompts.css';

interface AIWritingPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const AIWritingPrompts: React.FC<AIWritingPromptsProps> = ({ onSelectPrompt, disabled = false }) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGeneratePrompts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.generateResponse(
        'Generate 5 thoughtful journal writing prompts to help someone start writing. Each prompt should be a single question or statement. Make them varied - some reflective, some about daily life, some about goals or feelings.',
        'You are a helpful journaling assistant. Generate creative, thought-provoking prompts that encourage self-reflection and personal growth.',
        600,
        0.8
      );

      // Parse prompts from response (split by newlines, filter empty)
      const generatedPrompts = response.response
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => p.replace(/^[-•*\d.]+\s*/, '')) // Remove bullet points or numbers
        .filter(p => p.length > 10) // Filter out very short lines
        .slice(0, 5); // Limit to 5 prompts

      setPrompts(generatedPrompts);
      setIsExpanded(true);
    } catch (err) {
      console.error('Error generating writing prompts:', err);
      setError('Failed to generate prompts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    onSelectPrompt(prompt);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div className="ai-writing-prompts collapsed">
        <button
          className="btn-show-prompts"
          onClick={() => {
            if (prompts.length === 0) {
              handleGeneratePrompts();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={disabled || isLoading}
          type="button"
        >
          {isLoading ? (
            <>
              <span className="prompts-spinner"></span>
              Generating prompts...
            </>
          ) : (
            <>
              💡 {prompts.length > 0 ? 'Show' : 'Get'} AI Writing Prompts
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="ai-writing-prompts expanded">
      <div className="prompts-header">
        <h4>AI Writing Prompts</h4>
        <div className="prompts-actions">
          <button
            className="btn-refresh-prompts"
            onClick={handleGeneratePrompts}
            disabled={disabled || isLoading}
            type="button"
            aria-label="Refresh prompts"
          >
            ↻
          </button>
          <button
            className="btn-collapse-prompts"
            onClick={() => setIsExpanded(false)}
            type="button"
            aria-label="Hide prompts"
          >
            −
          </button>
        </div>
      </div>

      {error && (
        <div className="prompts-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="prompts-loading">
          <div className="prompts-spinner"></div>
          <p>Generating writing prompts...</p>
        </div>
      ) : (
        <div className="prompts-list">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              className="prompt-item"
              onClick={() => handleSelectPrompt(prompt)}
              disabled={disabled}
              type="button"
            >
              <span className="prompt-number">{index + 1}</span>
              <span className="prompt-text">{prompt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIWritingPrompts;
