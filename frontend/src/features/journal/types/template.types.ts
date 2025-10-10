/**
 * Template-related type definitions
 */

export interface TemplateSection {
  id: string
  title: string
  type: string
  placeholder: string
  defaultValue?: string
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
  [sectionId: string]: string
}
