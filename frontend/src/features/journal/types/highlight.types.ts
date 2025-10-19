/**
 * Type definitions for Journal Highlights and Collaborative Comments feature
 */

export interface TextRange {
  startOffset: number;
  endOffset: number;
  startContainerId?: string;
  endContainerId?: string;
}

export interface Highlight {
  id: string;
  journalEntryId: string;
  spaceId: string;
  highlightedText: string;
  textRange: TextRange;
  color?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface Comment {
  id: string;
  highlightId: string;
  spaceId: string;
  text: string;
  author: string;
  authorName: string;
  parentCommentId?: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface CommentThread {
  highlight: Highlight;
  comments: Comment[];
  isExpanded: boolean;
}

export interface HighlightSelection {
  text: string;
  range: TextRange;
  boundingRect: DOMRect;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  color: string;
  lastActivity: string;
}

// API Request/Response types
export interface CreateHighlightRequest {
  highlightedText: string;
  textRange: TextRange;
  color?: string;
}

export interface CreateHighlightResponse {
  highlight: Highlight;
}

export interface GetHighlightsResponse {
  highlights: Highlight[];
}

export interface CreateCommentRequest {
  text: string;
  parentCommentId?: string;
  mentions?: string[];
}

export interface CreateCommentResponse {
  comment: Comment;
}

export interface GetCommentsResponse {
  comments: Comment[];
}

// WebSocket message types
export type HighlightWebSocketMessage =
  | { type: 'highlight:created'; data: Highlight }
  | { type: 'highlight:deleted'; data: { id: string } }
  | { type: 'comment:created'; data: Comment }
  | { type: 'comment:updated'; data: Comment }
  | { type: 'comment:deleted'; data: { id: string } }
  | { type: 'presence:join'; data: PresenceUser }
  | { type: 'presence:leave'; data: { userId: string } }
  | { type: 'presence:typing'; data: { userId: string; highlightId: string } };

// Component prop types
export interface HighlightableTextProps {
  content: string;
  highlights: Highlight[];
  journalEntryId: string;
  spaceId: string;
  onHighlightCreate: (selection: HighlightSelection) => void;
  onHighlightClick: (highlight: Highlight) => void;
  isReadOnly?: boolean;
  className?: string;
}

export interface HighlightPopoverProps {
  selection: HighlightSelection | null;
  position: { x: number; y: number };
  onCreateHighlight: (color?: string) => void;
  onCancel: () => void;
}

export interface CommentThreadProps {
  highlight: Highlight;
  comments: Comment[];
  spaceMembers: Array<{ id: string; name: string }>;
  currentUserId: string;
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
}

export interface HighlightsSidebarProps {
  highlights: Highlight[];
  activeHighlightId: string | null;
  onHighlightClick: (highlightId: string) => void;
  onHighlightDelete: (highlightId: string) => void;
}

// Utility types
export type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'orange';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FEF08A',
  green: '#86EFAC',
  blue: '#93C5FD',
  purple: '#C4B5FD',
  pink: '#F9A8D4',
  orange: '#FDBA74',
};
