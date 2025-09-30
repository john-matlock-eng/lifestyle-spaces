import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, UTC
from app.models.invitation import Invitation, InvitationStatus, InvitationCreate
from app.services.invitation import InvitationService

@pytest.fixture
def mock_dynamodb_client():
    return MagicMock()

@pytest.fixture
def mock_space_service():
    return MagicMock()

@pytest.fixture
def invitation_service(mock_dynamodb_client, mock_space_service):
    with patch('app.services.invitation.SpaceService', return_value=mock_space_service):
        service = InvitationService(mock_dynamodb_client)
        service.space_service = mock_space_service
        return service

@pytest.fixture
def sample_invitation_data():
    created_at = datetime.now(UTC)
    expires_at = created_at + timedelta(days=7)
    return {
        "invitation_id": "inv123",
        "space_id": "space456",
        "invitee_email": "test@example.com",
        "inviter_user_id": "user789",
        "status": InvitationStatus.PENDING.value,
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "user_id": "user123"
    }

def test_create_invitation(invitation_service, mock_dynamodb_client, sample_invitation_data):
    mock_dynamodb_client.put_item.return_value = sample_invitation_data
    invitation_create = InvitationCreate(
        space_id=sample_invitation_data["space_id"],
        invitee_email=sample_invitation_data["invitee_email"],
        expires_at=datetime.fromisoformat(sample_invitation_data["expires_at"])
    )
    invitation = invitation_service.create_invitation(
        invitation_create, sample_invitation_data["inviter_user_id"]
    )
    assert invitation.invitee_email == sample_invitation_data["invitee_email"]
    assert invitation.status == InvitationStatus.PENDING
    mock_dynamodb_client.put_item.assert_called_once()

def test_get_pending_invitations_for_user(invitation_service, mock_dynamodb_client, sample_invitation_data):
    mock_dynamodb_client.query.return_value = [sample_invitation_data]
    invitations = invitation_service.get_pending_invitations_for_user(
        sample_invitation_data["invitee_email"]
    )
    assert len(invitations) == 1
    assert invitations[0].invitation_id == sample_invitation_data["invitation_id"]
    mock_dynamodb_client.query.assert_called_once()

def test_get_pending_invitations_for_admin(invitation_service, mock_dynamodb_client, sample_invitation_data):
    mock_dynamodb_client.scan.return_value = [sample_invitation_data]
    invitations = invitation_service.get_pending_invitations_for_admin()
    assert len(invitations) == 1
    assert invitations[0].invitation_id == sample_invitation_data["invitation_id"]
    mock_dynamodb_client.scan.assert_called_once()

def test_accept_invitation(invitation_service, mock_dynamodb_client, mock_space_service, sample_invitation_data):
    # Mock the get_item to return a pending invitation
    pending_invitation_item = sample_invitation_data.copy()
    pending_invitation_item["status"] = InvitationStatus.PENDING.value
    mock_dynamodb_client.get_item.return_value = pending_invitation_item

    # Mock the update_item to return the accepted invitation
    accepted_invitation_item = pending_invitation_item.copy()
    accepted_invitation_item["status"] = InvitationStatus.ACCEPTED.value
    mock_dynamodb_client.update_item.return_value = accepted_invitation_item

    invitation = invitation_service.accept_invitation(
        sample_invitation_data["invitation_id"], sample_invitation_data["user_id"], sample_invitation_data["invitee_email"]
    )
    assert invitation.status == InvitationStatus.ACCEPTED
    mock_dynamodb_client.get_item.assert_called_once()
    mock_dynamodb_client.update_item.assert_called_once()
    mock_space_service.add_member.assert_called_once_with(
        space_id=sample_invitation_data["space_id"],
        user_id=sample_invitation_data["user_id"],
        role="member",
        added_by="system"
    )

def test_accept_non_existent_invitation(invitation_service, mock_dynamodb_client):
    mock_dynamodb_client.get_item.return_value = None
    with pytest.raises(ValueError, match="Invitation not found."):
        invitation_service.accept_invitation("non_existent_id", "user123", "test@example.com")
    mock_dynamodb_client.get_item.assert_called_once()

def test_accept_expired_invitation(invitation_service, mock_dynamodb_client, sample_invitation_data):
    expired_invitation_item = sample_invitation_data.copy()
    expired_invitation_item["expires_at"] = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    expired_invitation_item["status"] = InvitationStatus.PENDING.value
    mock_dynamodb_client.get_item.return_value = expired_invitation_item

    with pytest.raises(ValueError, match="Invitation has expired."):
        invitation_service.accept_invitation(
            sample_invitation_data["invitation_id"], sample_invitation_data["user_id"], sample_invitation_data["invitee_email"]
        )
    mock_dynamodb_client.get_item.assert_called_once()

def test_accept_already_accepted_invitation(invitation_service, mock_dynamodb_client, sample_invitation_data):
    accepted_invitation_item = sample_invitation_data.copy()
    accepted_invitation_item["status"] = InvitationStatus.ACCEPTED.value
    mock_dynamodb_client.get_item.return_value = accepted_invitation_item

    with pytest.raises(ValueError, match="Invitation has already been accepted or declined."):
        invitation_service.accept_invitation(
            sample_invitation_data["invitation_id"], sample_invitation_data["user_id"], sample_invitation_data["invitee_email"]
        )
    mock_dynamodb_client.get_item.assert_called_once()

def test_accept_invitation_wrong_user(invitation_service, mock_dynamodb_client, sample_invitation_data):
    pending_invitation_item = sample_invitation_data.copy()
    pending_invitation_item["status"] = InvitationStatus.PENDING.value
    mock_dynamodb_client.get_item.return_value = pending_invitation_item

    with pytest.raises(ValueError, match="Invitation not found or not for this user."):
        invitation_service.accept_invitation(
            sample_invitation_data["invitation_id"], sample_invitation_data["user_id"], "wrong_user@example.com"
        )
    mock_dynamodb_client.get_item.assert_called_once()
