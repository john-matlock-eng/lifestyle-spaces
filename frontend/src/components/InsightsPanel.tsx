/**
 * InsightsPanel Component - AI-powered insights for journal entries
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '../services/ai';
import './InsightsPanel.css';

interface InsightsPanelProps {
  journalContent: string;
  journalTitle?: string;
  emotions?: string[];
  autoGenerate?: boolean;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({
  journalContent,
  journalTitle,
  emotions,
  autoGenerate = false,
}) => {
  const [insights, setInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (autoGenerate && journalContent && !insights) {
      handleGenerateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, journalContent]);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.generateJournalInsights(
        journalContent,
        journalTitle,
        emotions
      );
      setInsights(result.response);
      setIsExpanded(true);
    } catch (err) {
      console.error('Error generating insights:', err);
      setError('Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setInsights('');
    handleGenerateInsights();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formatInsights = (text: string) => {
    // Split by numbered lists or bullet points
    const sections = text.split(/\n(?=\d+\.|\*|-)/);
    return sections.map((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return null;

      // Check if it's a numbered item
      const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/s);
      if (numberedMatch) {
        return (
          <div key={index} className="insight-item">
            <span className="insight-number">{numberedMatch[1]}</span>
            <span className="insight-text">{numberedMatch[2]}</span>
          </div>
        );
      }

      // Check if it's a bullet point
      const bulletMatch = trimmed.match(/^[*-]\s*(.+)/s);
      if (bulletMatch) {
        return (
          <div key={index} className="insight-item">
            <span className="insight-bullet">•</span>
            <span className="insight-text">{bulletMatch[1]}</span>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={index} className="insight-paragraph">
          {trimmed}
        </p>
      );
    });
  };

  if (!autoGenerate && !insights && !isLoading) {
    return (
      <div className="insights-panel">
        <div className="insights-panel-header">
          <h3>AI Insights</h3>
        </div>
        <div className="insights-panel-empty">
          <div className="insights-icon">💡</div>
          <p>Get AI-powered insights about your journal entry.</p>
          <button
            className="btn-generate-insights"
            onClick={handleGenerateInsights}
            disabled={!journalContent}
          >
            Generate Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      <div className="insights-panel-header">
        <h3>AI Insights</h3>
        <div className="insights-panel-actions">
          {insights && !isLoading && (
            <button
              className="btn-refresh-insights"
              onClick={handleRefresh}
              aria-label="Refresh insights"
            >
              ↻
            </button>
          )}
          {insights && (
            <button
              className="btn-toggle-insights"
              onClick={toggleExpanded}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="insights-panel-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your journal entry...</p>
        </div>
      )}

      {error && (
        <div className="insights-panel-error">
          {error}
        </div>
      )}

      {insights && !isLoading && isExpanded && (
        <div className="insights-panel-content">
          {formatInsights(insights)}
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
