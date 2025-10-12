/**
 * Template-related type definitions
 */

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
}

export interface TemplateListResponse {
  templates: Template[]
  total: number
}

export interface TemplateData {
  [sectionId: string]: string | QAPair[] | ListItem[] | number
}
