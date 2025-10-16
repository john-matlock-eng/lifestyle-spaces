/**
 * AIAssistantDock - Floating AI assistant dock for journal writing
 * Provides insights, questions, and chat in a minimizable bottom dock
 */

import React, { useState } from 'react'
import { Bot, Minimize2, Maximize2, X, Sparkles, MessageCircle, Lightbulb, HelpCircle } from 'lucide-react'
import { AIChat } from './AIChatEnhanced'
import { AIChatErrorBoundary } from './AIChatErrorBoundary'
import InsightsPanel from '../../../components/InsightsPanel'
import '../styles/ai-assistant-dock.css'

interface AIAssistantDockProps {
  journalContent: string
  journalTitle?: string
  journalId?: string
  emotions?: string[]
  onClose?: () => void
  onGenerateQuestions?: (type: 'reflection' | 'emotional' | 'growth' | 'patterns') => void
}

export const AIAssistantDock: React.FC<AIAssistantDockProps> = ({
  journalContent,
  journalTitle,
  journalId,
  emotions,
  onClose,
  onGenerateQuestions
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights')

  return (
    <div className={`ai-assistant-dock ${isMinimized ? 'minimized' : 'expanded'}`}>
      {/* Dock Header */}
      <div className="ai-dock-header">
        <div className="ai-dock-title">
          <Bot size={20} />
          <span>AI Journal Assistant</span>
          <Sparkles size={16} className="sparkle-icon" />
        </div>
        <div className="ai-dock-controls">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="dock-control-btn"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="dock-control-btn close-btn"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Dock Content */}
      {!isMinimized && (
        <>
          <div className="ai-dock-tabs">
            <button
              className={`ai-dock-tab ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              <Lightbulb size={16} />
              <span>Insights</span>
            </button>
            <button
              className={`ai-dock-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageCircle size={16} />
              <span>Chat</span>
            </button>
          </div>

          <div className="ai-dock-content">
            {activeTab === 'insights' && (
              <div className="ai-dock-insights">
                <InsightsPanel
                  journalContent={journalContent}
                  journalTitle={journalTitle}
                  emotions={emotions}
                  autoGenerate={true}
                />
                {onGenerateQuestions && (
                  <div className="generate-questions-section">
                    <div className="section-header">
                      <HelpCircle size={18} />
                      <h3>Generate Reflection Questions</h3>
                    </div>
                    <p className="section-description">
                      Add questions to your journal's Q&A section to deepen your reflection
                    </p>
                    <div className="question-type-buttons">
                      <button
                        onClick={() => onGenerateQuestions('reflection')}
                        className="btn-generate-type"
                      >
                        🤔 Deep Reflection
                      </button>
                      <button
                        onClick={() => onGenerateQuestions('emotional')}
                        className="btn-generate-type"
                      >
                        💭 Emotional Awareness
                      </button>
                      <button
                        onClick={() => onGenerateQuestions('growth')}
                        className="btn-generate-type"
                      >
                        🌱 Personal Growth
                      </button>
                      <button
                        onClick={() => onGenerateQuestions('patterns')}
                        className="btn-generate-type"
                      >
                        🔍 Pattern Recognition
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'chat' && (
              <AIChatErrorBoundary>
                <AIChat
                  journalContent={journalContent}
                  journalTitle={journalTitle}
                  journalId={journalId}
                  emotions={emotions}
                  isOpen={true}
                  position="center"
                />
              </AIChatErrorBoundary>
            )}
          </div>
        </>
      )}
    </div>
  )
}
