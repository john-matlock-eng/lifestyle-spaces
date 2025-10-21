from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

class Invitation(BaseModel):
    invitation_id: str = Field(..., description="Unique identifier for the invitation")
    space_id: str = Field(..., description="ID of the space the user is invited to")
    invitee_email: str = Field(..., description="Email of the user being invited")
    inviter_user_id: str = Field(..., description="ID of the user who sent the invitation")
    status: InvitationStatus = Field(InvitationStatus.PENDING, description="Current status of the invitation")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of when the invitation was created")
    expires_at: Optional[datetime] = Field(None, description="Timestamp of when the invitation expires")

class InvitationCreate(BaseModel):
    space_id: Optional[str] = Field(None, description="ID of the space the user is invited to")
    invitee_email: Optional[str] = Field(None, description="Email of the user being invited")
    email: Optional[str] = Field(None, description="Email of the user being invited (legacy)")
    role: Optional[str] = Field("viewer", description="Role for the invited user")
    message: Optional[str] = Field(None, description="Optional message for the invitation")
    expires_at: Optional[datetime] = Field(None, description="Timestamp of when the invitation expires")

class InvitationUpdate(BaseModel):
    status: InvitationStatus = Field(..., description="New status of the invitation")
    expires_at: Optional[datetime] = Field(None, description="New expiration timestamp for the invitation")

class InvitationResponse(BaseModel):
    id: str = Field(..., description="Invitation ID")
    space_id: str = Field(..., description="ID of the space")
    space_name: str = Field(..., description="Name of the space")
    inviter_id: str = Field(..., description="ID of the inviter")
    inviter_name: str = Field(..., description="Name of the inviter")
    invitee_email: str = Field(..., description="Email of the invitee")
    role: str = Field(..., description="Role for the invitation")
    status: str = Field(..., description="Status of the invitation")
    expires_at: datetime = Field(..., description="Expiration timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status field."""
        if v not in ["pending", "accepted", "declined", "expired"]:
            raise ValueError("Status must be one of: pending, accepted, declined, expired")
        return v

class InvitationAccept(BaseModel):
    invitation_code: str = Field(..., description="Invitation code to accept")

class InvitationListResponse(BaseModel):
    invitations: list = Field(..., description="List of invitations")
    total: int = Field(..., description="Total number of invitations")
