# Journal Feature Migration Plan

## 📋 Overview

Migrating the rich TipTap editor and journal functionality from `ai-lifestyle-app` to `lifestyle-spaces`.

**Source**: `C:\github\ai-lifestyle-app\frontend\src\features\journal`
**Target**: `C:\github\lifestyle-spaces`

## 🎯 Core Features

The journal POC includes:
- ✅ **Rich TipTap Editor** with markdown support
- ✅ **Template-based entries** (7 templates: Daily Reflection, Gratitude, Goal Progress, etc.)
- ✅ **Advanced search** with IndexedDB caching
- ✅ **Draft auto-save** system
- ✅ **Emotion/mood tracking** with visual wheel selector
- ✅ **Goal integration**
- ✅ **Client-side encryption** support

## 📐 Architecture for Lifestyle Spaces

Since this app is **space-based**, journals will:
1. **Belong to spaces** - Each journal entry is tied to a specific space
2. **Respect permissions** - Only space members can view/create journals
3. **Start simple** - Core editor + basic templates first, advanced features later

## 🗂️ Backend Schema (DynamoDB)

### Journal Entry Structure
```
PK: SPACE#<spaceId>
SK: JOURNAL#<journalId>

Attributes:
- journal_id: str (UUID)
- space_id: str
- user_id: str (author)
- title: str
- content: str (markdown)
- template_id: str (optional)
- template_data: dict (section responses)
- tags: list[str]
- mood: str (optional)
- created_at: datetime
- updated_at: datetime
- is_encrypted: bool
- word_count: int
- is_pinned: bool

GSI1 (User's Journals):
PK: USER#<userId>
SK: JOURNAL#<journalId>#<createdAt>

GSI2 (Space Journals by Date):
PK: SPACE#<spaceId>
SK: DATE#<createdAt>
```

## 🚀 Phase 1: Core Editor (MVP - Week 1)

**Goal**: Get basic journal creation working in spaces

### Backend Tasks

#### 1.1 Create Models
- [ ] Create `JournalEntry` Pydantic model in `backend/app/models/journal.py`
- [ ] Create `JournalCreate` request model
- [ ] Create `JournalUpdate` request model
- [ ] Create `JournalResponse` response model
- [ ] Create `JournalListResponse` with pagination

#### 1.2 Create Service Layer
- [ ] Create `JournalService` in `backend/app/services/journal.py`
- [ ] Implement `create_journal_entry(space_id, user_id, data)`
- [ ] Implement `get_journal_entry(journal_id, user_id)`
- [ ] Implement `update_journal_entry(journal_id, user_id, data)`
- [ ] Implement `delete_journal_entry(journal_id, user_id)`
- [ ] Implement `list_space_journals(space_id, user_id, pagination)`
- [ ] Implement `list_user_journals(user_id, pagination)`
- [ ] Add permission checks (user must be space member)

#### 1.3 Create API Routes
- [ ] Create `backend/app/api/routes/journals.py`
- [ ] Add route: `POST /api/spaces/{space_id}/journals` - Create journal
- [ ] Add route: `GET /api/spaces/{space_id}/journals` - List space journals
- [ ] Add route: `GET /api/journals/{journal_id}` - Get single journal
- [ ] Add route: `PUT /api/journals/{journal_id}` - Update journal
- [ ] Add route: `DELETE /api/journals/{journal_id}` - Delete journal
- [ ] Add route: `GET /api/users/me/journals` - List user's journals across all spaces

