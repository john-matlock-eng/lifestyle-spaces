import React, { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { RichTextEditor } from '../RichTextEditor'
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
  onGenerateQuestions?: () => Promise<string[]>
  showGenerateButton?: boolean
}

export const QASection: React.FC<QASectionProps> = ({
  value,
  onChange,
  disabled = false,
  config = {},
  onGenerateQuestions,
  showGenerateButton = false
}) => {
  // Parse value if it's a string (for backward compatibility)
  const pairs: QAPair[] = typeof value === 'string'
    ? JSON.parse(value || '[]')
    : value || []

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([])

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

  const handleGenerateClick = async () => {
    if (!onGenerateQuestions) return

    setIsGenerating(true)
    try {
      const questions = await onGenerateQuestions()
      setGeneratedQuestions(questions)
      setShowGenerateModal(true)
    } catch (error) {
      console.error('Failed to generate questions:', error)
      alert('Failed to generate questions. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddGeneratedQuestion = (question: string) => {
    addPair(question)
    setGeneratedQuestions(generatedQuestions.filter(q => q !== question))
  }

  const handleAddAllGenerated = () => {
    generatedQuestions.forEach(question => addPair(question))
    setGeneratedQuestions([])
    setShowGenerateModal(false)
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
                <RichTextEditor
                  content={pair.answer}
                  onChange={(value) => updatePair(pair.id, 'answer', value)}
                  placeholder="Explore your answer here with full markdown support..."
                  minHeight="150px"
                  showToolbar={true}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Generate Questions Button */}
      {showGenerateButton && onGenerateQuestions && (
        <button
          type="button"
          onClick={handleGenerateClick}
          className="qa-generate-btn"
          disabled={disabled || isGenerating}
        >
          <Sparkles size={16} />
          {isGenerating ? 'Generating Questions...' : 'Generate Questions with AI'}
        </button>
      )}

      {/* Generated Questions Modal */}
      {showGenerateModal && generatedQuestions.length > 0 && (
        <div className="qa-generate-modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="qa-generate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qa-generate-modal-header">
              <h3>
                <Sparkles size={20} />
                AI Generated Questions
              </h3>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="qa-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="qa-generate-modal-body">
              <p className="qa-modal-description">
                Select individual questions or add them all to your Q&A section:
              </p>
              <div className="qa-generated-list">
                {generatedQuestions.map((question, idx) => (
                  <div key={idx} className="qa-generated-item">
                    <span className="qa-generated-question">{question}</span>
                    <button
                      type="button"
                      onClick={() => handleAddGeneratedQuestion(question)}
                      className="qa-generated-add-btn"
                      title="Add this question"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="qa-generate-modal-footer">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="qa-modal-btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddAllGenerated}
                className="qa-modal-btn-primary"
                disabled={generatedQuestions.length === 0}
              >
                <Plus size={16} />
                Add All {generatedQuestions.length} Questions
              </button>
            </div>
          </div>
        </div>
      )}

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
