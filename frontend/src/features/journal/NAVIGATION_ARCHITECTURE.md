# Section Navigator - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JournalViewPage                             │
│                                                                     │
│  ┌────────────────────┐                                            │
│  │  Journal Content   │                                            │
│  │                    │                                            │
│  │  ┌──────────────┐  │  data-section-id="intro"                  │
│  │  │  Section 1   │◄─┼──────────────────┐                        │
│  │  └──────────────┘  │                  │                        │
│  │  ┌──────────────┐  │  data-section-id="main"                   │
│  │  │  Section 2   │◄─┼──────────────────┤                        │
│  │  └──────────────┘  │                  │                        │
│  │  ┌──────────────┐  │  data-section-id="conclusion"             │
│  │  │  Section 3   │◄─┼──────────────────┘                        │
│  │  └──────────────┘  │                                            │
│  └────────────────────┘                                            │
│           │                                                         │
│           │ content + sections[]                                   │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │            SectionNavigator Component                    │      │
│  │                                                          │      │
│  │  Props:                                                  │      │
│  │  • content: string                                       │      │
│  │  • sections: DisplaySection[]                            │      │
│  │  • options: ReadingProgressOptions                       │      │
│  │  • position: 'left' | 'right'                            │      │
│  │                                                          │      │
│  │         ┌─────────────────────────────────┐             │      │
│  │         │   useReadingProgress Hook       │             │      │
│  │         │                                 │             │      │
│  │         │  State:                         │             │      │
│  │         │  • enrichedSections[]           │             │      │
│  │         │  • sectionProgress Map          │             │      │
│  │         │  • readingProgress              │             │      │
│  │         │  • isInitialized                │             │      │
│  │         │                                 │             │      │
│  │         │  Effects:                       │             │      │
│  │         │  1. Initialize sections         │             │      │
│  │         │  2. Setup IntersectionObserver  │◄────────┐   │      │
│  │         │  3. Add scroll listeners        │         │   │      │
│  │         │  4. Calculate progress          │         │   │      │
│  │         │                                 │         │   │      │
│  │         │  Functions:                     │         │   │      │
│  │         │  • scrollToSection()            │         │   │      │
│  │         │  • calculateProgress()          │         │   │      │
│  │         │  • countWords()                 │         │   │      │
│  │         └─────────────────────────────────┘         │   │      │
│  │                     │                               │   │      │
│  │                     │ Returns:                      │   │      │
│  │                     │ • sections                    │   │      │
│  │                     │ • sectionProgress             │   │      │
│  │                     │ • readingProgress             │   │      │
│  │                     │ • scrollToSection             │   │      │
│  │                     ▼                               │   │      │
│  │         ┌─────────────────────────────────┐         │   │      │
│  │         │       UI Rendering              │         │   │      │
│  │         │                                 │         │   │      │
│  │         │  • Progress circle              │         │   │      │
│  │         │  • Section list                 │         │   │      │
│  │         │  • Progress bars                │         │   │      │
│  │         │  • Time estimate                │         │   │      │
│  │         │  • Stats footer                 │         │   │      │
│  │         └─────────────────────────────────┘         │   │      │
│  └─────────────────────────────────────────────────────┼───┘      │
│                                                         │          │
│                    Browser APIs                         │          │
│  ┌──────────────────────────────────────────────────────┘          │
│  │                                                                 │
│  ▼                                                                 │
│  IntersectionObserver ───┐                                        │
│  window.scroll           │  Triggers                              │
│  element.getBoundingClientRect()  ──► calculateProgress()         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────────┐
│  User Scrolls    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Browser Events                      │
│  • scroll (debounced 100ms)          │
│  • IntersectionObserver callbacks    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  calculateProgress()                 │
│  1. Get scroll position              │
│  2. Get viewport dimensions          │
│  3. Get section positions (rects)    │
│  4. Calculate reading line (50% vh)  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  For Each Section:                   │
│  • Calculate percentRead             │
│  • Determine if visible              │
│  • Check if complete                 │
│  • Count words read                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Update State                        │
│  • sectionProgress Map               │
│  • readingProgress Object            │
│    - currentSectionId                │
│    - overallPercent                  │
│    - sectionsComplete                │
│    - wordsRead                       │
│    - estimatedMinutesRemaining       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  React Re-render                     │
│  • Update progress bars              │
│  • Highlight current section         │
│  • Update circular progress          │
│  • Recalculate time remaining        │
└──────────────────────────────────────┘
```

## Component Lifecycle

```
Mount Phase:
├─ 1. Component renders with initial state
│     └─ sections = []
│     └─ isInitialized = false
│
├─ 2. useEffect: Initialize sections (100ms delay)
│     ├─ Find DOM elements by data-section-id
│     ├─ Calculate word counts
│     ├─ Calculate offsets
│     └─ Set enrichedSections
│
├─ 3. useEffect: Setup IntersectionObserver
│     ├─ Create observer with threshold
│     ├─ Observe all section elements
│     └─ Store observer ref
│
├─ 4. useEffect: Add scroll listener
│     ├─ Attach to window or container
│     ├─ Set passive: true for performance
│     └─ Initial calculateProgress() call
│
└─ 5. Set isInitialized = true
      └─ Component becomes visible

