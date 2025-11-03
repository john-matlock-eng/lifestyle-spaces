import { useState, useEffect, useCallback, useRef } from 'react'
import { useShihTzuCompanion } from '../../../hooks'
import type { Template } from '../types/template.types'
import type { EllieMood } from '../../../components/ellie/types/ellie.types'

export type ReadingCompanionState = 'resting' | 'active' | 'hidden'

export interface ReadingProgress {
  /** Current section being read */
  currentSection: string | null
  /** Total sections in the journal */
  totalSections: number
  /** Number of sections completed */
  sectionsRead: number
  /** Time spent reading (seconds) */
  timeSpent: number
  /** Percentage of content read (0-100) */
  percentageRead: number
  /** Whether user has scrolled recently */
  isReading: boolean
}

export interface ReadingInsight {
  /** Unique ID for this insight */
  id: string
  /** Type of insight */
  type: 'section-transition' | 'break-point' | 'comprehension' | 'emotional-support' | 'completion'
  /** Ellie's message */
  message: string
  /** Ellie's mood for this insight */
  mood: EllieMood
  /** Optional follow-up questions */
  questions?: string[]
  /** Section ID this insight relates to */
  sectionId?: string
  /** Timestamp when insight was generated */
  timestamp: number
}

export interface UseEllieReadingCompanionReturn {
  // Reading companion state
  companionState: ReadingCompanionState
  setCompanionState: (state: ReadingCompanionState) => void

  // Ellie state
  mood: EllieMood
  thoughtText: string
  particleEffect: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null

  // Reading progress
  readingProgress: ReadingProgress

  // Current insight
  currentInsight: ReadingInsight | null

  // Actions
  handleSectionVisible: (sectionId: string) => void
  handleScrollProgress: (percentage: number) => void
  offerInsight: () => void
  dismissInsight: () => void
  askQuestion: (question: string) => void

  // Chat integration
  isChatOpen: boolean
  openChat: () => void
  closeChat: () => void
}

/**
 * Hook for managing Ellie as a reading companion
 * Provides context-aware support while reading journal entries
 */
