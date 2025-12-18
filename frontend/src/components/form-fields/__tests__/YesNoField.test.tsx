/**
 * Tests for YesNoField Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { YesNoField } from '../yes-no/YesNoField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  completed: boolean | null
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormData>({
    mode: 'all',
    defaultValues,
  })

  return <>{children({ register, watch, setValue, errors })}</>
}

describe('YesNoField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Task Completed?')).toBeInTheDocument()
    })

    it('renders Yes and No options', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Yes')).toBeInTheDocument()
      expect(screen.getByText('No')).toBeInTheDocument()
    })

    it('renders custom labels', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              yesLabel="Completed"
              noLabel="Not Completed"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Not Completed')).toBeInTheDocument()
    })

    it('renders N/A option when allowNA is true', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              allowNA
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('renders custom N/A label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              allowNA
              naLabel="Not Applicable"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Not Applicable')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              description="Mark whether the task is done"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Mark whether the task is done')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Please select an option' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Please select an option')
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
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

  describe('selection', () => {
    it('selects Yes when clicking Yes button', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      await user.click(yesButton)

      expect(setValueMock).toHaveBeenCalledWith('completed', true, { shouldValidate: true })
    })

    it('selects No when clicking No button', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const noButton = screen.getByTestId('completed-field-no')
      await user.click(noButton)

      expect(setValueMock).toHaveBeenCalledWith('completed', false, { shouldValidate: true })
    })

    it('selects N/A when clicking N/A button', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              allowNA
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const naButton = screen.getByTestId('completed-field-na')
      await user.click(naButton)

      expect(setValueMock).toHaveBeenCalledWith('completed', null, { shouldValidate: true })
    })

    it('shows selected state for Yes', () => {
      render(
        <TestWrapper defaultValues={{ completed: true }}>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      expect(yesButton).toHaveClass('field-yesno-option--selected')
    })

    it('shows selected state for No', () => {
      render(
        <TestWrapper defaultValues={{ completed: false }}>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const noButton = screen.getByTestId('completed-field-no')
      expect(noButton).toHaveClass('field-yesno-option--selected')
    })
  })

  describe('states', () => {
    it('disables all buttons when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              disabled
              allowNA
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('completed-field-yes')).toBeDisabled()
      expect(screen.getByTestId('completed-field-no')).toBeDisabled()
      expect(screen.getByTestId('completed-field-na')).toBeDisabled()
    })

    it('does not call setValue when disabled', async () => {
      const user = userEvent.setup()
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              disabled
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      await user.click(yesButton)

      expect(setValueMock).not.toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('handles Enter key to select', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      yesButton.focus()
      fireEvent.keyDown(yesButton, { key: 'Enter' })

      expect(setValueMock).toHaveBeenCalledWith('completed', true, { shouldValidate: true })
    })

    it('handles Space key to select', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const noButton = screen.getByTestId('completed-field-no')
      noButton.focus()
      fireEvent.keyDown(noButton, { key: ' ' })

      expect(setValueMock).toHaveBeenCalledWith('completed', false, { shouldValidate: true })
    })

    it('handles ArrowLeft key navigation without N/A', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper defaultValues={{ completed: true }}>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      yesButton.focus()
      fireEvent.keyDown(yesButton, { key: 'ArrowLeft' })

      expect(setValueMock).toHaveBeenCalledWith('completed', false, { shouldValidate: true })
    })

    it('handles ArrowRight key navigation without N/A', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper defaultValues={{ completed: false }}>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const noButton = screen.getByTestId('completed-field-no')
      noButton.focus()
      fireEvent.keyDown(noButton, { key: 'ArrowRight' })

      expect(setValueMock).toHaveBeenCalledWith('completed', true, { shouldValidate: true })
    })

    it('handles ArrowLeft key navigation with N/A', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper defaultValues={{ completed: true }}>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              allowNA
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const yesButton = screen.getByTestId('completed-field-yes')
      yesButton.focus()
      fireEvent.keyDown(yesButton, { key: 'ArrowLeft' })

      expect(setValueMock).toHaveBeenCalledWith('completed', null, { shouldValidate: true })
    })

    it('handles ArrowRight key navigation with N/A', async () => {
      const setValueMock = vi.fn()

      render(
        <TestWrapper defaultValues={{ completed: false }}>
          {({ register, watch }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              allowNA
              register={register}
              watch={watch}
              setValue={setValueMock}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      const noButton = screen.getByTestId('completed-field-no')
      noButton.focus()
      fireEvent.keyDown(noButton, { key: 'ArrowRight' })

      expect(setValueMock).toHaveBeenCalledWith('completed', null, { shouldValidate: true })
    })
  })

  describe('accessibility', () => {
    it('has radiogroup role', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('has radio role on options', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      const radios = screen.getAllByRole('radio')
      expect(radios).toHaveLength(2)
    })

    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              required
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true')
    })

    it('sets aria-checked on selected option', () => {
      render(
        <TestWrapper defaultValues={{ completed: true }}>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('completed-field-yes')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByTestId('completed-field-no')).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('completed-field')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <YesNoField
              id="completed"
              name="completed"
              label="Task Completed?"
              className="custom-class"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="completed-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('completed-field')).toHaveClass('custom-class')
    })
  })
})
