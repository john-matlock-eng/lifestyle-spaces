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
  mood?: string
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
 * Create journal request payload
 */
export interface CreateJournalRequest {
  spaceId: string
  title: string
  content: string
  tags?: string[]
  mood?: string
  isPinned?: boolean
}

/**
 * Update journal request payload
 */
export interface UpdateJournalRequest {
  title?: string
  content?: string
  tags?: string[]
  mood?: string
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
