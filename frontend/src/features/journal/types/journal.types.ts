/**
 * Journal entry author information
 */
export interface JournalAuthor {
  userId: string
  username: string
  displayName: string
  email: string
}

/**
 * Journal entry interface matching backend response format
 */
export interface JournalEntry {
  journalId: string
  spaceId: string
  userId: string
  title: string
  content: string
  templateId?: string
  templateData?: Record<string, unknown>
  tags: string[]
  mood?: string  // Legacy field for backward compatibility
  emotions?: string[]  // New field for multiple emotion IDs
  createdAt: string
  updatedAt: string
  wordCount: number
  isPinned: boolean
  author?: JournalAuthor
}

/**
 * Journal list response with pagination
 */
export interface JournalListResponse {
  journals: JournalEntry[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Create journal request payload (spaceId comes from URL, not body)
 */
export interface CreateJournalRequest {
  title: string
  content: string
  tags?: string[]
  mood?: string  // Legacy field for backward compatibility
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  templateId?: string
  templateData?: Record<string, unknown>
}

/**
 * Update journal request payload
 */
export interface UpdateJournalRequest {
  title?: string
  content?: string
  tags?: string[]
  mood?: string  // Legacy field for backward compatibility
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
}

/**
 * Journal list query parameters
 */
export interface JournalListParams {
  page?: number
  pageSize?: number
  tags?: string
  mood?: string
  authorId?: string
}
