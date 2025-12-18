/**
 * Tests for CheckboxWithTextField Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { CheckboxWithTextField } from '../checkbox-with-text/CheckboxWithTextField'
import type { CheckboxWithTextValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  other: CheckboxWithTextValue
}

function TestWrapper({
  children,
  defaultValues = { other: { checked: false, text: '' } },
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

describe('CheckboxWithTextField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              label="Additional Option"
              checkboxLabel="I have more to add"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Additional Option')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              description="Optional description"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Optional description')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              label="Option"
              checkboxLabel="Check me"
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

    it('renders checkbox with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="I have additional notes"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I have additional notes')).toBeInTheDocument()
    })

    it('does not render text input when unchecked', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('other-text')).not.toBeInTheDocument()
    })

    it('renders text input when checked', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-text')).toBeInTheDocument()
    })

    it('renders text hint when checked and hint provided', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              textHint="Please provide details"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Please provide details')).toBeInTheDocument()
    })

    it('renders character count when checked and text has content', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: 'Some text' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              textMaxLength={200}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('9 / 200')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Text required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Text required')
    })
  })

  describe('checkbox interaction', () => {
    it('toggles checkbox when clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      const checkbox = screen.getByTestId('other-checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('shows text input after checking', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('other-text')).not.toBeInTheDocument()

      const checkbox = screen.getByTestId('other-checkbox')
      await user.click(checkbox)

      expect(screen.getByTestId('other-text')).toBeInTheDocument()
    })

    it('hides text input after unchecking', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: 'some text' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-text')).toBeInTheDocument()

      const checkbox = screen.getByTestId('other-checkbox')
      await user.click(checkbox)

      expect(screen.queryByTestId('other-text')).not.toBeInTheDocument()
    })
  })

  describe('text input interaction', () => {
    it('updates text when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      const textInput = screen.getByTestId('other-text')
      await user.type(textInput, 'My additional notes')

      expect(textInput).toHaveValue('My additional notes')
    })

    it('shows placeholder text', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              textPlaceholder="Enter your notes"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Enter your notes')).toBeInTheDocument()
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              textMaxLength={100}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      const textInput = screen.getByTestId('other-text')
      expect(textInput).toHaveAttribute('maxLength', '100')
    })
  })

  describe('disabled state', () => {
    it('disables checkbox when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-checkbox')).toBeDisabled()
    })

    it('disables text input when disabled', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-text')).toBeDisabled()
    })
  })

  describe('textRequired', () => {
    it('sets aria-required on text input when textRequired is true', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              textRequired
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-text')).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              label="My Option"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Option' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
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

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper defaultValues={{ other: { checked: true, text: '' } }}>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Error' }}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other-checkbox')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('other-text')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <CheckboxWithTextField
              id="other"
              name="other"
              checkboxLabel="Check me"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="other"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('other')).toHaveClass('custom-class')
    })
  })
})
