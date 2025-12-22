/**
 * Journal Synopsis Component
 *
 * Displays AI-generated synopsis with expandable insights.
 */

import React, { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { JournalMetadataBadges } from '../JournalMetadataBadges'
import type { JournalAIMetadata } from '../../../features/journal/types/journal.types'
import styles from './JournalSynopsis.module.css'

interface JournalSynopsisProps {
  metadata: JournalAIMetadata | null | undefined
  defaultExpanded?: boolean
}

export function JournalSynopsis({
  metadata,
  defaultExpanded = false,
}: JournalSynopsisProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!metadata || !metadata.synopsis) return null

  const hasInsights = metadata.insights && metadata.insights.length > 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={16} className={styles.icon} />
          <span className={styles.title}>AI Summary</span>
        </div>
        {hasInsights && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            {isExpanded ? 'Less' : 'Insights'}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      <p className={styles.synopsis}>{metadata.synopsis}</p>

      {metadata.emotionalTone && (
        <p className={styles.emotionalTone}>
          <em>"{metadata.emotionalTone}"</em>
        </p>
      )}

      <JournalMetadataBadges
        metadata={metadata}
        showSentiment={true}
        showThemes={true}
        maxThemes={5}
      />

      {/* Expandable Insights */}
      {isExpanded && hasInsights && (
        <div className={styles.insights}>
          <div className={styles.insightsHeader}>
            <Lightbulb size={14} />
            <span>Key Insights</span>
          </div>
          <ul className={styles.insightsList}>
            {metadata.insights!.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
