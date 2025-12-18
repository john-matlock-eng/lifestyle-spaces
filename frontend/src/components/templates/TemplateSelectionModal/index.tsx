/**
 * TemplateSelectionModal Component
 *
 * Main modal for selecting templates organized by frameworks.
 * Provides browsing, searching, and selection of journal templates.
 *
 * @module templates/TemplateSelectionModal
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { FrameworkSection } from './FrameworkSection'
import { FrameworkDetailView } from './FrameworkDetailView'
import { StandaloneSection } from './StandaloneSection'
import { LockedTemplateModal } from './LockedTemplateModal'
import type {
  TemplateSelectionModalProps,
  ModalView,
  FrameworkDisplayData,
  TemplateWithStatus,
  SearchFilterState,
} from './types'
import type { Framework, FrameworkSummary } from '@/features/journal/types/framework.types'
import './template-selection-modal.css'

/**
 * Build display data for a framework including summary and progress
 */
function buildFrameworkDisplayData(
  framework: Framework,
  summaries: FrameworkSummary[]
): FrameworkDisplayData {
  const summary = summaries.find((s) => s.frameworkId === framework.id) || null
  const completedCount = summary?.completedTemplates || 0
  const templateCount = framework.templates.length
  const category = framework.categories?.[0]?.name

  return {
    framework,
    summary,
    templateCount,
    completedCount,
    category,
    isStarted: completedCount > 0,
  }
}

/**
 * Build template status data for a framework's templates
 */
function buildTemplatesWithStatus(
  framework: Framework,
  summary: FrameworkSummary | null
): TemplateWithStatus[] {
  return framework.templates.map((template) => {
    const progress = summary?.templateProgress?.find((p) => p.templateId === template.id)

    let status: TemplateWithStatus['status'] = 'available'
    if (progress) {
      if (progress.status === 'completed') {
        status = 'completed'
      } else if (progress.status === 'in_progress') {
        status = 'in_progress'
      }
    }

    // Check unlock status from summary
    const unlockStatus = summary?.unlockStatuses?.find((u) => u.templateId === template.id)
    if (unlockStatus && !unlockStatus.isUnlocked) {
      if (unlockStatus.cooldownEndsAt && new Date(unlockStatus.cooldownEndsAt) > new Date()) {
        status = 'cooldown'
      } else {
        status = 'locked'
      }
    }

    return {
      template,
      status,
      unlockEvaluation: unlockStatus
        ? {
            isUnlocked: unlockStatus.isUnlocked,
            blockedReasons: unlockStatus.blockedReasons || [],
          }
        : undefined,
      lastCompletedAt: progress?.completedAt,
      entryId: progress?.entryId,
      cooldownEndsAt: unlockStatus?.cooldownEndsAt,
    }
  })
}

/**
 * Filter frameworks based on search query
 */
function filterFrameworks(
  frameworks: FrameworkDisplayData[],
  query: string
): FrameworkDisplayData[] {
  if (!query.trim()) return frameworks

  const lowerQuery = query.toLowerCase()
  return frameworks.filter(
    ({ framework }) =>
      framework.name.toLowerCase().includes(lowerQuery) ||
      framework.tagline?.toLowerCase().includes(lowerQuery) ||
      framework.description.toLowerCase().includes(lowerQuery) ||
      framework.templates.some(
        (t) =>
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery)
      )
  )
}

/**
 * Main template selection modal component
 *
 * Features:
 * - Two-section layout: Frameworks and Standalone templates
 * - Framework detail view with template list
 * - Search filtering across all content
 * - Locked template modal with unlock guidance
 * - Keyboard navigation and accessibility
 * - Mobile responsive design
 *
 * @example
 * ```tsx
 * <TemplateSelectionModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSelectTemplate={(templateId, frameworkId) => createEntry(templateId, frameworkId)}
 *   onViewEntry={(entryId) => viewEntry(entryId)}
 *   onEditEntry={(entryId) => editEntry(entryId)}
 *   frameworks={frameworks}
 *   frameworkSummaries={summaries}
 *   standaloneTemplates={standaloneTemplates}
 *   initialSearchQuery=""
 *   testId="template-modal"
 * />
 * ```
 */
