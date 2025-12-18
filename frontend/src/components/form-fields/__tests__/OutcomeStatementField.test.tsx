/**
 * Tests for OutcomeStatementField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { OutcomeStatementField } from '../outcome-statement/OutcomeStatementField'
import type { OutcomeStatementValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  outcome: OutcomeStatementValue
}

function TestWrapper({
  children,
  defaultValues = { outcome: { date: '', statement: '' } },
}: {
  children: (props: any) => React.ReactNode
  defaultValues?: Partial<TestFormData>
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, watch, setValue, errors })}</>
}

describe('OutcomeStatementField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              label="My Commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('My Commitment')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              description="Define your outcome"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Define your outcome')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              label="Outcome"
              required
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders date input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome-date')).toBeInTheDocument()
    })

    it('renders statement input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome-statement')).toBeInTheDocument()
    })

    it('renders prefix text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              prefixText="By"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('By')).toBeInTheDocument()
    })

    it('renders mid text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              midText="I will"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I will')).toBeInTheDocument()
    })

    it('renders default prefix and mid text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('By')).toBeInTheDocument()
      expect(screen.getByText('I will')).toBeInTheDocument()
    })

    it('renders character count when statement has content', () => {
      render(
        <TestWrapper defaultValues={{ outcome: { date: '', statement: 'My goal' } }}>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              statementMaxLength={200}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('7 / 200')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Invalid outcome' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid outcome')
    })
  })

  describe('date input interaction', () => {
    it('updates date when changed', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      const dateInput = screen.getByTestId('outcome-date')
      await user.clear(dateInput)
      await user.type(dateInput, '2024-12-31')

      expect(dateInput).toHaveValue('2024-12-31')
    })

    it('respects minDate constraint', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              minDate="2024-01-01"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      const dateInput = screen.getByTestId('outcome-date')
      expect(dateInput).toHaveAttribute('min')
    })

    it('respects maxDate constraint', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              maxDate="2025-12-31"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      const dateInput = screen.getByTestId('outcome-date')
      expect(dateInput).toHaveAttribute('max')
    })
  })

  describe('statement input interaction', () => {
    it('updates statement when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      const statementInput = screen.getByTestId('outcome-statement')
      await user.type(statementInput, 'complete this task')

      expect(statementInput).toHaveValue('complete this task')
    })

    it('shows placeholder text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              statementPlaceholder="describe your goal"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('describe your goal')).toBeInTheDocument()
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              statementMaxLength={100}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      const statementInput = screen.getByTestId('outcome-statement')
      expect(statementInput).toHaveAttribute('maxLength', '100')
    })
  })

  describe('disabled state', () => {
    it('disables both inputs when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome-date')).toBeDisabled()
      expect(screen.getByTestId('outcome-statement')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              label="My Outcome"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Outcome' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              ariaLabel="Custom outcome label"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Custom outcome label' })).toBeInTheDocument()
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Error' }}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome-date')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('outcome-statement')).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-labels on inputs', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome-date')).toHaveAttribute('aria-label', 'Target date')
      expect(screen.getByTestId('outcome-statement')).toHaveAttribute('aria-label', 'Outcome statement')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <OutcomeStatementField
              id="outcome"
              name="outcome"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="outcome"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('outcome')).toHaveClass('custom-class')
    })
  })
})
