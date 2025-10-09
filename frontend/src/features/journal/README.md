# Journal Feature - Phase 1

## Overview

This is the complete frontend implementation for the journal feature Phase 1. The journal feature allows users to create, view, edit, and delete journal entries within spaces using a rich text editor with markdown support.

## Features Implemented

### Core Functionality
- ✅ Create journal entries with rich text editor
- ✅ View journal entries with formatted markdown
- ✅ Edit existing journal entries
- ✅ Delete journal entries (author only)
- ✅ List all journals in a space with pagination
- ✅ Tag support
- ✅ Mood tracking (optional)
- ✅ Word count tracking
- ✅ Pin important journals

### Rich Text Editor
- Bold, italic, strikethrough formatting
- Headings (H1, H2, H3)
- Bullet lists, numbered lists, task lists
- Blockquotes
- Code blocks
- Horizontal rules
- Undo/redo
- Markdown export/import

### User Interface
- Responsive design (mobile & desktop)
- Theme integration (light/dark mode)
- Clean, intuitive layout
- Loading states
- Error handling
- Empty states

## File Structure

```
frontend/src/features/journal/
├── components/
│   ├── extensions.ts           # TipTap editor extensions configuration
│   ├── RichTextEditor.tsx      # Rich text editor component
│   ├── JournalCard.tsx         # Journal card for list display
│   └── JournalList.tsx         # Paginated journal list
├── pages/
│   ├── JournalListPage.tsx     # Journal list page
│   ├── JournalCreatePage.tsx   # Create journal page
│   ├── JournalViewPage.tsx     # View journal page
│   └── JournalEditPage.tsx     # Edit journal page
├── services/
│   └── journalApi.ts           # API client for journal endpoints
├── types/
│   └── journal.types.ts        # TypeScript type definitions
├── hooks/
│   └── useJournal.ts           # Custom hook for journal state
├── styles/
│   └── journal.css             # Journal feature styles
├── index.ts                    # Feature exports
└── README.md                   # This file
```

## API Integration

The frontend integrates with the backend API endpoints:

- `POST /api/spaces/{spaceId}/journals` - Create journal
- `GET /api/spaces/{spaceId}/journals` - List journals in space
- `GET /api/journals/{journalId}` - Get single journal
- `PUT /api/journals/{journalId}` - Update journal
- `DELETE /api/journals/{journalId}` - Delete journal
- `GET /api/users/me/journals` - Get user's journals across all spaces

## Routes

The following routes were added to the application:

- `/spaces/:spaceId/journals` - Journal list page
- `/spaces/:spaceId/journals/new` - Create new journal
- `/journals/:journalId` - View journal
- `/journals/:journalId/edit` - Edit journal

## Integration Points

### App.tsx
Added journal routes with protected route wrapper.

### SpaceDetail.tsx
Added "Journals" tab to space detail page that displays the `JournalList` component.

## Usage Examples

### Creating a Journal

```tsx
import { JournalCreatePage } from '@/features/journal'

// Navigate to /spaces/{spaceId}/journals/new
// User fills in title, content, tags, mood
// On save, redirects to journal view page
```

### Viewing Journals

```tsx
import { JournalList } from '@/features/journal'

// In SpaceDetail.tsx:
<JournalList spaceId={spaceId} />
```

### Using the Rich Text Editor

```tsx
import { RichTextEditor } from '@/features/journal'

const [content, setContent] = useState('')

<RichTextEditor
  content={content}
  onChange={setContent}
  placeholder="Start writing..."
  minHeight="400px"
  showToolbar={true}
/>
```

### Using the Journal Hook

```tsx
import { useJournal } from '@/features/journal'

const { journal, loading, error, loadJournal, createJournal, updateJournal, deleteJournal } = useJournal()

// Load a journal
await loadJournal(journalId)

// Create a journal
const newJournal = await createJournal(spaceId, {
  title: 'My Journal',
  content: '# Hello\n\nThis is my journal.',
  tags: ['personal', 'thoughts'],
  mood: 'reflective'
})

// Update a journal
await updateJournal(journalId, {
  title: 'Updated Title',
  content: 'Updated content'
})

// Delete a journal
await deleteJournal(journalId)
```

## Styling

The journal feature uses CSS variables from the theme system for consistent theming:

- `--theme-bg-base` - Base background
- `--theme-bg-surface` - Surface background
- `--theme-bg-elevated` - Elevated background
- `--theme-text-primary` - Primary text
- `--theme-text-secondary` - Secondary text
- `--theme-primary-*` - Primary color variants
- `--theme-border-light` - Light borders
- `--theme-error-*` - Error color variants

## Dependencies

The following packages were installed for the journal feature:

- `@tiptap/react` - TipTap editor framework
- `@tiptap/starter-kit` - Basic editor extensions
- `@tiptap/extension-placeholder` - Placeholder text
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-task-list` - Task list support
- `@tiptap/extension-task-item` - Task items
- `tiptap-markdown` - Markdown support
- `react-markdown` - Markdown rendering

## Permissions

- All users in a space can create journals
- Only journal authors can edit/delete their journals
- All space members can view journals in that space

## Future Enhancements (Phase 2)

- [ ] Template system for structured journals
- [ ] Advanced mood selector (emotion wheel)
- [ ] Auto-save functionality
- [ ] Journal sharing outside of space
- [ ] Export journals (PDF, markdown)
- [ ] Search and filtering by tags/mood
- [ ] Rich media support (images, videos)
- [ ] Collaborative editing
- [ ] Comments and reactions

## Testing

To test the journal feature:

1. Start the development server: `npm run dev`
2. Create a space or navigate to an existing space
3. Click the "Journals" tab
4. Click "New Journal" to create your first journal
5. Use the rich text editor to write your journal
6. Save and view your journal
7. Edit or delete as needed

## Build Status

✅ TypeScript compilation successful
✅ Production build successful
✅ All routes integrated
✅ Theme integration complete
