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
 * TipTap-Only Format: API now returns ONLY contentTiptap, no markdown content field
 */
export interface JournalEntry {
  journalId: string
  spaceId: string
  userId: string
  title: string
  contentTiptap?: Record<string, unknown> | null  // TipTap JSON format (primary and only content format)
  templateId?: string  // For identifying which template was used
  tags: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  createdAt: string
  updatedAt: string
  wordCount: number
  isPinned: boolean
  isPrivate: boolean  // Privacy setting
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
 * TipTap-Only Format: contentTiptap is now required, no markdown content field
 */
export interface CreateJournalRequest {
  title: string
  contentTiptap: Record<string, unknown>  // TipTap JSON format (required)
  tags?: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  isPrivate?: boolean  // Privacy setting
  templateId?: string  // For identifying which template was used
}

/**
 * Update journal request payload
 * TipTap-Only Format: Only contentTiptap is accepted, no markdown content field
 */
export interface UpdateJournalRequest {
  title?: string
  contentTiptap?: Record<string, unknown>  // TipTap JSON format
  tags?: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  isPrivate?: boolean  // Privacy setting
  templateId?: string  // For identifying which template was used
}

/**
 * Journal list query parameters
 */
export interface JournalListParams {
  page?: number
  pageSize?: number
  tags?: string
  authorId?: string
}
