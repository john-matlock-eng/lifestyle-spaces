/**
 * Tests for SliderField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { SliderField } from '../slider/SliderField'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  rating: number
}

function TestWrapper({
  children,
  defaultValues = { rating: 5 },
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

describe('SliderField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Rating')).toBeInTheDocument()
    })

    it('renders with min and max labels', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              minLabel="Poor"
              maxLabel="Excellent"
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Poor')).toBeInTheDocument()
      expect(screen.getByText('Excellent')).toBeInTheDocument()
    })

    it('renders current value when showValue is true', () => {
      render(
        <TestWrapper defaultValues={{ rating: 7 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              showValue
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('renders formatted value with formatValue function', () => {
      render(
        <TestWrapper defaultValues={{ rating: 7 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              showValue
              formatValue={(val) => `${val} stars`}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('7 stars')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              description="Choose a rating from 1 to 10"
              min={1}
              max={10}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Choose a rating from 1 to 10')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Rating is required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Rating is required')
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disables slider when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              disabled
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Rating')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('sets aria-required when required', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              required
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Rating')).toHaveAttribute('aria-required', 'true')
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              error={{ type: 'required', message: 'Required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Rating')).toHaveAttribute('aria-invalid', 'true')
    })

    it('sets aria-valuemin, aria-valuemax, and aria-valuenow', () => {
      render(
        <TestWrapper defaultValues={{ rating: 7 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      expect(slider).toHaveAttribute('aria-valuemin', '1')
      expect(slider).toHaveAttribute('aria-valuemax', '10')
      expect(slider).toHaveAttribute('aria-valuenow', '7')
    })

    it('sets aria-valuetext with formatted value', () => {
      render(
        <TestWrapper defaultValues={{ rating: 7 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              formatValue={(val) => `${val} stars`}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Rating')).toHaveAttribute('aria-valuetext', '7 stars')
    })

    it('uses ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              ariaLabel="Custom aria label"
              min={1}
              max={10}
              register={register}
              watch={watch}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByLabelText('Custom aria label')).toBeInTheDocument()
    })
  })

  describe('keyboard navigation', () => {
    it('handles Home key to go to min value', () => {
      const setValueMock = vi.fn()
      render(
        <TestWrapper defaultValues={{ rating: 5 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      fireEvent.keyDown(slider, { key: 'Home' })

      expect(setValueMock).toHaveBeenCalledWith('rating', 1, { shouldValidate: true })
    })

    it('handles End key to go to max value', () => {
      const setValueMock = vi.fn()
      render(
        <TestWrapper defaultValues={{ rating: 5 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      fireEvent.keyDown(slider, { key: 'End' })

      expect(setValueMock).toHaveBeenCalledWith('rating', 10, { shouldValidate: true })
    })

    it('handles PageUp key to increase by step * 10', () => {
      const setValueMock = vi.fn()
      render(
        <TestWrapper defaultValues={{ rating: 5 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={100}
              step={1}
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      fireEvent.keyDown(slider, { key: 'PageUp' })

      expect(setValueMock).toHaveBeenCalledWith('rating', 15, { shouldValidate: true })
    })

    it('handles PageDown key to decrease by step * 10', () => {
      const setValueMock = vi.fn()
      render(
        <TestWrapper defaultValues={{ rating: 50 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={100}
              step={1}
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      fireEvent.keyDown(slider, { key: 'PageDown' })

      expect(setValueMock).toHaveBeenCalledWith('rating', 40, { shouldValidate: true })
    })

    it('does not handle keyboard events when disabled', () => {
      const setValueMock = vi.fn()
      render(
        <TestWrapper defaultValues={{ rating: 5 }}>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              disabled
              register={register}
              watch={watch}
              setValue={setValueMock}
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Rating')
      fireEvent.keyDown(slider, { key: 'Home' })

      expect(setValueMock).not.toHaveBeenCalled()
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              testId="rating-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-field')).toBeInTheDocument()
    })

    it('applies testId to input with -input suffix', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              testId="rating-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-field-input')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch }) => (
            <SliderField
              id="rating"
              name="rating"
              label="Rating"
              min={1}
              max={10}
              className="custom-class"
              register={register}
              watch={watch}
              testId="rating-field"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-field')).toHaveClass('custom-class')
    })
  })
})
