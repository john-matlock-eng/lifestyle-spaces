/**
 * Tests for RatingWithEvidenceField Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { RatingWithEvidenceField } from '../rating-with-evidence/RatingWithEvidenceField'
import type { RatingWithEvidenceValue } from '../types'

// Wrapper component to provide React Hook Form context
interface TestFormData {
  rating: RatingWithEvidenceValue
}

function TestWrapper({
  children,
  defaultValues = { rating: { rating: 5, evidence: '' } },
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

describe('RatingWithEvidenceField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              label="Confidence Level"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Confidence Level')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              description="Rate your confidence"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Rate your confidence')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              label="Rating"
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

    it('renders slider input', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-slider')).toBeInTheDocument()
    })

    it('renders evidence textarea', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-evidence')).toBeInTheDocument()
    })

    it('renders evidence prompt', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              evidencePrompt="What supports this rating?"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('What supports this rating?')).toBeInTheDocument()
    })

    it('renders default evidence prompt', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('What evidence supports this rating?')).toBeInTheDocument()
    })

    it('renders min and max labels', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              minLabel="Low"
              maxLabel="High"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('renders numeric min and max when no labels provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('renders current value display', () => {
      render(
        <TestWrapper defaultValues={{ rating: { rating: 7, evidence: '' } }}>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('renders character count', () => {
      render(
        <TestWrapper defaultValues={{ rating: { rating: 5, evidence: 'Some evidence' } }}>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              evidenceMaxLength={500}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('13 / 500')).toBeInTheDocument()
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Evidence required' }}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Evidence required')
    })
  })

  describe('slider interaction', () => {
    it('updates rating when slider changes', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByTestId('rating-slider')
      fireEvent.change(slider, { target: { value: '8' } })

      expect(slider).toHaveValue('8')
    })

    it('respects min and max values', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              min={1}
              max={5}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByTestId('rating-slider')
      expect(slider).toHaveAttribute('min', '1')
      expect(slider).toHaveAttribute('max', '5')
    })

    it('respects step value', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              step={0.5}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByTestId('rating-slider')
      expect(slider).toHaveAttribute('step', '0.5')
    })
  })

  describe('evidence textarea interaction', () => {
    it('updates evidence when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const textarea = screen.getByTestId('rating-evidence')
      await user.type(textarea, 'My evidence')

      expect(textarea).toHaveValue('My evidence')
    })

    it('shows placeholder text', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              evidencePlaceholder="Enter evidence here"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Enter evidence here')).toBeInTheDocument()
    })

    it('respects maxLength', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              evidenceMaxLength={100}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const textarea = screen.getByTestId('rating-evidence')
      expect(textarea).toHaveAttribute('maxLength', '100')
    })
  })

  describe('disabled state', () => {
    it('disables slider and textarea when disabled', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              disabled
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-slider')).toBeDisabled()
      expect(screen.getByTestId('rating-evidence')).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has proper role and aria-label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              label="My Rating"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group', { name: 'My Rating' })).toBeInTheDocument()
    })

    it('sets aria-invalid when error exists', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              error={{ type: 'validate', message: 'Error' }}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating-slider')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByTestId('rating-evidence')).toHaveAttribute('aria-invalid', 'true')
    })

    it('has aria-valuemin, aria-valuemax, aria-valuenow on slider', () => {
      render(
        <TestWrapper defaultValues={{ rating: { rating: 7, evidence: '' } }}>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              min={1}
              max={10}
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      const slider = screen.getByTestId('rating-slider')
      expect(slider).toHaveAttribute('aria-valuemin', '1')
      expect(slider).toHaveAttribute('aria-valuemax', '10')
      expect(slider).toHaveAttribute('aria-valuenow', '7')
    })
  })

  describe('testId', () => {
    it('applies testId to container', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating')).toBeInTheDocument()
    })
  })

  describe('className', () => {
    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RatingWithEvidenceField
              id="rating"
              name="rating"
              register={register}
              watch={watch}
              setValue={setValue}
              className="custom-class"
              testId="rating"
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('rating')).toHaveClass('custom-class')
    })
  })
})
