import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionNavigator } from './SectionNavigator'
import type { UseReadingProgressReturn } from '../types/navigation.types'

// Mock the useReadingProgress hook
vi.mock('../hooks/useReadingProgress', () => ({
  useReadingProgress: vi.fn()
}))

import { useReadingProgress } from '../hooks/useReadingProgress'

describe('SectionNavigator', () => {
  const mockSections = [
    {
      id: 'intro',
      title: 'Introduction',
      type: 'prose',
      content: 'This is the introduction section with some content.'
    },
    {
      id: 'main',
      title: 'Main Content',
      type: 'prose',
      content: 'This is the main content section with more detailed information.'
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      type: 'prose',
      content: 'This is the conclusion section wrapping up the content.'
    }
  ]

  const mockContent = `
<!-- section:intro @title:"Introduction" @type:prose -->
This is the introduction section with some content.
<!-- /section:intro -->

<!-- section:main @title:"Main Content" @type:prose -->
This is the main content section with more detailed information.
<!-- /section:main -->

<!-- section:conclusion @title:"Conclusion" @type:prose -->
This is the conclusion section wrapping up the content.
<!-- /section:conclusion -->
  `

  const createMockReturn = (overrides?: Partial<UseReadingProgressReturn>): UseReadingProgressReturn => ({
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        type: 'prose',
        wordCount: 8,
        startOffset: 0,
        endOffset: 54,
        element: document.createElement('div')
      },
      {
        id: 'main',
        title: 'Main Content',
        type: 'prose',
        wordCount: 10,
        startOffset: 54,
        endOffset: 120,
        element: document.createElement('div')
      },
      {
        id: 'conclusion',
        title: 'Conclusion',
        type: 'prose',
        wordCount: 9,
        startOffset: 120,
        endOffset: 185,
        element: document.createElement('div')
      }
    ],
    sectionProgress: new Map([
      ['intro', { sectionId: 'intro', percentRead: 100, isVisible: false, isComplete: true }],
      ['main', { sectionId: 'main', percentRead: 45, isVisible: true, isComplete: false }],
      ['conclusion', { sectionId: 'conclusion', percentRead: 0, isVisible: false, isComplete: false }]
    ]),
    readingProgress: {
      currentSectionId: 'main',
      overallPercent: 48.15,
      sectionsComplete: 1,
      sectionsTotal: 3,
      estimatedMinutesRemaining: 2,
      totalWordCount: 27,
      wordsRead: 13
    },
    scrollToSection: vi.fn(),
    isInitialized: true,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render navigator with sections list when initialized', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByRole('navigation', { name: 'Journal section navigation' })).toBeInTheDocument()
      expect(screen.getByText('Contents')).toBeInTheDocument()
      expect(screen.getByText('Introduction')).toBeInTheDocument()
      expect(screen.getByText('Main Content')).toBeInTheDocument()
      expect(screen.getByText('Conclusion')).toBeInTheDocument()
    })

    it('should not render when show prop is false', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          show={false}
        />
      )

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should not render when sections array is empty', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({ sections: [] }))

      render(
        <SectionNavigator
          content=""
          sections={[]}
        />
      )

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })

    it('should not render until initialized', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({ isInitialized: false }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {
    it('should show circular progress indicator with correct percentage', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      // Progress percentage in SVG text element
      const progressText = screen.getByText('48')
      expect(progressText).toBeInTheDocument()

      // Check aria-label for complete percentage
      const progressCircle = screen.getByLabelText('48% complete')
      expect(progressCircle).toBeInTheDocument()
    })

    it('should display sections complete count', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('1 of 3 sections')).toBeInTheDocument()
    })

    it('should show estimated time remaining', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('2 min remaining')).toBeInTheDocument()
    })

    it('should show "Complete!" when time remaining is 0', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: null,
          overallPercent: 100,
          sectionsComplete: 3,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 0,
          totalWordCount: 27,
          wordsRead: 27
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('Complete!')).toBeInTheDocument()
    })

    it('should format time remaining for 1 minute', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: 'conclusion',
          overallPercent: 90,
          sectionsComplete: 2,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 1,
          totalWordCount: 27,
          wordsRead: 24
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('1 min remaining')).toBeInTheDocument()
    })

    it('should format time remaining for hours', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: 'intro',
          overallPercent: 5,
          sectionsComplete: 0,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 125,
          totalWordCount: 5000,
          wordsRead: 100
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('2 hr 5 min remaining')).toBeInTheDocument()
    })

    it('should format time remaining for exactly 1 hour', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: 'intro',
          overallPercent: 5,
          sectionsComplete: 0,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 60,
          totalWordCount: 5000,
          wordsRead: 100
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('1 hr remaining')).toBeInTheDocument()
    })
  })

  describe('Section Highlighting', () => {
    it('should highlight current section being read', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const currentSection = screen.getByRole('listitem', { current: 'location' })
      expect(currentSection).toHaveClass('current')
      expect(currentSection).toHaveTextContent('Main Content')
    })

    it('should show correct status icons for sections', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      // Find all section items
      const allButtons = screen.getAllByRole('listitem')

      // Complete section (intro) should have checkmark
      expect(allButtons[0]).toHaveTextContent('✓')

      // Current section (main) should have play icon
      expect(allButtons[1]).toHaveTextContent('▶')

      // Unread section (conclusion) should have circle
      expect(allButtons[2]).toHaveTextContent('○')
    })

    it('should mark completed sections with complete class', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const allButtons = screen.getAllByRole('listitem')
      expect(allButtons[0]).toHaveClass('complete')
      expect(allButtons[1]).not.toHaveClass('complete')
      expect(allButtons[2]).not.toHaveClass('complete')
    })
  })

  describe('Section Navigation', () => {
    it('should call scrollToSection when section is clicked', async () => {
      const mockScrollToSection = vi.fn()
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({ scrollToSection: mockScrollToSection }))

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const mainSection = screen.getByText('Main Content')
      await user.click(mainSection)

      expect(mockScrollToSection).toHaveBeenCalledWith('main')
    })

    it('should allow navigating to any section via click', async () => {
      const mockScrollToSection = vi.fn()
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({ scrollToSection: mockScrollToSection }))

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      await user.click(screen.getByText('Introduction'))
      expect(mockScrollToSection).toHaveBeenCalledWith('intro')

      await user.click(screen.getByText('Conclusion'))
      expect(mockScrollToSection).toHaveBeenCalledWith('conclusion')
    })
  })

  describe('Word Count Display', () => {
    it('should display word count for each section', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      // Check word counts with aria-label
      expect(screen.getByLabelText('8 words')).toBeInTheDocument()
      expect(screen.getByLabelText('10 words')).toBeInTheDocument()
      expect(screen.getByLabelText('9 words')).toBeInTheDocument()
    })

    it('should show total word count in footer', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('Total words:')).toBeInTheDocument()
      expect(screen.getByText('27')).toBeInTheDocument()
    })

    it('should show words read in footer', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('Words read:')).toBeInTheDocument()
      expect(screen.getByText('13')).toBeInTheDocument()
    })
  })

  describe('Progress Bars', () => {
    it('should render progress bar for each section', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(3)
    })

    it('should set correct aria attributes for progress bars', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')

      // First section (100% complete)
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '100')
      expect(progressBars[0]).toHaveAttribute('aria-valuemin', '0')
      expect(progressBars[0]).toHaveAttribute('aria-valuemax', '100')

      // Second section (45% complete)
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '45')

      // Third section (0% complete)
      expect(progressBars[2]).toHaveAttribute('aria-valuenow', '0')
    })

    it('should set correct width for progress fill', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const progressBars = screen.getAllByRole('progressbar')

      // Check fill widths
      const fill1 = progressBars[0].querySelector('.section-progress-fill') as HTMLElement
      expect(fill1).toHaveStyle({ width: '100%' })

      const fill2 = progressBars[1].querySelector('.section-progress-fill') as HTMLElement
      expect(fill2).toHaveStyle({ width: '45%' })

      const fill3 = progressBars[2].querySelector('.section-progress-fill') as HTMLElement
      expect(fill3).toHaveStyle({ width: '0%' })
    })
  })

  describe('Mobile Collapse/Expand', () => {
    it('should start collapsed on mobile when startCollapsedMobile is true', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={true}
        />
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('collapsed')

      const toggleButton = screen.getByLabelText('Open navigation')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should start expanded when startCollapsedMobile is false', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={false}
        />
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('expanded')

      const toggleButton = screen.getByLabelText('Close navigation')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should toggle collapsed state when toggle button is clicked', async () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={true}
        />
      )

      const toggleButton = screen.getByLabelText('Open navigation')
      await user.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation')).toBeInTheDocument()
      })

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('expanded')
    })

    it('should show backdrop when expanded on mobile', async () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={true}
        />
      )

      // Initially no backdrop (collapsed)
      expect(document.querySelector('.section-nav-backdrop')).not.toBeInTheDocument()

      // Expand
      await user.click(screen.getByLabelText('Open navigation'))

      // Backdrop should appear
      await waitFor(() => {
        expect(document.querySelector('.section-nav-backdrop')).toBeInTheDocument()
      })
    })

    it('should close navigation when backdrop is clicked', async () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={false}
        />
      )

      const backdrop = document.querySelector('.section-nav-backdrop') as HTMLElement
      expect(backdrop).toBeInTheDocument()

      await user.click(backdrop)

      await waitFor(() => {
        expect(screen.getByLabelText('Open navigation')).toBeInTheDocument()
      })
    })

    it('should change toggle button icon based on state', async () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={true}
        />
      )

      const toggleButton = screen.getByRole('button', { name: 'Open navigation' })
      expect(toggleButton).toHaveTextContent('📖')

      await user.click(toggleButton)

      await waitFor(() => {
        const expandedButton = screen.getByRole('button', { name: 'Close navigation' })
        expect(expandedButton).toHaveTextContent('✕')
      })
    })
  })

  describe('Position Variants', () => {
    it('should render on right side by default', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('right')
    })

    it('should render on left side when position is left', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          position="left"
        />
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('left')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const nav = screen.getByRole('navigation', { name: 'Journal section navigation' })
      expect(nav).toBeInTheDocument()
    })

    it('should have proper aria-expanded on toggle button', async () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      const user = userEvent.setup()

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          startCollapsedMobile={true}
        />
      )

      const toggleButton = screen.getByRole('button', { name: 'Open navigation' })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(toggleButton)

      await waitFor(() => {
        const expandedButton = screen.getByRole('button', { name: 'Close navigation' })
        expect(expandedButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('should have aria-current on current section', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const currentSection = screen.getByRole('listitem', { current: 'location' })
      expect(currentSection).toBeInTheDocument()
    })

    it('should have list role on section container', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const list = document.querySelector('[role="list"]')
      expect(list).toBeInTheDocument()
    })

    it('should have listitem role on section items', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle sections with no progress data', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        sectionProgress: new Map()
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      // Should still render sections
      expect(screen.getByText('Introduction')).toBeInTheDocument()
      expect(screen.getByText('Main Content')).toBeInTheDocument()
      expect(screen.getByText('Conclusion')).toBeInTheDocument()
    })

    it('should handle no current section', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: null,
          overallPercent: 0,
          sectionsComplete: 0,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 5,
          totalWordCount: 27,
          wordsRead: 0
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      // No section should have aria-current
      const currentSection = screen.queryByRole('listitem', { current: 'location' })
      expect(currentSection).not.toBeInTheDocument()
    })

    it('should format large word counts with commas', () => {
      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn({
        readingProgress: {
          currentSectionId: 'intro',
          overallPercent: 10,
          sectionsComplete: 0,
          sectionsTotal: 3,
          estimatedMinutesRemaining: 50,
          totalWordCount: 12543,
          wordsRead: 1254
        }
      }))

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
        />
      )

      expect(screen.getByText('12,543')).toBeInTheDocument()
      expect(screen.getByText('1,254')).toBeInTheDocument()
    })

    it('should handle custom options passed to useReadingProgress', () => {
      const mockOptions = {
        wordsPerMinute: 300,
        debounceMs: 200,
        intersectionThreshold: 0.7
      }

      vi.mocked(useReadingProgress).mockReturnValue(createMockReturn())

      render(
        <SectionNavigator
          content={mockContent}
          sections={mockSections}
          options={mockOptions}
        />
      )

      expect(useReadingProgress).toHaveBeenCalledWith(mockContent, mockSections, mockOptions)
    })
  })
})