Active Phase (User Scrolling):
├─ User scrolls
│
├─ Debounced scroll handler (100ms)
│     └─ clearTimeout existing
│     └─ setTimeout new calculation
│
├─ IntersectionObserver callbacks
│     └─ When section enters/exits viewport
│     └─ Trigger calculateProgress()
│
└─ calculateProgress()
      ├─ Calculate section positions
      ├─ Determine current section
      ├─ Calculate progress percentages
      ├─ Update state
      └─ Trigger re-render

User Interaction:
├─ User clicks section
│     └─ scrollToSection(sectionId)
│           ├─ Find element
│           ├─ Calculate scroll position
│           └─ window.scrollTo({ smooth })
│
└─ Mobile toggle button
      └─ setIsCollapsed(!isCollapsed)

Unmount Phase:
├─ useEffect cleanup
│     ├─ Disconnect IntersectionObserver
│     ├─ Remove scroll listener
│     └─ Clear timeout refs
│
└─ Component unmounts
```

## State Management

```
┌────────────────────────────────────────────────┐
│          useReadingProgress Hook State          │
├────────────────────────────────────────────────┤
│                                                │
│  enrichedSections: Section[]                   │
│  ┌──────────────────────────────────────────┐  │
│  │ [                                        │  │
│  │   {                                      │  │
│  │     id: "intro",                         │  │
│  │     title: "Introduction",               │  │
│  │     type: "prose",                       │  │
│  │     wordCount: 150,                      │  │
│  │     startOffset: 0,                      │  │
│  │     endOffset: 750,                      │  │
│  │     element: HTMLElement                 │  │
│  │   },                                     │  │
│  │   { ... }                                │  │
│  │ ]                                        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  sectionProgress: Map<string, SectionProgress> │
│  ┌──────────────────────────────────────────┐  │
│  │ Map {                                    │  │
│  │   "intro" => {                           │  │
│  │     sectionId: "intro",                  │  │
│  │     percentRead: 100,                    │  │
│  │     isVisible: false,                    │  │
│  │     isComplete: true                     │  │
│  │   },                                     │  │
│  │   "main" => {                            │  │
│  │     sectionId: "main",                   │  │
│  │     percentRead: 45,                     │  │
│  │     isVisible: true,                     │  │
│  │     isComplete: false                    │  │
│  │   }                                      │  │
│  │ }                                        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  readingProgress: ReadingProgress              │
│  ┌──────────────────────────────────────────┐  │
│  │ {                                        │  │
│  │   currentSectionId: "main",              │  │
│  │   overallPercent: 62.5,                  │  │
│  │   sectionsComplete: 1,                   │  │
│  │   sectionsTotal: 3,                      │  │
│  │   estimatedMinutesRemaining: 3,          │  │
│  │   totalWordCount: 500,                   │  │
│  │   wordsRead: 312                         │  │
│  │ }                                        │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  isInitialized: boolean                        │
│  └─ true                                       │
│                                                │
└────────────────────────────────────────────────┘
```

## Progress Calculation Algorithm

```
Function: calculateProgress()
│
├─ Get Container Dimensions
│  ├─ containerHeight = viewport height or container height
│  ├─ scrollTop = current scroll position
│  └─ readingLine = scrollTop + (containerHeight × 0.5)
│
├─ Initialize Counters
│  ├─ currentSectionId = null
│  ├─ sectionsComplete = 0
│  └─ totalWordsRead = 0
│
├─ For Each Section:
│  │
│  ├─ Get Element Position
│  │  ├─ rect = element.getBoundingClientRect()
│  │  ├─ rect.top = distance from viewport top
│  │  └─ rect.bottom = distance from viewport top + height
│  │
│  ├─ Calculate Visibility
│  │  └─ isVisible = (rect.top < viewport.bottom) &&
│  │                  (rect.bottom > viewport.top)
│  │
│  ├─ Calculate Progress
│  │  │
│  │  ├─ If (rect.bottom <= readingLine + threshold):
│  │  │     └─ Section is ABOVE reading line
│  │  │         ├─ percentRead = 100
│  │  │         ├─ isComplete = true
│  │  │         ├─ sectionsComplete++
│  │  │         └─ totalWordsRead += section.wordCount
│  │  │
│  │  ├─ Else If (rect.top <= readingLine):
│  │  │     └─ Section is AT reading line
│  │  │         ├─ currentSectionId = section.id
│  │  │         ├─ visibleFromTop = readingLine - rect.top
│  │  │         ├─ percentRead = (visibleFromTop / rect.height) × 100
│  │  │         └─ totalWordsRead += (percentRead / 100) × wordCount
│  │  │
│  │  └─ Else:
│  │        └─ Section is BELOW reading line
│  │            ├─ percentRead = 0
│  │            └─ isComplete = false
│  │
│  └─ Update sectionProgress Map
│
├─ Calculate Overall Statistics
│  ├─ overallPercent = (totalWordsRead / totalWordCount) × 100
│  ├─ wordsRemaining = totalWordCount - totalWordsRead
│  └─ minutesRemaining = ⌈wordsRemaining / wordsPerMinute⌉
│
└─ Update State
   ├─ setSectionProgress(newProgressMap)
   └─ setReadingProgress(newOverallProgress)
