"""
Data models for Conversations aggregation (Conversations feature).

These models represent the aggregated view of discussions across journals in a space.
Unlike the ReadStatus model, these are computed/aggregated responses, not stored entities.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ConversationModel(BaseModel):
    """Represents a journal with its discussion activity."""
    journal_id: str = Field(alias="journalId")
    journal_title: str = Field(alias="journalTitle")
    journal_author: str = Field(alias="journalAuthor")
    journal_author_name: str = Field(alias="journalAuthorName")
    last_activity: str = Field(alias="lastActivity")
    highlight_count: int = Field(alias="highlightCount")
    highlight_comment_count: int = Field(alias="highlightCommentCount")
    journal_comment_count: int = Field(alias="journalCommentCount")
    unread_count: int = Field(alias="unreadCount")
    participants: List[str] = Field(default_factory=list)
    preview_text: Optional[str] = Field(None, alias="previewText")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class ConversationsResponse(BaseModel):
    """Response model for list of conversations in a space."""
    conversations: List[ConversationModel]
    total_unread: int = Field(alias="totalUnread")
    next_token: Optional[str] = Field(None, alias="nextToken")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class UnreadCountResponse(BaseModel):
    """Response model for unread count."""
    total_unread: int = Field(alias="totalUnread")
    space_id: str = Field(alias="spaceId")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class MarkReadRequest(BaseModel):
    """Request to mark a journal as read."""
    # Optional: mark specific types as read
    mark_highlight_comments: bool = Field(True, alias="markHighlightComments")
    mark_journal_comments: bool = Field(True, alias="markJournalComments")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class MarkReadResponse(BaseModel):
    """Response for marking a journal as read."""
    success: bool
    journal_id: str = Field(alias="journalId")
    space_id: str = Field(alias="spaceId")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)
