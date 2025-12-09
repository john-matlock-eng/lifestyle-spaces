"""
Data models for Conversations aggregation (Conversations feature).

Thread-level conversation models that show individual discussion threads
(highlight comments or journal discussions) with rich participation data.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ConversationThread(BaseModel):
    """
    Represents an individual conversation thread.

    A thread is either:
    - A highlight with its comments
    - The journal-level discussion
    """

    # Thread identification
    thread_id: str = Field(alias="threadId")  # highlightId or "journal-discussion-{journalId}"
    thread_type: str = Field(alias="threadType")  # "highlight" or "journal_discussion"

    # Journal context
    journal_id: str = Field(alias="journalId")
    journal_title: str = Field(alias="journalTitle")
    journal_author_id: str = Field(alias="journalAuthorId")
    journal_author_name: str = Field(alias="journalAuthorName")

    # Thread-specific content (for highlights)
    highlight_text: Optional[str] = Field(None, alias="highlightText")  # The highlighted text snippet
    highlight_color: Optional[str] = Field(None, alias="highlightColor")

    # Activity timestamps
    last_activity: str = Field(alias="lastActivity")
    created_at: str = Field(alias="createdAt")

    # Comment stats
    comment_count: int = Field(alias="commentCount")

    # Participation tracking
    participants: List[str] = Field(default_factory=list)  # Display names
    participant_ids: List[str] = Field(default_factory=list, alias="participantIds")

    # Current user's relationship to this thread
    user_participated: bool = Field(alias="userParticipated")  # Has user commented?
    user_started: bool = Field(alias="userStarted")  # Did user create the highlight/start discussion?
    user_last_seen: Optional[str] = Field(None, alias="userLastSeen")  # When user last viewed
    user_last_comment: Optional[str] = Field(None, alias="userLastComment")  # When user last commented

    # Unread status
    is_unread: bool = Field(alias="isUnread")  # Any new activity since user last saw
    unread_count: int = Field(alias="unreadCount")  # Number of new comments
    has_reply_to_user: bool = Field(alias="hasReplyToUser")  # Someone replied after user's last comment

    # Latest comment preview
    latest_comment_text: Optional[str] = Field(None, alias="latestCommentText")
    latest_comment_author: Optional[str] = Field(None, alias="latestCommentAuthor")
    latest_comment_author_id: Optional[str] = Field(None, alias="latestCommentAuthorId")
    latest_comment_time: Optional[str] = Field(None, alias="latestCommentTime")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class ThreadsResponse(BaseModel):
    """Response model for list of conversation threads."""

    threads: List[ConversationThread]
    total_unread: int = Field(alias="totalUnread")
    threads_with_replies: int = Field(alias="threadsWithReplies")  # Threads where someone replied to user
    next_token: Optional[str] = Field(None, alias="nextToken")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# Keep old models for backwards compatibility during transition
class ConversationModel(BaseModel):
    """DEPRECATED: Use ConversationThread instead. Represents a journal with its discussion activity."""

    journal_id: str = Field(alias="journalId")
    journal_title: str = Field(alias="journalTitle")
    journal_author: str = Field(alias="journalAuthor")
    journal_author_name: str = Field(alias="journalAuthorName")
    last_activity: str = Field(alias="lastActivity")
    last_activity_type: str = Field(alias="lastActivityType")
    last_activity_highlight_id: Optional[str] = Field(None, alias="lastActivityHighlightId")
    highlight_count: int = Field(alias="highlightCount")
    highlight_comment_count: int = Field(alias="highlightCommentCount")
    journal_comment_count: int = Field(alias="journalCommentCount")
    unread_count: int = Field(alias="unreadCount")
    participants: List[str] = Field(default_factory=list)
    preview_text: Optional[str] = Field(None, alias="previewText")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class ConversationsResponse(BaseModel):
    """DEPRECATED: Use ThreadsResponse instead."""

    conversations: List[ConversationModel]
    total_unread: int = Field(alias="totalUnread")
    next_token: Optional[str] = Field(None, alias="nextToken")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class UnreadCountResponse(BaseModel):
    """Response model for unread count."""

    total_unread: int = Field(alias="totalUnread")
    threads_with_replies: int = Field(0, alias="threadsWithReplies")
    space_id: str = Field(alias="spaceId")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class MarkReadRequest(BaseModel):
    """Request to mark a thread or journal as read."""

    # Optional: mark specific thread
    thread_id: Optional[str] = Field(None, alias="threadId")
    # Legacy: mark entire journal
    mark_highlight_comments: bool = Field(True, alias="markHighlightComments")
    mark_journal_comments: bool = Field(True, alias="markJournalComments")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class MarkReadResponse(BaseModel):
    """Response for marking as read."""

    success: bool
    journal_id: str = Field(alias="journalId")
    space_id: str = Field(alias="spaceId")
    thread_id: Optional[str] = Field(None, alias="threadId")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)
