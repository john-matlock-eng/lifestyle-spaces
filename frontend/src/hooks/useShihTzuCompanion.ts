import { useState, useCallback, useRef, useEffect } from 'react'

// Type definitions
export type Mood =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'playful'
  | 'sleeping'
  | 'walking'
  | 'concerned'
  | 'proud'
  | 'zen'
  | 'celebrating'

export type Position = {
  x: number
  y: number
}

export type ElementSide = 'left' | 'right' | 'top' | 'bottom'

export interface UseShihTzuCompanionParams {
  initialMood: Mood
  initialPosition: Position
  onCelebrate?: () => void // Optional callback for particle effects
  transitionDuration?: number // Optional duration for position transitions
}

export interface UseShihTzuCompanionReturn {
  mood: Mood
  position: Position
  setMood: (mood: Mood) => void
  moveToElement: (element: HTMLElement, side: ElementSide) => void
  celebrate: () => void
  showCuriosity: () => void
}

// Configuration constants
const COMPANION_OFFSET = 80 // Distance from element edge
const COMPANION_SIZE = 120 // Approximate size of companion (including thought bubble)
const VIEWPORT_PADDING = 20 // Minimum distance from viewport edges

// Helper to constrain position within viewport bounds
const constrainToViewport = (position: Position): Position => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const x = Math.max(
    VIEWPORT_PADDING,
    Math.min(position.x, viewportWidth - COMPANION_SIZE - VIEWPORT_PADDING)
  )
  const y = Math.max(
    VIEWPORT_PADDING,
    Math.min(position.y, viewportHeight - COMPANION_SIZE - VIEWPORT_PADDING)
  )

  return { x, y }
}

// Valid moods for runtime validation
const VALID_MOODS: readonly Mood[] = [
  'idle', 'happy', 'excited', 'curious', 'playful',
  'sleeping', 'walking', 'concerned', 'proud', 'zen', 'celebrating'
] as const

// Helper to validate mood
const isValidMood = (mood: string): mood is Mood => {
  return VALID_MOODS.includes(mood as Mood)
}

export function useShihTzuCompanion({
  initialMood,
  initialPosition,
  onCelebrate
}: UseShihTzuCompanionParams): UseShihTzuCompanionReturn {
  // Validate initial mood
  if (!isValidMood(initialMood)) {
    console.warn(`Invalid initial mood: ${initialMood}. Defaulting to 'idle'`)
  }

  const [mood, setMoodState] = useState<Mood>(isValidMood(initialMood) ? initialMood : 'idle')
  // Constrain initial position to viewport bounds
  const [position, setPosition] = useState<Position>(constrainToViewport(initialPosition))

  // Track if this is the first render to avoid initial transitions
  const isFirstRender = useRef(true)

  useEffect(() => {
    isFirstRender.current = false
  }, [])

  // Handle viewport resize - keep Ellie in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(currentPos => constrainToViewport(currentPos))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Stable function to update mood with validation
  const setMood = useCallback((newMood: Mood) => {
    if (!isValidMood(newMood)) {
      console.warn(`Invalid mood: ${newMood}. Ignoring mood change.`)
      return
    }
    setMoodState(newMood)
  }, [])

  // Calculate position relative to an element with smooth transitions
  const moveToElement = useCallback((element: HTMLElement, side: ElementSide) => {
    const rect = element.getBoundingClientRect()
    let newX: number
    let newY: number

    switch (side) {
      case 'left':
        newX = rect.left - COMPANION_OFFSET - COMPANION_SIZE
        newY = rect.top + (rect.height / 2) - (COMPANION_SIZE / 2)
        break

      case 'right':
        newX = rect.right + COMPANION_OFFSET
        newY = rect.top + (rect.height / 2) - (COMPANION_SIZE / 2)
        break

      case 'top':
        newX = rect.left + (rect.width / 2) - (COMPANION_SIZE / 2)
        newY = rect.top - COMPANION_OFFSET - COMPANION_SIZE
        break

      case 'bottom': {
        newX = rect.left + (rect.width / 2) - (COMPANION_SIZE / 2)
        newY = rect.bottom + COMPANION_OFFSET
        break
      }

      default: {
        // TypeScript exhaustiveness check
        const exhaustiveCheck: never = side
        throw new Error(`Unknown side: ${exhaustiveCheck}`)
      }
    }

    // Constrain to viewport bounds
    setPosition(constrainToViewport({ x: newX, y: newY }))
  }, [])

  // Celebrate function - sets mood and triggers optional effects
  const celebrate = useCallback(() => {
    setMoodState('celebrating')

    // Trigger external celebration effects if provided
    if (onCelebrate) {
      onCelebrate()
    }

    // Auto-reset mood after celebration
    setTimeout(() => {
      setMoodState(prevMood => prevMood === 'celebrating' ? 'happy' : prevMood)
    }, 3000) // 3 seconds of celebration
  }, [onCelebrate])

  // Show curiosity function with optional head tilt animation
  const showCuriosity = useCallback(() => {
    setMoodState('curious')

    // Could trigger additional curiosity animations here
    // For example, a slight position adjustment to "lean in"
  }, [])

  return {
    mood,
    position,
    setMood,
    moveToElement,
    celebrate,
    showCuriosity
  }
}

// Default export for the import style used in LandingPage
export default useShihTzuCompanion
