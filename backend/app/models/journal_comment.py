"""
Data models for Journal-level Comments (Conversations feature).

Single Table Design:
- JournalComments: PK=SPACE#{space_id}, SK=JOURNAL_COMMENT#{comment_id}

GSI1:
- Comments by journal: GSI1PK=JOURNAL#{journal_id}, GSI1SK=JOURNAL_COMMENT#{timestamp}

These comments are journal-level discussions, separate from highlight-specific comments.
"""

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class JournalCommentModel(BaseModel):
    """Journal-level comment model (not tied to a specific highlight)."""

    id: str
    journal_id: str = Field(alias="journalId")
    space_id: str = Field(alias="spaceId")
    text: str
    author: str
    author_name: str = Field(alias="authorName")
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: List[str] = Field(default_factory=list)
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    is_edited: bool = Field(default=False, alias="isEdited")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class CreateJournalCommentRequest(BaseModel):
    """Request to create a new journal comment."""

    text: str
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: Optional[List[str]] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class UpdateJournalCommentRequest(BaseModel):
    """Request to update a journal comment."""

    text: str
    mentions: Optional[List[str]] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class JournalCommentResponse(BaseModel):
    """Response model for a journal comment."""

    id: str
    journal_id: str = Field(alias="journalId")
    space_id: str = Field(alias="spaceId")
    text: str
    author: str
    author_name: str = Field(alias="authorName")
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: List[str] = Field(default_factory=list)
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    is_edited: bool = Field(default=False, alias="isEdited")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class JournalCommentListResponse(BaseModel):
    """Response model for list of journal comments."""

    comments: List[JournalCommentModel]
    count: int

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# DynamoDB Item helpers
def journal_comment_to_db_item(comment: JournalCommentModel) -> dict:
    """Convert journal comment model to DynamoDB item."""
    return {
        "PK": f"SPACE#{comment.space_id}",
        "SK": f"JOURNAL_COMMENT#{comment.id}",
        "GSI1PK": f"JOURNAL#{comment.journal_id}",
        "GSI1SK": f"JOURNAL_COMMENT#{comment.created_at}",
        "EntityType": "JournalComment",
        "id": comment.id,
        "journalId": comment.journal_id,
        "spaceId": comment.space_id,
        "text": comment.text,
        "author": comment.author,
        "authorName": comment.author_name,
        "parentCommentId": comment.parent_comment_id,
        "mentions": comment.mentions,
        "createdAt": comment.created_at,
        "updatedAt": comment.updated_at,
        "isEdited": comment.is_edited,
    }


def db_item_to_journal_comment(item: dict) -> JournalCommentModel:
    """Convert DynamoDB item to journal comment model."""
    return JournalCommentModel(
        id=item["id"],
        journalId=item["journalId"],
        spaceId=item["spaceId"],
        text=item["text"],
        author=item["author"],
        authorName=item["authorName"],
        parentCommentId=item.get("parentCommentId"),
        mentions=item.get("mentions", []),
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
        isEdited=item.get("isEdited", False),
    )
