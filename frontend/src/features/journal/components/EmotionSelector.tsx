import React, { useState } from 'react'
import { emotions, getChildEmotions, getEmotionById, type Emotion } from '../data/emotionData'
import '../styles/emotion-selector.css'

interface EmotionSelectorProps {
  selectedEmotion?: string
  onSelectEmotion: (emotionId: string | null, emotionLabel: string | null) => void
  disabled?: boolean
}

/**
 * Emotion selector component for choosing emotions from a hierarchical structure
 * Shows core emotions first, then secondary emotions when a core emotion is selected
 */
export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  selectedEmotion,
  onSelectEmotion,
  disabled = false
}) => {
  const [selectedCore, setSelectedCore] = useState<string | null>(null)
  const [showSecondary, setShowSecondary] = useState(false)

  // Get core emotions
  const coreEmotions = emotions.filter((e) => e.level === 'core')

  // Get secondary emotions for selected core
  const secondaryEmotions = selectedCore ? getChildEmotions(selectedCore) : []

  const handleCoreClick = (emotion: Emotion) => {
    if (disabled) return

    setSelectedCore(emotion.id)
    setShowSecondary(true)
    // If clicking the same core emotion again, select it directly
    if (selectedEmotion === emotion.id) {
      onSelectEmotion(emotion.id, emotion.label)
    }
  }

  const handleSecondaryClick = (emotion: Emotion) => {
    if (disabled) return
    onSelectEmotion(emotion.id, emotion.label)
    setShowSecondary(false)
  }

  const handleClearSelection = () => {
    if (disabled) return
    onSelectEmotion(null, null)
    setSelectedCore(null)
    setShowSecondary(false)
  }

  const selectedEmotionData = selectedEmotion ? getEmotionById(selectedEmotion) : null

  return (
    <div className="emotion-selector">
      <div className="emotion-selector-header">
        <h4 className="emotion-selector-title">How are you feeling?</h4>
        {selectedEmotionData && (
          <button
            onClick={handleClearSelection}
            className="emotion-clear-btn"
            disabled={disabled}
            type="button"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {selectedEmotionData && (
        <div className="selected-emotion-display">
          <div
            className="selected-emotion-badge"
            style={{ backgroundColor: selectedEmotionData.color }}
          >
            {selectedEmotionData.label}
          </div>
        </div>
      )}

      <div className="core-emotions-grid">
        {coreEmotions.map((emotion) => (
          <button
            key={emotion.id}
            type="button"
            onClick={() => handleCoreClick(emotion)}
            className={`emotion-btn core-emotion ${
              selectedCore === emotion.id || selectedEmotion === emotion.id ? 'selected' : ''
            }`}
            style={{
              backgroundColor: emotion.color,
              borderColor: selectedCore === emotion.id ? emotion.color : 'transparent'
            }}
            disabled={disabled}
          >
            {emotion.label}
          </button>
        ))}
      </div>

      {showSecondary && secondaryEmotions.length > 0 && (
        <div className="secondary-emotions-section">
          <div className="secondary-emotions-header">
            <h5>More specific feelings:</h5>
            <button
              type="button"
              onClick={() => setShowSecondary(false)}
              className="secondary-close-btn"
              disabled={disabled}
            >
              ← Back
            </button>
          </div>
          <div className="secondary-emotions-grid">
            {secondaryEmotions.map((emotion) => (
              <button
                key={emotion.id}
                type="button"
                onClick={() => handleSecondaryClick(emotion)}
                className={`emotion-btn secondary-emotion ${
                  selectedEmotion === emotion.id ? 'selected' : ''
                }`}
                style={{
                  backgroundColor: emotion.color,
                  borderColor: selectedEmotion === emotion.id ? emotion.color : 'transparent'
                }}
                disabled={disabled}
              >
                {emotion.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
