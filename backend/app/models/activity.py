"""
Activity tracking models for space activity feed.

Single Table Design:
- Activities: PK=SPACE#{space_id}, SK=ACTIVITY#{timestamp}#{activity_id}

This allows efficient querying of recent activities for a space.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class ActivityType(str, Enum):
    """Types of activities that can be tracked."""
    # Journal activities
    JOURNAL_CREATED = "journal_created"
    JOURNAL_UPDATED = "journal_updated"
    JOURNAL_DELETED = "journal_deleted"

    # Highlight activities
    HIGHLIGHT_CREATED = "highlight_created"
    HIGHLIGHT_DELETED = "highlight_deleted"

    # Comment activities
    COMMENT_CREATED = "comment_created"

    # Member activities
    MEMBER_JOINED = "member_joined"


class ActivityMetadata(BaseModel):
    """
    Metadata for an activity, varies by activity type.

    For journal activities:
        - journal_id: str
        - journal_title: str
        - content_preview: str (first 100 chars)
        - template_id: Optional[str]

    For highlight activities:
        - highlight_id: str
        - journal_id: str
        - journal_title: str
        - highlighted_text: str (first 100 chars)

    For comment activities:
        - comment_id: str
        - highlight_id: str
        - journal_id: str
        - journal_title: str
        - comment_text: str (first 100 chars)

    For member activities:
        - member_id: str
        - member_name: str
    """
    model_config = ConfigDict(extra='allow')


class ActivityModel(BaseModel):
    """Activity model for tracking space events."""
    activity_id: str = Field(alias="activityId")
    space_id: str = Field(alias="spaceId")
    activity_type: ActivityType = Field(alias="activityType")
    user_id: str = Field(alias="userId")
    user_name: str = Field(alias="userName")
    timestamp: str  # ISO 8601 format
    metadata: Dict[str, Any]  # Flexible metadata based on activity type

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class ActivityResponse(BaseModel):
    """Response model for activity feed."""
    activity_id: str = Field(alias="activityId")
    space_id: str = Field(alias="spaceId")
    activity_type: str = Field(alias="activityType")
    user_id: str = Field(alias="userId")
    user_name: str = Field(alias="userName")
    timestamp: str
    metadata: Dict[str, Any]

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class ActivityListResponse(BaseModel):
    """Response model for list of activities."""
    activities: list[ActivityResponse]
    next_token: Optional[str] = Field(None, alias="nextToken")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)
