import React, { useEffect, useRef, useState, useCallback } from 'react'
import { SmartEllie } from './SmartEllie'
import type { EllieMood } from './types/ellie.types'
import './styles/ellie-reading-mode.css'

export interface EllieReadingModeProps {
  /** Ellie's current mood */
  mood: EllieMood

  /** Current thought bubble text */
  thoughtText?: string

  /** Particle effect to show */
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null

  /** Reading companion state */
  companionState: 'resting' | 'active' | 'hidden'

  /** Handler when user clicks Ellie */
  onClick?: () => void

  /** Handler when user dismisses Ellie */
  onDismiss?: () => void

  /** Handler when user wants to bring Ellie back */
  onRestore?: () => void

  /** Fur color customization */
  furColor?: string

  /** Collar style */
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana'

  /** Collar color */
  collarColor?: string

  /** Whether to show collar tag */
  collarTag?: boolean

  /** Additional CSS class */
  className?: string
}

/**
 * Ellie Reading Mode Component
 *
 * A context-aware reading companion with three states:
 * - Resting: Minimized corner presence with breathing animation
 * - Active: Full companion mode with thought bubbles and interactions
 * - Hidden: User dismissed, shows subtle "bring back" button
 *
 * Features:
 * - Smart positioning that never overlaps content
 * - Smooth animations between states
 * - Collision detection with content elements
 * - Responsive design (desktop: left margin, mobile: bottom-right)
 */
export const EllieReadingMode: React.FC<EllieReadingModeProps> = ({
  mood,
  thoughtText,
  particleEffect,
  companionState,
  onClick,
  onDismiss,
  onRestore,
  furColor,
  collarStyle,
  collarColor,
  collarTag,
  className
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const ellieRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate initial position based on viewport
  useEffect(() => {
    const calculatePosition = () => {
      if (isMobile) {
        // Mobile: bottom-right corner
        return {
          x: window.innerWidth - 100,
          y: window.innerHeight - 120
        }
      } else {
        // Desktop: left margin at comfortable reading position
        return {
          x: 40,
          y: Math.max(200, window.innerHeight * 0.3)
        }
      }
    }

    setPosition(calculatePosition())
  }, [isMobile])

  // Collision detection with content elements
  const checkCollisions = useCallback(() => {
    if (!ellieRef.current || companionState === 'hidden') return

    const ellieRect = ellieRef.current.getBoundingClientRect()

    // Check for overlaps with main content
    const contentElements = document.querySelectorAll(
      '.journal-view-content, .template-section, .journal-header-compact'
    )

    let hasCollision = false

    contentElements.forEach(element => {
      const elementRect = element.getBoundingClientRect()

      // Check if rectangles overlap
      if (
        ellieRect.left < elementRect.right &&
        ellieRect.right > elementRect.left &&
        ellieRect.top < elementRect.bottom &&
        ellieRect.bottom > elementRect.top
      ) {
        hasCollision = true
      }
    })

    // If collision detected, adjust position
    if (hasCollision && !isMobile) {
      // On desktop, move to a safe position above or below
      const newY = ellieRect.top < window.innerHeight / 2
        ? window.innerHeight - 180
        : 40

      setPosition(prev => ({ ...prev, y: newY }))
    }
  }, [companionState, isMobile])

  // Handle scroll-based repositioning
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - lastScrollY.current
      lastScrollY.current = currentScrollY

      // On mobile, keep Ellie in viewport
      if (isMobile && companionState !== 'hidden') {
        // Fixed position on mobile, no need to adjust
        return
      }

      // On desktop, check for collisions when scrolling
      if (!isMobile) {
        // Debounce collision check
        requestAnimationFrame(checkCollisions)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile, companionState, checkCollisions])

  // Run collision detection periodically
  useEffect(() => {
    if (companionState === 'hidden') return

    const interval = setInterval(checkCollisions, 1000)
    return () => clearInterval(interval)
  }, [companionState, checkCollisions])

  // Hidden state - show restore button
  if (companionState === 'hidden') {
    return (
      <button
        className="ellie-restore-button"
        onClick={onRestore}
        title="Bring Ellie back"
        aria-label="Bring Ellie back"
      >
        <span className="ellie-restore-icon">🐕</span>
      </button>
    )
  }

  // Resting or Active state - show Ellie
  const ellieSize = companionState === 'resting' ? 'sm' : 'md'
  const showThoughtBubble = companionState === 'active' || (companionState === 'resting' && thoughtText)

  return (
    <div
      ref={ellieRef}
      className={`ellie-reading-mode ${companionState} ${isMobile ? 'mobile' : 'desktop'} ${className || ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 900,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'auto'
      }}
    >
      <SmartEllie
        mood={mood}
        size={ellieSize}
        showThoughtBubble={showThoughtBubble}
        thoughtText={thoughtText || ''}
        particleEffect={particleEffect || undefined}
        onClick={onClick}
        furColor={furColor}
        collarStyle={collarStyle}
        collarColor={collarColor}
        collarTag={collarTag}
        enableSmartPositioning={false} // We handle positioning ourselves
        showControlPanel={companionState === 'active'}
      />

      {/* Dismiss button when active */}
      {companionState === 'active' && onDismiss && (
        <button
          className="ellie-dismiss-button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          title="Hide Ellie"
          aria-label="Hide Ellie"
        >
          ✕
        </button>
      )}
    </div>
  )
}
