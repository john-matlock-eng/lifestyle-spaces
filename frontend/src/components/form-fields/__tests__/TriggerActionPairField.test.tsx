/**
 * Tests for TriggerActionPairField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { TriggerActionPairField } from '../trigger-action-pair/TriggerActionPairField'
import type { TriggerActionPairValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  habit: TriggerActionPairValue
}

function TestWrapper({
  children,
  defaultValues = { habit: { trigger: '', action: '' } },
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

describe('TriggerActionPairField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              label="Implementation Intention"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Implementation Intention')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              description="Create a habit trigger"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Create a habit trigger')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              label="Habit"
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

    it('renders trigger input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit-trigger')).toBeInTheDocument()
    })

    it('renders action input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit-action')).toBeInTheDocument()
    })

    it('renders custom trigger label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              triggerLabel="Whenever"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Whenever')).toBeInTheDocument()
    })

    it('renders custom action label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              actionLabel="I shall"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I shall')).toBeInTheDocument()
    })

    it('renders default labels', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('When')).toBeInTheDocument()
      expect(screen.getByText('Then I will')).toBeInTheDocument()
    })

    it('renders arrow connector', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      // Arrow icon is rendered
      const arrow = document.querySelector('.field-trigger-action-arrow')
      expect(arrow).toBeInTheDocument()
    })

    it('renders character count for trigger when has content', () => {
      render(
        <TestWrapper defaultValues={{ habit: { trigger: 'Morning alarm', action: '' } }}>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              triggerMaxLength={150}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('13 / 150')).toBeInTheDocument()
    })

    it('renders character count for action when has content', () => {
      render(
        <TestWrapper defaultValues={{ habit: { trigger: '', action: 'Exercise' } }}>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              actionMaxLength={150}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('8 / 150')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Both fields required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Both fields required')
    })
  })

  describe('trigger input interaction', () => {
    it('updates trigger when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      const triggerInput = screen.getByTestId('habit-trigger')
      await user.type(triggerInput, 'I wake up')

      expect(triggerInput).toHaveValue('I wake up')
    })

    it('shows placeholder text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              triggerPlaceholder="describe your trigger"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('describe your trigger')).toBeInTheDocument()
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              triggerMaxLength={50}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      const triggerInput = screen.getByTestId('habit-trigger')
      expect(triggerInput).toHaveAttribute('maxLength', '50')
    })
  })

  describe('action input interaction', () => {
    it('updates action when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      const actionInput = screen.getByTestId('habit-action')
      await user.type(actionInput, 'do 10 pushups')

      expect(actionInput).toHaveValue('do 10 pushups')
    })

    it('shows placeholder text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              actionPlaceholder="describe your action"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('describe your action')).toBeInTheDocument()
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              actionMaxLength={100}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      const actionInput = screen.getByTestId('habit-action')
      expect(actionInput).toHaveAttribute('maxLength', '100')
    })
  })

  describe('disabled state', () => {
    it('disables both inputs when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit-trigger')).toBeDisabled()
      expect(screen.getByTestId('habit-action')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              label="My Habit"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Habit' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              ariaLabel="Custom habit label"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Custom habit label' })).toBeInTheDocument()
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Error' }}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit-trigger')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('habit-action')).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-labels on inputs', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit-trigger')).toHaveAttribute('aria-label', 'Trigger')
      expect(screen.getByTestId('habit-action')).toHaveAttribute('aria-label', 'Action')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <TriggerActionPairField
              id="habit"
              name="habit"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="habit"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('habit')).toHaveClass('custom-class')
    })
  })
})
