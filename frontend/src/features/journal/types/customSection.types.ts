/**
 * Custom section types for dynamic journal sections
 */

export interface CustomSection {
  id: string
  title: string
  type: string
  content: string | number | unknown[]
  config?: Record<string, unknown>
  isEditing?: boolean
}

export interface NewCustomSection {
  id: string
  title: string
  type: string
  content: string | number | unknown[]
  config?: Record<string, unknown>
}
