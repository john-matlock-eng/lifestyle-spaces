/**
 * JournalCard Component
 *
 * Displays a journal entry in a card format with AI-generated metadata,
 * emotional context, and discovery features.
 *
 * Information Hierarchy:
 * 1. Title — What is this? (Primary)
 * 2. Synopsis — What's it about? (Secondary)
 * 3. Emotional context — How did I feel? (Tertiary)
 * 4. Discovery metadata — How do I find similar? (Supporting)
 * 5. Housekeeping — When, how long, what type? (Minimal)
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pin,
  Sparkles,
  Heart,
  CloudRain,
  Sun,
  Sunrise,
  HelpCircle,
  Frown,
  Meh,
  FileText,
  MessageSquareQuote,
} from 'lucide-react'
import styles from './JournalCard.module.css'

// Types
interface JournalAIMetadata {
  synopsis?: string
  themes?: string[]
  insights?: string[]
  sentiment?: string
  emotionalTone?: string
  generatedAt?: string
}

export interface JournalCardData {
  journalId: string
  spaceId: string
  title: string
  templateId?: string
  frameworkId?: string
  tags?: string[]
  emotions?: string[]
  createdAt: string
  updatedAt?: string
  wordCount?: number
  isPinned?: boolean
  aiMetadata?: JournalAIMetadata | null
}

export interface JournalCardProps {
  journal: JournalCardData
  onThemeClick?: (theme: string) => void
  onTagClick?: (tag: string) => void
}

// Sentiment configuration
const SENTIMENT_CONFIG: Record<
  string,
  {
    icon: React.ElementType
    color: string
    bgColor: string
    label: string
  }
> = {
  positive: {
    icon: Sun,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    label: 'Positive',
  },
  grateful: {
    icon: Heart,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    label: 'Grateful',
  },
  hopeful: {
    icon: Sunrise,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: 'Hopeful',
  },
  reflective: {
    icon: Sparkles,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    label: 'Reflective',
  },
  challenging: {
    icon: CloudRain,
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.15)',
    label: 'Challenging',
  },
  anxious: {
    icon: Frown,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Anxious',
  },
  neutral: {
    icon: Meh,
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    label: 'Neutral',
  },
  mixed: {
    icon: HelpCircle,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    label: 'Mixed',
  },
}

// Template display names
const TEMPLATE_NAMES: Record<string, string> = {
  express_examine_evolve: 'Express/Examine/Evolve',
  daily_log: 'Daily Log',
  daily_gratitude: 'Daily Gratitude',
  daily_lens: 'The Daily Lens',
  mood_tracker: 'Mood Tracker',
  goal_progress: 'Goal Progress',
  blank: 'Freeform',
}

export function JournalCard({ journal, onThemeClick, onTagClick }: JournalCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const {
    journalId,
    spaceId,
    title,
    templateId,
    tags = [],
    isPinned,
    createdAt,
    wordCount,
    aiMetadata,
  } = journal

  // Get sentiment config
  const sentiment = aiMetadata?.sentiment
  const sentimentConfig = sentiment ? SENTIMENT_CONFIG[sentiment] : null
  const SentimentIcon = sentimentConfig?.icon

  // Format date
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: createdAt.startsWith(new Date().getFullYear().toString()) ? undefined : 'numeric',
  })

  // Get template name
  const templateName = templateId ? TEMPLATE_NAMES[templateId] || templateId : null

  // Themes to display (max 3)
  const themes = aiMetadata?.themes || []
  const displayThemes = themes.slice(0, 3)
  const remainingThemes = themes.length - 3

  // Handle card click
  const handleCardClick = () => {
    navigate(`/spaces/${spaceId}/journals/${journalId}`)
  }

  // Handle theme click (stop propagation)
  const handleThemeClick = (e: React.MouseEvent, theme: string) => {
    e.stopPropagation()
    onThemeClick?.(theme)
  }

  // Handle tag click (stop propagation)
  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    onTagClick?.(tag)
  }

  return (
    <article
      className={`${styles.card} ${isHovered ? styles.hovered : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Header Row */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {isPinned && <Pin size={14} className={styles.pinIcon} />}
          {SentimentIcon && sentimentConfig && (
            <div
              className={styles.sentimentIcon}
              style={{
                color: sentimentConfig.color,
                backgroundColor: sentimentConfig.bgColor,
              }}
              title={sentimentConfig.label}
            >
              <SentimentIcon size={14} />
            </div>
          )}
        </div>
        <time className={styles.date} dateTime={createdAt}>
          {formattedDate}
        </time>
      </header>

      {/* Title */}
      <h3 className={styles.title}>{title || 'Untitled'}</h3>

      {/* Synopsis */}
      {aiMetadata?.synopsis && <p className={styles.synopsis}>{aiMetadata.synopsis}</p>}

      {/* Emotional Tone (if different from sentiment label) */}
      {aiMetadata?.emotionalTone && (
        <div className={styles.emotionalTone}>
          <MessageSquareQuote size={12} />
          <span>"{aiMetadata.emotionalTone}"</span>
        </div>
      )}

      {/* AI Themes */}
      {displayThemes.length > 0 && (
        <div className={styles.themes}>
          {displayThemes.map((theme) => (
            <button
              key={theme}
              className={styles.theme}
              onClick={(e) => handleThemeClick(e, theme)}
              title={`Filter by "${theme}"`}
            >
              {theme}
            </button>
          ))}
          {remainingThemes > 0 && <span className={styles.moreThemes}>+{remainingThemes}</span>}
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          {wordCount !== undefined && wordCount > 0 && (
            <span className={styles.wordCount}>
              <FileText size={12} />
              {wordCount.toLocaleString()} words
            </span>
          )}
          {templateName && <span className={styles.template}>{templateName}</span>}
        </div>

        {/* User Tags */}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 2).map((tag) => (
              <button
                key={tag}
                className={styles.tag}
                onClick={(e) => handleTagClick(e, tag)}
                title={`Filter by tag "${tag}"`}
              >
                #{tag}
              </button>
            ))}
            {tags.length > 2 && <span className={styles.moreTags}>+{tags.length - 2}</span>}
          </div>
        )}
      </footer>
    </article>
  )
}

export default JournalCard
