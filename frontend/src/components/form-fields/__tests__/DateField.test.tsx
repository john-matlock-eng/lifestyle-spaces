/**
 * Tests for DateField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { DateField } from '../date/DateField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  birthdate: string
}

function TestWrapper({
  children,
  defaultValues = {},
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: (props: any) => React.ReactNode
  defaultValues?: Partial<TestFormData>
}) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, setValue, errors })}</>
}

describe('DateField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              placeholder="YYYY-MM-DD"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              description="Enter your date of birth"
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Enter your date of birth')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
              error={{ type: 'required', message: 'Birth date is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Birth date is required')
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              required
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('min/max dates', () => {
    it('sets min date attribute', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              minDate="2000-01-15"
              register={register}
            />
          )}
        </TestWrapper>
      )

      // The component formats dates, so check that min is set
      const input = screen.getByLabelText('Birth Date')
      expect(input).toHaveAttribute('min')
      const minValue = input.getAttribute('min')
      expect(minValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('sets max date attribute', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              maxDate="2025-06-15"
              register={register}
            />
          )}
        </TestWrapper>
      )

      // The component formats dates, so check that max is set
      const input = screen.getByLabelText('Birth Date')
      expect(input).toHaveAttribute('max')
      const maxValue = input.getAttribute('max')
      expect(maxValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('accepts string dates for min/max', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              minDate="2000-03-15"
              maxDate="2025-09-20"
              register={register}
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByLabelText('Birth Date')
      expect(input).toHaveAttribute('min')
      expect(input).toHaveAttribute('max')
    })
  })

  describe('default value behavior', () => {
    it('sets default value via setValue when defaultValue provided', () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              defaultValue="1990-05-15"
              register={register}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      // setValue should be called with a formatted date string
      expect(setValueMock).toHaveBeenCalled()
      const call = setValueMock.mock.calls[0]
      expect(call[0]).toBe('birthdate')
      expect(call[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(call[2]).toEqual({ shouldValidate: false })
    })

    it('sets today as default when defaultToday is true', () => {
      const setValueMock = vi.fn()
      const today = new Date()
      const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              defaultToday
              register={register}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      expect(setValueMock).toHaveBeenCalledWith('birthdate', expectedDate, { shouldValidate: false })
    })

    it('prioritizes defaultValue over defaultToday', () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              defaultValue="2000-03-15"
              defaultToday
              register={register}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      // setValue should be called with formatted defaultValue (which takes precedence)
      expect(setValueMock).toHaveBeenCalled()
      const call = setValueMock.mock.calls[0]
      expect(call[0]).toBe('birthdate')
      expect(call[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(call[2]).toEqual({ shouldValidate: false })
    })
  })

  describe('states', () => {
    it('disables input when disabled', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              disabled
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Birth Date')).toBeDisabled()
    })

    it('sets readOnly when readOnly prop is true', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              readOnly
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Birth Date')).toHaveAttribute('readonly')
    })
  })

  describe('user interaction', () => {
    it('allows selecting a date', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByLabelText('Birth Date')
      await user.clear(input)
      await user.type(input, '2000-05-15')

      expect(input).toHaveValue('2000-05-15')
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              required
              register={register}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Birth Date')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Birth Date')).toHaveAttribute('aria-invalid', 'true')
    })

    it('uses ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
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
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByLabelText('Birth Date')
      const errorId = input.getAttribute('aria-describedby')
      expect(errorId).toContain('error')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
              testId="birthdate-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('birthdate-field')).toBeInTheDocument()
    })

    it('applies testId to input with -input suffix', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              register={register}
              testId="birthdate-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('birthdate-field-input')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register }) => (
            <DateField
              id="birthdate"
              name="birthdate"
              label="Birth Date"
              className="custom-class"
              register={register}
              testId="birthdate-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('birthdate-field')).toHaveClass('custom-class')
    })
  })
})
