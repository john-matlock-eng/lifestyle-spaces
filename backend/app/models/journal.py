"""
Journal-related Pydantic models.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer


class JournalBase(BaseModel):
    """
    Base journal model.

    NOTE: Template data is now embedded in the content field using HTML comments.
    The content field contains markdown with embedded template metadata via JournalParser.
    """
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(...)  # Contains markdown with embedded template metadata
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    is_pinned: bool = Field(default=False, alias="isPinned")

    model_config = ConfigDict(populate_by_name=True)


class JournalCreateRequest(JournalBase):
    """
    Journal creation request model (without space_id - comes from URL).

    NOTE: content contains serialized template data via JournalContentManager.
    templateId is kept for tracking which template was used, but templateData is removed.
    """
    template_id: Optional[str] = Field(None, alias="templateId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)


class JournalCreate(JournalBase):
    """
    Journal creation model (internal use with space_id).

    NOTE: content contains serialized template data via JournalContentManager.
    """
    space_id: str = Field(..., alias="spaceId")
    template_id: Optional[str] = Field(None, alias="templateId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Journal title is required')
        if len(v) > 200:
            raise ValueError('Journal title must be 200 characters or less')
        return v

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Journal content is required')
        return v

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        # Remove duplicates and empty strings
        return list(set(tag.strip() for tag in v if tag.strip()))


class JournalUpdate(BaseModel):
    """
    Journal update model.

    NOTE: content contains serialized template data via JournalContentManager.
    """
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None  # Contains markdown with embedded template metadata
    tags: Optional[List[str]] = None
    emotions: Optional[List[str]] = None  # New field for multiple emotions
    is_pinned: Optional[bool] = Field(None, alias="isPinned")
    template_id: Optional[str] = Field(None, alias="templateId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Journal title cannot be empty')
            if len(v) > 200:
                raise ValueError('Journal title must be 200 characters or less')
        return v

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError('Journal content cannot be empty')
        return v

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            # Remove duplicates and empty strings
            return list(set(tag.strip() for tag in v if tag.strip()))
        return v


class JournalEntry(BaseModel):
    """
    Represents a journal entry for internal service use.

    NOTE: content contains markdown with embedded template metadata.
    """
    journal_id: str
    space_id: str
    user_id: str
    title: str
    content: str  # Contains markdown with embedded template metadata
    template_id: Optional[str] = None  # For tracking which template was used
    # REMOVED: template_data field - data is embedded in content
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    created_at: datetime
    updated_at: datetime
    is_encrypted: bool = False
    word_count: int = 0
    is_pinned: bool = False


class JournalResponse(BaseModel):
    """
    Journal response model for API responses.

    NOTE: content contains markdown with embedded template metadata.
    Frontend should use JournalContentManager to parse the content.
    """
    journal_id: str = Field(..., alias="journalId")
    space_id: str = Field(..., alias="spaceId")
    user_id: str = Field(..., alias="userId")
    title: str
    content: str  # Contains markdown with embedded template metadata
    template_id: Optional[str] = Field(None, alias="templateId")
    # REMOVED: template_data field - data is embedded in content
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    word_count: int = Field(..., alias="wordCount")
    is_pinned: bool = Field(False, alias="isPinned")
    author: Optional[Dict[str, Any]] = None

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True,
        json_schema_extra={
            "example": {
                "journalId": "123e4567-e89b-12d3-a456-426614174000",
                "spaceId": "space-123",
                "userId": "user-123",
                "title": "My Daily Reflection",
                "content": "<!--\n@template: daily-reflection\n@metadata: {\"emotions\":[\"happy\",\"playful\",\"joyful\"]}\n-->\n\n<!-- section:gratitude @title:\"Gratitude\" -->\n- family\n- health\n<!-- /section:gratitude -->\n\nToday was a great day...",
                "templateId": "daily-reflection",
                "tags": ["daily", "reflection"],
                "emotions": ["happy", "playful", "joyful"],
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z",
                "wordCount": 25,
                "isPinned": False,
                "author": {
                    "userId": "user-123",
                    "username": "johndoe",
                    "displayName": "John Doe"
                }
            }
        }
    )


class JournalListResponse(BaseModel):
    """Journal list response model."""
    journals: List[JournalResponse]
    total: int
    page: int = Field(default=1)
    page_size: int = Field(default=20, alias="pageSize")
    has_more: bool = Field(default=False, alias="hasMore")

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )
