"""
Space-related Pydantic models.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SpaceBase(BaseModel):
    """Base space model."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = Field(False, alias="isPublic")
    
    model_config = ConfigDict(populate_by_name=True)


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
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class SpaceMember(BaseModel):
    """Space member model."""
    user_id: str = Field(..., alias="userId")
    username: str
    email: str
    display_name: Optional[str] = Field(None, alias="displayName")
    role: str
    joined_at: datetime = Field(..., alias="joinedAt")
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
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
    page_size: Optional[int] = Field(20)
    has_more: Optional[bool] = Field(False, alias="hasMore")
    
    model_config = ConfigDict(populate_by_name=True)


class MembersListResponse(BaseModel):
    """Members list response model."""
    members: List[SpaceMember]
    total: int
    has_more: bool = Field(False, alias="hasMore")
    
    model_config = ConfigDict(populate_by_name=True)