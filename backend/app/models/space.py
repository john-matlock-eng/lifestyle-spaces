"""
Space-related Pydantic models.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer


class SpaceBase(BaseModel):
    """Base space model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = Field(False, alias="isPublic")
    
    model_config = ConfigDict(populate_by_name=True)


class Space(BaseModel):
    """Represents a space for internal service use."""
    space_id: str
    name: str
    owner_id: str
    members: List[str] = [] # List of user_ids


class SpaceCreate(SpaceBase):
    """Space creation model."""
    type: str = Field(default="workspace")
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Space name is required')
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v


class SpaceUpdate(BaseModel):
    """Space update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = Field(None, alias="isPublic")
    metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if not v:
                raise ValueError('Space name cannot be empty')
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v


class SpaceResponse(BaseModel):
    """Space response model."""
    id: str = Field(..., alias="spaceId")
    name: str
    description: Optional[str] = None
    type: Optional[str] = "workspace"
    owner_id: str = Field(..., alias="ownerId")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    member_count: int = Field(0, alias="memberCount")
    is_public: bool = Field(False, alias="isPublic")
    is_owner: Optional[bool] = Field(False, alias="isOwner")
    invite_code: Optional[str] = Field(None, alias="inviteCode")
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None
    
    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True,
        json_schema_extra={
            "example": {
                "spaceId": "123e4567-e89b-12d3-a456-426614174000",
                "name": "My Workspace",
                "description": "A collaborative workspace",
                "ownerId": "user-123",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z",
                "memberCount": 5,
                "isPublic": False,
                "isOwner": True
            }
        }
    )


class SpaceMember(BaseModel):
    """Space member model."""
    user_id: str = Field(..., alias="userId")
    username: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = Field(None, alias="displayName")
    role: str
    joined_at: datetime = Field(..., alias="joinedAt")
    
    @field_serializer('joined_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None
    
    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )
    
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid_roles = ["owner", "admin", "member", "viewer"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of {valid_roles}")
        return v


class SpaceListResponse(BaseModel):
    """Space list response model."""
    spaces: List[SpaceResponse]
    total: int
    page: Optional[int] = Field(1)
    page_size: Optional[int] = Field(20, alias="pageSize")
    has_more: Optional[bool] = Field(False, alias="hasMore")
    
    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )


class MembersListResponse(BaseModel):
    """Members list response model."""
    members: List[SpaceMember]
    total: int
    has_more: bool = Field(False, alias="hasMore")
    
    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )