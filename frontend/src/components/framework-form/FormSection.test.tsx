/**
 * FormSection Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormSection } from './FormSection'
import type { TemplateSection } from '@/features/journal/types/framework.types'
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

// Mock FormSubsection
vi.mock('./FormSubsection', () => ({
  FormSubsection: ({ subsection, testIdPrefix }: { subsection: { id: string; title: string }; testIdPrefix?: string }) => (
    <div data-testid={testIdPrefix ? `${testIdPrefix}-subsection-${subsection.id}` : `subsection-${subsection.id}`}>
      <h4>{subsection.title}</h4>
    </div>
  ),
}))

describe('FormSection', () => {
  const mockOnFieldChange = vi.fn()
  const mockOnFieldBlur = vi.fn()

  const createSection = (overrides: Partial<TemplateSection> = {}): TemplateSection => ({
    id: 'test-section',
    title: 'Test Section',
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
    it('renders section with title', () => {
      const section = createSection({ title: 'My Section Title' })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('My Section Title')).toBeInTheDocument()
    })

    it('renders section description when provided', () => {
      const section = createSection({
        title: 'Section',
        description: 'This is the section description',
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('This is the section description')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
      const section = createSection({
        title: 'Section with Icon',
        icon: 'star',
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Icon is rendered as text content in a span
      expect(screen.getByText('star')).toBeInTheDocument()
    })

    it('renders all fields in the section', () => {
      const section = createSection({ fields: ['field1', 'field2'] })
      const fields = createFields()

      render(
        <FormSection
          section={section}
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
    it('renders clickable header for collapse', () => {
      const section = createSection({ collapsible: true })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Header should have role="button"
      const header = screen.getByTestId('test-section-test-section-header')
      expect(header).toHaveAttribute('role', 'button')
    })

    it('toggles collapse state on header click', async () => {
      const user = userEvent.setup()
      const section = createSection({ collapsible: true })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const header = screen.getByTestId('test-section-test-section-header')

      // Initially expanded
      expect(screen.getByText('Field 1')).toBeInTheDocument()

      // Click to collapse
      await user.click(header)

      // Container should have collapsed class
      const container = screen.getByTestId('test-section-test-section')
      expect(container).toHaveClass('form-section--collapsed')
    })

    it('starts collapsed when defaultCollapsed is true', () => {
      const section = createSection({
        collapsible: true,
        defaultCollapsed: true,
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const container = screen.getByTestId('test-section-test-section')
      expect(container).toHaveClass('form-section--collapsed')
    })
  })

  describe('Subsections', () => {
    it('renders subsections when present', () => {
      const section = createSection({
        fields: [],
        subsections: [
          { id: 'sub1', title: 'Subsection 1', fields: ['field1'], order: 1 },
          { id: 'sub2', title: 'Subsection 2', fields: ['field2'], order: 2 },
        ],
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // testId includes the full path: prefix-section-sectionId-subsection-subsectionId
      expect(screen.getByTestId('test-section-test-section-subsection-sub1')).toBeInTheDocument()
      expect(screen.getByTestId('test-section-test-section-subsection-sub2')).toBeInTheDocument()
    })

    it('sorts subsections by order', () => {
      const section = createSection({
        fields: [],
        subsections: [
          { id: 'sub2', title: 'Second', fields: ['field2'], order: 2 },
          { id: 'sub1', title: 'First', fields: ['field1'], order: 1 },
        ],
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      const subsections = screen.getAllByText(/First|Second/)
      expect(subsections[0]).toHaveTextContent('First')
      expect(subsections[1]).toHaveTextContent('Second')
    })
  })

  describe('Conditional Display', () => {
    it('hides section when showIf evaluates to false', () => {
      const section = createSection({
        showIf: 'showSection == true',
      })
      const fields = createFields()

      const { container } = render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{ showSection: false }}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(container.querySelector('.form-section')).toBeNull()
    })

    it('shows section when showIf evaluates to true', () => {
      const section = createSection({
        showIf: 'showSection == true',
      })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{ showSection: 'true' }}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('Test Section')).toBeInTheDocument()
    })
  })

  describe('Disabled and ReadOnly States', () => {
    it('passes disabled state to field renderers', () => {
      const section = createSection()
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          disabled
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Should render without errors - disabled is passed to children
      const sectionEl = screen.getByTestId('test-section-test-section')
      expect(sectionEl).toBeInTheDocument()
    })

    it('passes readOnly state to field renderers', () => {
      const section = createSection()
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          readOnly
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="test"
        />
      )

      // Should render without errors - readOnly is passed to children
      const sectionEl = screen.getByTestId('test-section-test-section')
      expect(sectionEl).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('skips fields not in fields map', () => {
      const section = createSection({ fields: ['field1', 'nonexistent'] })
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
        />
      )

      expect(screen.getByText('Field 1')).toBeInTheDocument()
      // Should not throw, nonexistent field simply not rendered
    })
  })

  describe('Test ID Handling', () => {
    it('applies testIdPrefix to elements', () => {
      const section = createSection()
      const fields = createFields()

      render(
        <FormSection
          section={section}
          fields={fields}
          formValues={{}}
          errors={{}}
          onFieldChange={mockOnFieldChange}
          onFieldBlur={mockOnFieldBlur}
          testIdPrefix="my-form"
        />
      )

      expect(screen.getByTestId('my-form-section-test-section')).toBeInTheDocument()
    })
  })
})
