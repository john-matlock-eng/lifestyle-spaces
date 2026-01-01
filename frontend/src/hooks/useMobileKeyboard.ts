/**
 * Hook for handling mobile keyboard visibility and ensuring
 * input fields remain visible when the keyboard is open.
 *
 * Uses the visualViewport API for accurate keyboard detection.
 */

import { useEffect, useCallback, useRef } from 'react'

interface UseMobileKeyboardOptions {
  /** Ref to the input/textarea element */
  inputRef: React.RefObject<HTMLElement | null>
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean
}

export function useMobileKeyboard({
  inputRef,
  enabled = true,
}: UseMobileKeyboardOptions) {
  const lastViewportHeight = useRef<number>(0)
  const isKeyboardOpen = useRef(false)

  const scrollInputIntoView = useCallback(() => {
    const input = inputRef.current
    if (!input) return

    // Small delay to let the keyboard fully appear
    setTimeout(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [inputRef])

  const handleViewportResize = useCallback(() => {
    if (!window.visualViewport) return

    const currentHeight = window.visualViewport.height
    const heightDiff = lastViewportHeight.current - currentHeight

    // Keyboard likely opened (viewport got smaller by significant amount)
    if (heightDiff > 150 && !isKeyboardOpen.current) {
      isKeyboardOpen.current = true

      // If our input is focused, scroll it into view
      if (document.activeElement === inputRef.current) {
        scrollInputIntoView()
      }
    }
    // Keyboard likely closed
    else if (heightDiff < -150 && isKeyboardOpen.current) {
      isKeyboardOpen.current = false
    }

    lastViewportHeight.current = currentHeight
  }, [inputRef, scrollInputIntoView])

  const handleFocus = useCallback(() => {
    // When input is focused on mobile, scroll it into view
    const isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window
    if (isMobile) {
      scrollInputIntoView()
    }
  }, [scrollInputIntoView])

  useEffect(() => {
    if (!enabled) return

    const input = inputRef.current
    if (!input) return

    // Initialize viewport height
    if (window.visualViewport) {
      lastViewportHeight.current = window.visualViewport.height
      window.visualViewport.addEventListener('resize', handleViewportResize)
    }

    // Add focus listener to input
    input.addEventListener('focus', handleFocus)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize)
      }
      input.removeEventListener('focus', handleFocus)
    }
  }, [enabled, inputRef, handleViewportResize, handleFocus])

  return {
    scrollInputIntoView,
    isKeyboardOpen: isKeyboardOpen.current,
  }
}
