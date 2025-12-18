/**
 * FormSubsection Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormSubsection } from './FormSubsection'
import type { TemplateSubsection } from '@/features/journal/types/framework.types'
import type { FieldDefinition } from '@/features/journal/types/field.types'

// Mock FieldRenderer
vi.mock('./FieldRenderer', () => ({
  FieldRenderer: ({ field, testId }: { field: FieldDefinition; testId?: string }) => (
    <div data-testid={testId || `field-${field.id}`} data-field-id={field.id}>
      <label>{field.label}</label>
      <input type="text" />
    </div>
  ),
}))

describe('FormSubsection', () => {
  const mockOnFieldChange = vi.fn()
  const mockOnFieldBlur = vi.fn()

  const createSubsection = (overrides: Partial<TemplateSubsection> = {}): TemplateSubsection => ({
    id: 'test-subsection',
    title: 'Test Subsection',
    order: 1,
    fields: ['field1', 'field2'],
    ...overrides,
  })

  const createFields = (): Record<string, FieldDefinition> => ({
    field1: {
      id: 'field1',
      type: 'text',
      label: 'Field 1',
      order: 1,
    },
    field2: {
      id: 'field2',
      type: 'textarea',
      label: 'Field 2',
      order: 2,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders subsection with title', () => {
      const subsection = createSubsection({ title: 'My Subsection' })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('My Subsection')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      const subsection = createSubsection({
        description: 'Subsection description text',
      })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('Subsection description text')).toBeInTheDocument()
    })

    it('renders all fields in the subsection', () => {
      const subsection = createSubsection({ fields: ['field1', 'field2'] })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('Field 1')).toBeInTheDocument()
      expect(screen.getByText('Field 2')).toBeInTheDocument()
    })
  })

  describe('Collapsible Behavior', () => {
    it('renders clickable header when collapsible', () => {
      const subsection = createSubsection({ collapsible: true })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Header should have role="button" when collapsible
      const header = screen.getByTestId('test-subsection-test-subsection-header')
      expect(header).toHaveAttribute('role', 'button')
    })

    it('toggles collapse state on header click', async () => {
      const user = userEvent.setup()
      const subsection = createSubsection({ collapsible: true })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Initially expanded
      expect(screen.getByText('Field 1')).toBeInTheDocument()

      // Click header to collapse
      const header = screen.getByTestId('test-subsection-test-subsection-header')
      await user.click(header)

      // Container should have collapsed class
      const container = screen.getByTestId('test-subsection-test-subsection')
      expect(container).toHaveClass('form-subsection--collapsed')
    })

    it('starts collapsed when defaultCollapsed is true', () => {
      const subsection = createSubsection({
        collapsible: true,
        defaultCollapsed: true,
      })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const container = screen.getByTestId('test-subsection-test-subsection')
      expect(container).toHaveClass('form-subsection--collapsed')
    })

    it('does not render as button when not collapsible', () => {
      const subsection = createSubsection({ collapsible: false })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Header should not have role="button" when not collapsible
      const header = screen.getByTestId('test-subsection-test-subsection-header')
      expect(header).not.toHaveAttribute('role', 'button')
    })
  })

  describe('Subsection Types', () => {
    it('renders with base form-subsection class', () => {
      const subsection = createSubsection()
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const subsectionEl = screen.getByTestId('test-subsection-test-subsection')
      expect(subsectionEl).toHaveClass('form-subsection')
    })

    it('renders collapsible class when collapsible', () => {
      const subsection = createSubsection({ collapsible: true })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const subsectionEl = screen.getByTestId('test-subsection-test-subsection')
      expect(subsectionEl).toHaveClass('form-subsection--collapsible')
    })
  })

  describe('Disabled and ReadOnly States', () => {
    it('passes disabled prop to children', () => {
      const subsection = createSubsection()
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          disabled
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Should render without errors - disabled is passed to FieldRenderer
      const subsectionEl = screen.getByTestId('test-subsection-test-subsection')
      expect(subsectionEl).toBeInTheDocument()
    })

    it('passes readOnly prop to children', () => {
      const subsection = createSubsection()
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          readOnly
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Should render without errors - readOnly is passed to FieldRenderer
      const subsectionEl = screen.getByTestId('test-subsection-test-subsection')
      expect(subsectionEl).toBeInTheDocument()
    })
  })

  describe('Field Ordering', () => {
    it('renders fields in order', () => {
      const subsection = createSubsection({ fields: ['field1', 'field2'] })
      const fields: Record<string, FieldDefinition> = {
        field1: { id: 'field1', type: 'text', label: 'First', order: 1 },
        field2: { id: 'field2', type: 'text', label: 'Second', order: 2 },
      }

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      const labels = screen.getAllByText(/First|Second/)
      expect(labels[0]).toHaveTextContent('First')
      expect(labels[1]).toHaveTextContent('Second')
    })
  })

  describe('Error Handling', () => {
    it('gracefully handles missing fields', () => {
      const subsection = createSubsection({ fields: ['field1', 'missingField'] })
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      // Should render field1 without errors
      expect(screen.getByText('Field 1')).toBeInTheDocument()
    })
  })

  describe('Test ID Handling', () => {
    it('applies testIdPrefix correctly', () => {
      const subsection = createSubsection()
      const fields = createFields()

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="my-form"
        />
      )

      expect(screen.getByTestId('my-form-subsection-test-subsection')).toBeInTheDocument()
    })
  })

  describe('Bindings', () => {
    it('passes resolved bindings to field renderer', () => {
      const subsection = createSubsection({ fields: ['field1'] })
      const fields = createFields()
      const resolvedBindings = {
        bindings: {
          field1: {
            fieldId: 'field1',
            mode: 'prefill' as const,
            sourceType: 'context' as const,
            resolved: true,
            value: 'Prefilled value',
          },
        },
        prefillValues: { field1: 'Prefilled value' },
        errors: [],
        allRequiredResolved: true,
      }

      render(
        <FormSubsection
          subsection={subsection}
          fields={fields}
          formValues={{}}
          errors={{}}
          resolvedBindings={resolvedBindings}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('Field 1')).toBeInTheDocument()
    })
  })
})
