"""
Data models for Read Status tracking (Conversations feature).

Single Table Design:
- UserReadStatus: PK=USER#{user_id}, SK=READ_STATUS#{space_id}#{journal_id}

This tracks when a user last read comments on a journal, enabling unread count calculations.
"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ReadStatusModel(BaseModel):
    """Tracks when a user last read comments on a journal."""

    user_id: str = Field(alias="userId")
    space_id: str = Field(alias="spaceId")
    journal_id: str = Field(alias="journalId")
    last_read_highlight_comment_at: Optional[str] = Field(None, alias="lastReadHighlightCommentAt")
    last_read_journal_comment_at: Optional[str] = Field(None, alias="lastReadJournalCommentAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


# DynamoDB Item helpers
def read_status_to_db_item(status: ReadStatusModel) -> dict:
    """Convert read status model to DynamoDB item."""
    return {
        "PK": f"USER#{status.user_id}",
        "SK": f"READ_STATUS#{status.space_id}#{status.journal_id}",
        "EntityType": "ReadStatus",
        "userId": status.user_id,
        "spaceId": status.space_id,
        "journalId": status.journal_id,
        "lastReadHighlightCommentAt": status.last_read_highlight_comment_at,
        "lastReadJournalCommentAt": status.last_read_journal_comment_at,
    }


def db_item_to_read_status(item: dict) -> ReadStatusModel:
    """Convert DynamoDB item to read status model."""
    return ReadStatusModel(
        userId=item["userId"],
        spaceId=item["spaceId"],
        journalId=item["journalId"],
        lastReadHighlightCommentAt=item.get("lastReadHighlightCommentAt"),
        lastReadJournalCommentAt=item.get("lastReadJournalCommentAt"),
    )
