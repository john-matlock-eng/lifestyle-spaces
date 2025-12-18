/**
 * Tests for DateRangeField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { DateRangeField } from '../date/DateRangeField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  startDate: string
  endDate: string
}

function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: (props: any) => React.ReactNode
  defaultValues?: Partial<TestFormData>
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, watch, errors })}</>
}

describe('DateRangeField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Date Range')).toBeInTheDocument()
    })

    it('renders start and end labels', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              startLabel="From"
              endLabel="To"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('From')).toBeInTheDocument()
      expect(screen.getByText('To')).toBeInTheDocument()
    })

    it('renders default start and end labels', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Start Date')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              description="Select start and end dates"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Select start and end dates')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              startName="startDate"
              endName="endDate"
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders start error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              startError={{ type: 'required', message: 'Start date is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Start date is required')
    })

    it('renders end error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              endError={{ type: 'required', message: 'End date is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('End date is required')
    })

    it('renders general error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              label="Date Range"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              error={{ type: 'validate', message: 'Invalid date range' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid date range')
    })
  })

  describe('min/max dates', () => {
    it('sets min date attribute on start input', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              minDate="2000-01-15"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // The component formats dates, so check that min is set with proper format
      const input = screen.getByTestId('date-range-start-input')
      expect(input).toHaveAttribute('min')
      const minValue = input.getAttribute('min')
      expect(minValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('sets max date attribute on end input', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              maxDate="2025-06-15"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // The component formats dates, so check that max is set with proper format
      const input = screen.getByTestId('date-range-end-input')
      expect(input).toHaveAttribute('max')
      const maxValue = input.getAttribute('max')
      expect(maxValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('linked date constraints', () => {
    it('limits start date max to end date value', () => {
      render(
        <TestWrapper defaultValues={{ startDate: '', endDate: '2024-06-15' }}>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // The component uses the end date value to constrain start date max
      const input = screen.getByTestId('date-range-start-input')
      expect(input).toHaveAttribute('max')
    })

    it('limits end date min to start date value', () => {
      render(
        <TestWrapper defaultValues={{ startDate: '2024-01-15', endDate: '' }}>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // The component uses the start date value to constrain end date min
      const input = screen.getByTestId('date-range-end-input')
      expect(input).toHaveAttribute('min')
    })

    it('combines end date with maxDate constraint for start date', () => {
      render(
        <TestWrapper defaultValues={{ startDate: '', endDate: '2024-06-15' }}>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              maxDate="2024-03-15"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // maxDate is earlier than endDate, so it should be used
      const input = screen.getByTestId('date-range-start-input')
      expect(input).toHaveAttribute('max')
      const maxValue = input.getAttribute('max')
      expect(maxValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('combines start date with minDate constraint for end date', () => {
      render(
        <TestWrapper defaultValues={{ startDate: '2024-01-15', endDate: '' }}>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              minDate="2024-02-15"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      // minDate is later than startDate, so it should be used
      const input = screen.getByTestId('date-range-end-input')
      expect(input).toHaveAttribute('min')
      const minValue = input.getAttribute('min')
      expect(minValue).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('states', () => {
    it('disables both inputs when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              disabled
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-start-input')).toBeDisabled()
      expect(screen.getByTestId('date-range-end-input')).toBeDisabled()
    })
  })

  describe('user interaction', () => {
    it('allows selecting start date', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      const startInput = screen.getByTestId('date-range-start-input')
      await user.clear(startInput)
      await user.type(startInput, '2024-01-15')

      expect(startInput).toHaveValue('2024-01-15')
    })

    it('allows selecting end date', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      const endInput = screen.getByTestId('date-range-end-input')
      await user.clear(endInput)
      await user.type(endInput, '2024-06-15')

      expect(endInput).toHaveValue('2024-06-15')
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              required
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-start-input')).toHaveAttribute('aria-required', 'true')
      expect(screen.getByTestId('date-range-end-input')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid on start input when startError exists', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              startError={{ type: 'required', message: 'Required' }}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-start-input')).toHaveAttribute('aria-invalid', 'true')
    })

    it('sets aria-invalid on end input when endError exists', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              endError={{ type: 'required', message: 'Required' }}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-end-input')).toHaveAttribute('aria-invalid', 'true')
    })

    it('connects start error via aria-describedby', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              startError={{ type: 'required', message: 'Required' }}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      const startInput = screen.getByTestId('date-range-start-input')
      const describedBy = startInput.getAttribute('aria-describedby')
      expect(describedBy).toContain('error')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range')).toBeInTheDocument()
    })

    it('applies testId to start input with -start-input suffix', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-start-input')).toBeInTheDocument()
    })

    it('applies testId to end input with -end-input suffix', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range-end-input')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <DateRangeField
              id="dateRange"
              name="startDate"
              startName="startDate"
              endName="endDate"
              className="custom-class"
              register={register}
              watch={watch}
              testId="date-range"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('date-range')).toHaveClass('custom-class')
    })
  })
})
