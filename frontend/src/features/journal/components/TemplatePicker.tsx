import React, { useState, useEffect } from 'react'
import { getTemplates } from '../services/templateApi'
import { journalApi } from '../services/journalApi'
import { getFrameworkRegistry } from '../frameworks/definitions'
import type { Template } from '../types/template.types'
import type { Framework } from '../types/framework.types'
import '../styles/template-picker.css'

interface TemplatePickerProps {
  onSelectTemplate: (template: Template | null) => void
  selectedTemplateId?: string
  spaceId?: string
}

/**
 * Template picker component for selecting journal templates
 * Shows both framework-based templates and standalone templates
 */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  onSelectTemplate,
  selectedTemplateId,
  spaceId
}) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completedTemplateIds, setCompletedTemplateIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTemplates()
  }, [])

  // Load completed templates when a framework is selected
  useEffect(() => {
    if (selectedFramework && spaceId) {
      loadCompletedTemplates(selectedFramework.id)
    }
  }, [selectedFramework, spaceId])

  const loadCompletedTemplates = async (frameworkId: string) => {
    if (!spaceId) return
    try {
      const response = await journalApi.getSpaceJournals(spaceId, { pageSize: 100 })
      console.log('[DEBUG loadCompletedTemplates] frameworkId:', frameworkId)
      console.log('[DEBUG loadCompletedTemplates] journals count:', response.journals.length)

      const completedIds = new Set<string>()
      for (const journal of response.journals) {
        console.log('[DEBUG loadCompletedTemplates] journal:', {
          title: journal.title,
          frameworkId: journal.frameworkId,
          templateId: journal.templateId,
          matches: journal.frameworkId === frameworkId
        })
        if (journal.frameworkId === frameworkId && journal.templateId) {
          completedIds.add(journal.templateId)
          console.log('[DEBUG loadCompletedTemplates] Added to completedIds:', journal.templateId)
        }
      }
      console.log('[DEBUG loadCompletedTemplates] completedIds:', Array.from(completedIds))
      setCompletedTemplateIds(completedIds)
    } catch (err) {
      console.error('Failed to load completed templates:', err)
    }
  }

  const loadTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load both frameworks and standalone templates
      const [templateResponse, frameworkList] = await Promise.all([
        getTemplates().catch(() => ({ templates: [] })),
        Promise.resolve(getFrameworkRegistry().getAll({ isActive: true }))
      ])
      setTemplates(templateResponse.templates)
      setFrameworks(frameworkList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template)
  }

  const handleSelectFrameworkTemplate = (framework: Framework, templateConfig: Framework['templates'][0]) => {
    // Convert framework template config to Template format for compatibility
    const template: Template = {
      id: templateConfig.templateId || templateConfig.id || '',
      name: templateConfig.name || 'Untitled Template',
      description: templateConfig.description || '',
      icon: templateConfig.icon || framework.icon,
      color: templateConfig.color || framework.color,
      version: templateConfig.version || 1,
      sections: templateConfig.content?.sections?.map((section, index) => ({
        id: section.id,
        title: section.title,
        type: 'paragraph' as const,
        placeholder: section.description || '',
        order: index,
      })) || [],
      // Store framework reference
      frameworkId: framework.id,
    }
    onSelectTemplate(template)
  }

  const handleClearSelection = () => {
    onSelectTemplate(null)
    setSelectedFramework(null)
  }

  const handleBackToFrameworks = () => {
    setSelectedFramework(null)
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

  // Show framework detail view
  if (selectedFramework) {
    // Group templates by lifecycle
    const foundationTemplates = selectedFramework.templates
      .filter(t => t.lifecycle === 'foundation')
      .sort((a, b) => a.order - b.order)
    const recurringTemplates = selectedFramework.templates
      .filter(t => t.lifecycle !== 'foundation')
      .sort((a, b) => a.order - b.order)

    // First foundation template with no prerequisites is the starting point
    const startingTemplate = foundationTemplates.find(t => !t.prerequisites || t.prerequisites.length === 0)

    const renderTemplateCard = (templateConfig: Framework['templates'][0], isStarting: boolean = false) => {
      const templateId = templateConfig.templateId || templateConfig.id
      const hasPrerequisites = templateConfig.prerequisites && templateConfig.prerequisites.length > 0
      // Check if all prerequisites are completed
      const prerequisitesMet = !hasPrerequisites || templateConfig.prerequisites!.every(
        prereqId => completedTemplateIds.has(prereqId)
      )
      const isCompleted = templateId ? completedTemplateIds.has(templateId) : false
      const isLocked = hasPrerequisites && !prerequisitesMet

      // Debug logging
      console.log('[DEBUG renderTemplateCard]', templateConfig.name, {
        templateId,
        hasPrerequisites,
        prerequisites: templateConfig.prerequisites,
        completedTemplateIds: Array.from(completedTemplateIds),
        prerequisitesMet,
        isCompleted,
        isLocked
      })

      // Show "Start Here" only if not completed and is the starting template
      const showStartHere = isStarting && !isCompleted

      return (
        <button
          key={templateId}
          onClick={() => !isLocked && handleSelectFrameworkTemplate(selectedFramework, templateConfig)}
          className={`template-card ${selectedTemplateId === templateId ? 'selected' : ''} ${showStartHere ? 'template-card--starting' : ''} ${isLocked ? 'template-card--locked' : ''} ${isCompleted ? 'template-card--completed' : ''}`}
          data-template-color={templateConfig.color || selectedFramework.color || ''}
          aria-label={`${templateConfig.name} template${isLocked ? ' (locked)' : ''}${isCompleted ? ' (completed)' : ''}`}
          disabled={isLocked}
          style={isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
        >
          {isCompleted && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'var(--color-success, #10b981)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              ✓ Done
            </div>
          )}
          {showStartHere && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'var(--color-success, #10b981)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Start Here
            </div>
          )}
          {isLocked && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'var(--color-warning, #f59e0b)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              🔒 Locked
            </div>
          )}
          <div className="template-card-header">
            <span className="template-icon" style={{ color: templateConfig.color || selectedFramework.color }}>
              {templateConfig.icon || selectedFramework.icon}
            </span>
            <h4 className="template-name">{templateConfig.name}</h4>
          </div>
          <p className="template-description">{templateConfig.description}</p>
          {isLocked && templateConfig.lockedMessage && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-warning, #f59e0b)', marginTop: '0.5rem', fontStyle: 'italic' }}>
              {templateConfig.lockedMessage}
            </p>
          )}
          <div className="template-sections">
            <span className="template-sections-count">
              {templateConfig.lifecycle === 'foundation' ? '🏛️ Foundation' :
               templateConfig.lifecycle === 'recurring' ? '🔄 Recurring' :
               templateConfig.lifecycle || 'Template'}
            </span>
            {templateConfig.frequency && (
              <span className="template-frequency" style={{ marginLeft: '0.5rem' }}>
                • {templateConfig.frequency}
              </span>
            )}
          </div>
        </button>
      )
    }

    return (
      <div className="template-picker">
        <div className="template-picker-header">
          <button
            onClick={handleBackToFrameworks}
            className="button-secondary"
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Frameworks
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>{selectedFramework.icon}</span>
            <div>
              <h3 className="template-picker-title">{selectedFramework.name}</h3>
              <p className="template-picker-subtitle">{selectedFramework.tagline}</p>
            </div>
          </div>
        </div>

        {/* Foundation Templates - One-time setup */}
        {foundationTemplates.length > 0 && (
          <>
            <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏛️</span> Foundation
              <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>— Complete these first, in order</span>
            </h4>
            <div className="template-grid" style={{ position: 'relative' }}>
              {foundationTemplates.map((templateConfig) =>
                renderTemplateCard(
                  templateConfig,
                  startingTemplate && (startingTemplate.templateId || startingTemplate.id) === (templateConfig.templateId || templateConfig.id)
                )
              )}
            </div>
          </>
        )}

        {/* Recurring Templates */}
        {recurringTemplates.length > 0 && (
          <>
            <h4 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔄</span> Recurring
              <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>— Use these regularly after foundation</span>
            </h4>
            <div className="template-grid">
              {recurringTemplates.map((templateConfig) => renderTemplateCard(templateConfig, false))}
            </div>
          </>
        )}

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

  // Show main picker with frameworks and templates
  return (
    <div className="template-picker">
      <div className="template-picker-header">
        <h3 className="template-picker-title">Choose a Template</h3>
        <p className="template-picker-subtitle">
          Select a framework or template to help structure your journal entry
        </p>
      </div>

      {/* Frameworks Section */}
      {frameworks.length > 0 && (
        <>
          <h4 style={{ margin: '1.5rem 0 1rem', color: 'var(--color-text-secondary)' }}>
            Frameworks
          </h4>
          <div className="template-grid">
            {frameworks.map((framework) => (
              <button
                key={framework.id}
                onClick={() => setSelectedFramework(framework)}
                className="template-card framework-card"
                data-template-color={framework.color || ''}
                aria-label={`${framework.name} framework`}
              >
                <div className="template-card-header">
                  <span className="template-icon" style={{ color: framework.color }}>
                    {framework.icon}
                  </span>
                  <h4 className="template-name">{framework.name}</h4>
                </div>
                <p className="template-description">{framework.tagline || framework.description}</p>
                <div className="template-sections">
                  <span className="template-sections-count">
                    {framework.templates.length} {framework.templates.length === 1 ? 'template' : 'templates'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Standalone Templates Section */}
      {templates.length > 0 && (
        <>
          <h4 style={{ margin: '1.5rem 0 1rem', color: 'var(--color-text-secondary)' }}>
            {frameworks.length > 0 ? 'Standalone Templates' : 'Templates'}
          </h4>
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                data-template-color={template.color || ''}
                aria-label={`${template.name} template`}
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
        </>
      )}

      {/* Empty state */}
      {frameworks.length === 0 && templates.length === 0 && (
        <div className="template-picker-empty">
          <p>No templates available. Start with a blank journal!</p>
        </div>
      )}

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
