# SectionNavigator Component

A comprehensive navigation and reading progress tracking system for journal entries with multiple sections.

## Overview

The SectionNavigator provides an intelligent, responsive navigation sidebar that:
- Displays a navigable table of contents for journal sections
- Tracks reading progress in real-time using scroll position
- Calculates time remaining based on reading speed
- Highlights the current section being read
- Supports keyboard navigation and accessibility features
- Responsive design: collapsible on mobile, fixed sidebar on desktop

## Architecture

### Components

```
SectionNavigator (Component)
├── useReadingProgress (Hook)
│   ├── IntersectionObserver (Browser API)
│   └── Scroll tracking with debouncing
└── navigation.types.ts (TypeScript interfaces)
```

### File Structure

```
frontend/src/features/journal/
├── components/
│   ├── SectionNavigator.tsx           # Main component
│   ├── SectionNavigator.example.tsx   # Usage examples
│   └── SectionNavigator.README.md     # This file
├── hooks/
│   └── useReadingProgress.ts          # Core logic hook
├── types/
│   └── navigation.types.ts            # TypeScript definitions
└── styles/
    └── section-navigator.css          # Component styles
```

## Installation

The component is already integrated into `JournalViewPage.tsx`. For new implementations:

1. Ensure your section elements have `data-section-id` attributes:
```tsx
<div data-section-id={section.id}>
  <h2>{section.title}</h2>
  <p>{section.content}</p>
</div>
```

2. Import and use the component:
```tsx
import { SectionNavigator } from '../components/SectionNavigator'

<SectionNavigator
  content={journal.content}
  sections={displaySections}
  options={{ wordsPerMinute: 250 }}
/>
```

## Usage

### Basic Example

```tsx
import { SectionNavigator } from './components/SectionNavigator'

function JournalView() {
  const sections = [
    { id: 'intro', title: 'Introduction', type: 'prose', content: '...' },
    { id: 'body', title: 'Main Content', type: 'prose', content: '...' },
    { id: 'conclusion', title: 'Conclusion', type: 'prose', content: '...' }
  ]

  return (
    <div>
      {sections.map(section => (
        <div key={section.id} data-section-id={section.id}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </div>
      ))}

      <SectionNavigator
        content={journal.content}
        sections={sections}
      />
    </div>
  )
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | Required | Full journal content for word count calculations |
| `sections` | `DisplaySection[]` | Required | Array of sections with id, title, type, content |
| `options` | `ReadingProgressOptions` | `{}` | Configuration for reading tracking |
| `show` | `boolean` | `true` | Whether to display the navigator |
| `position` | `'left' \| 'right'` | `'right'` | Position of the navigator sidebar |
| `startCollapsedMobile` | `boolean` | `true` | Start collapsed on mobile devices |

### Options

```typescript
interface ReadingProgressOptions {
  wordsPerMinute?: number           // Default: 250
  debounceMs?: number               // Default: 100
  intersectionThreshold?: number    // Default: 0.5
  containerRef?: React.RefObject<HTMLElement>
}
```

## Features

### 1. Reading Progress Tracking

The system tracks:
- **Overall progress**: Percentage of entire document read
- **Section progress**: Individual progress for each section
- **Current section**: Which section is being actively read
- **Words read**: Approximate word count based on scroll position

### 2. Time Estimation

Calculates remaining reading time based on:
- Average reading speed (default: 250 words/minute)
- Remaining words from current scroll position
- Total word count per section

### 3. Smart Scroll Detection

Uses IntersectionObserver for efficient viewport detection:
- Detects when sections enter/exit viewport
- Tracks scroll position within each section
- Debounces calculations for performance
- Updates < 100ms latency

### 4. Responsive Design

**Desktop (≥1024px):**
- Fixed sidebar on left or right
- Always visible
- Cannot be collapsed

**Mobile/Tablet (<1024px):**
- Starts collapsed (configurable)
- Toggle button to show/hide
- Slides in from side
- Backdrop overlay when expanded
- Touch-friendly interactions

### 5. Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper semantic markup
- **Screen Reader**: Descriptive labels and roles
- **Focus Management**: Clear focus indicators
- **Reduced Motion**: Respects prefers-reduced-motion

## Technical Details

### How It Works

1. **Initialization**:
   - Hook parses sections and calculates word counts
   - Finds section elements in DOM via `data-section-id`
   - Sets up IntersectionObserver and scroll listeners

2. **Scroll Tracking**:
   - IntersectionObserver detects visible sections
   - Scroll event triggers debounced calculation (100ms)
   - Calculates reading position within each section
   - Updates progress state

3. **Progress Calculation**:
   ```
   Section Progress = (Pixels Above Reading Line / Section Height) × 100
   Overall Progress = (Words Read / Total Words) × 100
   Time Remaining = (Remaining Words / WPM)
   ```

4. **Rendering**:
   - Displays circular progress indicator
   - Lists all sections with progress bars
   - Highlights current section
   - Shows completion checkmarks

### Performance Optimizations

1. **Debouncing**: Scroll calculations debounced to 100ms
2. **IntersectionObserver**: Efficient visibility tracking
3. **RequestAnimationFrame**: Smooth animations
4. **Lazy Initialization**: Waits for DOM to be ready
5. **Memoization**: Caches calculated values

### Browser Compatibility

- Chrome 58+ (IntersectionObserver)
- Firefox 55+
- Safari 12.1+
- Edge 16+

Fallback behavior for older browsers: Navigator still displays but progress tracking may be less accurate.

## Customization

### Styling

The component uses CSS custom properties for easy theming:

```css
.section-navigator {
  --surface: #ffffff;
  --border: #e5e7eb;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --primary: #3b82f6;
  --progress-bg: #e5e7eb;
}
```

### Dark Mode

Automatically adapts to system preference:

```css
@media (prefers-color-scheme: dark) {
  .section-navigator {
    --surface: #1f2937;
    --text-primary: #f9fafb;
    /* ... */
  }
}
```

### Custom Reading Speed

Adjust for different reading contexts:

```tsx
// Academic reading (slower)
<SectionNavigator options={{ wordsPerMinute: 150 }} />

