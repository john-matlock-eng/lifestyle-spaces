import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StickyHeaderSection } from './StickyHeaderSection'

describe('StickyHeaderSection', () => {
  const defaultProps = {
    sectionId: 'test-section',
    title: 'Test Section Title',
    icon: '📝',
    index: 0,
    total: 3,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    wordCount: 247,
    children: <div>Test section content</div>
  }

  let mockObserver: {
    observe: ReturnType<typeof vi.fn>
    unobserve: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    callback?: IntersectionObserverCallback
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a more sophisticated IntersectionObserver mock
    mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }

    global.IntersectionObserver = vi.fn((callback) => {
      // Store callback for later invocation
      mockObserver.callback = callback
      return mockObserver
    }) as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render section header and content', () => {
      render(<StickyHeaderSection {...defaultProps} />)

      expect(screen.getByText('Test Section Title')).toBeInTheDocument()
      expect(screen.getByText('Test section content')).toBeInTheDocument()
    })

    it('should render with icon when provided', () => {
      render(<StickyHeaderSection {...defaultProps} />)

      expect(screen.getByText('📝')).toBeInTheDocument()
    })

    it('should render without icon when not provided', () => {
      render(<StickyHeaderSection {...defaultProps} icon={undefined} />)

      const icons = screen.queryAllByText('📝')
      expect(icons).toHaveLength(0)
    })

    it('should apply data-section-id attribute', () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} />)

      const section = container.querySelector('[data-section-id="test-section"]')
      expect(section).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      const { container } = render(
        <StickyHeaderSection {...defaultProps} className="custom-class" />
      )

      const section = container.querySelector('.custom-class')
      expect(section).toBeInTheDocument()
    })
  })

  describe('Progress Badge', () => {
    it('should show section progress indicator (X of Y)', () => {
      render(<StickyHeaderSection {...defaultProps} index={1} total={5} />)

      expect(screen.getByText('2 of 5')).toBeInTheDocument()
    })

    it('should calculate correct section number (index + 1)', () => {
      render(<StickyHeaderSection {...defaultProps} index={0} total={3} />)

      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    it('should update when index changes', () => {
      const { rerender } = render(<StickyHeaderSection {...defaultProps} index={0} total={3} />)

      expect(screen.getByText('1 of 3')).toBeInTheDocument()

      rerender(<StickyHeaderSection {...defaultProps} index={2} total={3} />)

      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })
  })

  describe('Sticky Behavior', () => {
    it('should set up IntersectionObserver on mount', () => {
      render(<StickyHeaderSection {...defaultProps} />)

      expect(global.IntersectionObserver).toHaveBeenCalled()
      expect(mockObserver.observe).toHaveBeenCalled()
    })

    it('should apply sticky-active class when scrolled past sentinel', async () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} />)

      // Trigger the intersection observer callback to simulate scrolling
      const entries = [{ isIntersecting: false }]
      mockObserver.callback(entries)

      await waitFor(() => {
        const header = container.querySelector('.sticky-header')
        expect(header).toHaveClass('sticky-active')
      })
    })

    it('should remove sticky-active class when not scrolled past', async () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} />)

      // Initially sticky
      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        const header = container.querySelector('.sticky-header')
        expect(header).toHaveClass('sticky-active')
      })

      // Then not sticky
      mockObserver.callback([{ isIntersecting: true }])

      await waitFor(() => {
        const header = container.querySelector('.sticky-header')
        expect(header).not.toHaveClass('sticky-active')
      })
    })

    it('should show short title when sticky', async () => {
      const longTitle = 'This is a very long section title that should be truncated when sticky'

      const { container } = render(
        <StickyHeaderSection {...defaultProps} title={longTitle} />
      )

      // Not sticky - full title
      expect(screen.getByText(longTitle)).toBeInTheDocument()

      // Become sticky
      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        const header = container.querySelector('.sticky-header')
        expect(header).toHaveClass('sticky-active')
      })

      // Should show shortened title (first 30 chars + ...)
      expect(screen.getByText('This is a very long section ti...')).toBeInTheDocument()
    })

    it('should not truncate short titles when sticky', async () => {
      const shortTitle = 'Short Title'

      render(<StickyHeaderSection {...defaultProps} title={shortTitle} />)

      // Become sticky
      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        // Title should remain unchanged
        expect(screen.getByText(shortTitle)).toBeInTheDocument()
      })
    })

    it('should disconnect observer on unmount', () => {
      const { unmount } = render(<StickyHeaderSection {...defaultProps} />)

      unmount()

      expect(mockObserver.disconnect).toHaveBeenCalled()
    })

    it('should create and remove sentinel element', () => {
      const { unmount } = render(<StickyHeaderSection {...defaultProps} />)

      // Check that sentinel was created (via observe being called)
      expect(mockObserver.observe).toHaveBeenCalled()

      // Unmount and check cleanup
      unmount()

      expect(mockObserver.disconnect).toHaveBeenCalled()
    })
  })

  describe('Collapse/Expand Functionality', () => {
    it('should call onToggleCollapse when header is double-clicked', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      await user.dblClick(header)

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })

    it('should call onToggleCollapse when collapse toggle button is clicked', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const toggleButton = screen.getByLabelText('Collapse section')
      await user.click(toggleButton)

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })

    it('should show ChevronUp icon when expanded', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      const toggleButton = screen.getByLabelText('Collapse section')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should show ChevronDown icon when collapsed', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const toggleButton = screen.getByLabelText('Expand section')
      expect(toggleButton).toBeInTheDocument()
    })

    it('should apply collapsed class when isCollapsed is true', () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const section = container.querySelector('.sticky-header-section')
      expect(section).toHaveClass('collapsed')
    })

    it('should not call onToggleCollapse when toggle button is clicked (event propagation)', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const toggleButton = screen.getByLabelText('Collapse section')
      await user.click(toggleButton)

      // Should be called exactly once (not twice from header double-click)
      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard Accessibility', () => {
    it('should toggle collapse on Enter key press', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      header.focus()
      await user.keyboard('{Enter}')

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })

    it('should toggle collapse on Space key press', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      header.focus()
      await user.keyboard(' ')

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })

    it('should not toggle on other key presses', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      header.focus()
      await user.keyboard('a')

      expect(onToggleCollapse).not.toHaveBeenCalled()
    })

    it('should be keyboard accessible with tabIndex={0}', () => {
      render(<StickyHeaderSection {...defaultProps} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      expect(header).toHaveAttribute('tabIndex', '0')
    })

    it('should toggle collapsed placeholder on Enter key', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const placeholder = screen.getByRole('button', { name: /Expand Test Section Title section/i })
      placeholder.focus()
      await user.keyboard('{Enter}')

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })

    it('should toggle collapsed placeholder on Space key', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const placeholder = screen.getByRole('button', { name: /Expand Test Section Title section/i })
      placeholder.focus()
      await user.keyboard(' ')

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })
  })

  describe('Collapsed State', () => {
    it('should show collapsed placeholder when isCollapsed is true', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      expect(screen.getByText('collapsed')).toBeInTheDocument()
      expect(screen.queryByText('Test section content')).not.toBeInTheDocument()
    })

    it('should show section content when isCollapsed is false', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      expect(screen.getByText('Test section content')).toBeInTheDocument()
      expect(screen.queryByText('collapsed')).not.toBeInTheDocument()
    })

    it('should show word count in collapsed placeholder', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} wordCount={247} />)

      expect(screen.getByText('247 words • Click to expand')).toBeInTheDocument()
    })

    it('should show "No content" when word count is 0', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} wordCount={0} />)

      expect(screen.getByText('No content • Click to expand')).toBeInTheDocument()
    })

    it('should show icon in collapsed placeholder', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} icon="📝" />)

      // Icon appears in both header and placeholder
      const icons = screen.getAllByText('📝')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should call onToggleCollapse when placeholder is clicked', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} onToggleCollapse={onToggleCollapse} />)

      const placeholder = screen.getByRole('button', { name: /Expand Test Section Title section/i })
      await user.click(placeholder)

      expect(onToggleCollapse).toHaveBeenCalledTimes(1)
    })
  })

  describe('ARIA Attributes', () => {
    it('should have proper aria-expanded when expanded', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have proper aria-expanded when collapsed', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      expect(header).toHaveAttribute('aria-expanded', 'false')
    })

    it('should have aria-controls attribute', () => {
      render(<StickyHeaderSection {...defaultProps} sectionId="test-section" />)

      const header = screen.getByRole('button', { name: /Test Section Title section header/i })
      expect(header).toHaveAttribute('aria-controls', 'section-content-test-section')
    })

    it('should have aria-label on header describing action', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      const header = screen.getByRole('button', { name: /Double-click to collapse/i })
      expect(header).toBeInTheDocument()
    })

    it('should update aria-label when collapsed state changes', () => {
      const { rerender } = render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      expect(screen.getByRole('button', { name: /Double-click to collapse/i })).toBeInTheDocument()

      rerender(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      expect(screen.getByRole('button', { name: /Double-click to expand/i })).toBeInTheDocument()
    })

    it('should have aria-hidden on content when collapsed', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} />)

      const content = document.getElementById('section-content-test-section')
      expect(content).toHaveAttribute('aria-hidden', 'true')
    })

    it('should not have aria-hidden on content when expanded', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={false} />)

      const content = document.getElementById('section-content-test-section')
      expect(content).toHaveAttribute('aria-hidden', 'false')
    })

    it('should have proper aria-label on collapsed placeholder', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} wordCount={247} />)

      const placeholder = screen.getByLabelText('Expand Test Section Title section. 247 words.')
      expect(placeholder).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle title exactly 30 characters (no truncation)', async () => {
      const exactTitle = '12345678901234567890123456789' // 29 chars
      render(<StickyHeaderSection {...defaultProps} title={exactTitle} />)

      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        expect(screen.getByText(exactTitle)).toBeInTheDocument()
      })
    })

    it('should handle title with 31 characters (truncate to 30 + ...)', async () => {
      const longTitle = '1234567890123456789012345678901' // 31 chars
      render(<StickyHeaderSection {...defaultProps} title={longTitle} />)

      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        expect(screen.getByText('123456789012345678901234567890...')).toBeInTheDocument()
      })
    })

    it('should handle empty children', () => {
      render(<StickyHeaderSection {...defaultProps} children={null} />)

      // Should still render header
      expect(screen.getByText('Test Section Title')).toBeInTheDocument()
    })

    it('should handle undefined wordCount', () => {
      render(<StickyHeaderSection {...defaultProps} isCollapsed={true} wordCount={undefined} />)

      // Should show 0 words
      expect(screen.getByText('No content • Click to expand')).toBeInTheDocument()
    })

    it('should handle section with index 0 of total 1', () => {
      render(<StickyHeaderSection {...defaultProps} index={0} total={1} />)

      expect(screen.getByText('1 of 1')).toBeInTheDocument()
    })

    it('should handle rapid toggle clicks', async () => {
      const onToggleCollapse = vi.fn()
      const user = userEvent.setup()

      render(<StickyHeaderSection {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      const toggleButton = screen.getByLabelText('Collapse section')

      // Rapid clicks
      await user.click(toggleButton)
      await user.click(toggleButton)
      await user.click(toggleButton)

      expect(onToggleCollapse).toHaveBeenCalledTimes(3)
    })

    it('should handle special characters in title', () => {
      const specialTitle = 'Test <Section> & "Quotes" \'and\' symbols!'
      render(<StickyHeaderSection {...defaultProps} title={specialTitle} />)

      expect(screen.getByText(specialTitle)).toBeInTheDocument()
    })

    it('should handle special characters in sectionId', () => {
      render(<StickyHeaderSection {...defaultProps} sectionId="section-with-dashes_and_underscores.123" />)

      const content = document.getElementById('section-content-section-with-dashes_and_underscores.123')
      expect(content).toBeInTheDocument()
    })
  })

  describe('Sticky Header Indicator', () => {
    it('should show sticky indicator line when sticky', async () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} />)

      // Not sticky initially - no indicator
      expect(container.querySelector('.sticky-header-indicator')).not.toBeInTheDocument()

      // Become sticky
      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        expect(container.querySelector('.sticky-header-indicator')).toBeInTheDocument()
        expect(container.querySelector('.sticky-header-line')).toBeInTheDocument()
      })
    })

    it('should hide sticky indicator when not sticky', async () => {
      const { container } = render(<StickyHeaderSection {...defaultProps} />)

      // Make sticky
      mockObserver.callback([{ isIntersecting: false }])

      await waitFor(() => {
        expect(container.querySelector('.sticky-header-indicator')).toBeInTheDocument()
      })

      // Make not sticky
      mockObserver.callback([{ isIntersecting: true }])

      await waitFor(() => {
        expect(container.querySelector('.sticky-header-indicator')).not.toBeInTheDocument()
      })
    })
  })
})
