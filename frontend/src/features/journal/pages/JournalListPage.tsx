import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { JournalList } from '../components/JournalList'
import { ElliePerch } from '../../../components/ellie'
import { useEllieCustomizationContext } from '../../../hooks/useEllieCustomizationContext'
import { ChatSidebar, ChatBottomSheet } from '../../chat'
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
      <ElliePerch
        showThoughtBubble={true}
        thoughtText="Browse your journals! 📖"
        size="md"
        onClick={() => setMood(mood === 'playful' ? 'curious' : 'playful')}
        furColor={customization.furColor}
        collarStyle={customization.collarStyle}
        collarColor={customization.collarColor}
        collarTag={customization.collarTag}
        showPerchControl={true}
      />

      {/* Ellie Chat - Desktop sidebar and mobile bottom sheet */}
      <ChatSidebar spaceId={spaceId} />
      <ChatBottomSheet spaceId={spaceId} />
    </>
  )
}