export function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onViewEntry,
  onEditEntry,
  frameworks = [],
  frameworkSummaries = [],
  standaloneTemplates = [],
  initialSearchQuery = '',
  initialFrameworkId,
  testId = 'template-selection-modal',
}: TemplateSelectionModalProps): JSX.Element | null {
  // View state
  const [view, setView] = useState<ModalView>(initialFrameworkId ? 'framework-detail' : 'list')
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(
    initialFrameworkId || null
  )

  // Search state
  const [searchFilter, setSearchFilter] = useState<SearchFilterState>({
    query: initialSearchQuery,
  })

  // Locked template modal state
  const [lockedTemplate, setLockedTemplate] = useState<TemplateWithStatus | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('list')
      setSelectedFrameworkId(null)
      setSearchFilter({ query: initialSearchQuery })
      setLockedTemplate(null)
    }
  }, [isOpen, initialSearchQuery])

  // Handle initial framework ID
  useEffect(() => {
    if (initialFrameworkId && isOpen) {
      setSelectedFrameworkId(initialFrameworkId)
      setView('framework-detail')
    }
  }, [initialFrameworkId, isOpen])

  // Build framework display data
  const frameworkDisplayData = useMemo(
    () => frameworks.map((fw) => buildFrameworkDisplayData(fw, frameworkSummaries)),
    [frameworks, frameworkSummaries]
  )

  // Filter frameworks based on search
  const filteredFrameworks = useMemo(
    () => filterFrameworks(frameworkDisplayData, searchFilter.query),
    [frameworkDisplayData, searchFilter.query]
  )

  // Filter standalone templates based on search
  const filteredStandaloneTemplates = useMemo(() => {
    if (!searchFilter.query.trim()) return standaloneTemplates

    const lowerQuery = searchFilter.query.toLowerCase()
    return standaloneTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  }, [standaloneTemplates, searchFilter.query])

  // Get selected framework data
  const selectedFramework = useMemo(() => {
    if (!selectedFrameworkId) return null
    return frameworks.find((fw) => fw.id === selectedFrameworkId) || null
  }, [frameworks, selectedFrameworkId])

  const selectedFrameworkSummary = useMemo(() => {
    if (!selectedFrameworkId) return null
    return frameworkSummaries.find((s) => s.frameworkId === selectedFrameworkId) || null
  }, [frameworkSummaries, selectedFrameworkId])

  const selectedFrameworkTemplates = useMemo(() => {
    if (!selectedFramework) return []
    return buildTemplatesWithStatus(selectedFramework, selectedFrameworkSummary)
  }, [selectedFramework, selectedFrameworkSummary])

  // Handlers
  const handleFrameworkClick = useCallback((frameworkId: string) => {
    setSelectedFrameworkId(frameworkId)
    setView('framework-detail')
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedFrameworkId(null)
    setView('list')
  }, [])

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      onSelectTemplate(templateId, selectedFrameworkId || undefined)
      onClose()
    },
    [onSelectTemplate, selectedFrameworkId, onClose]
  )

  const handleStandaloneTemplateClick = useCallback(
    (templateId: string) => {
      onSelectTemplate(templateId)
      onClose()
    },
    [onSelectTemplate, onClose]
  )

  const handleLockedTemplateClick = useCallback((template: TemplateWithStatus) => {
    setLockedTemplate(template)
  }, [])

  const handleCloseLockedModal = useCallback(() => {
    setLockedTemplate(null)
  }, [])

  const handleNavigateToPrerequisite = useCallback(
    (templateId: string) => {
      setLockedTemplate(null)
      // Scroll to the prerequisite template in the list
      const templateElement = document.querySelector(`[data-template-id="${templateId}"]`)
      if (templateElement) {
        templateElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        templateElement.classList.add('template-card--highlight')
        setTimeout(() => {
          templateElement.classList.remove('template-card--highlight')
        }, 2000)
      }
    },
    []
  )

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter((prev) => ({ ...prev, query: event.target.value }))
  }, [])

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lockedTemplate) {
          setLockedTemplate(null)
        } else if (view === 'framework-detail') {
          handleBackToList()
        } else {
          onClose()
        }
      }
    },
    [lockedTemplate, view, handleBackToList, onClose]
  )

  if (!isOpen) return null

  return (
    <div
      className="template-selection-modal__overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
    >
      <div className="template-selection-modal" data-testid={`${testId}-content`}>
        {/* Header */}
        <header className="template-selection-modal__header">
          <h1 id={`${testId}-title`} className="template-selection-modal__title">
            {view === 'framework-detail' && selectedFramework
              ? selectedFramework.name
              : 'Select Template'}
          </h1>

          <button
            type="button"
            className="template-selection-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            data-testid={`${testId}-close`}
          >
            ×
          </button>
        </header>

        {/* Search Bar (only in list view) */}
        {view === 'list' && (
          <div className="template-selection-modal__search" data-testid={`${testId}-search`}>
            <input
              type="text"
              className="template-selection-modal__search-input"
              placeholder="Search templates and frameworks..."
              value={searchFilter.query}
              onChange={handleSearchChange}
              aria-label="Search templates"
              data-testid={`${testId}-search-input`}
            />
            {searchFilter.query && (
              <button
                type="button"
                className="template-selection-modal__search-clear"
                onClick={() => setSearchFilter({ query: '' })}
                aria-label="Clear search"
                data-testid={`${testId}-search-clear`}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="template-selection-modal__content" data-testid={`${testId}-body`}>
          {view === 'list' ? (
            <>
              {/* Framework Section */}
              <FrameworkSection
                frameworks={filteredFrameworks}
                onFrameworkClick={handleFrameworkClick}
                testIdPrefix={testId}
              />

              {/* Standalone Templates Section */}
              {filteredStandaloneTemplates.length > 0 && (
                <StandaloneSection
                  templates={filteredStandaloneTemplates}
                  onTemplateClick={handleStandaloneTemplateClick}
                  testIdPrefix={testId}
                />
              )}

              {/* No Results State */}
              {searchFilter.query &&
                filteredFrameworks.length === 0 &&
                filteredStandaloneTemplates.length === 0 && (
                  <div
                    className="template-selection-modal__no-results"
                    data-testid={`${testId}-no-results`}
                  >
                    <div className="template-selection-modal__no-results-icon" aria-hidden="true">
                      🔍
                    </div>
                    <p className="template-selection-modal__no-results-text">
                      No templates found for "{searchFilter.query}"
                    </p>
                    <button
                      type="button"
                      className="template-selection-modal__no-results-clear"
                      onClick={() => setSearchFilter({ query: '' })}
                    >
                      Clear search
                    </button>
                  </div>
                )}
            </>
          ) : selectedFramework ? (
            <FrameworkDetailView
              framework={selectedFramework}
              summary={selectedFrameworkSummary}
              templates={selectedFrameworkTemplates}
              onBack={handleBackToList}
              onSelectTemplate={handleSelectTemplate}
              onViewEntry={onViewEntry}
              onEditEntry={onEditEntry}
              onLockedTemplateClick={handleLockedTemplateClick}
              testIdPrefix={testId}
            />
          ) : (
            <div className="template-selection-modal__loading">
              Loading framework...
            </div>
          )}
        </div>
      </div>

      {/* Locked Template Modal */}
      {lockedTemplate && selectedFramework && (
        <LockedTemplateModal
          isOpen={true}
          onClose={handleCloseLockedModal}
          template={lockedTemplate}
          framework={selectedFramework}
          onNavigateToTemplate={handleNavigateToPrerequisite}
          onBackToFramework={handleCloseLockedModal}
          testId={`${testId}-locked-modal`}
        />
      )}
    </div>
  )
}

// Re-export types and components for external use
export type {
  TemplateSelectionModalProps,
  ModalView,
  SelectionMode,
  TemplateStatus,
  TemplateWithStatus,
  FrameworkDisplayData,
  StandaloneTemplate,
  SearchFilterState,
} from './types'

export { FrameworkSection } from './FrameworkSection'
export { FrameworkCard } from './FrameworkCard'
export { FrameworkDetailView } from './FrameworkDetailView'
export { TemplateCard } from './TemplateCard'
export { TemplateUnlockStatus } from './TemplateUnlockStatus'
export { LockedTemplateModal } from './LockedTemplateModal'
export { StandaloneSection } from './StandaloneSection'
export { getFrequencyLabel, getLifecycleLabel, getStatusLabel, getStatusIcon } from './types'

export default TemplateSelectionModal
