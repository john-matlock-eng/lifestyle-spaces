# Conversations Feature Implementation Plan

## Overview
Extend the highlights/comments system to support "Conversations" - a unified view of all discussions across a space, with journal-level comments and activity tracking.

## Key Features
1. **Journal-level comments** - General discussion thread for each journal (not tied to highlights)
2. **Conversations tab** - Space-level view of all discussions, prioritized by recent activity
3. **Unread tracking** - Track which comments users have seen

---

## Phase 1: Backend - Journal Comments

### 1.1 New Data Model (`backend/app/models/journal_comment.py`)

```
DynamoDB Schema:
- JournalComment: PK=SPACE#{space_id}, SK=JOURNAL_COMMENT#{comment_id}
- GSI1: GSI1PK=JOURNAL#{journal_id}, GSI1SK=JOURNAL_COMMENT#{timestamp}
```

**JournalCommentModel fields:**
- `id`: str
- `journalId`: str
- `spaceId`: str
- `text`: str
- `author`: str (userId)
- `authorName`: str
- `parentCommentId`: Optional[str] (for threading)
- `mentions`: List[str]
- `createdAt`: str
- `updatedAt`: str
- `isEdited`: bool

### 1.2 Journal Comment Service (`backend/app/services/journal_comment_service.py`)

Methods:
- `create_comment(space_id, journal_id, user_id, user_name, request)`
- `get_comments_for_journal(space_id, journal_id)`
- `update_comment(space_id, comment_id, user_id, new_text)`
- `delete_comment(space_id, comment_id, user_id)`
- `get_comment_count(space_id, journal_id)`

### 1.3 API Routes (`backend/app/api/routes/journal_comments.py`)

```
POST   /api/spaces/{space_id}/journals/{journal_id}/comments
GET    /api/spaces/{space_id}/journals/{journal_id}/comments
PUT    /api/spaces/{space_id}/comments/{comment_id}
DELETE /api/spaces/{space_id}/comments/{comment_id}
```

### 1.4 Activity Recording

Add new activity type: `JOURNAL_COMMENT_CREATED`
- Metadata: `comment_id`, `journal_id`, `journal_title`, `comment_text`

---

## Phase 2: Backend - Conversations Aggregation

### 2.1 Read Status Tracking Model

```
DynamoDB Schema:
- UserReadStatus: PK=USER#{user_id}, SK=READ_STATUS#{space_id}#{journal_id}
```

**ReadStatusModel fields:**
- `userId`: str
- `spaceId`: str
- `journalId`: str
- `lastReadHighlightCommentAt`: str (ISO timestamp)
- `lastReadJournalCommentAt`: str (ISO timestamp)

### 2.2 Conversations Service (`backend/app/services/conversation_service.py`)

Methods:
- `get_space_conversations(space_id, user_id, limit, sort_by='recent_activity')`
  - Returns aggregated view of all journals with discussions
  - Includes: journal info, highlight count, comment counts, unread counts
  - Sorted by most recent activity

- `mark_journal_as_read(user_id, space_id, journal_id)`
  - Updates user's read timestamp for a journal

- `get_unread_count(user_id, space_id)`
  - Returns total unread comments across space

### 2.3 Conversations API Route

```
GET  /api/spaces/{space_id}/conversations
     Query params: limit, sort (recent|unread)

POST /api/spaces/{space_id}/journals/{journal_id}/mark-read
```

**Response format for GET /conversations:**
```json
{
  "conversations": [
    {
      "journalId": "xxx",
      "journalTitle": "My Journal",
      "journalAuthor": "John",
      "lastActivity": "2024-01-15T10:30:00Z",
      "highlightCount": 5,
      "highlightCommentCount": 12,
      "journalCommentCount": 3,
      "unreadCount": 4,
      "participants": ["user1", "user2"],
      "previewText": "Latest comment preview..."
    }
  ],
  "totalUnread": 15,
  "nextToken": null
}
```

---

## Phase 3: Frontend - Journal Comments UI

### 3.1 Journal Comment Thread Component

**File:** `frontend/src/features/journal/components/JournalCommentThread.tsx`

Features:
- Render at bottom of JournalViewPage
- Collapsible by default, shows comment count
- Threaded replies support
- "Expand to panel" button to open side drawer
- Auto-scroll to new comments

### 3.2 Journal Comment Panel (Reuse CommentThread pattern)

**File:** `frontend/src/features/journal/components/JournalCommentPanel.tsx`

