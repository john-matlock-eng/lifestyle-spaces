/**
 * DynamicFormRenderer Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DynamicFormRenderer } from './DynamicFormRenderer'
import type { FrameworkTemplate } from '@/features/journal/types/framework.types'

// Mock the child components
vi.mock('./FormSection', () => ({
  FormSection: ({ section, testIdPrefix }: { section: { id: string; title: string }; testIdPrefix?: string }) => (
    <div data-testid={testIdPrefix ? `${testIdPrefix}-section-${section.id}` : `section-${section.id}`}>
      <h3>{section.title}</h3>
    </div>
  ),
}))

vi.mock('./FormValidation', () => ({
  FormValidation: ({ errors, testId }: { errors: Record<string, unknown>; testId?: string }) => (
    Object.keys(errors).length > 0 ? (
      <div data-testid={testId || 'validation'}>
        <span>{Object.keys(errors).length} errors</span>
      </div>
    ) : null
  ),
}))

vi.mock('./FormActions', () => ({
  FormActions: ({
    onSubmit,
    onSaveDraft,
    onCancel,
    testId,
  }: {
    onSubmit: () => void
    onSaveDraft?: () => void
    onCancel?: () => void
    testId?: string
  }) => (
    <div data-testid={testId || 'actions'}>
      <button data-testid={`${testId}-submit`} onClick={onSubmit}>Submit</button>
      {onSaveDraft && <button data-testid={`${testId}-draft`} onClick={onSaveDraft}>Draft</button>}
      {onCancel && <button data-testid={`${testId}-cancel`} onClick={onCancel}>Cancel</button>}
    </div>
  ),
}))

// Mock useTemplateForm hook
vi.mock('./useTemplateForm', () => ({
  useTemplateForm: ({ onSubmit, onSaveDraft }: { onSubmit: (values: Record<string, unknown>) => Promise<void>; onSaveDraft?: (values: Record<string, unknown>) => void }) => ({
    state: {
      values: {},
      errors: {},
      isDirty: false,
      isSubmitting: false,
      isValid: true,
      hasUnsavedChanges: false,
      lastSaved: undefined,
      isSavingDraft: false,
    },
    actions: {
      setFieldValue: vi.fn(),
      setFieldValues: vi.fn(),
      validateField: vi.fn(),
      validateForm: vi.fn().mockResolvedValue(true),
      resetForm: vi.fn(),
      clearErrors: vi.fn(),
      submitForm: async () => {
        await onSubmit({})
      },
      saveDraft: () => {
        onSaveDraft?.({})
      },
      getFieldError: vi.fn(),
      scrollToFirstError: vi.fn(),
    },
    formMethods: {
      register: vi.fn(),
      watch: vi.fn(),
      setValue: vi.fn(),
      control: {},
      handleSubmit: (fn: (values: Record<string, unknown>) => void) => (e?: React.FormEvent) => {
        e?.preventDefault()
        fn({})
      },
      formState: { errors: {}, isDirty: false, isSubmitting: false, isValid: true },
    },
  }),
}))

describe('DynamicFormRenderer', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined)
  const mockOnSaveDraft = vi.fn()
  const mockOnCancel = vi.fn()

  const createTemplate = (overrides: Partial<FrameworkTemplate> = {}): FrameworkTemplate => ({
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    version: '1.0.0',
    frameworkId: 'framework-1',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      fields: [
        { id: 'field1', type: 'text', label: 'Field 1', order: 1 },
        { id: 'field2', type: 'textarea', label: 'Field 2', order: 2 },
      ],
      sections: [
        { id: 'section1', title: 'Section 1', order: 1, fields: ['field1'] },
        { id: 'section2', title: 'Section 2', order: 2, fields: ['field2'] },
      ],
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders the form with template name', () => {
      const template = createTemplate({ name: 'Weekly Review' })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByText('Weekly Review')).toBeInTheDocument()
    })

    it('renders the form with template description', () => {
      const template = createTemplate({ description: 'Review your week' })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByText('Review your week')).toBeInTheDocument()
    })

    it('renders guidance text when provided', () => {
      const template = createTemplate({
        content: {
          fields: [],
          sections: [],
          guidance: 'Fill out this form carefully',
        },
      })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByText('Fill out this form carefully')).toBeInTheDocument()
    })

    it('renders all sections', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByTestId('form-section-section1')).toBeInTheDocument()
      expect(screen.getByTestId('form-section-section2')).toBeInTheDocument()
    })

    it('renders form actions', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          onCancel={mockOnCancel}
          testId="form"
        />
      )

      expect(screen.getByTestId('form-actions')).toBeInTheDocument()
    })
  })

  describe('Form Header', () => {
    it('shows header with title and description', () => {
      const template = createTemplate({
        name: 'My Form',
        description: 'Form description',
      })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByTestId('form-header')).toBeInTheDocument()
      expect(screen.getByText('My Form')).toBeInTheDocument()
      expect(screen.getByText('Form description')).toBeInTheDocument()
    })

    it('renders without header when no name or description', () => {
      const template = createTemplate({
        name: '',
        description: '',
      })

      const { container } = render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(container.querySelector('.dynamic-form-header')).toBeNull()
    })
  })

  describe('Read-Only Mode', () => {
    it('applies readonly class', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          readOnly
          testId="form"
        />
      )

      const form = screen.getByTestId('form')
      expect(form).toHaveClass('dynamic-form--readonly')
    })

    it('hides actions in readonly mode', () => {
      const template = createTemplate()

      const { container } = render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          readOnly
          testId="form"
        />
      )

      expect(container.querySelector('.dynamic-form-footer')).toBeNull()
    })
  })

  describe('Form Actions', () => {
    it('calls onSubmit when submit button clicked', async () => {
      const user = userEvent.setup()
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      await user.click(screen.getByTestId('form-actions-submit'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('calls onSaveDraft when draft button clicked', async () => {
      const user = userEvent.setup()
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          testId="form"
        />
      )

      await user.click(screen.getByTestId('form-actions-draft'))

      expect(mockOnSaveDraft).toHaveBeenCalled()
    })

    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          testId="form"
        />
      )

      await user.click(screen.getByTestId('form-actions-cancel'))

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Sections Container', () => {
    it('renders sections container with testId', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByTestId('form-sections')).toBeInTheDocument()
    })

    it('sorts sections by order', () => {
      const template = createTemplate({
        content: {
          fields: [],
          sections: [
            { id: 'second', title: 'Second Section', order: 2, fields: [] },
            { id: 'first', title: 'First Section', order: 1, fields: [] },
          ],
        },
      })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      const sections = screen.getAllByText(/Section/)
      expect(sections[0]).toHaveTextContent('First Section')
      expect(sections[1]).toHaveTextContent('Second Section')
    })
  })

  describe('Custom Class Names', () => {
    it('applies custom className', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          className="my-custom-form"
          testId="form"
        />
      )

      expect(screen.getByTestId('form')).toHaveClass('my-custom-form')
    })
  })

  describe('Initial Values', () => {
    it('accepts initial values', () => {
      const template = createTemplate()
      const initialValues = { field1: 'Initial Value' }

      render(
        <DynamicFormRenderer
          template={template}
          initialValues={initialValues}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      // Form should render (initial values are passed to useTemplateForm)
      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })

  describe('Resolved Bindings', () => {
    it('accepts resolved bindings', () => {
      const template = createTemplate()
      const resolvedBindings = {
        bindings: {},
        prefillValues: { field1: 'Bound Value' },
        errors: [],
        allRequiredResolved: true,
      }

      render(
        <DynamicFormRenderer
          template={template}
          resolvedBindings={resolvedBindings}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      // Form should render (bindings are passed to useTemplateForm)
      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })

  describe('Auto-Save Configuration', () => {
    it('accepts autoSaveDraft prop', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          onSaveDraft={mockOnSaveDraft}
          autoSaveDraft
          autoSaveDelay={5000}
          testId="form"
        />
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('accepts disabled prop', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          disabled
          testId="form"
        />
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })

  describe('Empty Template', () => {
    it('handles template with no sections', () => {
      const template = createTemplate({
        content: {
          fields: [],
          sections: [],
        },
      })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
      expect(screen.getByTestId('form-sections')).toBeInTheDocument()
    })

    it('handles template with no content', () => {
      const template = createTemplate({
        content: undefined,
      })

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      expect(screen.getByTestId('form')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has noValidate attribute to use custom validation', () => {
      const template = createTemplate()

      render(
        <DynamicFormRenderer
          template={template}
          onSubmit={mockOnSubmit}
          testId="form"
        />
      )

      const form = screen.getByTestId('form')
      expect(form).toHaveAttribute('noValidate')
    })
  })
})
