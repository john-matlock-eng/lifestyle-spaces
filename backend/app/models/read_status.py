"""
Data models for Per-Thread Read Status tracking.

Single Table Design:
- ThreadReadStatus: PK=USER#{user_id}, SK=THREAD_READ#{space_id}#{thread_id}

This tracks when a user last read each individual thread (highlight or journal discussion).
"""

from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ThreadReadStatus(BaseModel):
    """Tracks when a user last read a specific thread."""

    user_id: str = Field(alias="userId")
    space_id: str = Field(alias="spaceId")
    thread_id: str = Field(alias="threadId")
    thread_type: str = Field(alias="threadType")  # "highlight" or "journal_discussion"
    journal_id: str = Field(alias="journalId")  # Reference for queries
    last_read_at: str = Field(alias="lastReadAt")  # ISO timestamp
    last_comment_count: int = Field(default=0, alias="lastCommentCount")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


def thread_read_status_to_db_item(status: ThreadReadStatus) -> dict:
    """Convert thread read status model to DynamoDB item."""
    return {
        "PK": f"USER#{status.user_id}",
        "SK": f"THREAD_READ#{status.space_id}#{status.thread_id}",
        "GSI1PK": f"USER#{status.user_id}#SPACE#{status.space_id}",
        "GSI1SK": f"THREAD_READ#{status.last_read_at}",
        "EntityType": "ThreadReadStatus",
        "userId": status.user_id,
        "spaceId": status.space_id,
        "threadId": status.thread_id,
        "threadType": status.thread_type,
        "journalId": status.journal_id,
        "lastReadAt": status.last_read_at,
        "lastCommentCount": status.last_comment_count,
    }


def db_item_to_thread_read_status(item: dict) -> ThreadReadStatus:
    """Convert DynamoDB item to thread read status model."""
    return ThreadReadStatus(
        userId=item["userId"],
        spaceId=item["spaceId"],
        threadId=item["threadId"],
        threadType=item["threadType"],
        journalId=item["journalId"],
        lastReadAt=item["lastReadAt"],
        lastCommentCount=item.get("lastCommentCount", 0),
    )


# ============================================================
# LEGACY: Keep old model for migration period, then remove
# ============================================================

class ReadStatusModel(BaseModel):
    """DEPRECATED: Use ThreadReadStatus instead. Journal-level read tracking."""

    user_id: str = Field(alias="userId")
    space_id: str = Field(alias="spaceId")
    journal_id: str = Field(alias="journalId")
    last_read_highlight_comment_at: Optional[str] = Field(None, alias="lastReadHighlightCommentAt")
    last_read_journal_comment_at: Optional[str] = Field(None, alias="lastReadJournalCommentAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


def read_status_to_db_item(status: ReadStatusModel) -> dict:
    """DEPRECATED: Convert read status model to DynamoDB item."""
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
    """DEPRECATED: Convert DynamoDB item to read status model."""
    return ReadStatusModel(
        userId=item["userId"],
        spaceId=item["spaceId"],
        journalId=item["journalId"],
        lastReadHighlightCommentAt=item.get("lastReadHighlightCommentAt"),
        lastReadJournalCommentAt=item.get("lastReadJournalCommentAt"),
    )