// Casual reading (default)
<SectionNavigator options={{ wordsPerMinute: 250 }} />

// Speed reading
<SectionNavigator options={{ wordsPerMinute: 400 }} />
```

## Advanced Usage

### Using the Hook Directly

For custom UI implementations:

```tsx
import { useReadingProgress } from '../hooks/useReadingProgress'

function CustomNavigator() {
  const {
    sections,
    sectionProgress,
    readingProgress,
    scrollToSection,
    isInitialized
  } = useReadingProgress(content, displaySections)

  return (
    <div>
      <h3>Progress: {readingProgress.overallPercent}%</h3>
      {sections.map(section => {
        const progress = sectionProgress.get(section.id)
        return (
          <div key={section.id}>
            <button onClick={() => scrollToSection(section.id)}>
              {section.title}
            </button>
            <span>{progress?.percentRead}%</span>
          </div>
        )
      })}
    </div>
  )
}
```

### Container Scrolling

Track scrolling within a specific container:

```tsx
const containerRef = useRef<HTMLDivElement>(null)

<div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
  {/* Scrollable content */}
</div>

<SectionNavigator
  options={{ containerRef }}
/>
```

### Conditional Display

Show only for entries with multiple sections:

```tsx
<SectionNavigator
  show={sections.length >= 3}
/>
```

## Troubleshooting

### Navigator not appearing
- Ensure sections have `data-section-id` attributes
- Check that `show` prop is true
- Verify sections array is not empty

### Progress not updating
- Confirm `data-section-id` matches section.id
- Check scroll container is correctly configured
- Verify sections are actually rendering in DOM

### Incorrect time estimates
- Adjust `wordsPerMinute` for your audience
- Ensure section content includes full text
- Check word count calculation is accurate

### Performance issues
- Increase `debounceMs` (default: 100ms)
- Reduce `intersectionThreshold` precision
- Check for other scroll listeners interfering

## Examples

See `SectionNavigator.example.tsx` for comprehensive examples including:
- Basic usage
- Custom reading speeds
- Left/right positioning
- Container scrolling
- Direct hook usage
- Conditional display
- Performance tuning

## Contributing

When modifying this component:

1. **Types**: Update `navigation.types.ts` for interface changes
2. **Hook**: Core logic lives in `useReadingProgress.ts`
3. **UI**: Component structure in `SectionNavigator.tsx`
4. **Styles**: All styles in `section-navigator.css`
5. **Tests**: Add test cases for new features
6. **Docs**: Update this README and examples

## Future Enhancements

Potential improvements:
- [ ] Bookmark/save reading position
- [ ] Reading speed auto-detection
- [ ] Annotations and notes integration
- [ ] Export reading statistics
- [ ] Multiple reading sessions tracking
- [ ] Collaborative reading indicators
- [ ] Section-specific reading time goals

## License

Part of Lifestyle Spaces project. See project root for license information.
