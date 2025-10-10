import React, { useState, useEffect } from 'react'
import { getTemplates } from '../services/templateApi'
import type { Template } from '../types/template.types'
import '../styles/template-picker.css'

interface TemplatePickerProps {
  onSelectTemplate: (template: Template | null) => void
  selectedTemplateId?: string
}

/**
 * Template picker component for selecting journal templates
 */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  onSelectTemplate,
  selectedTemplateId
}) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getTemplates()
      setTemplates(response.templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template)
  }

  const handleClearSelection = () => {
    onSelectTemplate(null)
  }

  if (loading) {
    return (
      <div className="template-picker-loading">
        <p>Loading templates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="template-picker-error">
        <p>Error: {error}</p>
        <button onClick={loadTemplates} className="button-secondary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="template-picker">
      <div className="template-picker-header">
        <h3 className="template-picker-title">Choose a Template</h3>
        <p className="template-picker-subtitle">
          Select a template to help structure your journal entry
        </p>
      </div>

      <div className="template-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
            style={{
              borderColor: selectedTemplateId === template.id ? template.color : undefined
            }}
          >
            <div className="template-card-header">
              {template.icon && (
                <span className="template-icon" style={{ color: template.color }}>
                  {template.icon}
                </span>
              )}
              <h4 className="template-name">{template.name}</h4>
            </div>
            <p className="template-description">{template.description}</p>
            <div className="template-sections">
              <span className="template-sections-count">
                {template.sections.length} {template.sections.length === 1 ? 'section' : 'sections'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedTemplateId && (
        <div className="template-picker-actions">
          <button onClick={handleClearSelection} className="button-secondary">
            Clear Selection
          </button>
        </div>
      )}
    </div>
  )
}
