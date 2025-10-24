"""
Data models for Journal Highlights and Comments feature.

Single Table Design:
- Highlights: PK=SPACE#{space_id}, SK=HIGHLIGHT#{highlight_id}
- Comments: PK=SPACE#{space_id}, SK=COMMENT#{comment_id}

GSI1:
- Highlights by journal: GSI1PK=JOURNAL#{entry_id}, GSI1SK=HIGHLIGHT#{timestamp}
- Comments by highlight: GSI1PK=HIGHLIGHT#{highlight_id}, GSI1SK=COMMENT#{timestamp}
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TextRange(BaseModel):
    """Text selection range for highlights."""
    start_offset: int = Field(alias="startOffset")
    end_offset: int = Field(alias="endOffset")
    start_container_id: Optional[str] = Field(None, alias="startContainerId")
    end_container_id: Optional[str] = Field(None, alias="endContainerId")

    class Config:
        populate_by_name = True
        by_alias = True


class HighlightModel(BaseModel):
    """Journal entry highlight model."""
    id: str
    journal_entry_id: str = Field(alias="journalEntryId")
    space_id: str = Field(alias="spaceId")
    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")
    color: Optional[str] = "yellow"
    created_by: str = Field(alias="createdBy")
    created_by_name: str = Field(alias="createdByName")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    comment_count: int = Field(default=0, alias="commentCount")

    class Config:
        populate_by_name = True
        by_alias = True


class CommentModel(BaseModel):
    """Comment on a highlight model."""
    id: str
    highlight_id: str = Field(alias="highlightId")
    space_id: str = Field(alias="spaceId")
    text: str
    author: str
    author_name: str = Field(alias="authorName")
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: List[str] = Field(default_factory=list)
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    is_edited: bool = Field(default=False, alias="isEdited")

    class Config:
        populate_by_name = True
        by_alias = True


class CreateHighlightRequest(BaseModel):
    """Request to create a new highlight."""
    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")
    color: Optional[str] = "yellow"

    class Config:
        populate_by_name = True
        by_alias = True


class UpdateHighlightRequest(BaseModel):
    """Request to update a highlight's text selection."""
    highlighted_text: str = Field(alias="highlightedText")
    text_range: TextRange = Field(alias="textRange")

    class Config:
        populate_by_name = True
        by_alias = True


class CreateCommentRequest(BaseModel):
    """Request to create a new comment."""
    text: str
    parent_comment_id: Optional[str] = Field(None, alias="parentCommentId")
    mentions: Optional[List[str]] = Field(default_factory=list)

    class Config:
        populate_by_name = True
        by_alias = True


# DynamoDB Item helpers
def highlight_to_db_item(highlight: HighlightModel) -> dict:
    """Convert highlight model to DynamoDB item."""
    return {
        "PK": f"SPACE#{highlight.space_id}",
        "SK": f"HIGHLIGHT#{highlight.id}",
        "GSI1PK": f"JOURNAL#{highlight.journal_entry_id}",
        "GSI1SK": f"HIGHLIGHT#{highlight.created_at}",
        "EntityType": "Highlight",
        "id": highlight.id,
        "journalEntryId": highlight.journal_entry_id,
        "spaceId": highlight.space_id,
        "highlightedText": highlight.highlighted_text,
        "textRange": highlight.text_range.dict(by_alias=True),
        "color": highlight.color,
        "createdBy": highlight.created_by,
        "createdByName": highlight.created_by_name,
        "createdAt": highlight.created_at,
        "updatedAt": highlight.updated_at,
        "commentCount": highlight.comment_count,
    }


def db_item_to_highlight(item: dict) -> HighlightModel:
    """Convert DynamoDB item to highlight model."""
    return HighlightModel(
        id=item["id"],
        journalEntryId=item["journalEntryId"],
        spaceId=item["spaceId"],
        highlightedText=item["highlightedText"],
        textRange=TextRange(**item["textRange"]),
        color=item.get("color", "yellow"),
        createdBy=item["createdBy"],
        createdByName=item["createdByName"],
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
        commentCount=item.get("commentCount", 0),
    )


def comment_to_db_item(comment: CommentModel) -> dict:
    """Convert comment model to DynamoDB item."""
    return {
        "PK": f"SPACE#{comment.space_id}",
        "SK": f"COMMENT#{comment.id}",
        "GSI1PK": f"HIGHLIGHT#{comment.highlight_id}",
        "GSI1SK": f"COMMENT#{comment.created_at}",
        "EntityType": "Comment",
        "id": comment.id,
        "highlightId": comment.highlight_id,
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


def db_item_to_comment(item: dict) -> CommentModel:
    """Convert DynamoDB item to comment model."""
    return CommentModel(
        id=item["id"],
        highlightId=item["highlightId"],
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
