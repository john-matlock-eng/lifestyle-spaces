"""
User-related Pydantic models.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class User(BaseModel):
    """Represents a user for internal service use."""
    user_id: str
    email: EmailStr
    spaces: List[str] = [] # List of space_ids


class UserCreate(UserBase):
    """User creation model."""
    password: str = Field(..., min_length=8)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    """User update model."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserResponse(UserBase):
    """User response model."""
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    id_token: Optional[str] = None  # ID token contains custom attributes
    refresh_token: Optional[str] = None  # Refresh token for obtaining new tokens
    token_type: str = "bearer"
    expires_in: int