import React, { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import '../../styles/sections.css'

interface QAPair {
  id: string
  question: string
  answer: string
  isCollapsed?: boolean
}

interface QASectionProps {
  value: QAPair[] | string
  onChange: (value: QAPair[]) => void
  placeholder?: string
  disabled?: boolean
  config?: {
    suggested_questions?: string[]
    min_pairs?: number
    max_pairs?: number
  }
}

export const QASection: React.FC<QASectionProps> = ({
  value,
  onChange,
  disabled = false,
  config = {}
}) => {
  // Parse value if it's a string (for backward compatibility)
  const pairs: QAPair[] = typeof value === 'string'
    ? JSON.parse(value || '[]')
    : value || []

  const [showSuggestions, setShowSuggestions] = useState(false)

  const addPair = (question: string = '') => {
    if (config.max_pairs && pairs.length >= config.max_pairs) return

    const newPair: QAPair = {
      id: uuidv4(),
      question: question || '',
      answer: '',
      isCollapsed: false
    }

    onChange([...pairs, newPair])
  }

  const updatePair = (id: string, field: 'question' | 'answer', value: string) => {
    const updated = pairs.map(pair =>
      pair.id === id ? { ...pair, [field]: value } : pair
    )
    onChange(updated)
  }

  const removePair = (id: string) => {
    if (config.min_pairs && pairs.length <= config.min_pairs) return
    onChange(pairs.filter(pair => pair.id !== id))
  }

  const toggleCollapse = (id: string) => {
    const updated = pairs.map(pair =>
      pair.id === id ? { ...pair, isCollapsed: !pair.isCollapsed } : pair
    )
    onChange(updated)
  }

  return (
    <div className="qa-section">
      {/* Existing Q&A Pairs */}
      <div className="qa-pairs">
        {pairs.map((pair, index) => (
          <div key={pair.id} className="qa-pair">
            <div className="qa-pair-header">
              <button
                type="button"
                onClick={() => toggleCollapse(pair.id)}
                className="qa-collapse-btn"
                disabled={disabled}
              >
                {pair.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>

              <span className="qa-number">Q{index + 1}</span>

              <input
                type="text"
                value={pair.question}
                onChange={(e) => updatePair(pair.id, 'question', e.target.value)}
                placeholder="Enter your question..."
                className="qa-question-input"
                disabled={disabled}
              />

              <button
                type="button"
                onClick={() => removePair(pair.id)}
                className="qa-remove-btn"
                disabled={disabled || (config.min_pairs !== undefined && pairs.length <= config.min_pairs)}
                title="Remove this Q&A"
              >
                <X size={16} />
              </button>
            </div>

            {!pair.isCollapsed && (
              <div className="qa-pair-body">
                <textarea
                  value={pair.answer}
                  onChange={(e) => updatePair(pair.id, 'answer', e.target.value)}
                  placeholder="Explore your answer here..."
                  className="qa-answer-input"
                  disabled={disabled}
                  rows={4}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Questions */}
      {config.suggested_questions && config.suggested_questions.length > 0 && (
        <div className="qa-suggestions">
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="qa-suggestions-toggle"
          >
            💡 Suggested questions
            {showSuggestions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSuggestions && (
            <div className="qa-suggestions-list">
              {config.suggested_questions.map((question, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addPair(question)}
                  className="qa-suggestion-item"
                  disabled={disabled || (config.max_pairs !== undefined && pairs.length >= config.max_pairs)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add New Q&A Button */}
      <button
        type="button"
        onClick={() => addPair()}
        className="qa-add-btn"
        disabled={disabled || (config.max_pairs !== undefined && pairs.length >= config.max_pairs)}
      >
        <Plus size={16} />
        Add Question
      </button>

      {/* Helper text */}
      {config.min_pairs && pairs.length < config.min_pairs && (
        <p className="qa-helper-text">
          Add at least {config.min_pairs - pairs.length} more question{config.min_pairs - pairs.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
