import React from 'react'
import { Plus, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { MomentBlock, MomentSubField } from '../../types/template.types'
import '../../styles/moment-blocks.css'

interface MomentBlocksSectionProps {
  value: MomentBlock[] | string
  onChange: (value: MomentBlock[]) => void
  placeholder?: string
  disabled?: boolean
  config?: {
    minMoments?: number
    maxMoments?: number
    defaultMoments?: number
    textareaRows?: number
    subFields?: MomentSubField[]
  }
  onMomentAdd?: () => void
  onMomentRemove?: (index: number) => void
  onSubFieldComplete?: (momentIndex: number, fieldId: string) => void
}

const defaultSubFields: MomentSubField[] = [
  {
    id: 'scene',
    label: 'The Scene',
    placeholder: 'Briefly, what happened?',
    hint: 'Just the facts—set the stage in 1-2 sentences'
  },
  {
    id: 'reaction',
    label: 'The Reaction',
    placeholder: 'What was the somatic or emotional spike?',
    hint: 'Frustration, warmth, tightening chest, relief, tears?'
  },
  {
    id: 'takeaway',
    label: 'The Takeaway',
    placeholder: 'What does this tell you about your needs or values?',
    hint: 'The insight, question, or intention you\'re carrying forward',
    optional: true
  }
]

export const MomentBlocksSection: React.FC<MomentBlocksSectionProps> = ({
  value,
  onChange,
  disabled = false,
  config = {},
  onMomentAdd,
  onMomentRemove,
  onSubFieldComplete
}) => {
  const {
    minMoments = 1,
    maxMoments = 3,
    defaultMoments = 1,
    textareaRows = 4,
    subFields = defaultSubFields
  } = config

  // Parse value if it's a string (backward compatibility)
  const moments: MomentBlock[] = typeof value === 'string'
    ? (value ? JSON.parse(value) : [])
    : value || []

  // Initialize with default moments if empty
  React.useEffect(() => {
    if (moments.length === 0 && defaultMoments > 0) {
      const initialMoments: MomentBlock[] = []
      for (let i = 0; i < defaultMoments; i++) {
        initialMoments.push({
          id: uuidv4(),
          scene: '',
          reaction: '',
          takeaway: ''
        })
      }
      onChange(initialMoments)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addMoment = () => {
    if (moments.length >= maxMoments) return

    const newMoment: MomentBlock = {
      id: uuidv4(),
      scene: '',
      reaction: '',
      takeaway: ''
    }

    onChange([...moments, newMoment])
    onMomentAdd?.()
  }

  const removeMoment = (index: number) => {
    if (moments.length <= minMoments) return

    const updated = moments.filter((_, i) => i !== index)
    onChange(updated)
    onMomentRemove?.(index)
  }

  const updateMomentField = (
    momentIndex: number,
    fieldId: string,
    fieldValue: string
  ) => {
    const updated = moments.map((moment, i) => {
      if (i !== momentIndex) return moment
      return { ...moment, [fieldId]: fieldValue }
    })
    onChange(updated)
  }

  const handleFieldBlur = (momentIndex: number, fieldId: string, fieldValue: string) => {
    // Only trigger completion if there's content
    if (fieldValue.trim()) {
      onSubFieldComplete?.(momentIndex, fieldId)
    }
  }

  const canAddMoment = moments.length < maxMoments
  const canRemoveMoment = moments.length > minMoments

  return (
    <div className="moment-blocks-section">
      {moments.map((moment, momentIndex) => (
        <div key={moment.id} className="moment-block">
          <div className="moment-block-header">
            <span className="moment-block-number">Moment {momentIndex + 1}</span>
            {canRemoveMoment && (
              <button
                type="button"
                onClick={() => removeMoment(momentIndex)}
                className="moment-block-remove"
                disabled={disabled}
                aria-label={`Remove moment ${momentIndex + 1}`}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="moment-block-fields">
            {subFields.map((field) => (
              <div key={field.id} className="moment-block-field">
                <label
                  htmlFor={`moment-${moment.id}-${field.id}`}
                  className="moment-block-label"
                >
                  {field.label}
                  {field.optional && (
                    <span className="moment-block-optional">(optional)</span>
                  )}
                </label>
                <textarea
                  id={`moment-${moment.id}-${field.id}`}
                  value={(moment as Record<string, string>)[field.id] || ''}
                  onChange={(e) => updateMomentField(momentIndex, field.id, e.target.value)}
                  onBlur={(e) => handleFieldBlur(momentIndex, field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={textareaRows}
                  className="moment-block-textarea"
                  disabled={disabled}
                />
                {field.hint && (
                  <span className="moment-block-hint">{field.hint}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {canAddMoment && (
        <button
          type="button"
          onClick={addMoment}
          className="moment-block-add"
          disabled={disabled}
        >
          <Plus size={16} />
          Add another moment
        </button>
      )}
    </div>
  )
}
