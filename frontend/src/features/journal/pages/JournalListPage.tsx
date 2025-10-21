import React from 'react'
import { useParams } from 'react-router-dom'
import { JournalList } from '../components/JournalList'
import { Ellie } from '../../../components/ellie'
import { useShihTzuCompanion } from '../../../hooks'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import '../styles/journal.css'

/**
 * Page for displaying all journals in a space
 */
export const JournalListPage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>()

  // Ellie companion
  const { mood, setMood, position } = useShihTzuCompanion({
    initialMood: 'curious',
    initialPosition: {
      x: Math.min(window.innerWidth * 0.8, window.innerWidth - 150),
      y: 100
    }
  })

  // Ellie customization
  const { customization } = useEllieCustomizationContext()

  if (!spaceId) {
    return (
      <div className="journal-list-container">
        <p>Error: Space ID not found</p>
      </div>
    )
  }

  return (
    <>
      <JournalList spaceId={spaceId} />

      {/* Ellie companion */}
      <Ellie
        mood={mood}
        position={position}
        showThoughtBubble={true}
        thoughtText="Browse your journals! 📖"
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'curious' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
      />
    </>
  )
}
