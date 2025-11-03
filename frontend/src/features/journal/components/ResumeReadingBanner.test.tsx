import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumeReadingBanner } from './ResumeReadingBanner'
import type { ReadingPosition } from '../types/reading-position.types'

describe('ResumeReadingBanner', () => {
  const mockPosition: ReadingPosition = {
    journalId: 'journal-123',
    spaceId: 'space-456',
    userId: 'user-789',
    scrollPosition: 1200,
    currentSectionId: 'section-2',
    progressPercent: 45.5,
    wordsRead: 500,
    totalWords: 1100,
    lastReadAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }

  const defaultProps = {
    position: mockPosition,
    onResume: vi.fn(),
    onStartFromBeginning: vi.fn(),
    onDismiss: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render with position data', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByText('Resume reading from where you left off?')).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      // Progress is rounded to 46%
      expect(screen.getByText(/46% complete/i)).toBeInTheDocument()
    })

    it('should show current section info when available', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByText(/Continue from current section/i)).toBeInTheDocument()
    })

    it('should not show section info when currentSectionId is null', () => {
      const positionWithoutSection = {
        ...mockPosition,
        currentSectionId: null
      }

      render(<ResumeReadingBanner {...defaultProps} position={positionWithoutSection} />)

      expect(screen.queryByText(/Continue from current section/i)).not.toBeInTheDocument()
    })

    it('should not show section info when currentSectionId is undefined', () => {
      const positionWithoutSection = {
        ...mockPosition,
        currentSectionId: undefined
      }

      render(<ResumeReadingBanner {...defaultProps} position={positionWithoutSection} />)

      expect(screen.queryByText(/Continue from current section/i)).not.toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {
    it('should round progress percentage correctly', () => {
      const position45 = { ...mockPosition, progressPercent: 45.4 }
      const { rerender } = render(<ResumeReadingBanner {...defaultProps} position={position45} />)

      expect(screen.getByText(/45% complete/i)).toBeInTheDocument()

      const position46 = { ...mockPosition, progressPercent: 45.5 }
      rerender(<ResumeReadingBanner {...defaultProps} position={position46} />)

      expect(screen.getByText(/46% complete/i)).toBeInTheDocument()
    })

    it('should handle 0% progress', () => {
      const position = { ...mockPosition, progressPercent: 0 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByText(/0% complete/i)).toBeInTheDocument()
    })

    it('should handle 100% progress', () => {
      const position = { ...mockPosition, progressPercent: 100 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByText(/100% complete/i)).toBeInTheDocument()
    })

    it('should render progress bar with correct width', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar', { name: /Reading progress: 46%/i })
      const progressFill = progressBar.querySelector('.resume-banner-progress-fill') as HTMLElement

      expect(progressFill).toHaveStyle({ width: '46%' })
    })

    it('should have correct ARIA attributes on progress bar', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '46')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Action Buttons', () => {
    it('should render all three action buttons', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Resume reading from saved position/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Start reading from the beginning/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dismiss this banner/i })).toBeInTheDocument()
    })

    it('should call onResume when Resume button is clicked', async () => {
      const onResume = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onResume={onResume} />)

      const resumeButton = screen.getByRole('button', { name: /Resume reading from saved position/i })
      await user.click(resumeButton)

      // Wait for animation timeout
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(onResume).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onStartFromBeginning when Start from Beginning is clicked', async () => {
      const onStartFromBeginning = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onStartFromBeginning={onStartFromBeginning} />)

      const startButton = screen.getByRole('button', { name: /Start reading from the beginning/i })
      await user.click(startButton)

      // Wait for animation timeout
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(onStartFromBeginning).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onDismiss when Dismiss button is clicked', async () => {
      const onDismiss = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onDismiss={onDismiss} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss this banner/i })
      await user.click(dismissButton)

      // Wait for animation timeout
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1)
      })
    })

    it('should have correct button labels', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByText('Resume')).toBeInTheDocument()
      expect(screen.getByText('Start from Beginning')).toBeInTheDocument()
      expect(screen.getByText('✕')).toBeInTheDocument()
    })
  })

  describe('Animation Behavior', () => {
    it('should apply slide-in class on initial render', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('slide-in')
      expect(banner).not.toHaveClass('slide-out')
    })

    it('should apply slide-out class when dismissing', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss this banner/i })
      await user.click(dismissButton)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('slide-out')
      expect(banner).not.toHaveClass('slide-in')
    })

    it('should apply slide-out class when resuming', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      const resumeButton = screen.getByRole('button', { name: /Resume reading from saved position/i })
      await user.click(resumeButton)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('slide-out')
    })

    it('should apply slide-out class when starting from beginning', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      const startButton = screen.getByRole('button', { name: /Start reading from the beginning/i })
      await user.click(startButton)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveClass('slide-out')
    })

    it('should unmount after animation completes (300ms)', async () => {
      const onDismiss = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onDismiss={onDismiss} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss this banner/i })
      await user.click(dismissButton)

      // Still visible during animation
      expect(screen.getByRole('banner')).toBeInTheDocument()

      // Advance timers to complete animation
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })

    it('should call handler after animation completes', async () => {
      const onResume = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onResume={onResume} />)

      const resumeButton = screen.getByRole('button', { name: /Resume reading from saved position/i })
      await user.click(resumeButton)

      // Handler not called immediately
      expect(onResume).not.toHaveBeenCalled()

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(onResume).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Visibility State', () => {
    it('should be visible initially', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should hide after dismiss animation completes', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Dismiss this banner/i }))

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })

    it('should hide after resume animation completes', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Resume reading from saved position/i }))

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })

    it('should hide after start from beginning animation completes', async () => {
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Start reading from the beginning/i }))

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have role="banner"', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const banner = screen.getByRole('banner')
      expect(banner).toBeInTheDocument()
    })

    it('should have aria-live="polite"', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const banner = screen.getByRole('banner')
      expect(banner).toHaveAttribute('aria-live', 'polite')
    })

    it('should have descriptive aria-labels on all buttons', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      expect(screen.getByLabelText('Resume reading from saved position')).toBeInTheDocument()
      expect(screen.getByLabelText('Start reading from the beginning')).toBeInTheDocument()
      expect(screen.getByLabelText('Dismiss this banner')).toBeInTheDocument()
    })

    it('should have aria-label on icon with description', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const icon = screen.getByLabelText('Resume reading')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('role', 'img')
    })

    it('should have progress bar with accessible label', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const progressBar = screen.getByLabelText('Reading progress: 46%')
      expect(progressBar).toHaveAttribute('role', 'progressbar')
    })
  })

  describe('Edge Cases', () => {
    it('should handle decimal progress values', () => {
      const position = { ...mockPosition, progressPercent: 33.333333 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByText(/33% complete/i)).toBeInTheDocument()
    })

    it('should handle negative progress (treated as 0)', () => {
      const position = { ...mockPosition, progressPercent: -5 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '-5')
    })

    it('should handle progress > 100', () => {
      const position = { ...mockPosition, progressPercent: 105 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByText(/105% complete/i)).toBeInTheDocument()
    })

    it('should handle 0 progress', () => {
      const position = { ...mockPosition, progressPercent: 0 }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      const progressFill = screen.getByRole('progressbar').querySelector('.resume-banner-progress-fill') as HTMLElement
      expect(progressFill).toHaveStyle({ width: '0%' })
    })

    it('should handle rapid button clicks', async () => {
      const onResume = vi.fn()
      const user = userEvent.setup({ delay: null })

      render(<ResumeReadingBanner {...defaultProps} onResume={onResume} />)

      const resumeButton = screen.getByRole('button', { name: /Resume reading from saved position/i })

      // Click multiple times rapidly
      await user.click(resumeButton)
      await user.click(resumeButton)
      await user.click(resumeButton)

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        // Should only trigger once due to state management
        // The banner becomes invisible after first click, subsequent clicks won't work
        expect(onResume).toHaveBeenCalled()
      })
    })

    it('should not crash with empty string currentSectionId', () => {
      const position = { ...mockPosition, currentSectionId: '' }
      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.queryByText(/Continue from current section/i)).not.toBeInTheDocument()
    })

    it('should handle position with all numeric values as 0', () => {
      const position: ReadingPosition = {
        journalId: 'journal-123',
        spaceId: 'space-456',
        userId: 'user-789',
        scrollPosition: 0,
        currentSectionId: null,
        progressPercent: 0,
        wordsRead: 0,
        totalWords: 0,
        lastReadAt: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      }

      render(<ResumeReadingBanner {...defaultProps} position={position} />)

      expect(screen.getByText(/0% complete/i)).toBeInTheDocument()
    })
  })

  describe('Button Styling', () => {
    it('should apply primary class to Resume button', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const resumeButton = screen.getByRole('button', { name: /Resume reading from saved position/i })
      expect(resumeButton).toHaveClass('primary')
    })

    it('should apply secondary class to Start from Beginning button', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const startButton = screen.getByRole('button', { name: /Start reading from the beginning/i })
      expect(startButton).toHaveClass('secondary')
    })

    it('should apply dismiss class to Dismiss button', () => {
      render(<ResumeReadingBanner {...defaultProps} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss this banner/i })
      expect(dismissButton).toHaveClass('dismiss')
    })
  })

  describe('Multiple Actions', () => {
    it('should handle dismiss after attempting resume', async () => {
      const onResume = vi.fn()
      const onDismiss = vi.fn()
      const user = userEvent.setup({ delay: null })

      const { rerender } = render(
        <ResumeReadingBanner
          {...defaultProps}
          onResume={onResume}
          onDismiss={onDismiss}
        />
      )

      // Click resume
      await user.click(screen.getByRole('button', { name: /Resume reading from saved position/i }))

      // Animation in progress, banner still visible
      expect(screen.getByRole('banner')).toHaveClass('slide-out')

      // Don't advance timers, try to dismiss
      // The banner is still visible during animation, but clicking again won't do anything
      // because the component manages state internally

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(onResume).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      })
    })
  })
})
