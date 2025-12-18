/**
 * Tests for SignatureField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { SignatureField } from '../signature/SignatureField'
import type { SignatureValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  commitment: SignatureValue
}

function TestWrapper({
  children,
  defaultValues = { commitment: { signature: '', timestamp: '' } },
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

describe('SignatureField', () => {

  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              label="Your Commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Your Commitment')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              description="Sign to confirm"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Sign to confirm')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              label="Signature"
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

    it('renders signature input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-input')).toBeInTheDocument()
    })

    it('renders framing text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              framingText="I commit to following this plan."
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I commit to following this plan.')).toBeInTheDocument()
    })

    it('renders default framing text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('I commit to the above.')).toBeInTheDocument()
    })

    it('renders placeholder text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              signaturePlaceholder="Type your name"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Type your name')).toBeInTheDocument()
    })

    it('renders default placeholder', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Type your full name to sign')).toBeInTheDocument()
    })

    it('renders signature line', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(document.querySelector('.field-signature-line')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Signature is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Signature is required')
    })
  })

  describe('signature input interaction', () => {
    it('updates signature when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByTestId('signature-input')
      await user.type(input, 'John Doe')

      expect(input).toHaveValue('John Doe')
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              signatureMaxLength={50}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-input')).toHaveAttribute('maxLength', '50')
    })
  })

  describe('timestamp', () => {
    it('shows timestamp when signed and showTimestamp is true', () => {
      render(
        <TestWrapper defaultValues={{ commitment: { signature: 'John Doe', timestamp: '2024-06-15T10:30:00Z' } }}>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              showTimestamp
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-timestamp')).toBeInTheDocument()
    })

    it('does not show timestamp when showTimestamp is false', () => {
      render(
        <TestWrapper defaultValues={{ commitment: { signature: 'John Doe', timestamp: '2024-06-15T10:30:00Z' } }}>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              showTimestamp={false}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('signature-timestamp')).not.toBeInTheDocument()
    })

    it('does not show timestamp when not signed', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              showTimestamp
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByTestId('signature-timestamp')).not.toBeInTheDocument()
    })
  })

  describe('signature status', () => {
    it('shows signed status with name when signed', () => {
      render(
        <TestWrapper defaultValues={{ commitment: { signature: 'John Doe', timestamp: '2024-06-15T10:30:00Z' } }}>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Signed by:')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('does not show signed status when not signed', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.queryByText('Signed by:')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('disables input when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-input')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              label="My Signature"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Signature' })).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              ariaLabel="Custom signature label"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'Custom signature label' })).toBeInTheDocument()
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'required', message: 'Required' }}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-input')).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-label on input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature-input')).toHaveAttribute('aria-label', 'Signature')
    })

    it('has aria-live on status for screen readers', () => {
      render(
        <TestWrapper defaultValues={{ commitment: { signature: 'John', timestamp: '2024-06-15T10:30:00Z' } }}>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      const status = document.querySelector('.field-signature-status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <SignatureField
              id="commitment"
              name="commitment"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="signature"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('signature')).toHaveClass('custom-class')
    })
  })
})
