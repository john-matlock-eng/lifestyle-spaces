
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone

from app.services.invitation import InvitationService
from app.services.space import SpaceService
from app.models.invitation import Invitation, InvitationCreate, InvitationStatus

@pytest.fixture
def mock_db_client():
    return MagicMock()

@pytest.fixture
def mock_space_service():
    return MagicMock()

@pytest.fixture
def invitation_service(mock_db_client, mock_space_service):
    with patch('app.services.invitation.SpaceService', return_value=mock_space_service):
        service = InvitationService(mock_db_client)
        service.space_service = mock_space_service
        return service

def test_get_pending_invitations_for_user(invitation_service, mock_db_client):
    # Arrange
    invitee_email = "test@example.com"
    invitation_item = {
        "invitation_id": "inv-123",
        "space_id": "space-123",
        "invitee_email": invitee_email,
        "inviter_user_id": "user-456",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }
    mock_db_client.query.return_value = [invitation_item]

    # Act
    invitations = invitation_service.get_pending_invitations_for_user(invitee_email)

    # Assert
    assert len(invitations) == 1
    assert invitations[0].invitation_id == "inv-123"
    mock_db_client.query.assert_called_once_with(
        pk=f"USER#{invitee_email}",
        sk_prefix=f"INVITATION#{InvitationStatus.PENDING.value}",
        index_name="GSI1"
    )

def test_accept_invitation_success(invitation_service, mock_db_client, mock_space_service):
    # Arrange
    invitation_id = "inv-123"
    invitee_email = "test@example.com"
    space_id = "space-123"
    user_id = "user-123"
    
    invitation_item = {
        "invitation_id": invitation_id,
        "space_id": space_id,
        "invitee_email": invitee_email,
        "inviter_user_id": "user-456",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }
    
    mock_db_client.get_item.return_value = invitation_item
    mock_db_client.update_item.return_value = {**invitation_item, "status": "accepted"}

    # Act
    result = invitation_service.accept_invitation(invitation_id, user_id, invitee_email)

    # Assert
    assert result.status == InvitationStatus.ACCEPTED
    mock_space_service.add_member.assert_called_once_with(
        space_id=space_id,
        user_id=user_id,
        role="member",
        added_by="system"
    )
    mock_db_client.update_item.assert_called_once()

def test_accept_invitation_not_for_user(invitation_service, mock_db_client):
    # Arrange
    invitation_id = "inv-123"
    invitee_email = "test@example.com"
    other_user_id = "user-789"
    
    invitation_item = {
        "invitation_id": invitation_id,
        "space_id": "space-123",
        "invitee_email": "another@example.com",
        "inviter_user_id": "user-456",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    }
    
    mock_db_client.get_item.return_value = invitation_item

    # Act & Assert
    with pytest.raises(ValueError, match="Invitation not found or not for this user."):
        invitation_service.accept_invitation(invitation_id, other_user_id, invitee_email)

