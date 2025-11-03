import { useState, useCallback, useEffect } from 'react';

/**
 * useSectionCollapse - Hook to manage collapse/expand state for journal sections
 *
 * Features:
 * - Track collapsed state for multiple sections
 * - Persist state in sessionStorage (optional)
 * - Calculate word count for collapsed sections
 * - Preserve scroll position when toggling
 * - Bulk operations: collapse all, expand all
 *
 * @param storageKey - Optional key for sessionStorage persistence
 * @returns Object with collapse state and control functions
 */
export const useSectionCollapse = (storageKey?: string) => {
  // Track which sections are collapsed
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Load from sessionStorage if available
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load collapsed sections from storage:', error);
      }
    }
    return new Set();
  });

  // Persist to sessionStorage when state changes
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(Array.from(collapsedSections)));
      } catch (error) {
        console.warn('Failed to save collapsed sections to storage:', error);
      }
    }
  }, [collapsedSections, storageKey]);

  /**
   * Check if a section is collapsed
   */
  const isCollapsed = useCallback((sectionId: string): boolean => {
    return collapsedSections.has(sectionId);
  }, [collapsedSections]);

  /**
   * Toggle collapse state for a section with scroll position preservation
   */
  const toggleCollapse = useCallback((sectionId: string) => {
    // Store current scroll position
    const scrollY = window.scrollY;

    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });

    // Restore scroll position after DOM update
    // Use requestAnimationFrame to wait for the DOM to update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, []);

  /**
   * Collapse a specific section
   */
  const collapseSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => new Set(prev).add(sectionId));
  }, []);

  /**
   * Expand a specific section
   */
  const expandSection = useCallback((sectionId: string) => {
    const scrollY = window.scrollY;

    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });

    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, []);

  /**
   * Collapse all sections
   */
  const collapseAll = useCallback((sectionIds: string[]) => {
    setCollapsedSections(new Set(sectionIds));
  }, []);

  /**
   * Expand all sections
   */
  const expandAll = useCallback(() => {
    setCollapsedSections(new Set());
  }, []);

  /**
   * Calculate word count for content
   * Useful for showing word count in collapsed state
   */
  const getWordCount = useCallback((content: string): number => {
    if (!content || typeof content !== 'string') return 0;

    // Remove markdown syntax and count words
    const plainText = content
      .replace(/[#*_~`]/g, '') // Remove markdown formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
      .trim();

    if (!plainText) return 0;

    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  }, []);

  /**
   * Get collapsed section info (for display purposes)
   */
  const getCollapsedInfo = useCallback((sectionId: string, content: string) => {
    if (!isCollapsed(sectionId)) return null;

    const wordCount = getWordCount(content);
    return {
      wordCount,
      isCollapsed: true,
    };
  }, [isCollapsed, getWordCount]);

  return {
    collapsedSections: Array.from(collapsedSections),
    isCollapsed,
    toggleCollapse,
    collapseSection,
    expandSection,
    collapseAll,
    expandAll,
    getWordCount,
    getCollapsedInfo,
  };
};