#### 1.4 Testing
- [ ] Write unit tests for `JournalService`
- [ ] Write integration tests for journal routes
- [ ] Test permissions (non-members can't access)
- [ ] Ensure 95%+ test coverage

### Frontend Tasks

#### 1.5 Setup & Dependencies
- [ ] Install TipTap dependencies:
  ```bash
  cd frontend
  npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item tiptap-markdown lucide-react
  ```

#### 1.6 Create File Structure
```
frontend/src/features/journal/
├── components/
│   ├── RichTextEditor.tsx
│   ├── JournalCard.tsx
│   └── JournalList.tsx
├── pages/
│   ├── JournalListPage.tsx
│   ├── JournalCreatePage.tsx
│   └── JournalViewPage.tsx
├── services/
│   └── journalApi.ts
├── types/
│   └── journal.types.ts
├── hooks/
│   └── useJournal.ts
└── styles/
    └── journal.css
```

#### 1.7 Port Core Components
- [ ] Port `RichTextEditor.tsx` from POC (simplified, no templates yet)
- [ ] Port `rich-text-editor.css` and adapt to project theme
- [ ] Port `extensions.ts` for TipTap extensions
- [ ] Create `JournalCard.tsx` for list view
- [ ] Create `JournalList.tsx` component

#### 1.8 Create Pages
- [ ] Create `JournalListPage.tsx` - Shows all journals in a space
- [ ] Create `JournalCreatePage.tsx` - Create new journal
- [ ] Create `JournalViewPage.tsx` - View single journal (read-only)
- [ ] Create `JournalEditPage.tsx` - Edit existing journal

#### 1.9 API Integration
- [ ] Create `journalApi.ts` with API client methods
- [ ] Create `useJournal.ts` hook for managing journal state
- [ ] Add error handling and loading states
- [ ] Add optimistic updates

#### 1.10 Navigation Integration
- [ ] Add "Journals" tab to `SpaceDetail.tsx`
- [ ] Add "New Journal" button to space navigation
- [ ] Add journal routes to `App.tsx`
- [ ] Update space store to include journal count

## 🎨 Phase 2: Templates & Enhanced Editor (Week 2)

### Backend Tasks

#### 2.1 Template Support
- [ ] Add `template_id` enum to models
- [ ] Add `template_data` JSON field for section responses
- [ ] Create template validation helper
- [ ] Add template metadata extraction (mood, tags)

### Frontend Tasks

#### 2.2 Port Template System
- [ ] Port `enhanced-template.types.ts`
- [ ] Create 3 basic templates in `enhanced-templates.ts`:
  - Blank Journal
  - Daily Log
  - Gratitude Journal
- [ ] Port `SectionEditor.tsx` for template sections
- [ ] Port `EnhancedJournalEditor.tsx` (template-aware editor)

#### 2.3 Template UI
- [ ] Create `TemplatePicker.tsx` component
- [ ] Add template picker to journal creation flow
- [ ] Implement section-based editor rendering
- [ ] Add mood selector (simplified emoji picker)
- [ ] Add tag input component

#### 2.4 Template Features
- [ ] Add template preview in picker
- [ ] Save template responses in `template_data`
- [ ] Display template-based journals nicely in view mode
- [ ] Add template filtering in journal list

## 🔍 Phase 3: Search & Discovery (Week 3)

### Backend Tasks

#### 3.1 Search Endpoint
- [ ] Add search endpoint: `GET /api/spaces/{space_id}/journals/search`
- [ ] Implement text search on title and content
- [ ] Add filters: tags, date range, author, mood, template
- [ ] Optimize with DynamoDB GSIs
- [ ] Add pagination to search results

### Frontend Tasks

#### 3.2 Search UI
- [ ] Create `JournalSearchBar.tsx` component
- [ ] Add search to journal list page
- [ ] Create filter panel (tags, date, mood)
- [ ] Add search results highlighting
- [ ] Add "Clear filters" functionality

#### 3.3 Search Enhancement
- [ ] Add debounced search (300ms)
- [ ] Show search result count
- [ ] Add recent searches
- [ ] Add search suggestions based on tags

## ⚡ Phase 4: Advanced Features (Week 4+)

### 4.1 Draft Management
- [ ] Port `useJournalDraft.ts` hook
- [ ] Implement auto-save to localStorage every 5s
- [ ] Add draft recovery UI
- [ ] Add "Restore draft" banner

### 4.2 Analytics
- [ ] Add journal stats to space dashboard
- [ ] Show word count trends
- [ ] Show mood trends over time
- [ ] Add "streak" tracking (consecutive days)

### 4.3 Social Features
- [ ] Add comments on journal entries
- [ ] Add reactions (👍, ❤️, etc.)
- [ ] Add @mentions for space members
- [ ] Add notifications for comments

### 4.4 Privacy & Permissions
- [ ] Add privacy levels (Public to space, Private)
- [ ] Add "Only me" journals within spaces
- [ ] Add journal sharing outside space
- [ ] Add view permissions per entry

### 4.5 Export & Backup
- [ ] Export single journal to Markdown
- [ ] Export all journals to ZIP
- [ ] Export to PDF with styling
- [ ] Scheduled email digests

### 4.6 Advanced Features (Deferred)
- [ ] Client-side encryption
- [ ] IndexedDB caching for offline search
- [ ] Emotion wheel for detailed mood tracking
- [ ] Goal linking integration
- [ ] AI-powered insights
- [ ] Voice dictation
- [ ] Mobile app sync

## 📦 Key Files to Port

### Priority 1 (Must Have - Phase 1)
- `components/RichTextEditor/RichTextEditor.tsx` - Core editor
- `components/RichTextEditor/rich-text-editor.css` - Editor styles
- `components/RichTextEditor/extensions.ts` - TipTap extensions

### Priority 2 (Enhanced Experience - Phase 2)
- `types/enhanced-template.types.ts` - Template structure
- `templates/enhanced-templates.ts` - Template definitions
- `components/EnhancedEditor/SectionEditor.tsx` - Template sections
- `components/EnhancedEditor/EnhancedJournalEditor.tsx` - Template editor

### Priority 3 (Advanced - Phase 3+)
- `hooks/useJournalSearch.ts` - Search hook
- `services/JournalStorageService.ts` - IndexedDB caching
- `hooks/useJournalDraft.ts` - Draft management
- `components/EmotionSelector/EmotionWheel.tsx` - Mood selector

## 🎯 Recommended Approach

### Week 1 Sprint (Phase 1)
1. **Day 1-2**: Backend models, services, routes
2. **Day 3-4**: Frontend RichTextEditor + basic pages
3. **Day 5**: Integration, testing, polish
4. **Result**: Users can create plain markdown journals in spaces ✅

### Week 2 Sprint (Phase 2)
1. **Day 1-2**: Add template support to backend
2. **Day 3-4**: Port template system to frontend
3. **Day 5**: Add 3 basic templates with UI
4. **Result**: Users can use templates for structured journaling ✅

### Week 3 Sprint (Phase 3)
1. **Day 1-2**: Implement search backend
2. **Day 3-4**: Build search UI with filters
3. **Day 5**: Polish and optimize
4. **Result**: Users can search and filter journals ✅

## 📊 Success Metrics

### Phase 1
- ✅ Users can create journals in spaces
- ✅ Rich text editor with markdown support
- ✅ Journal list shows all entries
- ✅ Full CRUD operations working
- ✅ 95%+ test coverage

### Phase 2
- ✅ 3 templates available
- ✅ Template picker on creation
- ✅ Structured data from templates
- ✅ Mood and tag support

### Phase 3
- ✅ Text search functional
- ✅ Filter by tags, date, mood
- ✅ Search performance < 200ms
- ✅ Pagination working smoothly

## 🚀 Getting Started

To begin implementation:
```bash
# 1. Create feature branch
git checkout -b feature/journal-system

# 2. Start with backend (Phase 1.1-1.4)
cd backend
# Create models, services, routes

# 3. Add frontend dependencies (Phase 1.5)
cd ../frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item tiptap-markdown

# 4. Port components (Phase 1.6-1.10)
# Create feature structure and port RichTextEditor

# 5. Test and deploy
npm test
cd ../backend
python -m pytest
```

## 📝 Notes

- Start simple, iterate quickly
- Maintain 95%+ test coverage
- Follow existing patterns in the codebase
- Use existing auth/space infrastructure
- Keep DynamoDB single-table design
- Prioritize user experience over features

## 🎉 End Goal

A fully-functional journal system where users can:
1. Create rich text journals in their spaces
2. Use templates for structured journaling
3. Search and filter their journal history
4. Track mood and add tags
5. Share journals with space members
6. Export and backup their data

---

**Status**: Ready to begin Phase 1
**Next Step**: Create backend models and services
