/**
 * Tests for TextareaField Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { TextareaField } from '../textarea/TextareaField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  description: string
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

describe('TextareaField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              placeholder="Enter description"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()
    })

    it('renders with specified rows', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              rows={5}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveAttribute('rows', '5')
    })

    it('renders character count', () => {
      render(
        <TestWrapper defaultValues={{ description: 'test' }}>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              maxLength={100}
              showCharCount
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('4/100')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Description is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Description is required')
    })
  })

  describe('states', () => {
    it('disables textarea when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              disabled
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toBeDisabled()
    })

    it('sets readOnly when readOnly prop is true', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              readOnly
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveAttribute('readonly')
    })
  })

  describe('auto-resize', () => {
    it('applies auto-resize class when autoResize is true', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              autoResize
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveClass('field-textarea--autoresize')
    })

    it('applies maxHeight style when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              autoResize
              maxHeight={300}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveStyle({ maxHeight: '300px' })
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('user interaction', () => {
    it('allows typing in the textarea', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      const textarea = screen.getByLabelText('Description')
      await user.type(textarea, 'This is a test description')

      expect(textarea).toHaveValue('This is a test description')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
              testId="description-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('description-field')).toBeInTheDocument()
    })

    it('applies testId to input with -input suffix', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextareaField
              id="description"
              name="description"
              label="Description"
              register={register}
              watch={watch}
              testId="description-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('description-field-input')).toBeInTheDocument()
    })
  })
})
