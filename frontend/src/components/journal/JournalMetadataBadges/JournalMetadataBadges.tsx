/**
 * AI Metadata Badges for Journal Cards
 *
 * Displays sentiment badge and theme pills on journal cards.
 */

import React from 'react'
import {
  Sparkles,
  Heart,
  CloudRain,
  Sun,
  Sunrise,
  HelpCircle,
  Frown,
  Meh,
} from 'lucide-react'
import type { JournalAIMetadata, SentimentType } from '../../../features/journal/types/journal.types'
import styles from './JournalMetadataBadges.module.css'

interface JournalMetadataBadgesProps {
  metadata: JournalAIMetadata | null | undefined
  showThemes?: boolean
  showSentiment?: boolean
  maxThemes?: number
  compact?: boolean
}

const SENTIMENT_CONFIG: Record<
  SentimentType,
  { icon: React.ElementType; color: string; label: string }
> = {
  positive: { icon: Sun, color: '#22c55e', label: 'Positive' },
  grateful: { icon: Heart, color: '#ec4899', label: 'Grateful' },
  hopeful: { icon: Sunrise, color: '#f59e0b', label: 'Hopeful' },
  reflective: { icon: Sparkles, color: '#8b5cf6', label: 'Reflective' },
  challenging: { icon: CloudRain, color: '#6366f1', label: 'Challenging' },
  anxious: { icon: Frown, color: '#ef4444', label: 'Anxious' },
  neutral: { icon: Meh, color: '#6b7280', label: 'Neutral' },
  mixed: { icon: HelpCircle, color: '#8b5cf6', label: 'Mixed' },
}

export function JournalMetadataBadges({
  metadata,
  showThemes = true,
  showSentiment = true,
  maxThemes = 3,
  compact = false,
}: JournalMetadataBadgesProps) {
  if (!metadata) return null

  const { themes, sentiment } = metadata
  const sentimentConfig = sentiment ? SENTIMENT_CONFIG[sentiment] : null

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Sentiment Badge */}
      {showSentiment && sentimentConfig && (
        <div
          className={styles.sentimentBadge}
          style={{ '--sentiment-color': sentimentConfig.color } as React.CSSProperties}
          title={sentimentConfig.label}
        >
          <sentimentConfig.icon size={compact ? 12 : 14} />
          {!compact && <span>{sentimentConfig.label}</span>}
        </div>
      )}

      {/* Theme Pills */}
      {showThemes && themes && themes.length > 0 && (
        <div className={styles.themes}>
          {themes.slice(0, maxThemes).map((theme, i) => (
            <span key={i} className={styles.theme}>
              {theme}
            </span>
          ))}
          {themes.length > maxThemes && (
            <span className={styles.moreThemes}>+{themes.length - maxThemes}</span>
          )}
        </div>
      )}
    </div>
  )
}
