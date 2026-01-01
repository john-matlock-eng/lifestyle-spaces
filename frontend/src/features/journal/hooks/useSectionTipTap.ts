/**
 * Hook for managing multi-section TipTap state
 *
 * Handles both single-document and multi-section TipTap formats:
 * - Single: { type: 'doc', content: [...] }
 * - Multi: { sectionId: { type: 'doc', content: [...] }, ... }
 *
 * Prevents state collision when multiple RichTextEditor instances exist
 */

import { useState, useCallback } from 'react'

interface SectionTipTapState {
  [sectionId: string]: Record<string, unknown>
}

interface UseSectionTipTapReturn {
  sectionContents: SectionTipTapState
  updateSection: (sectionId: string, content: Record<string, unknown>) => void
  removeSection: (sectionId: string) => void
  getSectionContent: (sectionId: string) => Record<string, unknown> | null
  getAllSections: () => SectionTipTapState | null
  hasSection: (sectionId: string) => boolean
  getSectionIds: () => string[]
  hasChanges: boolean
  reset: () => void
  isSingleSection: boolean
  setAllSections: (sections: SectionTipTapState) => void
}

export const useSectionTipTap = (
  initialContent?: SectionTipTapState | Record<string, unknown> | null
): UseSectionTipTapReturn => {
  const [sectionContents, setSectionContents] = useState<SectionTipTapState>(() => {
    // Handle different input formats
    if (!initialContent) return {}

    // Check if it's single TipTap document format (has 'type' field at root)
    if (
      typeof initialContent === 'object' &&
      'type' in initialContent &&
      initialContent.type === 'doc'
    ) {
      // Convert single format to multi-section with 'content' key
      return { content: initialContent as Record<string, unknown> }
    }

    // Already multi-section format or empty object
    return initialContent as SectionTipTapState
  })

  const [hasChanges, setHasChanges] = useState(false)
  const isSingleSection = Object.keys(sectionContents).length === 1 && 'content' in sectionContents

  // Update a specific section's TipTap content
  const updateSection = useCallback((sectionId: string, content: Record<string, unknown>) => {
    console.log('[useSectionTipTap] updateSection called:', { sectionId, hasContent: !!content.content })
    setSectionContents(prev => {
      // Only update if actually changed (avoid unnecessary re-renders)
      const prevContent = prev[sectionId]
      if (prevContent && JSON.stringify(prevContent) === JSON.stringify(content)) {
        console.log('[useSectionTipTap] Content unchanged, skipping update')
        return prev
      }

      setHasChanges(true)
      const next = {
        ...prev,
        [sectionId]: content
      }
      console.log('[useSectionTipTap] Updated section contents:', { sectionIds: Object.keys(next) })
      return next
    })
  }, [])

  // Remove a section
  const removeSection = useCallback((sectionId: string) => {
    setSectionContents(prev => {
      if (!(sectionId in prev)) return prev

      const next = { ...prev }
      delete next[sectionId]
      setHasChanges(true)
      return next
    })
  }, [])

  // Get content for a specific section
  // Returns null if the content is not a valid TipTap document to prevent schema errors
  const getSectionContent = useCallback(
    (sectionId: string): Record<string, unknown> | null => {
      const content = sectionContents[sectionId]
      if (!content) return null

      // Validate that content is a proper TipTap document (has type: 'doc')
      // This prevents schema errors when malformed content is passed to TipTap
      if (
        typeof content === 'object' &&
        content !== null &&
        'type' in content &&
        content.type === 'doc'
      ) {
        return content
      }

      // Return null for malformed content to fall back to text-based editing
      console.warn('[useSectionTipTap] Malformed section content for:', sectionId, content)
      return null
    },
    [sectionContents]
  )

  // Get all sections for saving
  const getAllSections = useCallback((): SectionTipTapState | null => {
    const sectionCount = Object.keys(sectionContents).length
    console.log('[useSectionTipTap] getAllSections called:', {
      sectionCount,
      sectionIds: Object.keys(sectionContents),
      sectionContents: Object.keys(sectionContents).reduce((acc, key) => {
        const section = sectionContents[key]
        return {
          ...acc,
          [key]: {
            type: section && typeof section === 'object' && 'type' in section ? section.type : undefined,
            hasContent: section && typeof section === 'object' && 'content' in section ? !!section.content : false
          }
        }
      }, {})
    })

    // Return null if empty
    if (sectionCount === 0) {
      console.log('[useSectionTipTap] No sections, returning null')
      return null
    }

    // If single section with 'content' key, return just the document for backward compatibility
    if (sectionCount === 1 && 'content' in sectionContents) {
      console.log('[useSectionTipTap] Single section mode, returning just the document')
      return sectionContents.content as unknown as SectionTipTapState
    }

    // Multi-section format
    console.log('[useSectionTipTap] Multi-section mode, returning all sections')
    return sectionContents
  }, [sectionContents])

  // Check if we have content for a section
  const hasSection = useCallback(
    (sectionId: string): boolean => {
      return sectionId in sectionContents
    },
    [sectionContents]
  )

  // Get list of section IDs
  const getSectionIds = useCallback((): string[] => {
    return Object.keys(sectionContents)
  }, [sectionContents])

  // Reset to initial state
  const reset = useCallback(() => {
    if (!initialContent) {
      setSectionContents({})
    } else if (
      typeof initialContent === 'object' &&
      'type' in initialContent &&
      initialContent.type === 'doc'
    ) {
      setSectionContents({ content: initialContent as Record<string, unknown> })
    } else {
      setSectionContents(initialContent as SectionTipTapState)
    }
    setHasChanges(false)
  }, [initialContent])

  // Set all sections at once (useful for initialization after load)
  // Handles both single-doc and multi-section formats for backward compatibility
  const setAllSections = useCallback((sections: SectionTipTapState | Record<string, unknown>) => {
    if (!sections || typeof sections !== 'object') {
      console.warn('[useSectionTipTap] setAllSections: Invalid sections, using empty state')
      setSectionContents({})
      setHasChanges(false)
      return
    }

    // Check if it's single TipTap document format (has 'type' field at root)
    if ('type' in sections && sections.type === 'doc') {
      // Convert single format to multi-section with 'content' key
      console.log('[useSectionTipTap] setAllSections: Converting single-doc format to multi-section')
      setSectionContents({ content: sections as Record<string, unknown> })
    } else {
      // Multi-section format - validate each section
      const validSections: SectionTipTapState = {}
      for (const [key, value] of Object.entries(sections)) {
        if (
          value &&
          typeof value === 'object' &&
          'type' in value &&
          (value as Record<string, unknown>).type === 'doc'
        ) {
          validSections[key] = value as Record<string, unknown>
        } else {
          console.warn('[useSectionTipTap] setAllSections: Skipping malformed section:', key, value)
        }
      }
      setSectionContents(validSections)
    }
    setHasChanges(false)
  }, [])

return {
  sectionContents,
  updateSection,
  removeSection,
  getSectionContent,
  getAllSections,
  hasSection,
  getSectionIds,
  hasChanges,
  reset,
  isSingleSection,
  setAllSections
}
}
