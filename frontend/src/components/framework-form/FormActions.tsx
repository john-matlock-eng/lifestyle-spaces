/**
 * FormActions Component
 *
 * Renders form action buttons with loading states and keyboard shortcuts.
 * Supports save, cancel, and draft actions.
 *
 * @module framework-form/FormActions
 */

import { useMemo } from 'react'
import { Save, X, FileText, Check } from 'lucide-react'
import type { FormActionsProps } from './types'
import './framework-form.css'

/**
 * FormActions - Renders form action buttons
 *
 * @example
 * ```tsx
 * <FormActions
 *   formState={state}
 *   onSubmit={() => handleSubmit()}
 *   onSaveDraft={() => saveDraft()}
 *   onCancel={() => navigate(-1)}
 *   showShortcuts
 * />
 * ```
 */
export function FormActions({
  formState,
  onSubmit,
  onSaveDraft,
  onCancel,
  readOnly = false,
  disabled = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  draftLabel = 'Save Draft',
  showShortcuts = true,
  testId,
}: FormActionsProps): JSX.Element | null {
  const { isSubmitting, isSavingDraft, isDirty, isValid, hasUnsavedChanges, lastSaved } = formState

  // Determine if actions should be disabled
  const actionsDisabled = disabled || isSubmitting || readOnly

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null
    const now = new Date()
    const diff = now.getTime() - lastSaved.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Saved just now'
    if (minutes === 1) return 'Saved 1 minute ago'
    if (minutes < 60) return `Saved ${minutes} minutes ago`

    return `Saved at ${lastSaved.toLocaleTimeString()}`
  }, [lastSaved])

  // Get keyboard shortcut modifier key based on platform
  const modKey = useMemo(() => {
    if (typeof window !== 'undefined') {
      return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
    }
    return 'Ctrl'
  }, [])

  // Don't render in read-only mode
  if (readOnly) {
    return null
  }

  // Build container classes
  const containerClasses = [
    'form-actions',
    isSubmitting && 'form-actions--loading',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* Primary Actions */}
      <div className="form-actions-primary">
        {/* Submit Button */}
        <button
          type="submit"
          className="form-actions-button form-actions-button--primary"
          disabled={actionsDisabled || !isValid}
          onClick={onSubmit}
          data-testid={testId ? `${testId}-submit` : undefined}
        >
          {isSubmitting ? (
            <>
              <span className="form-actions-button-spinner" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} aria-hidden="true" />
              {submitLabel}
              {showShortcuts && (
                <span className="form-actions-shortcut">{modKey}+Enter</span>
              )}
            </>
          )}
        </button>

        {/* Save Draft Button */}
        {onSaveDraft && (
          <button
            type="button"
            className="form-actions-button form-actions-button--secondary"
            disabled={actionsDisabled || !isDirty}
            onClick={onSaveDraft}
            data-testid={testId ? `${testId}-draft` : undefined}
          >
            {isSavingDraft ? (
              <>
                <span className="form-actions-button-spinner" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <FileText size={18} aria-hidden="true" />
                {draftLabel}
                {showShortcuts && (
                  <span className="form-actions-shortcut">{modKey}+S</span>
                )}
              </>
            )}
          </button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className="form-actions-secondary">
        {/* Status Indicator */}
        {lastSavedText && (
          <div className="form-actions-status" data-testid={testId ? `${testId}-status` : undefined}>
            <span
              className={`form-actions-status-icon ${
                hasUnsavedChanges
                  ? 'form-actions-status-icon--warning'
                  : 'form-actions-status-icon--success'
              }`}
              aria-hidden="true"
            />
            {hasUnsavedChanges ? 'Unsaved changes' : lastSavedText}
          </div>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <button
            type="button"
            className="form-actions-button form-actions-button--ghost"
            disabled={isSubmitting}
            onClick={onCancel}
            data-testid={testId ? `${testId}-cancel` : undefined}
          >
            <X size={18} aria-hidden="true" />
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default FormActions
