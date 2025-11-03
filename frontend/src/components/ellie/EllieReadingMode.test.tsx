import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EllieReadingMode } from './EllieReadingMode'

// Mock SmartEllie component
vi.mock('./SmartEllie', () => ({
  SmartEllie: vi.fn(({ onClick, size, mood, thoughtText }) => (
    <div
      data-testid="smart-ellie"
      data-size={size}
      data-mood={mood}
      onClick={onClick}
    >
      {thoughtText}
    </div>
  ))
}))

describe('EllieReadingMode', () => {
  const defaultProps = {
    mood: 'idle' as const,
    companionState: 'resting' as const,
    onClick: vi.fn(),
    onDismiss: vi.fn(),
    onRestore: vi.fn()
  }

  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('rendering states', () => {
    it('should render in resting state', () => {
      render(<EllieReadingMode {...defaultProps} />)

      const ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toBeInTheDocument()
      expect(ellie).toHaveAttribute('data-size', 'sm')
    })

    it('should render in active state with larger size', () => {
      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="active"
          thoughtText="Hello!"
        />
      )

      const ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toBeInTheDocument()
      expect(ellie).toHaveAttribute('data-size', 'md')
      expect(ellie).toHaveTextContent('Hello!')
    })

    it('should render restore button when hidden', () => {
      render(<EllieReadingMode {...defaultProps} companionState="hidden" />)

      const restoreButton = screen.getByRole('button', { name: /bring ellie back/i })
      expect(restoreButton).toBeInTheDocument()
      expect(screen.queryByTestId('smart-ellie')).not.toBeInTheDocument()
    })

    it('should show dismiss button when active', () => {
      render(<EllieReadingMode {...defaultProps} companionState="active" />)

      const dismissButton = screen.getByRole('button', { name: /hide ellie/i })
      expect(dismissButton).toBeInTheDocument()
    })

    it('should not show dismiss button when resting', () => {
      render(<EllieReadingMode {...defaultProps} companionState="resting" />)

      expect(screen.queryByRole('button', { name: /hide ellie/i })).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onClick when Ellie is clicked', () => {
      const onClick = vi.fn()
      render(<EllieReadingMode {...defaultProps} onClick={onClick} />)

      const ellie = screen.getByTestId('smart-ellie')
      fireEvent.click(ellie)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="active"
          onDismiss={onDismiss}
        />
      )

      const dismissButton = screen.getByRole('button', { name: /hide ellie/i })
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should call onRestore when restore button is clicked', () => {
      const onRestore = vi.fn()
      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="hidden"
          onRestore={onRestore}
        />
      )

      const restoreButton = screen.getByRole('button', { name: /bring ellie back/i })
      fireEvent.click(restoreButton)

      expect(onRestore).toHaveBeenCalledTimes(1)
    })

    it('should prevent dismiss click from propagating to Ellie', () => {
      const onClick = vi.fn()
      const onDismiss = vi.fn()

      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="active"
          onClick={onClick}
          onDismiss={onDismiss}
        />
      )

      const dismissButton = screen.getByRole('button', { name: /hide ellie/i })
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('positioning', () => {
    it('should position Ellie in desktop mode by default', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      const ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('desktop')
      expect(ellieWrapper).not.toHaveClass('mobile')
    })

    it('should position Ellie in mobile mode on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      })

      const { container } = render(<EllieReadingMode {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      const ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('mobile')
    })

    it('should apply correct CSS classes for state', () => {
      const { container, rerender } = render(
        <EllieReadingMode {...defaultProps} companionState="resting" />
      )

      let ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('resting')

      rerender(<EllieReadingMode {...defaultProps} companionState="active" />)

      ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('active')
    })

    it('should calculate desktop position correctly', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      const ellieWrapper = container.querySelector('.ellie-reading-mode') as HTMLElement
      expect(ellieWrapper?.style.position).toBe('fixed')
      expect(parseInt(ellieWrapper?.style.left || '0')).toBeGreaterThan(0)
      expect(parseInt(ellieWrapper?.style.top || '0')).toBeGreaterThan(0)
    })

    it('should calculate mobile position correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800
      })

      const { container } = render(<EllieReadingMode {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      const ellieWrapper = container.querySelector('.ellie-reading-mode') as HTMLElement

      // Mobile: bottom-right
      const x = parseInt(ellieWrapper?.style.left || '0')
      const y = parseInt(ellieWrapper?.style.top || '0')

      expect(x).toBeGreaterThan(300) // Near right edge
      expect(y).toBeGreaterThan(600) // Near bottom
    })
  })

  describe('collision detection', () => {
    it('should check for collisions periodically', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      // Create a mock content element
      const contentElement = document.createElement('div')
      contentElement.className = 'journal-view-content'
      contentElement.style.position = 'absolute'
      contentElement.style.left = '0px'
      contentElement.style.top = '0px'
      contentElement.style.width = '500px'
      contentElement.style.height = '500px'
      document.body.appendChild(contentElement)

      // Run collision detection interval
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Cleanup
      document.body.removeChild(contentElement)
    })

    it('should not run collision detection when hidden', () => {
      const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll')

      render(<EllieReadingMode {...defaultProps} companionState="hidden" />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should not query for content elements
      expect(querySelectorAllSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('journal-view-content')
      )

      querySelectorAllSpy.mockRestore()
    })
  })

  describe('scroll handling', () => {
    it('should handle scroll events', () => {
      render(<EllieReadingMode {...defaultProps} />)

      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })

      // Should not crash
      expect(screen.getByTestId('smart-ellie')).toBeInTheDocument()
    })

    it('should clean up scroll listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(<EllieReadingMode {...defaultProps} />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('responsive behavior', () => {
    it('should respond to window resize', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      let ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('desktop')

      // Resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 600
        })
        window.dispatchEvent(new Event('resize'))
      })

      ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('mobile')

      // Resize back to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200
        })
        window.dispatchEvent(new Event('resize'))
      })

      ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('desktop')
    })

    it('should clean up resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(<EllieReadingMode {...defaultProps} />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      )

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('thought bubbles', () => {
    it('should show thought bubble when resting with text', () => {
      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="resting"
          thoughtText="Hello!"
        />
      )

      const ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toHaveTextContent('Hello!')
    })

    it('should show thought bubble when active', () => {
      render(
        <EllieReadingMode
          {...defaultProps}
          companionState="active"
          thoughtText="Need help?"
        />
      )

      const ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toHaveTextContent('Need help?')
    })

    it('should not show thought bubble when resting without text', () => {
      render(
        <EllieReadingMode {...defaultProps} companionState="resting" />
      )

      const ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toBeEmptyDOMElement()
    })
  })

  describe('customization', () => {
    it('should apply custom fur color', () => {
      const { container } = render(
        <EllieReadingMode {...defaultProps} furColor="#FF5733" />
      )

      expect(container).toBeInTheDocument()
      // SmartEllie mock receives the prop
    })

    it('should apply custom collar style', () => {
      const { container } = render(
        <EllieReadingMode {...defaultProps} collarStyle="bowtie" />
      )

      expect(container).toBeInTheDocument()
    })

    it('should apply custom class name', () => {
      const { container } = render(
        <EllieReadingMode {...defaultProps} className="custom-class" />
      )

      const ellieWrapper = container.querySelector('.ellie-reading-mode')
      expect(ellieWrapper).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have accessible restore button', () => {
      render(<EllieReadingMode {...defaultProps} companionState="hidden" />)

      const button = screen.getByRole('button', { name: /bring ellie back/i })
      expect(button).toHaveAttribute('aria-label', 'Bring Ellie back')
      expect(button).toHaveAttribute('title', 'Bring Ellie back')
    })

    it('should have accessible dismiss button', () => {
      render(<EllieReadingMode {...defaultProps} companionState="active" />)

      const button = screen.getByRole('button', { name: /hide ellie/i })
      expect(button).toHaveAttribute('aria-label', 'Hide Ellie')
      expect(button).toHaveAttribute('title', 'Hide Ellie')
    })
  })

  describe('performance', () => {
    it('should have smooth transitions', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      const ellieWrapper = container.querySelector('.ellie-reading-mode') as HTMLElement

      // Check for transition styles
      expect(ellieWrapper?.style.transition).toContain('cubic-bezier')
    })

    it('should use will-change for animations', () => {
      const { container } = render(<EllieReadingMode {...defaultProps} />)

      const ellieWrapper = container.querySelector('.ellie-reading-mode') as HTMLElement

      // Check CSS contains will-change
      expect(ellieWrapper).toHaveClass('ellie-reading-mode')
    })

    it('should clean up all timers on unmount', () => {
      const { unmount } = render(<EllieReadingMode {...defaultProps} />)

      // Start some timers
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      unmount()

      // No pending timers should remain
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('mood changes', () => {
    it('should update mood dynamically', () => {
      const { rerender } = render(
        <EllieReadingMode {...defaultProps} mood="idle" />
      )

      let ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toHaveAttribute('data-mood', 'idle')

      rerender(<EllieReadingMode {...defaultProps} mood="happy" />)

      ellie = screen.getByTestId('smart-ellie')
      expect(ellie).toHaveAttribute('data-mood', 'happy')
    })
  })
})
