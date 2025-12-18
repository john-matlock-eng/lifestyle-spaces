/**
 * Tests for ChecklistInputField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { ChecklistInputField } from '../checklist-input/ChecklistInputField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  tasks: string[]
}

function TestWrapper({
  children,
  defaultValues = { tasks: [] },
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

describe('ChecklistInputField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              label="Daily Tasks"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Daily Tasks')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              description="Add your tasks here"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Add your tasks here')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              label="Tasks"
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

    it('renders add button', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-add-btn')).toBeInTheDocument()
    })

    it('renders custom add button label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              addButtonLabel="Add task"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Add task')).toBeInTheDocument()
    })

    it('renders new item input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-new-input')).toBeInTheDocument()
    })

    it('renders existing items', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1', 'Task 2', 'Task 3'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('tasks-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('tasks-item-2')).toBeInTheDocument()
    })

    it('renders item count', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1', 'Task 2'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              maxItems={10}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('2 / 10 items')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'At least one item required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('At least one item required')
    })

    it('renders drag handles when reorderable', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              reorderable
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(document.querySelector('.field-checklist-drag-handle')).toBeInTheDocument()
    })

    it('does not render drag handles when not reorderable', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              reorderable={false}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(document.querySelector('.field-checklist-drag-handle')).not.toBeInTheDocument()
    })
  })

  describe('adding items', () => {
    it('adds item when clicking add button', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      const newInput = screen.getByTestId('tasks-new-input')
      await user.type(newInput, 'New task')

      const addBtn = screen.getByTestId('tasks-add-btn')
      await user.click(addBtn)

      expect(screen.getByTestId('tasks-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('tasks-item-0-input')).toHaveValue('New task')
    })

    it('adds item when pressing Enter', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      const newInput = screen.getByTestId('tasks-new-input')
      await user.type(newInput, 'New task{Enter}')

      expect(screen.getByTestId('tasks-item-0')).toBeInTheDocument()
    })

    it('clears input after adding', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      const newInput = screen.getByTestId('tasks-new-input')
      await user.type(newInput, 'New task')

      const addBtn = screen.getByTestId('tasks-add-btn')
      await user.click(addBtn)

      expect(newInput).toHaveValue('')
    })

    it('does not add empty items', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      const addBtn = screen.getByTestId('tasks-add-btn')
      await user.click(addBtn)

      expect(screen.queryByTestId('tasks-item-0')).not.toBeInTheDocument()
    })

    it('disables add button when input is empty', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-add-btn')).toBeDisabled()
    })

    it('hides add section when at maxItems', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1', 'Task 2', 'Task 3'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              maxItems={3}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('tasks-new-input')).not.toBeInTheDocument()
      expect(screen.queryByTestId('tasks-add-btn')).not.toBeInTheDocument()
    })
  })

  describe('removing items', () => {
    it('removes item when clicking remove button', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1', 'Task 2'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('tasks-item-1')).toBeInTheDocument()

      const removeBtn = screen.getByTestId('tasks-item-0-remove')
      await user.click(removeBtn)

      // Only one item should remain
      expect(screen.getByTestId('tasks-item-0-input')).toHaveValue('Task 2')
      expect(screen.queryByTestId('tasks-item-1')).not.toBeInTheDocument()
    })

    it('disables remove button when at minItems', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              minItems={1}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-item-0-remove')).toBeDisabled()
    })
  })

  describe('editing items', () => {
    it('updates item text when editing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ tasks: ['Original task'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      const itemInput = screen.getByTestId('tasks-item-0-input')
      await user.clear(itemInput)
      await user.type(itemInput, 'Updated task')

      expect(itemInput).toHaveValue('Updated task')
    })

    it('respects itemMaxLength', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              itemMaxLength={50}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-item-0-input')).toHaveAttribute('maxLength', '50')
    })
  })

  describe('disabled state', () => {
    it('disables all inputs when disabled', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-new-input')).toBeDisabled()
      expect(screen.getByTestId('tasks-add-btn')).toBeDisabled()
      expect(screen.getByTestId('tasks-item-0-input')).toBeDisabled()
      expect(screen.getByTestId('tasks-item-0-remove')).toBeDisabled()
    })
  })

  describe('placeholder', () => {
    it('shows custom placeholder', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              itemPlaceholder="Type a task"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Type a task')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              label="My Tasks"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Tasks' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              ariaLabel="Custom checklist"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Custom checklist' })).toBeInTheDocument()
    })

    it('has list role for items', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('has aria-labels on remove buttons', () => {
      render(
        <TestWrapper defaultValues={{ tasks: ['Task 1'] }}>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks-item-0-remove')).toHaveAttribute('aria-label', 'Remove item 1')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <ChecklistInputField
              id="tasks"
              name="tasks"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="tasks"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('tasks')).toHaveClass('custom-class')
    })
  })
})
