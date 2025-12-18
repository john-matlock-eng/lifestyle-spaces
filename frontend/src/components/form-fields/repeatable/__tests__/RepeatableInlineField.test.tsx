/**
 * Tests for RepeatableInlineField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { RepeatableInlineField } from '../RepeatableInlineField'
import type { RepeatableInlineValue, RepeatableFieldDefinition } from '../../types'

// Mock the registry's renderField function
vi.mock('../../registry', () => ({
  renderField: vi.fn((type, props) => (
    <input
      data-testid={`mock-field-${props.id}`}
      data-type={type}
      id={props.id}
      name={props.name}
      placeholder={props.placeholder}
      disabled={props.disabled}
      onChange={(e) => props.setValue?.(props.name, e.target.value)}
    />
  )),
}))

interface TestFormData {
  trapFix: RepeatableInlineValue
}

function TestWrapper({
  children,
  defaultValues,
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

const defaultFields: RepeatableFieldDefinition[] = [
  { key: 'trap', type: 'text', label: 'Trap', placeholder: 'When I...', required: true },
  { key: 'fix', type: 'text', label: 'Fix', placeholder: 'I will instead...' },
]

describe('RepeatableInlineField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Trap & Fix')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              description="Define trap-fix pairs"
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Define trap-fix pairs')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              required
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders item count', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              maxItems={10}
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('0 / 10')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              error={{ type: 'minItems', message: 'At least 1 item required' }}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('At least 1 item required')
    })

    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              className="custom-class"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('trap-fix')).toHaveClass('custom-class')
    })
  })

  describe('layout modes', () => {
    it('applies row layout class by default', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('trap-fix')).toHaveClass('field-repeatable-inline-container--row')
    })

    it('applies compact layout class', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              layout="compact"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('trap-fix')).toHaveClass('field-repeatable-inline-container--compact')
    })
  })

  describe('adding items', () => {
    it('adds item when add button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      const addButton = screen.getByTestId('trap-fix-add-btn')
      await user.click(addButton)

      expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
      expect(screen.getByText('1 / 20')).toBeInTheDocument()
    })

    it('hides add button when max items reached', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              maxItems={2}
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      // Add two items
      await user.click(screen.getByTestId('trap-fix-add-btn'))
      await user.click(screen.getByTestId('trap-fix-add-btn'))

      // Add button should not be present
      expect(screen.queryByTestId('trap-fix-add-btn')).not.toBeInTheDocument()
    })

    it('disables add button when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              disabled
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('trap-fix-add-btn')).toBeDisabled()
    })

    it('uses custom add button label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              addButtonLabel="Add Pair"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Add Pair')).toBeInTheDocument()
    })
  })

  describe('removing items', () => {
    it('removes item when remove button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      // Add an item
      await user.click(screen.getByTestId('trap-fix-add-btn'))
      expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()

      // Remove it
      await user.click(screen.getByTestId('trap-fix-item-0-remove'))
      expect(screen.queryByTestId('trap-fix-item-0')).not.toBeInTheDocument()
    })

    it('disables remove button when at minimum items', async () => {
      render(
        <TestWrapper
          defaultValues={{
            trapFix: { items: [{ _id: '1', trap: 'test', fix: 'solution' }] },
          }}
        >
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              minItems={1}
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      // Wait for item to render
      await waitFor(() => {
        expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
      })

      // Remove button should be disabled since we're at minItems
      await waitFor(() => {
        expect(screen.getByTestId('trap-fix-item-0-remove')).toBeDisabled()
      })
    })
  })

  describe('reordering', () => {
    it('shows drag handle when reorderable', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              reorderable
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await user.click(screen.getByTestId('trap-fix-add-btn'))

      const item = screen.getByTestId('trap-fix-item-0')
      expect(item).toHaveAttribute('draggable', 'true')
    })

    it('does not show drag handle when not reorderable', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              reorderable={false}
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await user.click(screen.getByTestId('trap-fix-add-btn'))

      const item = screen.getByTestId('trap-fix-item-0')
      expect(item).toHaveAttribute('draggable', 'false')
    })
  })

  describe('disabled state', () => {
    it('disables all controls when disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _user = userEvent.setup()

      render(
        <TestWrapper
          defaultValues={{
            trapFix: { items: [{ _id: '1', trap: 'test', fix: 'solution' }] },
          }}
        >
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              disabled
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
      })

      expect(screen.getByTestId('trap-fix-item-0-remove')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has proper aria-label on items group', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Trap & Fix')
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              ariaLabel="Custom trap-fix pairs"
              fields={defaultFields}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Custom trap-fix pairs')
    })

    it('has proper aria-label on remove buttons', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await user.click(screen.getByTestId('trap-fix-add-btn'))

      const removeButton = screen.getByTestId('trap-fix-item-0-remove')
      expect(removeButton).toHaveAttribute('aria-label', 'Remove item 1')
    })
  })

  describe('field rendering', () => {
    it('renders fields for each item', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await user.click(screen.getByTestId('trap-fix-add-btn'))

      expect(screen.getByTestId('trap-fix-item-0-field-trap')).toBeInTheDocument()
      expect(screen.getByTestId('trap-fix-item-0-field-fix')).toBeInTheDocument()
    })
  })

  describe('initialization', () => {
    it('initializes with minItems', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              minItems={2}
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
        expect(screen.getByTestId('trap-fix-item-1')).toBeInTheDocument()
      })
    })

    it('initializes with default value items', async () => {
      render(
        <TestWrapper
          defaultValues={{
            trapFix: {
              items: [
                { _id: '1', trap: 'Trap 1', fix: 'Fix 1' },
                { _id: '2', trap: 'Trap 2', fix: 'Fix 2' },
              ],
            },
          }}
        >
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
        expect(screen.getByTestId('trap-fix-item-1')).toBeInTheDocument()
      })
    })
  })

  describe('testId', () => {
    it('applies testId to all elements', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('trap-fix')).toBeInTheDocument()
      expect(screen.getByTestId('trap-fix-add-btn')).toBeInTheDocument()

      await user.click(screen.getByTestId('trap-fix-add-btn'))

      expect(screen.getByTestId('trap-fix-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('trap-fix-item-0-remove')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('validates minItems', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableInlineField
              id="trapFix"
              name="trapFix"
              label="Trap & Fix"
              minItems={2}
              fields={defaultFields}
              testId="trap-fix"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      // Count should show current state
      await waitFor(() => {
        expect(screen.getByText(/\/ 20/)).toBeInTheDocument()
      })
    })
  })
})
