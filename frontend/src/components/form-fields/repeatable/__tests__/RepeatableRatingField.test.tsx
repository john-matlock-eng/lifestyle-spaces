/**
 * Tests for RepeatableRatingField Component
 */

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { RepeatableRatingField } from '../RepeatableRatingField'
import type { RepeatableRatingValue, RatingItemDefinition } from '../../types'

interface TestFormData {
  valueRatings: RepeatableRatingValue
}

function TestWrapper({
  children,
  defaultValues,
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

const defaultRatingItems: RatingItemDefinition[] = [
  { key: 'integrity', prompt: 'I acted with integrity' },
  { key: 'excellence', prompt: 'I pursued excellence' },
  { key: 'teamwork', prompt: 'I collaborated effectively' },
]

describe('RepeatableRatingField', () => {
  describe('rendering', () => {
    it('renders with label', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Value Alignment')).toBeInTheDocument()
    })

    it('renders with description', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              description="Rate your alignment with each value"
              ratingItems={defaultRatingItems}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('Rate your alignment with each value')).toBeInTheDocument()
    })

    it('renders required indicator', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              required
              ratingItems={defaultRatingItems}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('renders all rating items', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('I acted with integrity')).toBeInTheDocument()
        expect(screen.getByText('I pursued excellence')).toBeInTheDocument()
        expect(screen.getByText('I collaborated effectively')).toBeInTheDocument()
      })
    })

    it('renders error message', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              error={{ type: 'required', message: 'Please complete all ratings' }}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toHaveTextContent('Please complete all ratings')
    })

    it('applies custom className', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              className="custom-class"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByTestId('value-ratings')).toHaveClass('custom-class')
    })
  })

  describe('rating sliders', () => {
    it('renders slider for each item', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-slider')).toBeInTheDocument()
        expect(screen.getByTestId('value-ratings-item-1-slider')).toBeInTheDocument()
        expect(screen.getByTestId('value-ratings-item-2-slider')).toBeInTheDocument()
      })
    })

    it('uses default min/max values', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('min', '1')
        expect(slider).toHaveAttribute('max', '10')
      })
    })

    it('uses custom min/max values', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              min={0}
              max={100}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('min', '0')
        expect(slider).toHaveAttribute('max', '100')
      })
    })

    it('updates rating when slider changes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-slider')).toBeInTheDocument()
      })

      const slider = screen.getByTestId('value-ratings-item-0-slider')
      fireEvent.change(slider, { target: { value: '8' } })

      expect(slider).toHaveValue('8')
    })

    it('displays min and max labels', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              minLabel="Low"
              maxLabel="High"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getAllByText('Low').length).toBeGreaterThan(0)
        expect(screen.getAllByText('High').length).toBeGreaterThan(0)
      })
    })

    it('uses numeric min/max when labels not provided', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              min={1}
              max={10}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        // Should show "1" and "10" as labels
        expect(screen.getAllByText('1').length).toBeGreaterThan(0)
        expect(screen.getAllByText('10').length).toBeGreaterThan(0)
      })
    })
  })

  describe('evidence textareas', () => {
    it('renders evidence textarea when showEvidence is true', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-evidence')).toBeInTheDocument()
      })
    })

    it('hides evidence textarea when showEvidence is false', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence={false}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('value-ratings-item-0-evidence')).not.toBeInTheDocument()
    })

    it('uses custom evidence prompt', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              evidencePrompt="What actions support this rating?"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getAllByText('What actions support this rating?').length).toBe(3)
      })
    })

    it('uses custom evidence placeholder', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              evidencePlaceholder="Enter your evidence here..."
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const textarea = screen.getByTestId('value-ratings-item-0-evidence')
        expect(textarea).toHaveAttribute('placeholder', 'Enter your evidence here...')
      })
    })

    it('enforces max length on evidence', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              evidenceMaxLength={100}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const textarea = screen.getByTestId('value-ratings-item-0-evidence')
        expect(textarea).toHaveAttribute('maxlength', '100')
      })
    })

    it('updates evidence when typing', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-evidence')).toBeInTheDocument()
      })

      const textarea = screen.getByTestId('value-ratings-item-0-evidence')
      await user.type(textarea, 'I helped a colleague today')

      expect(textarea).toHaveValue('I helped a colleague today')
    })

    it('shows character count for evidence', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              evidenceMaxLength={300}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-evidence')).toBeInTheDocument()
      })

      const textarea = screen.getByTestId('value-ratings-item-0-evidence')
      await user.type(textarea, 'test')

      // Should show character count
      expect(screen.getByText('4 / 300')).toBeInTheDocument()
    })
  })

  describe('default values', () => {
    it('uses defaultRating from rating items', async () => {
      const itemsWithDefaults: RatingItemDefinition[] = [
        { key: 'integrity', prompt: 'I acted with integrity', defaultRating: 8 },
      ]

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={itemsWithDefaults}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveValue('8')
      })
    })

    it('uses defaultEvidence from rating items', async () => {
      const itemsWithDefaults: RatingItemDefinition[] = [
        {
          key: 'integrity',
          prompt: 'I acted with integrity',
          defaultEvidence: 'I always tell the truth',
        },
      ]

      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              ratingItems={itemsWithDefaults}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const textarea = screen.getByTestId('value-ratings-item-0-evidence')
        expect(textarea).toHaveValue('I always tell the truth')
      })
    })

    it('uses middle value when no defaultRating', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              min={1}
              max={10}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        // Middle of 1-10 is 6 (ceil((1+10)/2))
        expect(slider).toHaveValue('6')
      })
    })
  })

  describe('disabled state', () => {
    it('disables all sliders when disabled', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              disabled
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-slider')).toBeDisabled()
        expect(screen.getByTestId('value-ratings-item-1-slider')).toBeDisabled()
        expect(screen.getByTestId('value-ratings-item-2-slider')).toBeDisabled()
      })
    })

    it('disables all textareas when disabled', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              disabled
              showEvidence
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings-item-0-evidence')).toBeDisabled()
        expect(screen.getByTestId('value-ratings-item-1-evidence')).toBeDisabled()
        expect(screen.getByTestId('value-ratings-item-2-evidence')).toBeDisabled()
      })
    })
  })

  describe('accessibility', () => {
    it('has proper aria-label on rating group', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Value Alignment')
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ariaLabel="Custom value ratings"
              ratingItems={defaultRatingItems}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Custom value ratings')
    })

    it('has proper aria attributes on sliders', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              min={1}
              max={10}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('aria-label', 'Rating for: I acted with integrity')
        expect(slider).toHaveAttribute('aria-valuemin', '1')
        expect(slider).toHaveAttribute('aria-valuemax', '10')
        expect(slider).toHaveAttribute('aria-valuenow', '6') // Default middle value
      })
    })

    it('has proper aria-label on evidence textareas', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const textarea = screen.getByTestId('value-ratings-item-0-evidence')
        expect(textarea).toHaveAttribute('aria-label', 'Evidence for: I acted with integrity')
      })
    })

    it('sets aria-invalid when error exists', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              error={{ type: 'required', message: 'Required' }}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('aria-invalid', 'true')

        const textarea = screen.getByTestId('value-ratings-item-0-evidence')
        expect(textarea).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  describe('step configuration', () => {
    it('uses default step of 1', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('step', '1')
      })
    })

    it('uses custom step value', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              step={0.5}
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        const slider = screen.getByTestId('value-ratings-item-0-slider')
        expect(slider).toHaveAttribute('step', '0.5')
      })
    })
  })

  describe('testId', () => {
    it('applies testId to all elements', async () => {
      render(
        <TestWrapper>
          {({ register, watch, setValue }) => (
            <RepeatableRatingField
              id="valueRatings"
              name="valueRatings"
              label="Value Alignment"
              showEvidence
              ratingItems={defaultRatingItems}
              testId="value-ratings"
              register={register}
              watch={watch}
              setValue={setValue}
            />
          )}
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('value-ratings')).toBeInTheDocument()
        expect(screen.getByTestId('value-ratings-item-0')).toBeInTheDocument()
        expect(screen.getByTestId('value-ratings-item-0-slider')).toBeInTheDocument()
        expect(screen.getByTestId('value-ratings-item-0-evidence')).toBeInTheDocument()
      })
    })
  })
})
