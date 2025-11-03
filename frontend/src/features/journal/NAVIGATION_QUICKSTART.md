# Section Navigator - Quick Start Guide

Get the Section Navigator working in 5 minutes.

## Prerequisites

- React 17+ with TypeScript
- Journal entries with multiple sections
- Section data with id, title, type, and content

## Step 1: Add Data Attributes (Required)

The navigator needs `data-section-id` attributes to find sections in the DOM.

```tsx
{displaySections.map((section) => (
  <div
    key={section.id}
    data-section-id={section.id}  // 👈 REQUIRED
    className="template-section"
  >
    <h3>{section.title}</h3>
    <div>{section.content}</div>
  </div>
))}
```

**Common mistake:** Using `id={section.id}` instead of `data-section-id={section.id}`

## Step 2: Import the Component

```tsx
import { SectionNavigator } from '../components/SectionNavigator'
```

## Step 3: Add to Your JSX

```tsx
{displaySections.length > 0 && (
  <SectionNavigator
    content={journal.content}
    sections={displaySections}
  />
)}
```

## That's It!

The navigator will now:
- ✅ Display a navigation sidebar
- ✅ Track reading progress
- ✅ Calculate time remaining
- ✅ Allow clicking to jump between sections
- ✅ Highlight the current section

## Customize (Optional)

### Adjust Reading Speed
```tsx
<SectionNavigator
  content={journal.content}
  sections={displaySections}
  options={{ wordsPerMinute: 200 }}  // Slower readers
/>
```

### Position on Left
```tsx
<SectionNavigator
  content={journal.content}
  sections={displaySections}
  position="left"
/>
```

### Start Expanded on Mobile
```tsx
<SectionNavigator
  content={journal.content}
  sections={displaySections}
  startCollapsedMobile={false}
/>
```

## Troubleshooting

### Navigator doesn't appear
1. Check `sections.length > 0`
2. Verify `data-section-id` attributes are present
3. Check browser console for errors

### Progress doesn't update
1. Confirm sections are actually rendering
2. Check `data-section-id` matches `section.id`
3. Try scrolling slowly

### Sections don't have word counts
1. Ensure `section.content` contains actual text
2. Check content isn't empty strings

## Complete Example

```tsx
import React from 'react'
import { SectionNavigator } from '../components/SectionNavigator'

export const JournalView: React.FC = () => {
  const journal = {
    content: '...',
    sections: [
      { id: 'intro', title: 'Introduction', type: 'prose', content: 'Text...' },
      { id: 'body', title: 'Main Content', type: 'prose', content: 'More text...' }
    ]
  }

  return (
    <div>
      {/* Your journal content */}
      {journal.sections.map((section) => (
        <div key={section.id} data-section-id={section.id}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </div>
      ))}

      {/* Add the navigator */}
      <SectionNavigator
        content={journal.content}
        sections={journal.sections}
      />
    </div>
  )
}
```

## Need More Control?

Use the hook directly:

```tsx
import { useReadingProgress } from '../hooks/useReadingProgress'

const { readingProgress, scrollToSection } = useReadingProgress(
  content,
  sections
)

console.log('Current progress:', readingProgress.overallPercent)
scrollToSection('intro')
```

## Next Steps

- Read full docs: `SectionNavigator.README.md`
- See examples: `SectionNavigator.example.tsx`
- Check tests: `useReadingProgress.test.ts`
- Review implementation: `NAVIGATION_IMPLEMENTATION.md`

## Support

Questions? Check the README or open an issue.
