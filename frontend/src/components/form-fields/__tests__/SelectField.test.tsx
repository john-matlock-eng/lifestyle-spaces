/**
 * Tests for SelectField Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { SelectField } from '../select/SelectField'

// Mock scrollIntoView since it's not available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

// Wrapper component to provide React Hook Form context
interface TestFormData {
  category: string
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
    setValue,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, watch, setValue, errors })}</>
}

const options = [
  { value: 'health', label: 'Health' },
  { value: 'career', label: 'Career' },
  { value: 'finance', label: 'Finance', description: 'Money matters' },
  { value: 'disabled', label: 'Disabled Option', disabled: true },
]

describe('SelectField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Category')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              placeholder="Choose category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Choose category')).toBeInTheDocument()
    })

    it('renders selected value', () => {
      render(
        <TestWrapper defaultValues={{ category: 'health' }}>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Health')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              description="Select your category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Select your category')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Category is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Category is required')
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
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
  })

  describe('dropdown behavior', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('displays all options when open', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      expect(screen.getByText('Health')).toBeInTheDocument()
      expect(screen.getByText('Career')).toBeInTheDocument()
      expect(screen.getByText('Finance')).toBeInTheDocument()
    })

    it('shows option description when present', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      expect(screen.getByText('Money matters')).toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <div>
              <SelectField
                id="category"
                name="category"
                label="Category"
                options={options}
                register={register}
                watch={watch}
                setValue={setValue}
                testId="category-field"
              />
              <div data-testid="outside">Outside</div>
            </div>
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByTestId('outside'))
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('shows empty message when no options match search', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              searchable
              emptyMessage="No categories found"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      const searchInput = screen.getByTestId('category-field-search')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No categories found')).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('selects option on click', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      const healthOption = screen.getByTestId('category-field-option-health')
      await user.click(healthOption)

      expect(setValueMock).toHaveBeenCalledWith('category', 'health', { shouldValidate: true })
    })

    it('does not select disabled option', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      const disabledOption = screen.getByTestId('category-field-option-disabled')
      await user.click(disabledOption)

      expect(setValueMock).not.toHaveBeenCalled()
    })
  })

  describe('clear functionality', () => {
    it('shows clear button when clearable and has value', async () => {
      render(
        <TestWrapper defaultValues={{ category: 'health' }}>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              clearable
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
    })

    it('clears selection when clear button is clicked', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper defaultValues={{ category: 'health' }}>
          {({ register, watch }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              clearable
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)

      expect(setValueMock).toHaveBeenCalledWith('category', undefined, { shouldValidate: true })
    })
  })

  describe('search functionality', () => {
    it('renders search input when searchable', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              searchable
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      expect(screen.getByTestId('category-field-search')).toBeInTheDocument()
    })

    it('filters options based on search query', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              searchable
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      const searchInput = screen.getByTestId('category-field-search')
      await user.type(searchInput, 'heal')

      expect(screen.getByText('Health')).toBeInTheDocument()
      expect(screen.queryByText('Career')).not.toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('opens dropdown on Enter key', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'Enter' })

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('opens dropdown on Space key', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: ' ' })

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      fireEvent.keyDown(trigger, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('navigates options with Arrow keys', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })

      const options_list = screen.getAllByRole('option')
      expect(options_list[1]).toHaveClass('field-select-option--highlighted')
    })
  })

  describe('states', () => {
    it('disables select when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('category-field-trigger')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              required
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('category-field-trigger')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Required' }}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('category-field-trigger')).toHaveAttribute('aria-invalid', 'true')
    })

    it('sets aria-haspopup and aria-expanded', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('custom rendering', () => {
    it('uses renderOption for custom option rendering', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              renderOption={(opt) => <span data-testid="custom-option">{opt.label.toUpperCase()}</span>}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      const trigger = screen.getByTestId('category-field-trigger')
      await user.click(trigger)

      expect(screen.getByText('HEALTH')).toBeInTheDocument()
    })

    it('uses renderValue for custom value rendering', async () => {
      render(
        <TestWrapper defaultValues={{ category: 'health' }}>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              renderValue={(opt) => <span>Selected: {opt.label}</span>}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Selected: Health')).toBeInTheDocument()
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SelectField
              id="category"
              name="category"
              label="Category"
              options={options}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="category-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('category-field')).toBeInTheDocument()
    })
  })
})
