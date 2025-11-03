/**
 * SectionNavigator Usage Examples
 *
 * This file demonstrates various ways to use the SectionNavigator component
 * with the useReadingProgress hook.
 */

import React from 'react'
import { SectionNavigator } from './SectionNavigator'
import { useReadingProgress } from '../hooks/useReadingProgress'
import type { DisplaySection } from '../../../lib/journal/types'

/**
 * Example 1: Basic Usage
 * Minimal setup with default options
 */
export const BasicExample: React.FC = () => {
  const content = `
<!-- section:intro @title:"Introduction" @type:prose -->
Welcome to my journal entry. This is the introduction section.
<!-- /section:intro -->

<!-- section:main @title:"Main Content" @type:prose -->
This is where I write about my day and experiences.
<!-- /section:main -->

<!-- section:conclusion @title:"Conclusion" @type:prose -->
Final thoughts and reflections.
<!-- /section:conclusion -->
  `

  const sections: DisplaySection[] = [
    { id: 'intro', title: 'Introduction', type: 'prose', content: 'Welcome to my journal entry. This is the introduction section.' },
    { id: 'main', title: 'Main Content', type: 'prose', content: 'This is where I write about my day and experiences.' },
    { id: 'conclusion', title: 'Conclusion', type: 'prose', content: 'Final thoughts and reflections.' }
  ]

  return (
    <div>
      <h1>My Journal Entry</h1>
      {sections.map(section => (
        <div key={section.id} data-section-id={section.id}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </div>
      ))}

      <SectionNavigator content={content} sections={sections} />
    </div>
  )
}

/**
 * Example 2: Custom Reading Speed
 * For faster/slower readers, adjust words per minute
 */
export const CustomReadingSpeedExample: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  return (
    <>
      {/* For fast readers (300 wpm) */}
      <SectionNavigator
        content={content}
        sections={sections}
        options={{ wordsPerMinute: 300 }}
      />

      {/* For slower, careful reading (150 wpm) */}
      <SectionNavigator
        content={content}
        sections={sections}
        options={{ wordsPerMinute: 150 }}
      />
    </>
  )
}

/**
 * Example 3: Left-Side Navigator
 * Position the navigator on the left side
 */
export const LeftSideExample: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  return (
    <SectionNavigator
      content={content}
      sections={sections}
      position="left"
    />
  )
}

/**
 * Example 4: Custom Container Scrolling
 * Track scrolling within a specific container instead of window
 */
export const ContainerScrollExample: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  return (
    <>
      <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
        {/* Your scrollable content */}
        {sections.map(section => (
          <div key={section.id} data-section-id={section.id}>
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </div>
        ))}
      </div>

      <SectionNavigator
        content={content}
        sections={sections}
        options={{ containerRef }}
      />
    </>
  )
}

/**
 * Example 5: Using the Hook Directly
 * For custom UI implementations
 */
export const DirectHookUsage: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  const {
    sections: enrichedSections,
    sectionProgress,
    readingProgress,
    scrollToSection,
    isInitialized
  } = useReadingProgress(content, sections)

  if (!isInitialized) {
    return <div>Loading progress tracker...</div>
  }

  return (
    <div>
      {/* Custom UI using the hook data */}
      <div>
        <h3>Progress: {Math.round(readingProgress.overallPercent)}%</h3>
        <p>Time remaining: {readingProgress.estimatedMinutesRemaining} min</p>

        <ul>
          {enrichedSections.map(section => {
            const progress = sectionProgress.get(section.id)
            return (
              <li key={section.id}>
                <button onClick={() => scrollToSection(section.id)}>
                  {section.title} - {progress?.percentRead.toFixed(0)}%
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/**
 * Example 6: Conditional Display
 * Only show navigator for entries with multiple sections
 */
export const ConditionalDisplayExample: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  // Only show for entries with 3+ sections
  const shouldShowNavigator = sections.length >= 3

  return (
    <div>
      {/* Your content */}

      <SectionNavigator
        content={content}
        sections={sections}
        show={shouldShowNavigator}
      />
    </div>
  )
}

/**
 * Example 7: Mobile-First Configuration
 * Start collapsed on mobile, expanded on desktop
 */
export const MobileFirstExample: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  return (
    <SectionNavigator
      content={content}
      sections={sections}
      startCollapsedMobile={true} // Default behavior
    />
  )
}

/**
 * Example 8: Performance Tuning
 * Adjust debounce and intersection threshold for different use cases
 */
export const PerformanceTuningExample: React.FC = () => {
  const content = "..." // Your content
  const sections: DisplaySection[] = [] // Your sections

  return (
    <>
      {/* More frequent updates (higher CPU usage) */}
      <SectionNavigator
        content={content}
        sections={sections}
        options={{
          debounceMs: 50, // Update every 50ms
          intersectionThreshold: 0.3 // Trigger when 30% visible
        }}
      />

      {/* Less frequent updates (better performance) */}
      <SectionNavigator
        content={content}
        sections={sections}
        options={{
          debounceMs: 200, // Update every 200ms
          intersectionThreshold: 0.7 // Trigger when 70% visible
        }}
      />
    </>
  )
}

/**
 * Key Implementation Notes:
 *
 * 1. REQUIRED: Add data-section-id attributes to section containers
 *    The hook uses these to find DOM elements and track scroll position
 *
 *    ✅ Correct:
 *    <div data-section-id="intro">...</div>
 *
 *    ❌ Incorrect:
 *    <div id="intro">...</div>
 *
 * 2. Section Content Structure:
 *    - Sections should be actual content containers, not just headers
 *    - Word count is calculated from section.content string
 *    - Ensure content is accurate for proper time estimates
 *
 * 3. Performance:
 *    - Uses IntersectionObserver for efficient viewport tracking
 *    - Debounces scroll calculations (default 100ms)
 *    - Only updates when sections change visibility
 *
 * 4. Accessibility:
 *    - Keyboard navigable (Tab, Enter, Space)
 *    - ARIA labels and roles included
 *    - Screen reader friendly
 *
 * 5. Responsive Behavior:
 *    - Desktop (>1024px): Always visible, cannot collapse
 *    - Tablet/Mobile (<1024px): Starts collapsed, toggle button appears
 *    - Backdrop appears on mobile when expanded
 *
 * 6. Styling Customization:
 *    - Uses CSS custom properties for theming
 *    - Dark mode support via prefers-color-scheme
 *    - Reduced motion support for accessibility
 */

export default {
  BasicExample,
  CustomReadingSpeedExample,
  LeftSideExample,
  ContainerScrollExample,
  DirectHookUsage,
  ConditionalDisplayExample,
  MobileFirstExample,
  PerformanceTuningExample
}
