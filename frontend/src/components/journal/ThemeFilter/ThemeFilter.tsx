/**
 * Theme Filter Component
 *
 * Displays clickable theme pills for filtering journals by AI-generated themes.
 */

import { useState, useEffect } from 'react'
import { Tag, X } from 'lucide-react'
import { useAuth } from '../../../stores/authStore'
import styles from './ThemeFilter.module.css'

interface ThemeCount {
  theme: string
  count: number
}

interface ThemeFilterProps {
  spaceId: string
  selectedThemes: string[]
  onThemeSelect: (theme: string) => void
  onThemeDeselect: (theme: string) => void
  onClearAll: () => void
}

export function ThemeFilter({
  spaceId,
  selectedThemes,
  onThemeSelect,
  onThemeDeselect,
  onClearAll,
}: ThemeFilterProps) {
  const [themes, setThemes] = useState<ThemeCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const { accessToken } = useAuth()

  useEffect(() => {
    async function fetchThemes() {
      if (!accessToken) return

      try {
        const response = await fetch(`/api/spaces/${spaceId}/journals/themes`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch themes')
        }

        const data = await response.json()
        setThemes(data.themes || [])
      } catch (error) {
        console.error('Failed to fetch themes:', error)
        setThemes([])
      } finally {
        setIsLoading(false)
      }
    }

    if (spaceId) {
      fetchThemes()
    }
  }, [spaceId, accessToken])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading themes...</div>
      </div>
    )
  }

  if (themes.length === 0) return null

  const displayThemes = isExpanded ? themes : themes.slice(0, 10)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Tag size={14} />
          <span>Filter by Theme</span>
        </div>
        {selectedThemes.length > 0 && (
          <button onClick={onClearAll} className={styles.clearButton}>
            Clear all
          </button>
        )}
      </div>

      <div className={styles.themes}>
        {displayThemes.map(({ theme, count }) => {
          const isSelected = selectedThemes.includes(theme)
          return (
            <button
              key={theme}
              onClick={() =>
                isSelected ? onThemeDeselect(theme) : onThemeSelect(theme)
              }
              className={`${styles.themeButton} ${isSelected ? styles.selected : ''}`}
            >
              <span>{theme}</span>
              <span className={styles.count}>{count}</span>
              {isSelected && <X size={12} />}
            </button>
          )
        })}

        {themes.length > 10 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            {isExpanded ? 'Show less' : `+${themes.length - 10} more`}
          </button>
        )}
      </div>
    </div>
  )
}
