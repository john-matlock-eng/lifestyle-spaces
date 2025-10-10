import React, { useState } from 'react'
import { Circle, Grid } from 'lucide-react'
import { getEmotionById, getCoreEmotions, getSecondaryEmotions } from '../data/emotionData'
import EmotionWheel from './EmotionWheel'
import '../styles/emotion-selector.css'
import '../styles/emotion-wheel.css'

interface EmotionSelectorProps {
  selectedEmotions: string[]
  onEmotionsChange: (emotions: string[]) => void
  disabled?: boolean
}

/**
 * Emotion selector component with toggle between button grid and wheel view
 * Supports multiple emotion selection
 */
export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  selectedEmotions = [],
  onEmotionsChange,
  disabled = false,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'wheel'>('grid')
  const [selectedCore, setSelectedCore] = useState<string | null>(null)
  const [showSecondary, setShowSecondary] = useState(false)

  // Handle emotion toggle
  const handleEmotionToggle = (emotionId: string) => {
    if (disabled) return

    if (selectedEmotions.includes(emotionId)) {
      // Remove emotion
      onEmotionsChange(selectedEmotions.filter((id) => id !== emotionId))
    } else {
      // Add emotion
      onEmotionsChange([...selectedEmotions, emotionId])
    }
  }

  // Handle core emotion click in grid mode
  const handleCoreClick = (emotionId: string) => {
    if (disabled) return

    setSelectedCore(emotionId)
    setShowSecondary(true)

    // If clicking the same core emotion again, toggle it
    if (selectedEmotions.includes(emotionId)) {
      handleEmotionToggle(emotionId)
    } else {
      handleEmotionToggle(emotionId)
    }
  }

  // Handle secondary emotion click in grid mode
  const handleSecondaryClick = (emotionId: string) => {
    if (disabled) return
    handleEmotionToggle(emotionId)
  }

  // Handle clear all
  const handleClearAll = () => {
    if (disabled) return
    onEmotionsChange([])
    setSelectedCore(null)
    setShowSecondary(false)
  }

  // Get core emotions
  const coreEmotions = getCoreEmotions()

  // Get secondary emotions for selected core
  const secondaryEmotions = selectedCore ? getSecondaryEmotions(selectedCore) : []

  return (
    <div className="emotion-selector">
      <div className="emotion-selector-header">
        <h4 className="emotion-selector-title">How are you feeling?</h4>
        <div className="emotion-selector-controls">
          {selectedEmotions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="emotion-clear-btn"
              disabled={disabled}
              type="button"
            >
              ✕ Clear All
            </button>
          )}
          <div className="emotion-view-toggle">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Grid view"
              disabled={disabled}
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wheel')}
              className={`view-toggle-btn ${viewMode === 'wheel' ? 'active' : ''}`}
              title="Wheel view"
              disabled={disabled}
            >
              <Circle size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedEmotions.length > 0 && (
        <div className="selected-emotions-display">
          {selectedEmotions.map((emotionId) => {
            const emotion = getEmotionById(emotionId)
            if (!emotion) return null

            return (
              <div
                key={emotionId}
                className="selected-emotion-badge"
                style={{
                  backgroundColor: emotion.color + '30',
                  borderColor: emotion.color,
                  color: emotion.color,
                }}
              >
                {emotion.label}
                <button
                  type="button"
                  onClick={() => handleEmotionToggle(emotionId)}
                  className="remove-emotion-btn"
                  disabled={disabled}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'grid' ? (
        <>
          <div className="core-emotions-grid">
            {coreEmotions.map((emotion) => (
              <button
                key={emotion.id}
                type="button"
                onClick={() => handleCoreClick(emotion.id)}
                className={`emotion-btn core-emotion ${
                  selectedEmotions.includes(emotion.id) ? 'selected' : ''
                }`}
                style={{
                  backgroundColor: emotion.color,
                  opacity: selectedEmotions.includes(emotion.id) ? 1 : 0.8,
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
                    onClick={() => handleSecondaryClick(emotion.id)}
                    className={`emotion-btn secondary-emotion ${
                      selectedEmotions.includes(emotion.id) ? 'selected' : ''
                    }`}
                    style={{
                      backgroundColor: emotion.color,
                      opacity: selectedEmotions.includes(emotion.id) ? 1 : 0.7,
                    }}
                    disabled={disabled}
                  >
                    {emotion.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmotionWheel
          selectedEmotions={selectedEmotions}
          onEmotionToggle={handleEmotionToggle}
          hierarchicalSelection={true}
          progressiveReveal={true}
          onComplete={() => {
            // Optional: Handle completion
          }}
        />
      )}
    </div>
  )
}
