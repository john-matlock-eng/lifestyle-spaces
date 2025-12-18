/**
 * NumberField Component Tests
 *
 * @module form-fields/number/__tests__/NumberField.test
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import { NumberField } from '../NumberField'

// Test wrapper component
function TestWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode
  defaultValues?: Record<string, unknown>
}) {
  const methods = useForm({ defaultValues })
  return <FormProvider {...methods}>{children}</FormProvider>
}

function renderWithForm(ui: React.ReactElement, defaultValues = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper defaultValues={defaultValues}>{children}</TestWrapper>
  )
  return render(ui, { wrapper: Wrapper })
}

describe('NumberField', () => {
  const defaultProps = {
    id: 'test-number',
    name: 'testNumber' as const,
    label: 'Test Number',
    register: vi.fn().mockReturnValue({}),
  }

  it('renders with label', () => {
    renderWithForm(<NumberField {...defaultProps} />)
    expect(screen.getByLabelText('Test Number')).toBeInTheDocument()
  })

  it('shows required indicator when required', () => {
    renderWithForm(<NumberField {...defaultProps} required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('shows description when provided', () => {
    renderWithForm(
      <NumberField {...defaultProps} description="Enter a number between 1 and 10" />
    )
    expect(screen.getByText('Enter a number between 1 and 10')).toBeInTheDocument()
  })

  it('shows error message when error provided', () => {
    renderWithForm(
      <NumberField
        {...defaultProps}
        error={{ type: 'min', message: 'Value is too low' }}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Value is too low')
  })

  it('respects min and max attributes', () => {
    renderWithForm(<NumberField {...defaultProps} min={1} max={13} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '13')
  })

  it('respects step attribute', () => {
    renderWithForm(<NumberField {...defaultProps} step={0.5} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('step', '0.5')
  })

  it('is disabled when disabled prop is true', () => {
    renderWithForm(<NumberField {...defaultProps} disabled />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })

  it('is readonly when readOnly prop is true', () => {
    renderWithForm(<NumberField {...defaultProps} readOnly />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('readonly')
  })

  it('shows range hint when min/max provided', () => {
    renderWithForm(<NumberField {...defaultProps} min={1} max={13} />)
    expect(screen.getByText('Value between 1 and 13')).toBeInTheDocument()
  })

  it('shows min-only hint when only min provided', () => {
    renderWithForm(<NumberField {...defaultProps} min={1} />)
    expect(screen.getByText('Minimum: 1')).toBeInTheDocument()
  })

  it('shows max-only hint when only max provided', () => {
    renderWithForm(<NumberField {...defaultProps} max={100} />)
    expect(screen.getByText('Maximum: 100')).toBeInTheDocument()
  })

  it('shows prefix when provided', () => {
    renderWithForm(<NumberField {...defaultProps} prefix="$" />)
    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('shows suffix when provided', () => {
    renderWithForm(<NumberField {...defaultProps} suffix="%" />)
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('renders increment/decrement buttons when showButtons is true', () => {
    renderWithForm(<NumberField {...defaultProps} showButtons />)
    expect(screen.getByLabelText('Increase value')).toBeInTheDocument()
    expect(screen.getByLabelText('Decrease value')).toBeInTheDocument()
  })

  it('does not render buttons when showButtons is false', () => {
    renderWithForm(<NumberField {...defaultProps} showButtons={false} />)
    expect(screen.queryByLabelText('Increase value')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Decrease value')).not.toBeInTheDocument()
  })

  it('does not render buttons when readOnly even if showButtons is true', () => {
    renderWithForm(<NumberField {...defaultProps} showButtons readOnly />)
    expect(screen.queryByLabelText('Increase value')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Decrease value')).not.toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    renderWithForm(
      <NumberField
        {...defaultProps}
        required
        error={{ type: 'required', message: 'Required' }}
      />
    )
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('applies custom className', () => {
    const { container } = renderWithForm(
      <NumberField {...defaultProps} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('passes testId to container', () => {
    renderWithForm(<NumberField {...defaultProps} testId="my-number-field" />)
    expect(screen.getByTestId('my-number-field')).toBeInTheDocument()
  })

  it('does not show range hint when error is present', () => {
    renderWithForm(
      <NumberField
        {...defaultProps}
        min={1}
        max={13}
        error={{ type: 'min', message: 'Value is too low' }}
      />
    )
    expect(screen.queryByText('Value between 1 and 13')).not.toBeInTheDocument()
    expect(screen.getByText('Value is too low')).toBeInTheDocument()
  })

  it('calls register with valueAsNumber option', () => {
    const mockRegister = vi.fn().mockReturnValue({})
    renderWithForm(
      <NumberField {...defaultProps} register={mockRegister} />
    )
    expect(mockRegister).toHaveBeenCalledWith(
      'testNumber',
      expect.objectContaining({ valueAsNumber: true })
    )
  })

  it('calls register with validation rules when required', () => {
    const mockRegister = vi.fn().mockReturnValue({})
    renderWithForm(
      <NumberField {...defaultProps} register={mockRegister} required />
    )
    expect(mockRegister).toHaveBeenCalledWith(
      'testNumber',
      expect.objectContaining({
        required: 'This field is required',
        valueAsNumber: true,
      })
    )
  })

  it('calls register with min/max validation when provided', () => {
    const mockRegister = vi.fn().mockReturnValue({})
    renderWithForm(
      <NumberField {...defaultProps} register={mockRegister} min={1} max={10} />
    )
    expect(mockRegister).toHaveBeenCalledWith(
      'testNumber',
      expect.objectContaining({
        min: { value: 1, message: 'Minimum value is 1' },
        max: { value: 10, message: 'Maximum value is 10' },
        valueAsNumber: true,
      })
    )
  })
})
