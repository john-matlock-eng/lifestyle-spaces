/**
 * ReflectionQuestions Component - AI-generated reflection questions for journal entries
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../services/ai';
import './ReflectionQuestions.css';

interface ReflectionQuestionsProps {
  journalContent: string;
  journalTitle?: string;
  emotions?: string[];
  autoGenerate?: boolean;
}

const ReflectionQuestions: React.FC<ReflectionQuestionsProps> = ({
  journalContent,
  journalTitle,
  emotions,
  autoGenerate = false,
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (autoGenerate && journalContent && questions.length === 0) {
      handleGenerateQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, journalContent]);

  const handleGenerateQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const generatedQuestions = await aiService.generateReflectionQuestions(
        journalContent,
        journalTitle,
        emotions
      );
      setQuestions(generatedQuestions);
    } catch (err) {
      console.error('Error generating reflection questions:', err);
      setError('Failed to generate reflection questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleRefresh = () => {
    setQuestions([]);
    setExpandedQuestions(new Set());
    handleGenerateQuestions();
  };

  if (!autoGenerate && questions.length === 0 && !isLoading) {
    return (
      <div className="reflection-questions">
        <div className="reflection-questions-header">
          <h3>Reflection Questions</h3>
        </div>
        <div className="reflection-questions-empty">
          <p>Get AI-powered reflection questions to deepen your self-awareness.</p>
          <button
            className="btn-generate-questions"
            onClick={handleGenerateQuestions}
            disabled={!journalContent}
          >
            Generate Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reflection-questions">
      <div className="reflection-questions-header">
        <h3>Reflection Questions</h3>
        {questions.length > 0 && (
          <button
            className="btn-refresh-questions"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh questions"
          >
            ↻
          </button>
        )}
      </div>

      {isLoading && (
        <div className="reflection-questions-loading">
          <div className="loading-spinner"></div>
          <p>Generating reflection questions...</p>
        </div>
      )}

      {error && (
        <div className="reflection-questions-error">
          {error}
        </div>
      )}

      {questions.length > 0 && !isLoading && (
        <div className="reflection-questions-list">
          {questions.map((question, index) => (
            <div
              key={index}
              className={`reflection-question-item ${
                expandedQuestions.has(index) ? 'expanded' : ''
              }`}
            >
              <button
                className="reflection-question-button"
                onClick={() => toggleQuestion(index)}
              >
                <span className="reflection-question-number">{index + 1}</span>
                <span className="reflection-question-text">{question}</span>
                <span className="reflection-question-icon">
                  {expandedQuestions.has(index) ? '−' : '+'}
                </span>
              </button>
              {expandedQuestions.has(index) && (
                <div className="reflection-question-response">
                  <textarea
                    placeholder="Write your thoughts here..."
                    rows={4}
                    className="reflection-response-input"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReflectionQuestions;
