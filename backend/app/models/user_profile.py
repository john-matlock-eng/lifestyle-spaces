"""
Pydantic models for user profile management.
"""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
import re


class NotificationPreferences(BaseModel):
    """Notification preferences for a user."""
    email: bool = True
    push: bool = False
    sms: bool = False
    
    model_config = ConfigDict(populate_by_alias=True)


class PrivacySettings(BaseModel):
    """Privacy settings for a user profile."""
    profile_visibility: str = Field(default="public", pattern="^(public|private|friends)$")
    show_email: bool = False
    show_phone: bool = False
    
    model_config = ConfigDict(populate_by_alias=True)


class UserProfileBase(BaseModel):
    """Base model for user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    preferred_name: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = None
    language: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None
    privacy_settings: Optional[PrivacySettings] = None
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if v and len(v) < 10:
            raise ValueError('Phone number must be at least 10 characters')
        # Basic phone validation - starts with + and contains only digits and common separators
        if v and not re.match(r'^\+?[\d\s\-\(\)]+$', v):
            raise ValueError('Invalid phone number format')
        return v
    
    @field_validator('avatar_url')
    @classmethod
    def validate_avatar_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError('Invalid URL format')
        return v
    
    @field_validator('bio')
    @classmethod
    def sanitize_bio(cls, v):
        if v:
            # Remove script tags to prevent XSS
            v = re.sub(r'<script[^>]*>.*?</script>', '', v, flags=re.IGNORECASE | re.DOTALL)
            v = re.sub(r'<[^>]+>', '', v)  # Remove all HTML tags
        return v
    
    model_config = ConfigDict(populate_by_alias=True)


class UserProfileUpdate(UserProfileBase):
    """Model for updating user profile."""
    email: Optional[EmailStr] = None  # Allow email updates for validation


class UserProfileResponse(BaseModel):
    """Model for user profile response."""
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    preferred_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_step: int = 0
    notification_preferences: Optional[NotificationPreferences] = None
    privacy_settings: Optional[PrivacySettings] = None
    created_at: str
    updated_at: str
    last_login: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    onboarding_completed_at: Optional[str] = None
    onboarding_metadata: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(populate_by_alias=True)


class OnboardingCompleteRequest(BaseModel):
    """Model for onboarding completion request."""
    completion_source: Optional[str] = None
    time_to_complete: Optional[int] = None
    skipped_optional_steps: Optional[list[str]] = None
    
    model_config = ConfigDict(populate_by_alias=True)