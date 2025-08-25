"""
Space-related Pydantic models.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class SpaceBase(BaseModel):
    """Base space model."""
    name: str
    description: Optional[str] = None
    type: str
    is_public: bool = False


class SpaceCreate(SpaceBase):
    """Space creation model."""
    metadata: Optional[Dict[str, Any]] = None


class SpaceUpdate(BaseModel):
    """Space update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class SpaceResponse(SpaceBase):
    """Space response model."""
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    is_owner: bool = False


class SpaceMember(BaseModel):
    """Space member model."""
    user_id: str
    username: str
    email: str
    role: str
    joined_at: datetime
    
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
    page: int = 1
    page_size: int = 10