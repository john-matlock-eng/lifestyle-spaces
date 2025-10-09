import React from 'react'
import { useParams } from 'react-router-dom'
import { JournalList } from '../components/JournalList'
import '../styles/journal.css'

/**
 * Page for displaying all journals in a space
 */
export const JournalListPage: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>()

  if (!spaceId) {
    return (
      <div className="journal-list-container">
        <p>Error: Space ID not found</p>
      </div>
    )
  }

  return <JournalList spaceId={spaceId} />
}
