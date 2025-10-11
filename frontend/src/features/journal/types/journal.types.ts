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
 * NOTE: Template data is now embedded in the content field using JournalContentManager
 */
export interface JournalEntry {
  journalId: string
  spaceId: string
  userId: string
  title: string
  content: string  // Contains embedded template metadata via HTML comments
  templateId?: string  // For identifying which template was used
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
 * NOTE: content should contain serialized template data via JournalContentManager
 */
export interface CreateJournalRequest {
  title: string
  content: string  // Serialized with JournalContentManager.serialize()
  tags?: string[]
  mood?: string  // Legacy field for backward compatibility
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  templateId?: string  // For identifying which template was used
}

/**
 * Update journal request payload
 * NOTE: content should contain serialized template data via JournalContentManager
 */
export interface UpdateJournalRequest {
  title?: string
  content?: string  // Serialized with JournalContentManager.serialize()
  tags?: string[]
  mood?: string  // Legacy field for backward compatibility
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  templateId?: string  // For identifying which template was used
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
