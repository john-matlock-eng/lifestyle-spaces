/**
 * Type definitions for Journal-level Comments (Conversations feature)
 */

export interface JournalComment {
  id: string;
  journalId: string;
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

export interface JournalCommentListResponse {
  comments: JournalComment[];
  count: number;
}

export interface CreateJournalCommentRequest {
  text: string;
  parentCommentId?: string;
  mentions?: string[];
}

export interface UpdateJournalCommentRequest {
  text: string;
  mentions?: string[];
}

export interface JournalCommentThread {
  comments: JournalComment[];
  isExpanded: boolean;
}

// Component prop types
export interface JournalCommentThreadProps {
  spaceId: string;
  journalId: string;
  journalTitle: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onOpenPanel?: () => void;
}

export interface JournalCommentPanelProps {
  spaceId: string;
  journalId: string;
  journalTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface JournalCommentItemProps {
  comment: JournalComment;
  currentUserId: string;
  onReply?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  isReply?: boolean;
}
