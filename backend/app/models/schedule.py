"""
Schedule-related Pydantic models for weekly schedule sharing.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer
from enum import Enum


class SharingSettings(BaseModel):
    """Sharing configuration for schedules."""
    is_public: bool = Field(False, alias="isPublic")
    share_token: Optional[str] = Field(None, alias="shareToken")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    expires_at: Optional[datetime] = Field(None, alias="expiresAt")
    view_count: int = Field(0, alias="viewCount")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)

    @field_serializer('created_at', 'expires_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None


class ScheduleShare(BaseModel):
    """Share token information."""
    share_token: str = Field(..., alias="shareToken")
    schedule_id: str = Field(..., alias="scheduleId")
    share_link: str = Field(..., alias="shareLink")
    created_at: datetime = Field(..., alias="createdAt")
    expires_at: Optional[datetime] = Field(None, alias="expiresAt")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)

    @field_serializer('created_at', 'expires_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None


class ScheduleVersion(BaseModel):
    """Historical version of a schedule."""
    version: int
    schedule_data: Dict[str, List[Dict[str, Any]]] = Field(..., alias="scheduleData")
    notes: Optional[str] = None
    modified_at: datetime = Field(..., alias="modifiedAt")
    modified_by: str = Field(..., alias="modifiedBy")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)

    @field_serializer('modified_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime to ISO format."""
        return dt.isoformat() if dt else None


class ScheduleVersionListResponse(BaseModel):
    """List of schedule versions."""
    versions: List[ScheduleVersion]
    total: int
    current_version: int = Field(..., alias="currentVersion")

    model_config = ConfigDict(populate_by_name=True, by_alias=True)


class DayOfWeek(str, Enum):
    """Days of the week."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class ActivityType(str, Enum):
    """Types of activities in a schedule."""
    WORK = "work"
    EXERCISE = "exercise"
    MEAL = "meal"
    SLEEP = "sleep"
    STUDY = "study"
    SOCIAL = "social"
    PERSONAL = "personal"
    OTHER = "other"


class TimeBlock(BaseModel):
    """Represents a time block in a schedule."""
    start_time: str = Field(..., alias="startTime", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., alias="endTime", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    activity: str = Field(..., min_length=1, max_length=200)
    activity_type: ActivityType = Field(..., alias="activityType")
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)

    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time is in HH:MM format."""
        parts = v.split(':')
        if len(parts) != 2:
            raise ValueError('Time must be in HH:MM format')
        hour, minute = int(parts[0]), int(parts[1])
        if hour < 0 or hour > 23:
            raise ValueError('Hour must be between 0 and 23')
        if minute < 0 or minute > 59:
            raise ValueError('Minute must be between 0 and 59')
        return v


class DaySchedule(BaseModel):
    """Schedule for a single day."""
    day: DayOfWeek
    time_blocks: List[TimeBlock] = Field(default_factory=list, alias="timeBlocks")
    notes: Optional[str] = Field(None, max_length=1000)

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class ScheduleBase(BaseModel):
    """Base schedule model."""
    week_starting: date = Field(..., alias="weekStarting")
    space_id: str = Field(..., alias="spaceId")
    schedule_data: Dict[str, List[Dict[str, Any]]] = Field(
        default_factory=dict,
        alias="scheduleData"
    )
    notes: Optional[str] = Field(None, max_length=2000)
    sharing_settings: Optional[SharingSettings] = Field(None, alias="sharingSettings")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('week_starting')
    @classmethod
    def validate_week_starting(cls, v: date) -> date:
        """Ensure week_starting is a Monday."""
        if v.weekday() != 0:  # 0 = Monday
            raise ValueError('week_starting must be a Monday')
        return v


class ScheduleCreate(ScheduleBase):
    """Schedule creation model."""
    is_template: bool = Field(False, alias="isTemplate")
    template_name: Optional[str] = Field(None, alias="templateName", max_length=100)

    @field_validator('schedule_data')
    @classmethod
    def validate_schedule_data(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate schedule data structure."""
        valid_days = {day.value for day in DayOfWeek}
        for day_key in v.keys():
            if day_key not in valid_days:
                raise ValueError(f'Invalid day: {day_key}. Must be one of {valid_days}')
        return v


class ScheduleUpdate(BaseModel):
    """Schedule update model."""
    schedule_data: Optional[Dict[str, List[Dict[str, Any]]]] = Field(None, alias="scheduleData")
    notes: Optional[str] = Field(None, max_length=2000)
    is_template: Optional[bool] = Field(None, alias="isTemplate")
    template_name: Optional[str] = Field(None, alias="templateName", max_length=100)

    model_config = ConfigDict(populate_by_name=True)


class ScheduleResponse(BaseModel):
    """Schedule response model."""
    id: str = Field(..., alias="scheduleId")
    space_id: str = Field(..., alias="spaceId")
    user_id: str = Field(..., alias="userId")
    week_starting: date = Field(..., alias="weekStarting")
    schedule_data: Dict[str, List[Dict[str, Any]]] = Field(..., alias="scheduleData")
    notes: Optional[str] = None
    is_template: bool = Field(False, alias="isTemplate")
    template_name: Optional[str] = Field(None, alias="templateName")
    version: int = Field(1)
    sharing_settings: Optional[SharingSettings] = Field(None, alias="sharingSettings")
    created_by: str = Field(..., alias="createdBy")
    modified_by: str = Field(..., alias="modifiedBy")
    last_modified: datetime = Field(..., alias="lastModified")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    @field_serializer('created_at', 'updated_at', 'last_modified')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None

    @field_serializer('week_starting')
    def serialize_date(self, d: date) -> str:
        """Serialize date to ISO format."""
        return d.isoformat() if d else None

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True,
        json_schema_extra={
            "example": {
                "scheduleId": "123e4567-e89b-12d3-a456-426614174000",
                "spaceId": "space-123",
                "userId": "user-123",
                "weekStarting": "2024-01-01",
                "scheduleData": {
                    "monday": [
                        {
                            "startTime": "09:00",
                            "endTime": "17:00",
                            "activity": "Work",
                            "activityType": "work",
                            "description": "Regular work hours"
                        }
                    ]
                },
                "notes": "My weekly schedule",
                "isTemplate": False,
                "templateName": None,
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
        }
    )


class ScheduleListResponse(BaseModel):
    """Schedule list response model."""
    schedules: List[ScheduleResponse]
    total: int

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )


class ScheduleImportRequest(BaseModel):
    """Request model for schedule import."""
    json_data: str = Field(..., alias="json")
    space_id: Optional[str] = Field(None, alias="spaceId")

    model_config = ConfigDict(populate_by_name=True)


class ImportValidationError(BaseModel):
    """Validation error from import."""
    field: str
    message: str
    line: Optional[int] = None


class ImportConflict(BaseModel):
    """Time block conflict."""
    day: str
    block1: Dict[str, Any]
    block2: Dict[str, Any]
    message: str


class ScheduleImportValidationResponse(BaseModel):
    """Response model for import validation."""
    valid: bool
    schedule: Optional[Dict[str, Any]] = None
    errors: List[ImportValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    conflicts: List[ImportConflict] = Field(default_factory=list)


class ScheduleImportResponse(BaseModel):
    """Response model for successful import."""
    schedule: ScheduleResponse
    warnings: List[str] = Field(default_factory=list)
    conflicts: List[ImportConflict] = Field(default_factory=list)
