from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

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
    space_id: str = Field(..., description="ID of the space the user is invited to")
    invitee_email: str = Field(..., description="Email of the user being invited")
    expires_at: Optional[datetime] = Field(None, description="Timestamp of when the invitation expires")

class InvitationUpdate(BaseModel):
    status: InvitationStatus = Field(..., description="New status of the invitation")
    expires_at: Optional[datetime] = Field(None, description="New expiration timestamp for the invitation")
