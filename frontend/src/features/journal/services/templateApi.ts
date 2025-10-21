/**
 * Template API service
 */
import { apiService } from '../../../services/api'
import type { Template, TemplateListResponse } from '../types/template.types'

/**
 * Get all available templates
 */
export async function getTemplates(): Promise<TemplateListResponse> {
  return apiService.get<TemplateListResponse>('/api/templates')
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(templateId: string): Promise<Template> {
  return apiService.get<Template>(`/api/templates/${templateId}`)
}
