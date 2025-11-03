"""
Reading position Pydantic models for tracking user progress through journal entries.
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer


class ReadingPositionBase(BaseModel):
    """Base reading position model."""
    scroll_position: int = Field(..., ge=0, alias="scrollPosition", description="Scroll position in pixels from top")
    current_section_id: Optional[str] = Field(None, alias="currentSectionId", description="Current section being read")
    progress_percent: float = Field(..., ge=0.0, le=100.0, alias="progressPercent", description="Reading progress percentage")
    words_read: int = Field(..., ge=0, alias="wordsRead", description="Number of words read")
    total_words: int = Field(..., ge=0, alias="totalWords", description="Total number of words in journal")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('words_read')
    @classmethod
    def validate_words_read(cls, v: int, info) -> int:
        """Validate that words_read doesn't exceed total_words."""
        # Note: total_words is validated after, so we can't compare here
        # This will be validated in the service layer
        return v


class ReadingPositionCreate(ReadingPositionBase):
    """Model for creating a new reading position."""
    journal_id: str = Field(..., alias="journalId")
    space_id: str = Field(..., alias="spaceId")

    model_config = ConfigDict(populate_by_name=True)


class ReadingPositionUpdate(BaseModel):
    """Model for updating a reading position."""
    scroll_position: Optional[int] = Field(None, ge=0)
    current_section_id: Optional[str] = None
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    words_read: Optional[int] = Field(None, ge=0)
    total_words: Optional[int] = Field(None, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class ReadingPosition(BaseModel):
    """Internal reading position model for service layer."""
    user_id: str
    journal_id: str
    space_id: str
    scroll_position: int
    current_section_id: Optional[str] = None
    progress_percent: float
    words_read: int
    total_words: int
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[int] = None  # Unix timestamp for TTL


class ReadingPositionResponse(BaseModel):
    """Reading position response model for API responses."""
    user_id: str = Field(..., alias="userId")
    journal_id: str = Field(..., alias="journalId")
    space_id: str = Field(..., alias="spaceId")
    scroll_position: int = Field(..., alias="scrollPosition")
    current_section_id: Optional[str] = Field(None, alias="currentSectionId")
    progress_percent: float = Field(..., alias="progressPercent")
    words_read: int = Field(..., alias="wordsRead")
    total_words: int = Field(..., alias="totalWords")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True,
        json_schema_extra={
            "example": {
                "userId": "user-123",
                "journalId": "journal-456",
                "spaceId": "space-789",
                "scrollPosition": 1234,
                "currentSectionId": "section-2",
                "progressPercent": 45.5,
                "wordsRead": 250,
                "totalWords": 550,
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T12:30:00Z"
            }
        }
    )


class ReadingPositionListResponse(BaseModel):
    """Response model for list of reading positions."""
    positions: list[ReadingPositionResponse]
    total: int

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )
