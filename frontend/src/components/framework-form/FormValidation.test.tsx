/**
 * FormValidation Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormValidation } from './FormValidation'
import type { FieldError } from 'react-hook-form'
import type { FieldDefinition } from '@/features/journal/types/field.types'

describe('FormValidation', () => {
  const mockOnErrorClick = vi.fn()

  const createFields = (): Record<string, FieldDefinition> => ({
    name: {
      id: 'name',
      type: 'text',
      label: 'Name',
      order: 1,
    },
    email: {
      id: 'email',
      type: 'text',
      label: 'Email Address',
      order: 2,
    },
    age: {
      id: 'age',
      type: 'number',
      label: 'Age',
      order: 3,
    },
  })

  const createErrors = (errorMap: Record<string, string>): Record<string, FieldError | undefined> => {
    const errors: Record<string, FieldError | undefined> = {}
    for (const [fieldId, message] of Object.entries(errorMap)) {
      errors[fieldId] = { type: 'validation', message }
    }
    return errors
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders nothing when no errors', () => {
      const fields = createFields()

      const { container } = render(
        <FormValidation
          errors={{}}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(container.querySelector('.form-validation')).toBeNull()
    })

    it('renders validation summary with errors', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="validation"
        />
      )

      expect(screen.getByTestId('validation')).toBeInTheDocument()
      expect(screen.getByText('Please fix the following errors')).toBeInTheDocument()
    })

    it('displays error count', () => {
      const fields = createFields()
      const errors = createErrors({
        name: 'Name is required',
        email: 'Email is invalid',
      })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('2 errors')).toBeInTheDocument()
    })

    it('displays singular error text for one error', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('1 error')).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('displays field labels and error messages', () => {
      const fields = createFields()
      const errors = createErrors({
        name: 'Name is required',
        email: 'Please enter a valid email',
      })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email Address')).toBeInTheDocument()
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
    })

    it('uses field ID when field not found in fields map', () => {
      const fields = createFields()
      const errors = createErrors({ unknownField: 'Unknown field error' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('unknownField')).toBeInTheDocument()
      expect(screen.getByText('Unknown field error')).toBeInTheDocument()
    })

    it('displays default message when error message is missing', () => {
      const fields = createFields()
      const errors: Record<string, FieldError | undefined> = {
        name: { type: 'required' }, // No message
      }

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('This field is invalid')).toBeInTheDocument()
    })
  })

  describe('Error Click Handler', () => {
    it('calls onErrorClick with fieldId when error is clicked', async () => {
      const user = userEvent.setup()
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="validation"
        />
      )

      const errorButton = screen.getByTestId('validation-error-name')
      await user.click(errorButton)

      expect(mockOnErrorClick).toHaveBeenCalledWith('name')
    })

    it('handles multiple error clicks', async () => {
      const user = userEvent.setup()
      const fields = createFields()
      const errors = createErrors({
        name: 'Name is required',
        email: 'Email is invalid',
      })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="validation"
        />
      )

      await user.click(screen.getByTestId('validation-error-name'))
      await user.click(screen.getByTestId('validation-error-email'))

      expect(mockOnErrorClick).toHaveBeenCalledTimes(2)
      expect(mockOnErrorClick).toHaveBeenNthCalledWith(1, 'name')
      expect(mockOnErrorClick).toHaveBeenNthCalledWith(2, 'email')
    })
  })

  describe('Show Summary Option', () => {
    it('renders nothing when showSummary is false', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      const { container } = render(
        <FormValidation
          errors={errors}
          fields={fields}
          showSummary={false}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(container.querySelector('.form-validation')).toBeNull()
    })

    it('renders summary by default', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByText('Please fix the following errors')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has alert role for screen readers', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live attribute for dynamic updates', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      const summary = screen.getByRole('alert')
      expect(summary).toHaveAttribute('aria-live', 'polite')
    })

    it('renders errors in a list for accessibility', () => {
      const fields = createFields()
      const errors = createErrors({
        name: 'Name is required',
        email: 'Email is invalid',
      })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="validation"
        />
      )

      const list = screen.getByTestId('validation-list')
      expect(list.tagName).toBe('UL')
    })
  })

  describe('Nested Field Paths', () => {
    it('extracts field ID from nested paths', () => {
      const fields = createFields()
      const errors: Record<string, FieldError | undefined> = {
        'name.first': { type: 'required', message: 'First name is required' },
      }

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
        />
      )

      // Should show the label for 'name' field
      expect(screen.getByText('Name')).toBeInTheDocument()
    })
  })

  describe('Test ID Props', () => {
    it('applies testId to container', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="my-validation"
        />
      )

      expect(screen.getByTestId('my-validation')).toBeInTheDocument()
    })

    it('applies testId to error list', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="my-validation"
        />
      )

      expect(screen.getByTestId('my-validation-list')).toBeInTheDocument()
    })

    it('applies testId to individual errors', () => {
      const fields = createFields()
      const errors = createErrors({ name: 'Name is required' })

      render(
        <FormValidation
          errors={errors}
          fields={fields}
          onErrorClick={mockOnErrorClick}
          testId="my-validation"
        />
      )

      expect(screen.getByTestId('my-validation-error-name')).toBeInTheDocument()
    })
  })
})