- Slide-out panel similar to highlight comment thread
- Full-height, scrollable
- Close button to return to inline view

### 3.3 Update JournalViewPage

- Add JournalCommentThread at bottom of content
- Add state for panel open/closed
- Fetch journal comments alongside highlights
- Pass comment count to header for badge display

### 3.4 New Hook: useJournalComments

**File:** `frontend/src/features/journal/hooks/useJournalComments.ts`

```typescript
interface UseJournalComments {
  comments: JournalComment[];
  loading: boolean;
  error: string | null;
  createComment: (text: string, parentId?: string) => Promise<void>;
  updateComment: (id: string, text: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  refresh: () => void;
}
```

---

## Phase 4: Frontend - Conversations Tab

### 4.1 Conversations Tab Component

**File:** `frontend/src/components/ConversationsTab.tsx`

Features:
- List of journals with active discussions
- Sorted by recent activity (default) with unread prioritized
- Each item shows:
  - Journal title + author
  - Last activity timestamp
  - Comment counts (highlights + journal)
  - Unread badge
  - Participant avatars
  - Preview of latest comment
- Click to navigate to journal with comments open

### 4.2 Update SpaceDetail.tsx

- Add 'conversations' to VALID_TABS
- Add new tab button with unread badge
- Render ConversationsTab when active
- Fetch unread count on mount

### 4.3 Conversations Service (Frontend)

**File:** `frontend/src/services/conversationService.ts`

```typescript
export const conversationService = {
  getSpaceConversations(spaceId: string, options?: { limit?: number; sort?: 'recent' | 'unread' }),
  markJournalAsRead(spaceId: string, journalId: string),
  getUnreadCount(spaceId: string),
};
```

### 4.4 Types

**File:** `frontend/src/types/conversation.ts`

```typescript
interface Conversation {
  journalId: string;
  journalTitle: string;
  journalAuthor: string;
  lastActivity: string;
  highlightCount: number;
  highlightCommentCount: number;
  journalCommentCount: number;
  unreadCount: number;
  participants: string[];
  previewText: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  totalUnread: number;
  nextToken?: string;
}
```

---

## Phase 5: Polish & Integration

### 5.1 Real-time Updates
- Extend WebSocket to broadcast journal comments
- Update unread counts in real-time

### 5.2 Activity Feed Integration
- Show journal comment activities in activity feed
- Link to journal with comments panel open

### 5.3 Navigation Deep Links
- URL support: `/spaces/{id}/journals/{jid}?openComments=true`
- Activity feed links open directly to comments

### 5.4 Unread Indicators
- Badge on Conversations tab
- Badge on individual journals in JournalList
- Mark as read when user views comments

---

## Implementation Order

1. **Backend Phase 1** - Journal comments model, service, API (~2-3 files)
2. **Frontend Journal Comments** - Hook, thread component, panel (~3-4 files)
3. **Backend Phase 2** - Read status tracking, conversations aggregation (~2-3 files)
4. **Frontend Conversations Tab** - Tab component, service, types (~4-5 files)
5. **Polish** - Real-time, deep links, badges (~updates to existing files)

---

## Files to Create/Modify

### New Files (Backend):
- `backend/app/models/journal_comment.py`
- `backend/app/services/journal_comment_service.py`
- `backend/app/services/conversation_service.py`
- `backend/app/api/routes/journal_comments.py`
- `backend/app/api/routes/conversations.py`
- `backend/tests/test_journal_comments.py`
- `backend/tests/test_conversations.py`

### New Files (Frontend):
- `frontend/src/features/journal/components/JournalCommentThread.tsx`
- `frontend/src/features/journal/components/JournalCommentPanel.tsx`
- `frontend/src/features/journal/hooks/useJournalComments.ts`
- `frontend/src/components/ConversationsTab.tsx`
- `frontend/src/components/ConversationsTab.css`
- `frontend/src/services/conversationService.ts`
- `frontend/src/types/conversation.ts`

### Modified Files:
- `backend/app/main.py` - Register new routers
- `backend/app/models/activity.py` - Add JOURNAL_COMMENT_CREATED type
- `frontend/src/pages/SpaceDetail.tsx` - Add conversations tab
- `frontend/src/pages/SpaceDetail.css` - Tab styling
- `frontend/src/features/journal/pages/JournalViewPage.tsx` - Add journal comments
- `frontend/src/features/journal/styles/journal.css` - Comment thread styling
