/**
 * FormActions Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormActions } from './FormActions'
import type { TemplateFormState } from './types'

describe('FormActions', () => {
  const mockOnSubmit = vi.fn()
  const mockOnSaveDraft = vi.fn()
  const mockOnCancel = vi.fn()

  const createFormState = (overrides: Partial<TemplateFormState> = {}): TemplateFormState => ({
    values: {},
    errors: {},
    isDirty: false,
    isSubmitting: false,
    isValid: true,
    hasUnsavedChanges: false,
    lastSaved: undefined,
    isSavingDraft: false,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders submit button', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-submit')).toBeInTheDocument()
    })

    it('renders save draft button when onSaveDraft provided', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-draft')).toBeInTheDocument()
    })

    it('renders cancel button when onCancel provided', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-cancel')).toBeInTheDocument()
    })

    it('does not render draft button when onSaveDraft not provided', () => {
      const formState = createFormState()

      const { container } = render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
        />
      )

      expect(container.querySelector('[data-testid*="draft"]')).toBeNull()
    })

    it('does not render cancel button when onCancel not provided', () => {
      const formState = createFormState()

      const { container } = render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
        />
      )

      expect(container.querySelector('[data-testid*="cancel"]')).toBeNull()
    })
  })

  describe('Custom Labels', () => {
    it('uses custom submit label', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          submitLabel="Create Entry"
        />
      )

      expect(screen.getByText('Create Entry')).toBeInTheDocument()
    })

    it('uses custom draft label', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          draftLabel="Save Progress"
        />
      )

      expect(screen.getByText('Save Progress')).toBeInTheDocument()
    })

    it('uses custom cancel label', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          cancelLabel="Discard"
        />
      )

      expect(screen.getByText('Discard')).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('disables submit button when form is invalid', () => {
      const formState = createFormState({ isValid: false })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-submit')).toBeDisabled()
    })

    it('disables submit button when submitting', () => {
      const formState = createFormState({ isSubmitting: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-submit')).toBeDisabled()
    })

    it('disables draft button when not dirty', () => {
      const formState = createFormState({ isDirty: false })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-draft')).toBeDisabled()
    })

    it('enables draft button when dirty', () => {
      const formState = createFormState({ isDirty: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-draft')).not.toBeDisabled()
    })

    it('disables all buttons when disabled prop is true', () => {
      const formState = createFormState({ isDirty: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          disabled
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-submit')).toBeDisabled()
      expect(screen.getByTestId('actions-draft')).toBeDisabled()
    })
  })

  describe('Loading States', () => {
    it('shows loading state on submit button when submitting', () => {
      const formState = createFormState({ isSubmitting: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('shows loading state on draft button when saving draft', () => {
      const formState = createFormState({ isSavingDraft: true, isDirty: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="actions"
        />
      )

      // Draft button should show saving state
      const draftButton = screen.getByTestId('actions-draft')
      expect(draftButton).toHaveTextContent('Saving...')
    })
  })

  describe('Click Handlers', () => {
    it('calls onSubmit when submit clicked', async () => {
      const user = userEvent.setup()
      const formState = createFormState({ isValid: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      await user.click(screen.getByTestId('actions-submit'))

      expect(mockOnSubmit).toHaveBeenCalled()
    })

    it('calls onSaveDraft when draft clicked', async () => {
      const user = userEvent.setup()
      const formState = createFormState({ isDirty: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="actions"
        />
      )

      await user.click(screen.getByTestId('actions-draft'))

      expect(mockOnSaveDraft).toHaveBeenCalled()
    })

    it('calls onCancel when cancel clicked', async () => {
      const user = userEvent.setup()
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          testId="actions"
        />
      )

      await user.click(screen.getByTestId('actions-cancel'))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts Display', () => {
    it('shows shortcuts by default', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
        />
      )

      // Should show Ctrl/Cmd shortcuts
      expect(screen.getByText(/\+Enter/)).toBeInTheDocument()
      expect(screen.getByText(/\+S/)).toBeInTheDocument()
    })

    it('hides shortcuts when showShortcuts is false', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          showShortcuts={false}
        />
      )

      expect(screen.queryByText(/\+Enter/)).toBeNull()
      expect(screen.queryByText(/\+S/)).toBeNull()
    })
  })

  describe('Last Saved Status', () => {
    it('displays last saved time', () => {
      const lastSaved = new Date()
      const formState = createFormState({ lastSaved })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByTestId('actions-status')).toBeInTheDocument()
      expect(screen.getByText(/Saved/)).toBeInTheDocument()
    })

    it('shows unsaved changes indicator', () => {
      const lastSaved = new Date()
      const formState = createFormState({
        lastSaved,
        hasUnsavedChanges: true,
      })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })

    it('shows "just now" for recent saves', () => {
      const lastSaved = new Date()
      const formState = createFormState({ lastSaved, hasUnsavedChanges: false })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByText('Saved just now')).toBeInTheDocument()
    })
  })

  describe('Read-Only Mode', () => {
    it('renders nothing when readOnly is true', () => {
      const formState = createFormState()

      const { container } = render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          readOnly
        />
      )

      expect(container.querySelector('.form-actions')).toBeNull()
    })
  })

  describe('Test IDs', () => {
    it('applies testId to container', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="my-actions"
        />
      )

      expect(screen.getByTestId('my-actions')).toBeInTheDocument()
    })

    it('applies testId to submit button', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="my-actions"
        />
      )

      expect(screen.getByTestId('my-actions-submit')).toBeInTheDocument()
    })

    it('applies testId to draft button', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="my-actions"
        />
      )

      expect(screen.getByTestId('my-actions-draft')).toBeInTheDocument()
    })

    it('applies testId to cancel button', () => {
      const formState = createFormState()

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          testId="my-actions"
        />
      )

      expect(screen.getByTestId('my-actions-cancel')).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    it('applies loading class when submitting', () => {
      const formState = createFormState({ isSubmitting: true })

      render(
        <FormActions
          formState={formState}
          onSubmit={mockOnSubmit}
          testId="actions"
        />
      )

      const container = screen.getByTestId('actions')
      expect(container).toHaveClass('form-actions--loading')
    })
  })
})
