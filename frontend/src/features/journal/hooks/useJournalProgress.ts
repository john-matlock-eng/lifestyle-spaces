import { useState, useEffect, useMemo, useCallback } from 'react'
import type { QAPair, ListItem } from '../types/template.types'

export interface JournalProgressMetrics {
  wordCount: number
  timeSpent: number // in seconds
  sectionsCompleted: number
  totalSections: number
  hasTitle: boolean
  hasContent: boolean
  hasEmotions: boolean
  hasTags: boolean
}

export interface JournalProgressMilestone {
  type: 'first_words' | 'word_milestone' | 'section_complete' | 'emotion_select' | 'time_milestone'
  value?: number
  message: string
  mood: 'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'
}

export interface UseJournalProgressParams {
  title: string
  content: string
  emotions: string[]
  tags: string
  templateData?: Record<string, string | QAPair[] | ListItem[] | number>
  customSections?: Array<{ id: string; content: string | QAPair[] | ListItem[] | number | unknown[] }>
  totalSections?: number
}

export interface UseJournalProgressReturn {
  metrics: JournalProgressMetrics
  currentMilestone: JournalProgressMilestone | null
  getContextualMessage: () => string
  getContextualMood: () => JournalProgressMilestone['mood']
}

// Helper function to count words in text
function countWords(text: string): number {
  if (!text || text.trim() === '') return 0
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Helper function to count words in template data
function countTemplateWords(data: Record<string, string | QAPair[] | ListItem[] | number>): number {
  let total = 0

  for (const value of Object.values(data)) {
    if (typeof value === 'string') {
      total += countWords(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const qaItem = item as QAPair
          if ('question' in qaItem && 'answer' in qaItem) {
            total += countWords(qaItem.question)
            total += countWords(qaItem.answer)
          }
          const listItem = item as ListItem
          if ('text' in listItem) {
            total += countWords(listItem.text)
          }
        }
      }
    }
  }

  return total
}

// Helper function to count completed sections in template data
function countCompletedSections(data: Record<string, string | QAPair[] | ListItem[] | number>): number {
  let completed = 0

  for (const value of Object.values(data)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      completed++
    } else if (Array.isArray(value) && value.length > 0) {
      // Check if any Q&A pair has an answer or any list item has text
      const hasContent = value.some(item => {
        if (typeof item === 'object' && item !== null) {
          const qaItem = item as QAPair
          if ('answer' in qaItem && qaItem.answer && qaItem.answer.trim().length > 0) {
            return true
          }
          const listItem = item as ListItem
          if ('text' in listItem && listItem.text && listItem.text.trim().length > 0) {
            return true
          }
        }
        return false
      })
      if (hasContent) completed++
    } else if (typeof value === 'number') {
      completed++
    }
  }

  return completed
}

