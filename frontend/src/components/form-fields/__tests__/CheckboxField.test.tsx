/**
 * Tests for CheckboxField Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { CheckboxField } from '../checkbox/CheckboxField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  agree: boolean
}

interface TestWrapperProps {
  register: ReturnType<typeof useForm<TestFormData>>['register']
  errors: ReturnType<typeof useForm<TestFormData>>['formState']['errors']
}

function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: (props: TestWrapperProps) => React.ReactNode
  defaultValues?: Partial<TestFormData>
}) {
  const {
    register,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, errors })}</>
}

describe('CheckboxField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              label="Terms"
              checkboxLabel="I agree to the terms"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Terms')).toBeInTheDocument()
      expect(screen.getByText('I agree to the terms')).toBeInTheDocument()
    })

    it('renders with checkboxLabel only', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree to the terms"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I agree to the terms')).toBeInTheDocument()
    })

    it('renders with label as checkbox label when checkboxLabel not provided', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              label="I agree"
              register={register}
            />
          )}
        </TestWrapper>
      )

      // When label is used as checkbox label, it appears in checkbox label span
      const texts = screen.getAllByText('I agree')
      expect(texts.length).toBeGreaterThanOrEqual(1)
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              label="Terms"
              checkboxLabel="I agree"
              description="Please read the terms carefully"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Please read the terms carefully')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              error={{ type: 'required', message: 'You must agree to the terms' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('You must agree to the terms')
    })

    it('renders required indicator with separate label', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              label="Terms and Conditions"
              checkboxLabel="I agree"
              required
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders required indicator when label equals checkboxLabel', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              label="I agree to the terms"
              checkboxLabel="I agree to the terms"
              required
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disables checkbox when disabled', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              disabled
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-input')).toBeDisabled()
    })

    it('applies disabled class to label when disabled', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              disabled
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I agree')).toHaveClass('field-checkbox-label--disabled')
    })

    it('renders with defaultChecked', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              defaultChecked
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-input')).toBeChecked()
    })
  })

  describe('user interaction', () => {
    it('toggles checkbox on click', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      const checkbox = screen.getByTestId('agree-field-input')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('toggles checkbox when clicking label', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree to the terms"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      const checkbox = screen.getByTestId('agree-field-input')
      const label = screen.getByTestId('agree-field-label')

      expect(checkbox).not.toBeChecked()

      await user.click(label)
      expect(checkbox).toBeChecked()
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              required
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-input')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              error={{ type: 'required', message: 'Required' }}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-input')).toHaveAttribute('aria-invalid', 'true')
    })

    it('uses ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              ariaLabel="Custom aria label"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Custom aria label')).toBeInTheDocument()
    })

    it('connects error message via aria-describedby', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              error={{ type: 'required', message: 'Required' }}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByTestId('agree-field-input')
      const errorId = input.getAttribute('aria-describedby')
      expect(errorId).toContain('error')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field')).toBeInTheDocument()
    })

    it('applies testId to input with -input suffix', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-input')).toBeInTheDocument()
    })

    it('applies testId to label with -label suffix', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field-label')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <CheckboxField
              id="agree"
              name="agree"
              checkboxLabel="I agree"
              className="custom-class"
              register={register}
              testId="agree-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('agree-field')).toHaveClass('custom-class')
    })
  })
})
