"""
Journal-related Pydantic models.

TipTap Integration:
- Journals can now store TipTap JSON format in content_tiptap field
- This enables TipTap-native highlighting with perfect position accuracy
- Markdown (content) is maintained for backward compatibility

Multi-Section TipTap Support:
- content_tiptap can be either:
  1. Single TipTap document: { "type": "doc", "content": [...] }
  2. Multi-section mapping: { "sectionId": { "type": "doc", "content": [...] }, ... }
- This supports both simple journals and complex multi-section template journals
"""
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer

from app.models.ai_metadata import JournalAIMetadata


class JournalBase(BaseModel):
    """
    Base journal model.

    NOTE: Template data is now embedded in the content field using HTML comments.
    The content field contains markdown with embedded template metadata via JournalParser.

    TipTap Integration:
    - content: Markdown format (for backward compatibility)
    - content_tiptap: TipTap JSON format with embedded highlights (optional)
      Can be either single document or section mapping
    """

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(...)  # Contains markdown with embedded template metadata
    content_tiptap: Optional[Dict[str, Any]] = Field(
        None, alias="contentTiptap"
    )  # TipTap JSON format
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    is_pinned: bool = Field(default=False, alias="isPinned")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("content_tiptap")
    @classmethod
    def validate_content_tiptap(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Validate TipTap content format.

        Supports two formats:
        1. Single document: { "type": "doc", "content": [...] }
        2. Multi-section: { "sectionId": { "type": "doc", ... }, ... }
        """
        if v is None:
            return v

        if not isinstance(v, dict):
            raise ValueError("contentTiptap must be a dictionary")

        # Check if it's single TipTap document format
        if v.get("type") == "doc":
            # Validate it has content field
            if "content" not in v:
                raise ValueError("Single TipTap document must have 'content' field")
            return v

        # Otherwise, assume multi-section format
        # Validate each section is a valid TipTap document
        for section_id, doc in v.items():
            if not isinstance(doc, dict):
                raise ValueError(f"Section '{section_id}' must contain a TipTap document object")
            if doc.get("type") != "doc":
                raise ValueError(
                    f"Section '{section_id}' must be a valid TipTap document with type='doc'"
                )
            if "content" not in doc:
                raise ValueError(
                    f"Section '{section_id}' TipTap document must have 'content' field"
                )

        return v


class JournalCreateRequest(JournalBase):
    """
    Journal creation request model (without space_id - comes from URL).

    NOTE: content contains serialized template data via JournalContentManager.
    templateId is kept for tracking which template was used, but templateData is removed.
    """

    template_id: Optional[str] = Field(None, alias="templateId")
    framework_id: Optional[str] = Field(None, alias="frameworkId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)


class JournalCreate(JournalBase):
    """
    Journal creation model (internal use with space_id).

    NOTE: content contains serialized template data via JournalContentManager.
    """

    space_id: str = Field(..., alias="spaceId")
    template_id: Optional[str] = Field(None, alias="templateId")
    framework_id: Optional[str] = Field(None, alias="frameworkId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Journal title is required")
        if len(v) > 200:
            raise ValueError("Journal title must be 200 characters or less")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Journal content is required")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        # Remove duplicates and empty strings
        return list(set(tag.strip() for tag in v if tag.strip()))


class JournalUpdate(BaseModel):
    """
    Journal update model.

    NOTE: content contains serialized template data via JournalContentManager.

    TipTap Integration:
    - content: Markdown format (for backward compatibility)
    - content_tiptap: TipTap JSON format with embedded highlights (optional)
    """

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None  # Contains markdown with embedded template metadata
    content_tiptap: Optional[Dict[str, Any]] = Field(
        None, alias="contentTiptap"
    )  # TipTap JSON format
    tags: Optional[List[str]] = None
    emotions: Optional[List[str]] = None  # New field for multiple emotions
    is_pinned: Optional[bool] = Field(None, alias="isPinned")
    template_id: Optional[str] = Field(None, alias="templateId")
    framework_id: Optional[str] = Field(None, alias="frameworkId")
    # REMOVED: template_data field - data is embedded in content

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Journal title cannot be empty")
            if len(v) > 200:
                raise ValueError("Journal title must be 200 characters or less")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Journal content cannot be empty")
        return v

    @field_validator("tags")
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

    TipTap Integration:
    - content: Markdown format (for backward compatibility)
    - content_tiptap: TipTap JSON format with embedded highlights (optional)
      Supports both single document and multi-section formats
    """

    journal_id: str
    space_id: str
    user_id: str
    title: str
    content: str  # Contains markdown with embedded template metadata
    content_tiptap: Optional[Dict[str, Any]] = None  # TipTap JSON format
    template_id: Optional[str] = None  # For tracking which template was used
    framework_id: Optional[str] = None  # For tracking which framework this belongs to
    # REMOVED: template_data field - data is embedded in content
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    created_at: datetime
    updated_at: datetime
    is_encrypted: bool = False
    word_count: int = 0
    is_pinned: bool = False
    ai_metadata: Optional[JournalAIMetadata] = Field(
        default=None,
        alias="aiMetadata",
        description="AI-generated metadata (synopsis, themes, insights)"
    )

    model_config = ConfigDict(populate_by_name=True)

    def is_multi_section_tiptap(self) -> bool:
        """
        Check if journal uses multi-section TipTap format.

        Returns:
            True if content_tiptap is multi-section format, False otherwise
        """
        if not self.content_tiptap:
            return False
        # Single format has 'type' field at root
        return "type" not in self.content_tiptap

    def get_section_tiptap(self, section_id: str) -> Optional[Dict[str, Any]]:
        """
        Get TipTap JSON for a specific section, handling both formats.

        Args:
            section_id: The section identifier

        Returns:
            TipTap document for the section, or None if not found
        """
        if not self.content_tiptap:
            return None

        # Multi-section format
        if self.is_multi_section_tiptap():
            return self.content_tiptap.get(section_id)

        # Single document format (legacy/blank template)
        # Only return for 'content' section for backward compatibility
        if section_id == "content":
            return self.content_tiptap

        return None

    def get_all_section_ids(self) -> List[str]:
        """
        Get all section IDs that have TipTap content.

        Returns:
            List of section IDs
        """
        if not self.content_tiptap:
            return []

        if self.is_multi_section_tiptap():
            return list(self.content_tiptap.keys())
        else:
            # Single section, assume 'content'
            return ["content"]


class JournalResponse(BaseModel):
    """
    Journal response model for API responses.

    NOTE: content contains markdown with embedded template metadata.
    Frontend should use JournalContentManager to parse the content.

    TipTap Integration:
    - content: Markdown format (for backward compatibility)
    - content_tiptap: TipTap JSON format with embedded highlights (optional)
    """

    journal_id: str = Field(..., alias="journalId")
    space_id: str = Field(..., alias="spaceId")
    user_id: str = Field(..., alias="userId")
    title: str
    content: str  # Contains markdown with embedded template metadata
    content_tiptap: Optional[Dict[str, Any]] = Field(
        None, alias="contentTiptap"
    )  # TipTap JSON format
    template_id: Optional[str] = Field(None, alias="templateId")
    framework_id: Optional[str] = Field(None, alias="frameworkId")
    # REMOVED: template_data field - data is embedded in content
    tags: List[str] = Field(default_factory=list)
    emotions: List[str] = Field(default_factory=list)  # New field for multiple emotions
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    word_count: int = Field(..., alias="wordCount")
    is_pinned: bool = Field(False, alias="isPinned")
    author: Optional[Dict[str, Any]] = None
    ai_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        alias="aiMetadata",
        description="AI-generated metadata (synopsis, themes, insights)"
    )

    @field_serializer("created_at", "updated_at")
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
                "content": '<!--\n@template: daily-reflection\n@metadata: {"emotions":["happy","playful","joyful"]}\n-->\n\n<!-- section:gratitude @title:"Gratitude" -->\n- family\n- health\n<!-- /section:gratitude -->\n\nToday was a great day...',
                "templateId": "daily-reflection",
                "tags": ["daily", "reflection"],
                "emotions": ["happy", "playful", "joyful"],
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z",
                "wordCount": 25,
                "isPinned": False,
                "author": {"userId": "user-123", "username": "johndoe", "displayName": "John Doe"},
            }
        },
    )


class JournalListResponse(BaseModel):
    """Journal list response model."""

    journals: List[JournalResponse]
    total: int
    page: int = Field(default=1)
    page_size: int = Field(default=20, alias="pageSize")
    has_more: bool = Field(default=False, alias="hasMore")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)
