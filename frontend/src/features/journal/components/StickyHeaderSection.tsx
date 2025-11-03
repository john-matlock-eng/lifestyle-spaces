/**
 * StickyHeaderSection - Wraps section content with sticky header behavior
 *
 * Features:
 * - Header becomes sticky when scrolled past
 * - Shrinks to compact size when sticky (reduce padding, smaller font)
 * - Shows section progress indicator (e.g., "Section 2 of 5")
 * - Smooth transition animations
 * - Double-click header to collapse/expand section
 * - Keyboard accessible (Enter/Space to toggle)
 *
 * Usage:
 * <StickyHeaderSection
 *   sectionId="intro"
 *   title="Introduction"
 *   icon="📝"
 *   index={0}
 *   total={5}
 *   isCollapsed={false}
 *   onToggleCollapse={() => {}}
 *   wordCount={247}
 * >
 *   <YourSectionContent />
 * </StickyHeaderSection>
 */
import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/sticky-header.css';

interface StickyHeaderSectionProps {
  /** Unique section ID */
  sectionId: string;
  /** Section title */
  title: string;
  /** Optional icon/emoji for the section */
  icon?: string;
  /** Current section index (0-based) */
  index: number;
  /** Total number of sections */
  total: number;
  /** Whether the section is collapsed */
  isCollapsed: boolean;
  /** Callback when user toggles collapse state */
  onToggleCollapse: () => void;
  /** Word count for collapsed state display */
  wordCount?: number;
  /** Section content */
  children: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

export const StickyHeaderSection: React.FC<StickyHeaderSectionProps> = ({
  sectionId,
  title,
  icon,
  index,
  total,
  isCollapsed,
  onToggleCollapse,
  wordCount = 0,
  children,
  className = '',
}) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  // Use IntersectionObserver to detect when header becomes sticky
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    // Create a sentinel element just above the sticky header
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.position = 'absolute';
    sentinel.style.top = '-1px';
    sentinel.style.left = '0';
    sentinel.style.width = '100%';
    sentinel.style.pointerEvents = 'none';

    header.parentElement?.insertBefore(sentinel, header);

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel goes out of view at top, header is sticky
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '0px',
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse();
    }
  };

  // Generate short title for sticky mode (first 30 chars + ...)
  const shortTitle = title.length > 30 ? `${title.substring(0, 30)}...` : title;

  return (
    <div
      className={`sticky-header-section ${isCollapsed ? 'collapsed' : ''} ${className}`}
      data-section-id={sectionId}
    >
      {/* Sticky Header */}
      <div
        ref={headerRef}
        className={`sticky-header ${isSticky ? 'sticky-active' : ''}`}
        onDoubleClick={onToggleCollapse}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`section-content-${sectionId}`}
        aria-label={`${title} section header. Double-click to ${isCollapsed ? 'expand' : 'collapse'}`}
      >
        <div className="sticky-header-content">
          {/* Left: Icon + Title */}
          <div className="sticky-header-left">
            {icon && <span className="sticky-header-icon">{icon}</span>}
            <h3 className="sticky-header-title">
              {isSticky ? shortTitle : title}
            </h3>
          </div>

          {/* Right: Progress + Collapse Toggle */}
          <div className="sticky-header-right">
            {/* Section progress indicator */}
            <div className="sticky-header-progress">
              <span className="progress-badge">
                {index + 1} of {total}
              </span>
            </div>

            {/* Collapse/Expand Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="collapse-toggle-btn"
              aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              title={isCollapsed ? 'Expand section' : 'Collapse section'}
            >
              {isCollapsed ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronUp size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Sticky mode compact indicator */}
        {isSticky && (
          <div className="sticky-header-indicator">
            <div className="sticky-header-line" />
          </div>
        )}
      </div>

      {/* Section Content or Collapsed Placeholder */}
      <div
        id={`section-content-${sectionId}`}
        className="section-content-wrapper"
        aria-hidden={isCollapsed}
      >
        {isCollapsed ? (
          <div
            className="collapsed-section-placeholder"
            onClick={onToggleCollapse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleCollapse();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Expand ${title} section. ${wordCount} words.`}
          >
            <div className="collapsed-placeholder-content">
              <div className="collapsed-placeholder-icon">📦</div>
              <div className="collapsed-placeholder-text">
                <div className="collapsed-placeholder-title">
                  {icon && <span>{icon}</span>}
                  {title}
                  <span className="collapsed-badge">collapsed</span>
                </div>
                <div className="collapsed-placeholder-meta">
                  {wordCount > 0 ? `${wordCount} words` : 'No content'} • Click to expand
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="section-content-inner">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
