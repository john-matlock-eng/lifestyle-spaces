/**
 * Tests for TextField Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { TextField } from '../text/TextField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  username: string
  email: string
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

describe('TextField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              placeholder="Enter username"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              description="Choose a unique username"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Choose a unique username')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders character count when showCharCount is true', () => {
      render(
        <TestWrapper defaultValues={{ username: 'test' }}>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              maxLength={20}
              showCharCount
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('4/20')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Username is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Username is required')
    })
  })

  describe('states', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              disabled
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toBeDisabled()
    })

    it('sets readOnly when readOnly prop is true', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              readOnly
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toHaveAttribute('readonly')
    })
  })

  describe('input types', () => {
    it('renders text input by default', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toHaveAttribute('type', 'text')
    })

    it('renders email input', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="email"
              name="email"
              label="Email"
              inputType="email"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    })

    it('renders password input', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="password"
              name="username"
              label="Password"
              inputType="password"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    })

    it('connects error message via aria-describedby', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByLabelText('Username')
      const errorId = input.getAttribute('aria-describedby')
      expect(errorId).toContain('error')
    })

    it('uses ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              ariaLabel="Custom aria label"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Custom aria label')).toBeInTheDocument()
    })
  })

  describe('character count', () => {
    it('shows warning class when near limit', () => {
      render(
        <TestWrapper defaultValues={{ username: '1234567890123456789' }}>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              maxLength={20}
              showCharCount
              register={register}
              watch={watch}
              testId="username-field"
            />
          )}
        </TestWrapper>
      )

      const charCount = screen.getByText('19/20')
      expect(charCount).toHaveClass('field-char-count--warning')
    })

    it('shows error class when at or over limit', () => {
      render(
        <TestWrapper defaultValues={{ username: '12345678901234567890' }}>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              maxLength={20}
              showCharCount
              register={register}
              watch={watch}
              testId="username-field"
            />
          )}
        </TestWrapper>
      )

      const charCount = screen.getByText('20/20')
      expect(charCount).toHaveClass('field-char-count--error')
    })
  })

  describe('user interaction', () => {
    it('allows typing in the input', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      const input = screen.getByLabelText('Username')
      await user.type(input, 'testuser')

      expect(input).toHaveValue('testuser')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
              testId="username-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('username-field')).toBeInTheDocument()
    })

    it('applies testId to input with -input suffix', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              register={register}
              watch={watch}
              testId="username-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('username-field-input')).toBeInTheDocument()
    })
  })

  describe('autocomplete', () => {
    it('sets autocomplete attribute', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="email"
              name="email"
              label="Email"
              autoComplete="email"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <TextField
              id="username"
              name="username"
              label="Username"
              className="custom-class"
              register={register}
              watch={watch}
              testId="username-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('username-field')).toHaveClass('custom-class')
    })
  })
})
