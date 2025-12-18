/**
 * Template-related type definitions
 */

export type EllieMood =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'playful'
  | 'sleeping'
  | 'walking'
  | 'concerned'
  | 'proud'
  | 'zen'
  | 'celebrating'

export interface EllieGuidance {
  mood?: EllieMood
  message?: string
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null
  animation?: 'bounce' | 'sway' | 'spin' | 'pulse'
  delay?: number // milliseconds before showing
}

export interface QAPair {
  id: string
  question: string
  answer: string
  isCollapsed?: boolean
}

export interface ListItem {
  id: string
  text: string
}

export interface TableRow {
  id: string
  [key: string]: string | number
}

export interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'number'
  width?: string
}

// Moment blocks types for "The Daily Lens" template
export interface MomentSubField {
  id: string
  label: string
  placeholder: string
  hint?: string
  optional?: boolean
}

export interface MomentBlocksConfig {
  minMoments: number
  maxMoments: number
  defaultMoments: number
  textareaRows: number
  subFields: MomentSubField[]
}

export interface MomentBlock {
  id: string
  scene: string
  reaction: string
  takeaway: string
}

export interface TemplateSection {
  id: string
  title: string
  type: string
  placeholder: string
  defaultValue?: string | number | unknown[]
  config?: {
    suggested_questions?: string[]
    min_pairs?: number
    max_pairs?: number
    min?: number
    max?: number
    labels?: Record<string, string>
    columns?: TableColumn[]
    // Moment blocks config
    minMoments?: number
    maxMoments?: number
    defaultMoments?: number
    textareaRows?: number
    subFields?: MomentSubField[]
  }

  // Ellie guidance fields
  ellie?: {
    onStart?: EllieGuidance          // When user starts this section
    onProgress?: EllieGuidance       // While user is working (e.g., 50% complete)
    onComplete?: EllieGuidance       // When section is completed
    onSkip?: EllieGuidance          // If user skips this section
    hints?: string[]                 // Random hints Ellie can provide
    encouragement?: {
      wordCount?: Record<number, EllieGuidance>  // Word count milestones
      timeSpent?: Record<number, EllieGuidance>  // Time spent milestones (seconds)
      itemCount?: Record<number, EllieGuidance>  // Item count milestones (for lists/Q&A)
      momentCount?: Record<number, EllieGuidance>  // Moment count milestones (for moment_blocks)
    }
  }
}

export interface Template {
  id: string
  name: string
  description: string
  version: number
  sections: TemplateSection[]
  icon?: string
  color?: string

  /**
   * Framework ID if this template belongs to a framework
   * Templates can exist independently or as part of a framework
   */
  frameworkId?: string

  /**
   * Framework name for display purposes
   * Denormalized for convenience in UI rendering
   */
  frameworkName?: string

  // Template-level Ellie guidance
  ellie?: {
    onSelect?: EllieGuidance       // When template is selected
    onStart?: EllieGuidance        // When user begins journaling
    onComplete?: EllieGuidance     // When all sections complete
    onSave?: EllieGuidance         // When journal is saved
    theme?: {                      // Overall emotional theme
      supportive?: boolean          // Extra gentle/supportive
      energetic?: boolean           // High energy/excitement
      reflective?: boolean          // Calm and thoughtful
    }
  }
}

export interface TemplateListResponse {
  templates: Template[]
  total: number
}

export interface TemplateData {
  [sectionId: string]: string | QAPair[] | ListItem[] | TableRow[] | MomentBlock[] | number
}
