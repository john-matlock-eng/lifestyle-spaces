import type { TemplateFrequency } from './framework.types'

/**
 * Sentiment types for AI-generated metadata
 */
export type SentimentType =
  | 'reflective'
  | 'positive'
  | 'challenging'
  | 'grateful'
  | 'anxious'
  | 'hopeful'
  | 'neutral'
  | 'mixed'

/**
 * AI-generated metadata for a journal entry
 */
export interface JournalAIMetadata {
  /** 2-3 sentence summary of the journal entry */
  synopsis: string
  /** 3-7 topic tags/themes */
  themes: string[]
  /** Key takeaways or realizations (0-5) */
  insights: string[]
  /** Overall emotional tone */
  sentiment: SentimentType
  /** More nuanced emotional description */
  emotionalTone?: string
  /** When the metadata was generated */
  generatedAt: string
  /** Model that generated this metadata */
  modelUsed?: string
}

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
  contentTiptap?: Record<string, unknown> | null  // TipTap JSON format for native highlighting
  templateId?: string  // For identifying which template was used
  tags: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  createdAt: string
  updatedAt: string
  wordCount: number
  isPinned: boolean
  author?: JournalAuthor

  /**
   * Framework ID if this journal was created as part of a framework
   * Used for tracking progress and organizing framework-related entries
   */
  frameworkId?: string

  /**
   * The frequency context in which this journal was created
   * e.g., 'daily' for a daily check-in, 'weekly' for a weekly review
   * Helps with progress tracking and cycle completion
   */
  templateFrequency?: TemplateFrequency

  /**
   * AI-generated metadata (synopsis, themes, insights, sentiment)
   * Generated asynchronously after journal creation/update
   */
  aiMetadata?: JournalAIMetadata
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
  contentTiptap?: Record<string, unknown>  // TipTap JSON format for native highlighting
  tags?: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  templateId?: string  // For identifying which template was used
  /** Framework ID if creating as part of a framework */
  frameworkId?: string
  /** Template frequency for framework progress tracking */
  templateFrequency?: TemplateFrequency
}

/**
 * Update journal request payload
 * NOTE: content should contain serialized template data via JournalContentManager
 */
export interface UpdateJournalRequest {
  title?: string
  content?: string  // Serialized with JournalContentManager.serialize()
  contentTiptap?: Record<string, unknown>  // TipTap JSON format for native highlighting
  tags?: string[]
  emotions?: string[]  // New field for multiple emotion IDs
  isPinned?: boolean
  templateId?: string  // For identifying which template was used
  /** Framework ID if updating as part of a framework */
  frameworkId?: string
  /** Template frequency for framework progress tracking */
  templateFrequency?: TemplateFrequency
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