export function useEllieReadingCompanion(
  template: Template | null,
  sections: { id: string; title: string }[],
  journalContent: string,
  emotions?: string[]
): UseEllieReadingCompanionReturn {
  const { mood, setMood, celebrate } = useShihTzuCompanion({
    initialMood: 'idle',
    initialPosition: {
      x: Math.min(window.innerWidth * 0.85, window.innerWidth - 120),
      y: window.innerHeight - 180
    }
  })

  const [companionState, setCompanionState] = useState<ReadingCompanionState>('resting')
  const [thoughtText, setThoughtText] = useState<string>('')
  const [particleEffect, setParticleEffect] = useState<'hearts' | 'sparkles' | 'treats' | 'zzz' | null>(null)
  const [currentInsight, setCurrentInsight] = useState<ReadingInsight | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const [readingProgress, setReadingProgress] = useState<ReadingProgress>({
    currentSection: null,
    totalSections: sections.length,
    sectionsRead: 0,
    timeSpent: 0,
    percentageRead: 0,
    isReading: false
  })

  // Track which sections have been viewed
  const viewedSections = useRef<Set<string>>(new Set())
  const startTimeRef = useRef<number>(Date.now())
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastInsightTimeRef = useRef<number>(0)
  const shownInsightsRef = useRef<Set<string>>(new Set())

  // Update time spent reading
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setReadingProgress(prev => ({ ...prev, timeSpent: elapsed }))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Clear particle effect after animation
  useEffect(() => {
    if (particleEffect) {
      const timer = setTimeout(() => setParticleEffect(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [particleEffect])

  // Offer insight at break points
  const offerInsightAtBreakPoint = useCallback((percentage: number) => {
    const insights: Record<number, { message: string; mood: EllieMood; questions?: string[] }> = {
      25: {
        message: "You're making good progress! 📚",
        mood: 'happy',
        questions: [
          'What stands out to you so far?',
          'Any thoughts you want to explore?'
        ]
      },
      50: {
        message: "Halfway through! How are you feeling? 💭",
        mood: 'curious',
        questions: [
          'Does this resonate with you?',
          'Want to dig deeper into anything?'
        ]
      },
      75: {
        message: "Almost there! You're doing great 🌟",
        mood: 'proud',
        questions: [
          'What insights have you gained?',
          'Anything you want to revisit?'
        ]
      },
      100: {
        message: "You finished reading! Well done! ✨",
        mood: 'celebrating',
        questions: [
          'How do you feel after reading this?',
          'Want to add any reflections?'
        ]
      }
    }

    const config = insights[percentage]
    if (!config) return

    const key = `breakpoint-${percentage}`
    if (shownInsightsRef.current.has(key)) return

    const insight: ReadingInsight = {
      id: `breakpoint-${percentage}-${Date.now()}`,
      type: 'break-point',
      message: config.message,
      mood: config.mood,
      questions: config.questions,
      timestamp: Date.now()
    }

    shownInsightsRef.current.add(key)
    setCurrentInsight(insight)
    setMood(config.mood)
    setThoughtText(config.message)
    lastInsightTimeRef.current = Date.now()

    if (percentage === 100) {
      celebrate()
      setParticleEffect('sparkles')
    }

    // Auto-dismiss after 12 seconds (longer for break points)
    setTimeout(() => {
      if (companionState === 'resting') {
        setThoughtText('')
        setCurrentInsight(null)
      }
    }, 12000)
  }, [setMood, celebrate, companionState])

  // Handle scroll activity detection
  const handleScrollProgress = useCallback((percentage: number) => {
    setReadingProgress(prev => ({ ...prev, percentageRead: percentage, isReading: true }))

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Detect reading pause after 5 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setReadingProgress(prev => ({ ...prev, isReading: false }))

      // Offer insight at natural break points (25%, 50%, 75%, 100%)
      const breakPoints = [25, 50, 75, 100]
      const nearBreakPoint = breakPoints.find(bp =>
        Math.abs(percentage - bp) < 5
      )

      if (nearBreakPoint && companionState === 'resting') {
        const now = Date.now()
        const timeSinceLastInsight = (now - lastInsightTimeRef.current) / 1000

        // Only offer insights if 30 seconds have passed since last one
        if (timeSinceLastInsight > 30) {
          offerInsightAtBreakPoint(nearBreakPoint)
        }
      }
    }, 5000)
  }, [companionState, offerInsightAtBreakPoint])

  // Generate section transition insight
  const generateSectionTransitionInsight = useCallback((section: { id: string; title: string }) => {
    const messages = [
      `Moving to "${section.title}" 📖`,
      `Let's explore "${section.title}" together`,
      `Interesting section ahead: "${section.title}"`,
      `Ready for "${section.title}"?`
    ]

    const message = messages[Math.floor(Math.random() * messages.length)]

    const insight: ReadingInsight = {
      id: `section-${section.id}-${Date.now()}`,
      type: 'section-transition',
      message,
      mood: 'curious',
      sectionId: section.id,
      timestamp: Date.now()
    }

    // Only show if we haven't shown this section transition before
    const key = `section-transition-${section.id}`
    if (!shownInsightsRef.current.has(key)) {
      shownInsightsRef.current.add(key)
      setCurrentInsight(insight)
      setMood('curious')
      setThoughtText(message)
      lastInsightTimeRef.current = Date.now()

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        if (companionState === 'resting') {
          setThoughtText('')
          setCurrentInsight(null)
        }
      }, 8000)
    }
  }, [setMood, companionState])

  // Handle section visibility
  const handleSectionVisible = useCallback((sectionId: string) => {
    if (!viewedSections.current.has(sectionId)) {
      viewedSections.current.add(sectionId)

      setReadingProgress(prev => ({
        ...prev,
        currentSection: sectionId,
        sectionsRead: viewedSections.current.size
      }))

      // Show section transition encouragement
      const section = sections.find(s => s.id === sectionId)
      if (section && companionState === 'resting') {
        generateSectionTransitionInsight(section)
      }
    } else {
      // Just update current section
      setReadingProgress(prev => ({
        ...prev,
        currentSection: sectionId
      }))
    }
  }, [sections, companionState, generateSectionTransitionInsight])

  // Offer comprehension insight
  const offerInsight = useCallback(() => {
    // Generate contextual insights based on content
    const hasEmotions = emotions && emotions.length > 0
    const isLongEntry = journalContent.length > 1000
    const currentSection = sections.find(s => s.id === readingProgress.currentSection)

    let message = "I'm here if you want to talk about this 💭"
    let mood: EllieMood = 'curious'
    let questions: string[] = []

    if (hasEmotions) {
      message = "I notice this entry has emotional depth. Want to explore it? 💙"
      mood = 'concerned'
      questions = [
        'How does reading this make you feel?',
        'Do you want to talk about any of these feelings?'
      ]
    } else if (isLongEntry) {
      message = "This is a thoughtful entry! Would you like to discuss it? 🤔"
      mood = 'curious'
      questions = [
        'What are the key themes here?',
        'Anything you want to explore further?'
      ]
    } else if (currentSection) {
      message = `Want to dive deeper into "${currentSection.title}"? 💡`
      mood = 'playful'
      questions = [
        'What questions does this raise for you?',
        'Want help understanding this better?'
      ]
    }

    const insight: ReadingInsight = {
      id: `comprehension-${Date.now()}`,
      type: 'comprehension',
      message,
      mood,
      questions,
      timestamp: Date.now()
    }

    setCurrentInsight(insight)
    setMood(mood)
    setThoughtText(message)
    setCompanionState('active')
    lastInsightTimeRef.current = Date.now()
  }, [emotions, journalContent, sections, readingProgress.currentSection, setMood])

  // Dismiss current insight
  const dismissInsight = useCallback(() => {
    setCurrentInsight(null)
    setThoughtText('')
    setMood('idle')
    if (companionState === 'active') {
      setCompanionState('resting')
    }
  }, [companionState, setMood])

  // Ask a question (opens chat)
  const askQuestion = useCallback(() => {
    setCompanionState('active')
    setIsChatOpen(true)
  }, [])

  // Open chat
  const openChat = useCallback(() => {
    setIsChatOpen(true)
    setCompanionState('active')
    setMood('happy')
  }, [setMood])

  // Close chat
  const closeChat = useCallback(() => {
    setIsChatOpen(false)
    if (companionState === 'active') {
      setCompanionState('resting')
    }
    setMood('idle')
  }, [companionState, setMood])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Initial greeting
  useEffect(() => {
    setMood('happy')
    setThoughtText('Happy reading! 📖')

    const timer = setTimeout(() => {
      setThoughtText('')
      setMood('idle')
    }, 5000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return {
    // Reading companion state
    companionState,
    setCompanionState,

    // Ellie state
    mood,
    thoughtText,
    particleEffect,

    // Reading progress
    readingProgress,

    // Current insight
    currentInsight,

    // Actions
    handleSectionVisible,
    handleScrollProgress,
    offerInsight,
    dismissInsight,
    askQuestion,

    // Chat integration
    isChatOpen,
    openChat,
    closeChat
  }
}