```

## Performance Optimizations

```
┌─────────────────────────────────────────┐
│       Optimization Techniques           │
├─────────────────────────────────────────┤
│                                         │
│  1. Debouncing (100ms)                  │
│     ├─ Prevents excessive calculations  │
│     ├─ Batches rapid scroll events      │
│     └─ Reduces CPU usage by ~80%        │
│                                         │
│  2. IntersectionObserver                │
│     ├─ Native browser API               │
│     ├─ Efficient visibility detection   │
│     ├─ No polling or interval timers    │
│     └─ Triggers only on changes         │
│                                         │
│  3. Cached DOM References               │
│     ├─ sectionElementsRef Map           │
│     ├─ Find elements once on init       │
│     ├─ Reuse for all calculations       │
│     └─ Avoids repeated querySelector    │
│                                         │
│  4. Passive Event Listeners             │
│     ├─ { passive: true }                │
│     ├─ Allows scrolling optimization    │
│     └─ Improves scroll performance      │
│                                         │
│  5. CSS Transforms (GPU)                │
│     ├─ transform: translateX()          │
│     ├─ Hardware acceleration            │
│     └─ 60fps smooth animations          │
│                                         │
│  6. Memoized Calculations               │
│     ├─ useCallback for functions        │
│     ├─ useMemo for expensive calcs      │
│     └─ Prevents unnecessary re-renders  │
│                                         │
│  7. Lazy Initialization                 │
│     ├─ 100ms delay for DOM ready        │
│     ├─ Avoids layout thrashing          │
│     └─ Waits for elements to mount      │
│                                         │
└─────────────────────────────────────────┘
```

## File Dependencies

```
navigation.types.ts
    ↓
    └── Imported by
        ├── useReadingProgress.ts
        │       ↓
        │       └── Imported by
        │           └── SectionNavigator.tsx
        │                   ↓
        │                   ├── Imports
        │                   │   └── section-navigator.css
        │                   │
        │                   └── Used by
        │                       └── JournalViewPage.tsx
        │
        └── SectionNavigator.tsx
```

## Browser API Usage

```
┌─────────────────────────────────────────────┐
│          Browser APIs Used                  │
├─────────────────────────────────────────────┤
│                                             │
│  IntersectionObserver                       │
│  ├─ Purpose: Efficient viewport detection   │
│  ├─ Browser Support: 2017+                  │
│  └─ Fallback: Graceful degradation          │
│                                             │
│  Element.getBoundingClientRect()            │
│  ├─ Purpose: Get element position           │
│  └─ Browser Support: All modern             │
│                                             │
│  window.scrollTo({ behavior: 'smooth' })    │
│  ├─ Purpose: Smooth scroll animation        │
│  └─ Browser Support: 2015+                  │
│                                             │
│  window.pageYOffset / scrollTop             │
│  ├─ Purpose: Get current scroll position    │
│  └─ Browser Support: Universal              │
│                                             │
│  document.querySelector()                   │
│  ├─ Purpose: Find section elements          │
│  └─ Browser Support: Universal              │
│                                             │
│  setTimeout / clearTimeout                  │
│  ├─ Purpose: Debouncing mechanism           │
│  └─ Browser Support: Universal              │
│                                             │
└─────────────────────────────────────────────┘
```

## Responsive Design Strategy

```
Mobile (<1024px)                Desktop (≥1024px)
┌─────────────────┐            ┌──────────────────────┐
│                 │            │  ┌───────────────┐   │
│  [📖]           │            │  │  Navigator    │   │
│                 │            │  │  (Always      │   │
│  Content        │            │  │   Visible)    │   │
│  Flows          │            │  │               │   │
│  Full           │            │  │  • Progress   │   │
│  Width          │            │  │  • Sections   │   │
│                 │            │  │  • Stats      │   │
│                 │            │  └───────────────┘   │
│                 │            │                      │
│  Click 📖       │            │  Content             │
│      ↓          │            │  (Max Width)         │
│  ┌──────────┐   │            │                      │
│  │Navigator │   │            └──────────────────────┘
│  │(Overlay) │   │
│  │          │   │            Strategy:
│  │[Backdrop]│   │            • Mobile-first design
│  └──────────┘   │            • Breakpoint: 1024px
└─────────────────┘            • Toggle on small screens
                               • Fixed sidebar on large
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2025-11-03
**Complexity**: Medium
**Maintainability**: High