export function useJournalProgress({
  title,
  content,
  emotions,
  tags,
  templateData = {},
  customSections = [],
  totalSections = 0
}: UseJournalProgressParams): UseJournalProgressReturn {
  const [startTime] = useState<number>(() => Date.now())
  const [timeSpent, setTimeSpent] = useState<number>(0)
  const [previousWordCount, setPreviousWordCount] = useState<number>(0)
  const [currentMilestone, setCurrentMilestone] = useState<JournalProgressMilestone | null>(null)

  // Update time spent every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  // Calculate metrics
  const metrics = useMemo((): JournalProgressMetrics => {
    let wordCount = 0

    // Count words from regular content
    wordCount += countWords(title)
    wordCount += countWords(content)

    // Count words from template data
    wordCount += countTemplateWords(templateData)

    // Count words from custom sections
    for (const section of customSections) {
      if (typeof section.content === 'string') {
        wordCount += countWords(section.content)
      } else if (Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === 'object' && item !== null) {
            const qaItem = item as QAPair
            if ('question' in qaItem && 'answer' in qaItem) {
              wordCount += countWords(qaItem.question)
              wordCount += countWords(qaItem.answer)
            }
            const listItem = item as ListItem
            if ('text' in listItem) {
              wordCount += countWords(listItem.text)
            }
          }
        }
      }
    }

    const sectionsCompleted = countCompletedSections(templateData) + customSections.filter(s => {
      if (typeof s.content === 'string') return s.content.trim().length > 0
      if (Array.isArray(s.content)) return s.content.length > 0
      return false
    }).length

    return {
      wordCount,
      timeSpent,
      sectionsCompleted,
      totalSections: totalSections || Object.keys(templateData).length + customSections.length,
      hasTitle: title.trim().length > 0,
      hasContent: wordCount > 0,
      hasEmotions: emotions.length > 0,
      hasTags: tags.trim().length > 0
    }
  }, [title, content, emotions, tags, templateData, customSections, timeSpent, totalSections])

  // Track milestones
  useEffect(() => {
    const { wordCount } = metrics

    // First words milestone
    if (previousWordCount === 0 && wordCount > 0) {
      setCurrentMilestone({
        type: 'first_words',
        message: "Great start! Let your thoughts flow...",
        mood: 'excited'
      })
    }
    // 100 words milestone
    else if (previousWordCount < 100 && wordCount >= 100) {
      setCurrentMilestone({
        type: 'word_milestone',
        value: 100,
        message: "You're doing great! Keep writing...",
        mood: 'proud'
      })
    }
    // 500 words milestone
    else if (previousWordCount < 500 && wordCount >= 500) {
      setCurrentMilestone({
        type: 'word_milestone',
        value: 500,
        message: "You're on a roll! Keep going!",
        mood: 'celebrating'
      })
    }
    // 1000 words milestone
    else if (previousWordCount < 1000 && wordCount >= 1000) {
      setCurrentMilestone({
        type: 'word_milestone',
        value: 1000,
        message: "Incredible! Over 1000 words!",
        mood: 'celebrating'
      })
    }

    if (wordCount !== previousWordCount) {
      setPreviousWordCount(wordCount)
    }
  }, [metrics, previousWordCount])

  // Emotion selection milestone
  useEffect(() => {
    if (emotions.length > 0 && previousWordCount === 0) {
      setCurrentMilestone({
        type: 'emotion_select',
        message: "How are you feeling right now?",
        mood: 'zen'
      })
    }
  }, [emotions, previousWordCount])

  // Get contextual message based on current state
  const getContextualMessage = useCallback((): string => {
    if (currentMilestone) {
      return currentMilestone.message
    }

    if (!metrics.hasTitle) {
      return "What would you like to write about today?"
    }

    if (!metrics.hasContent) {
      return "Start writing your thoughts..."
    }

    if (metrics.wordCount < 50) {
      return "You're off to a good start!"
    }

    if (metrics.wordCount < 100) {
      return "Keep those thoughts flowing!"
    }

    if (metrics.wordCount < 300) {
      return "Great progress! 💭"
    }

    if (metrics.sectionsCompleted > 0 && metrics.totalSections > 0) {
      const percentage = Math.round((metrics.sectionsCompleted / metrics.totalSections) * 100)
      if (percentage === 100) {
        return "All sections complete! 🎉"
      }
      return `${percentage}% complete - keep going!`
    }

    return "You're doing amazing! ✨"
  }, [currentMilestone, metrics])

  // Get contextual mood based on current state
  const getContextualMood = useCallback((): JournalProgressMilestone['mood'] => {
    if (currentMilestone) {
      return currentMilestone.mood
    }

    if (!metrics.hasContent) {
      return 'curious'
    }

    if (metrics.wordCount >= 500) {
      return 'proud'
    }

    if (metrics.wordCount >= 100) {
      return 'happy'
    }

    if (metrics.hasEmotions) {
      return 'zen'
    }

    if (metrics.wordCount > 0) {
      return 'excited'
    }

    return 'idle'
  }, [currentMilestone, metrics])

  return {
    metrics,
    currentMilestone,
    getContextualMessage,
    getContextualMood
  }
}
