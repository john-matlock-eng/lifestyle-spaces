"""
Invitation-related Pydantic models.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class InvitationCreate(BaseModel):
    """Invitation creation model."""
    email: EmailStr
    role: str = "viewer"
    message: Optional[str] = None


class InvitationResponse(BaseModel):
    """Invitation response model."""
    id: str
    space_id: str
    space_name: str
    inviter_id: str
    inviter_name: str
    invitee_email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = ["pending", "accepted", "declined", "expired"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class InvitationAccept(BaseModel):
    """Invitation acceptance model."""
    invitation_code: str


class InvitationListResponse(BaseModel):
    """Invitation list response model."""
    invitations: List[InvitationResponse]
    total: int