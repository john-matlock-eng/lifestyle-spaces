/**
 * Utility functions for working with TipTap JSON content
 */

import type { QAPair, ListItem, TableRow } from '../../features/journal/types/template.types'

/**
 * Extract plain text from TipTap JSON
 */
export function extractTextFromTipTap(content: Record<string, unknown>): string {
  if (!content || typeof content !== 'object') return ''

  // Handle multi-section format { sectionId: { type: 'doc', content: [...] }, ... }
  if (!('type' in content)) {
    const sections = Object.values(content)
    return sections.map(section =>
      extractTextFromTipTapNode(section as Record<string, unknown>)
    ).join('\n\n')
  }

  // Handle single document format { type: 'doc', content: [...] }
  return extractTextFromTipTapNode(content)
}

/**
 * Extract plain text from a single TipTap document node
 */
function extractTextFromTipTapNode(node: Record<string, unknown>): string {
  if (!node || typeof node !== 'object') return ''

  let text = ''

  // If node has text content, add it
  if ('text' in node && typeof node.text === 'string') {
    text += node.text
  }

  // Recursively extract from content array
  if ('content' in node && Array.isArray(node.content)) {
    const childTexts = node.content.map(child =>
      extractTextFromTipTapNode(child as Record<string, unknown>)
    )
    text += childTexts.join('')
  }

  // Handle custom nodes (like qaPair)
  if ('type' in node && node.type === 'qaPair' && 'attrs' in node) {
    const attrs = node.attrs as Record<string, unknown>
    const question = attrs.question as string || ''
    const answer = attrs.answer as string || ''
    text += `Q: ${question}\nA: ${answer}\n`
  }

  // Add newlines for paragraph and heading nodes
  if ('type' in node && (node.type === 'paragraph' || node.type === 'heading')) {
    text += '\n'
  }

  return text
}

/**
 * Extract section information from multi-section TipTap content
 */
export interface TipTapSection {
  id: string
  title: string
  type: string
  content: Record<string, unknown>
}

export function extractSectionsFromTipTap(
  contentTiptap: Record<string, unknown> | null | undefined,
  template?: { sections: Array<{ id: string; title: string; type: string }> }
): TipTapSection[] {
  if (!contentTiptap) return []

  // Check if it's multi-section format (no 'type' field at root)
  if (!('type' in contentTiptap)) {
    return Object.entries(contentTiptap).map(([sectionId, sectionContent]) => {
      // Get title from template if available
      const templateSection = template?.sections.find(s => s.id === sectionId)

      return {
        id: sectionId,
        title: templateSection?.title || sectionId,
        type: templateSection?.type || 'paragraph',
        content: sectionContent as Record<string, unknown>
      }
    })
  }

  // Single document format - return as single section
  return [{
    id: 'content',
    title: 'Content',
    type: 'paragraph',
    content: contentTiptap
  }]
}

/**
 * Extract template data from TipTap content for editing
 * Converts TipTap JSON structure back to the format used by the edit form
 */
export function extractTemplateDataFromTipTap(
  contentTiptap: Record<string, unknown> | null | undefined
): Record<string, string | QAPair[] | ListItem[] | TableRow[] | number> {
  if (!contentTiptap) return {}

  const templateData: Record<string, string | QAPair[] | ListItem[] | TableRow[] | number> = {}

  // Handle multi-section format
  if (!('type' in contentTiptap)) {
    Object.entries(contentTiptap).forEach(([sectionId, sectionContent]) => {
      if (typeof sectionContent !== 'object' || !sectionContent) return

      const node = sectionContent as Record<string, unknown>

      // Check if section contains qaPair nodes
      if ('content' in node && Array.isArray(node.content)) {
        const hasQAPairs = node.content.some(
          (child: unknown) => typeof child === 'object' && child !== null && 'type' in child && child.type === 'qaPair'
        )

        if (hasQAPairs) {
          // Extract Q&A pairs from TipTap qaPair nodes
          const qaPairs: QAPair[] = node.content
            .filter((child: unknown) =>
              typeof child === 'object' && child !== null && 'type' in child && child.type === 'qaPair'
            )
            .map((child: unknown) => {
              const qaPairNode = child as Record<string, unknown>
              const attrs = (qaPairNode.attrs || {}) as Record<string, unknown>
              return {
                id: (attrs.id as string) || '',
                question: (attrs.question as string) || '',
                answer: (attrs.answer as string) || '',
                isCollapsed: (attrs.isCollapsed as boolean) || false
              }
            })

          templateData[sectionId] = qaPairs
        } else {
          // Extract plain text from other node types
          templateData[sectionId] = extractTextFromTipTapNode(node)
        }
      }
    })
  }

  return templateData
}
