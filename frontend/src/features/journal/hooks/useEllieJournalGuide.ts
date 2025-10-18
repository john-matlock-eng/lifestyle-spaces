import { useState, useEffect, useCallback, useRef } from 'react'
import { useShihTzuCompanion } from '../../../hooks'
import type { Template, EllieGuidance } from '../types/template.types'

export interface SectionProgress {
  sectionId: string
  wordCount?: number
  itemCount?: number
  timeSpent?: number
  isComplete: boolean
  startTime?: number
}

export interface UseEllieJournalGuideReturn {
  // Ellie state
  mood: 'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'
  position: { x: number; y: number }
  thoughtText: string
  particleEffect: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null
  currentGuidance: EllieGuidance | null

  // Actions
  handleTemplateSelect: () => void
  handleJournalStart: () => void
  handleSectionStart: (sectionId: string) => void
  updateSectionProgress: (sectionId: string, progress: Partial<SectionProgress>) => void
  handleSectionComplete: (sectionId: string) => void
  handleSave: () => void
  getHint: () => string | null

  // Progress tracking
  sectionProgress: Map<string, SectionProgress>
  isTemplateComplete: boolean
}

export function useEllieJournalGuide(
  template: Template | null,
  currentSectionId?: string
): UseEllieJournalGuideReturn {
  const { mood, setMood, position, celebrate } = useShihTzuCompanion({
    initialMood: template?.ellie?.onSelect?.mood || 'curious',
    initialPosition: {
      x: Math.min(window.innerWidth * 0.8, window.innerWidth - 150),
      y: 120
    }
  })

  const [thoughtText, setThoughtText] = useState<string>('')
  const [particleEffect, setParticleEffect] = useState<'hearts' | 'sparkles' | 'treats' | 'zzz' | null>(null)
  const [sectionProgress, setSectionProgress] = useState<Map<string, SectionProgress>>(new Map())
  const [currentGuidance, setCurrentGuidance] = useState<EllieGuidance | null>(null)
  const appliedGuidanceRef = useRef<Set<string>>(new Set())

  // Apply guidance (mood, message, effects)
  const applyGuidance = useCallback(
    (guidance: EllieGuidance | undefined, key?: string) => {
      console.log('[DEBUG ELLIE] applyGuidance called:', { guidance, key, alreadyApplied: key ? appliedGuidanceRef.current.has(key) : false })

      if (!guidance) return

      // Prevent applying the same guidance multiple times
      if (key && appliedGuidanceRef.current.has(key)) {
        console.log('[DEBUG ELLIE] Skipping - already applied:', key)
        return
      }
      if (key) appliedGuidanceRef.current.add(key)

      const applyEffect = () => {
        console.log('[DEBUG ELLIE] Applying effect:', { mood: guidance.mood, message: guidance.message })
        if (guidance.mood) setMood(guidance.mood)
        if (guidance.message) setThoughtText(guidance.message)
        if (guidance.particleEffect) {
          setParticleEffect(guidance.particleEffect)
          celebrate()
        }

        setCurrentGuidance(guidance)
      }

      if (guidance.delay) {
        setTimeout(applyEffect, guidance.delay)
      } else {
        applyEffect()
      }
    },
    [setMood, celebrate]
  )

  // Handle template selection
  const handleTemplateSelect = useCallback(() => {
    if (template?.ellie?.onSelect) {
      applyGuidance(template.ellie.onSelect, `template-${template.id}-select`)
    }
  }, [template, applyGuidance])

  // Handle journal start
  const handleJournalStart = useCallback(() => {
    if (template?.ellie?.onStart) {
      applyGuidance(template.ellie.onStart, `template-${template?.id}-start`)
    }
  }, [template, applyGuidance])

  // Handle section start
  const handleSectionStart = useCallback(
    (sectionId: string) => {
      console.log('[DEBUG ELLIE] handleSectionStart called:', sectionId)
      const section = template?.sections.find((s) => s.id === sectionId)
      console.log('[DEBUG ELLIE] Found section:', section?.id, 'has onStart guidance:', !!section?.ellie?.onStart)

      if (section?.ellie?.onStart) {
        applyGuidance(section.ellie.onStart, `section-${sectionId}-start`)
      }

      // Start tracking time for this section
      setSectionProgress((prev) => {
        const newMap = new Map(prev)
        const existing = newMap.get(sectionId)
        if (!existing) {
          newMap.set(sectionId, {
            sectionId,
            isComplete: false,
            startTime: Date.now()
          })
        }
        return newMap
      })
    },
    [template, applyGuidance]
  )

  // Update section progress
  const updateSectionProgress = useCallback(
    (sectionId: string, progress: Partial<SectionProgress>) => {
      setSectionProgress((prev) => {
        const newMap = new Map(prev)
        const existing = newMap.get(sectionId) || {
          sectionId,
          isComplete: false,
          startTime: Date.now()
        }
        newMap.set(sectionId, { ...existing, ...progress })
        return newMap
      })

      const section = template?.sections.find((s) => s.id === sectionId)
      if (!section?.ellie?.encouragement) return

      // Check word count milestones
      if (progress.wordCount !== undefined && section.ellie.encouragement.wordCount) {
        const milestones = Object.keys(section.ellie.encouragement.wordCount)
          .map(Number)
          .sort((a, b) => b - a)

        for (const milestone of milestones) {
          if (progress.wordCount >= milestone) {
            const guidance = section.ellie.encouragement.wordCount[milestone]
            const key = `section-${sectionId}-wordcount-${milestone}`
            if (guidance && !appliedGuidanceRef.current.has(key)) {
              applyGuidance(guidance, key)
              break
            }
          }
        }
      }

      // Check item count milestones (for lists/Q&A)
      if (progress.itemCount !== undefined && section.ellie.encouragement.itemCount) {
        const milestones = Object.keys(section.ellie.encouragement.itemCount)
          .map(Number)
          .sort((a, b) => b - a)

        for (const milestone of milestones) {
          if (progress.itemCount >= milestone) {
            const guidance = section.ellie.encouragement.itemCount[milestone]
            const key = `section-${sectionId}-itemcount-${milestone}`
            if (guidance && !appliedGuidanceRef.current.has(key)) {
              applyGuidance(guidance, key)
              break
            }
          }
        }
      }

      // Check time spent milestones
      if (progress.timeSpent !== undefined && section.ellie.encouragement.timeSpent) {
        const milestones = Object.keys(section.ellie.encouragement.timeSpent)
          .map(Number)
          .sort((a, b) => b - a)

        for (const milestone of milestones) {
          if (progress.timeSpent >= milestone) {
            const guidance = section.ellie.encouragement.timeSpent[milestone]
            const key = `section-${sectionId}-timespent-${milestone}`
            if (guidance && !appliedGuidanceRef.current.has(key)) {
              applyGuidance(guidance, key)
              break
            }
          }
        }
      }
    },
    [template, applyGuidance]
  )

  // Handle section completion
  const handleSectionComplete = useCallback(
    (sectionId: string) => {
      const section = template?.sections.find((s) => s.id === sectionId)
      if (section?.ellie?.onComplete) {
        applyGuidance(section.ellie.onComplete, `section-${sectionId}-complete`)
      }

      updateSectionProgress(sectionId, { isComplete: true })

      // Check if all sections complete
      const allSections = template?.sections || []
      const currentProgress = sectionProgress.get(sectionId)
      const completedCount =
        Array.from(sectionProgress.values()).filter((p) => p.isComplete).length +
        (!currentProgress?.isComplete ? 1 : 0)

      if (completedCount === allSections.length && template?.ellie?.onComplete) {
        setTimeout(() => {
          applyGuidance(template.ellie?.onComplete, `template-${template.id}-complete`)
        }, 1500) // Delay to not overlap with section completion
      }
    },
    [template, sectionProgress, applyGuidance, updateSectionProgress]
  )

  // Get random hint for current section
  const getHint = useCallback((): string | null => {
    if (!currentSectionId) return null

    const section = template?.sections.find((s) => s.id === currentSectionId)
    if (!section?.ellie?.hints || section.ellie.hints.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * section.ellie.hints.length)
    return section.ellie.hints[randomIndex]
  }, [template, currentSectionId])

  // Handle save
  const handleSave = useCallback(() => {
    if (template?.ellie?.onSave) {
      applyGuidance(template.ellie.onSave, `template-${template.id}-save`)
    }
  }, [template, applyGuidance])

  // Clear particle effect after animation
  useEffect(() => {
    if (particleEffect) {
      const timer = setTimeout(() => setParticleEffect(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [particleEffect])

  // Update time spent for active sections
  useEffect(() => {
    if (!currentSectionId) return

    const interval = setInterval(() => {
      const progress = sectionProgress.get(currentSectionId)
      if (progress && progress.startTime && !progress.isComplete) {
        const timeSpent = Math.floor((Date.now() - progress.startTime) / 1000)
        updateSectionProgress(currentSectionId, { timeSpent })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentSectionId, sectionProgress, updateSectionProgress])

  const isTemplateComplete = template
    ? Array.from(sectionProgress.values()).filter((p) => p.isComplete).length ===
      template.sections.length
    : false

  return {
    // Ellie state
    mood,
    position,
    thoughtText,
    particleEffect,
    currentGuidance,

    // Actions
    handleTemplateSelect,
    handleJournalStart,
    handleSectionStart,
    updateSectionProgress,
    handleSectionComplete,
    handleSave,
    getHint,

    // Progress tracking
    sectionProgress,
    isTemplateComplete
  }
}
