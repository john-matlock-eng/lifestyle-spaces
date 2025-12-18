/**
 * Tests for FractionTrackerField Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { FractionTrackerField } from '../fraction-tracker/FractionTrackerField'
import type { FractionValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  progress: FractionValue
}

function TestWrapper({
  children,
  defaultValues = { progress: { numerator: 0, denominator: 5 } },
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe('FractionTrackerField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              label="Tasks Completed"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Tasks Completed')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              label="Progress"
              description="Track your daily progress"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Track your daily progress')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              label="Progress"
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

    it('renders numerator and denominator inputs', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-numerator')).toBeInTheDocument()
      expect(screen.getByTestId('fraction-denominator')).toBeInTheDocument()
    })

    it('renders divider between inputs', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('/')).toBeInTheDocument()
    })

    it('renders quick-fill buttons by default', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-increment')).toBeInTheDocument()
      expect(screen.getByTestId('fraction-complete')).toBeInTheDocument()
      expect(screen.getByTestId('fraction-reset')).toBeInTheDocument()
    })

    it('hides quick-fill buttons when showQuickFill is false', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              showQuickFill={false}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('fraction-increment')).not.toBeInTheDocument()
      expect(screen.queryByTestId('fraction-complete')).not.toBeInTheDocument()
      expect(screen.queryByTestId('fraction-reset')).not.toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Invalid fraction' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid fraction')
    })
  })

  describe('default values', () => {
    it('uses provided default value', () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 3, denominator: 10 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-numerator')).toHaveValue(3)
      expect(screen.getByTestId('fraction-denominator')).toHaveValue(10)
    })

    it('uses component default value when form has no value', () => {
      render(
        <TestWrapper defaultValues={{}}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              defaultValue={{ numerator: 2, denominator: 7 }}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      // Component should use defaultValue prop
      expect(screen.getByTestId('fraction-numerator')).toHaveValue(2)
      expect(screen.getByTestId('fraction-denominator')).toHaveValue(7)
    })
  })

  describe('numerator input', () => {
    it('updates numerator when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const numeratorInput = screen.getByTestId('fraction-numerator')
      await user.clear(numeratorInput)
      await user.type(numeratorInput, '3')

      expect(numeratorInput).toHaveValue(3)
    })

    it('clamps numerator to denominator max', async () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 0, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const numeratorInput = screen.getByTestId('fraction-numerator')
      fireEvent.change(numeratorInput, { target: { value: '10' } })

      // Should be clamped to denominator (5)
      expect(numeratorInput).toHaveValue(5)
    })

    it('does not allow negative numerator', async () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 2, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const numeratorInput = screen.getByTestId('fraction-numerator')
      fireEvent.change(numeratorInput, { target: { value: '-1' } })

      // Should be clamped to 0
      expect(numeratorInput).toHaveValue(0)
    })
  })

  describe('denominator input', () => {
    it('updates denominator when typing', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const denominatorInput = screen.getByTestId('fraction-denominator')
      fireEvent.change(denominatorInput, { target: { value: '10' } })

      expect(denominatorInput).toHaveValue(10)
    })

    it('clamps denominator to maxDenominator', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              maxDenominator={20}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const denominatorInput = screen.getByTestId('fraction-denominator')
      fireEvent.change(denominatorInput, { target: { value: '50' } })

      // Should be clamped to maxDenominator (20)
      expect(denominatorInput).toHaveValue(20)
    })

    it('adjusts numerator when denominator decreases below it', async () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 8, denominator: 10 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const denominatorInput = screen.getByTestId('fraction-denominator')
      fireEvent.change(denominatorInput, { target: { value: '5' } })

      // Numerator should be adjusted to new denominator
      expect(screen.getByTestId('fraction-numerator')).toHaveValue(5)
      expect(denominatorInput).toHaveValue(5)
    })

    it('does not allow denominator below 1', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const denominatorInput = screen.getByTestId('fraction-denominator')
      fireEvent.change(denominatorInput, { target: { value: '0' } })

      // Should be clamped to 1
      expect(denominatorInput).toHaveValue(1)
    })
  })

  describe('quick-fill buttons', () => {
    it('increment button adds 1 to numerator', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ progress: { numerator: 2, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const incrementBtn = screen.getByTestId('fraction-increment')
      await user.click(incrementBtn)

      expect(screen.getByTestId('fraction-numerator')).toHaveValue(3)
    })

    it('increment button is disabled when numerator equals denominator', () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 5, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-increment')).toBeDisabled()
    })

    it('complete button sets numerator to denominator', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ progress: { numerator: 2, denominator: 10 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const completeBtn = screen.getByTestId('fraction-complete')
      await user.click(completeBtn)

      expect(screen.getByTestId('fraction-numerator')).toHaveValue(10)
    })

    it('complete button is disabled when already complete', () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 5, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-complete')).toBeDisabled()
    })

    it('reset button sets numerator to 0', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ progress: { numerator: 3, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      const resetBtn = screen.getByTestId('fraction-reset')
      await user.click(resetBtn)

      expect(screen.getByTestId('fraction-numerator')).toHaveValue(0)
    })

    it('reset button is disabled when numerator is already 0', () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 0, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-reset')).toBeDisabled()
    })
  })

  describe('disabled state', () => {
    it('disables all inputs when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              disabled
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-numerator')).toBeDisabled()
      expect(screen.getByTestId('fraction-denominator')).toBeDisabled()
      expect(screen.getByTestId('fraction-increment')).toBeDisabled()
      expect(screen.getByTestId('fraction-complete')).toBeDisabled()
      expect(screen.getByTestId('fraction-reset')).toBeDisabled()
    })

    it('does not update values when disabled', async () => {
      render(
        <TestWrapper defaultValues={{ progress: { numerator: 2, denominator: 5 } }}>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              disabled
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      // Try to change via fireEvent (bypassing disabled state)
      const numeratorInput = screen.getByTestId('fraction-numerator')
      fireEvent.change(numeratorInput, { target: { value: '10' } })

      // Value should not change due to disabled callback
      expect(numeratorInput).toHaveValue(2)
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              label="Progress Tracker"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Progress Tracker' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              ariaLabel="Custom label"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Custom label' })).toBeInTheDocument()
    })

    it('sets aria-invalid on inputs when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Error' }}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-numerator')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('fraction-denominator')).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-labels on inputs', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-numerator')).toHaveAttribute('aria-label', 'Numerator')
      expect(screen.getByTestId('fraction-denominator')).toHaveAttribute('aria-label', 'Denominator')
    })

    it('has aria-labels on quick-fill buttons', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction-increment')).toHaveAttribute('aria-label', 'Add one')
      expect(screen.getByTestId('fraction-complete')).toHaveAttribute('aria-label', 'Mark complete')
      expect(screen.getByTestId('fraction-reset')).toHaveAttribute('aria-label', 'Reset to zero')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <FractionTrackerField
              id="progress"
              name="progress"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="fraction"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('fraction')).toHaveClass('custom-class')
    })
  })
})
