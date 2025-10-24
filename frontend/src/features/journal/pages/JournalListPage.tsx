import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { JournalList } from '../components/JournalList'
import { SmartEllie } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import '../styles/journal.css'

/**
 * Page for displaying all journals in a space
 */
export const JournalListPage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>()

  // Ellie companion state
  const [mood, setMood] = useState<'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'>('curious');

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
      <SmartEllie
        mood={mood}
        showThoughtBubble={true}
        thoughtText="Browse your journals! 📖"
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'curious' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        enableSmartPositioning={true}
        showControlPanel={true}
      />
    </>
  )
}
