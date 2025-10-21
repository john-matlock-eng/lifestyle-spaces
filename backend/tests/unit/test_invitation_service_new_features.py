import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.invitation import InvitationService
from app.models.invitation import Invitation, InvitationStatus
from app.models.space import Space
from app.models.user import User
from app.services.exceptions import InvitationNotFoundError, SpaceNotFoundError, UserNotFoundError, InvitationNotFoundException, SpaceNotFoundException, UserNotFoundException

@pytest.fixture
def mock_dynamodb_client():
    return MagicMock()

@pytest.fixture
def mock_user_service():
    return AsyncMock()

@pytest.fixture
def mock_space_service():
    return AsyncMock()

@pytest.fixture
def invitation_service(mock_dynamodb_client, mock_space_service, mock_user_service):
    return InvitationService(mock_dynamodb_client, mock_space_service, mock_user_service)

@pytest.mark.asyncio
async def test_get_pending_invitations_for_user_success(invitation_service, mock_dynamodb_client):
    test_email = "test@example.com"
    mock_invitations = [
        Invitation(invitation_id="inv1", space_id="space1", inviter_user_id="user1", invitee_email=test_email, status=InvitationStatus.PENDING),
        Invitation(invitation_id="inv2", space_id="space2", inviter_user_id="user2", invitee_email=test_email, status=InvitationStatus.PENDING),
    ]
    mock_dynamodb_client.query.return_value = {
        "Items": [inv.model_dump() for inv in mock_invitations]
    }

    invitations = await invitation_service.get_pending_invitations_for_user(test_email)

    assert len(invitations) == 2
    assert all(inv.status == InvitationStatus.PENDING for inv in invitations)
    assert all(inv.invitee_email == test_email for inv in invitations)
    mock_dynamodb_client.query.assert_called_once()

@pytest.mark.asyncio
async def test_get_pending_invitations_for_user_no_invitations(invitation_service, mock_dynamodb_client):
    test_email = "noinvites@example.com"
    mock_dynamodb_client.query.return_value = {"Items": []}

    invitations = await invitation_service.get_pending_invitations_for_user(test_email)

    assert len(invitations) == 0
    mock_dynamodb_client.query.assert_called_once()

@pytest.mark.asyncio
async def test_get_all_pending_invitations_success(invitation_service, mock_dynamodb_client):
    mock_invitations = [
        Invitation(invitation_id="inv1", space_id="space1", inviter_user_id="user1", invitee_email="a@example.com", status=InvitationStatus.PENDING),
        Invitation(invitation_id="inv2", space_id="space2", inviter_user_id="user2", invitee_email="b@example.com", status=InvitationStatus.PENDING),
    ]
    mock_dynamodb_client.query.return_value = {
        "Items": [inv.model_dump() for inv in mock_invitations]
    }

    invitations = await invitation_service.get_all_pending_invitations()

    assert len(invitations) == 2
    assert all(inv.status == InvitationStatus.PENDING for inv in invitations)
    mock_dynamodb_client.query.assert_called_once()

@pytest.mark.asyncio
async def test_get_all_pending_invitations_no_invitations(invitation_service, mock_dynamodb_client):
    mock_dynamodb_client.query.return_value = {"Items": []}

    invitations = await invitation_service.get_all_pending_invitations()

    assert len(invitations) == 0
    mock_dynamodb_client.query.assert_called_once()

@pytest.mark.asyncio
async def test_accept_invitation_success_new_user(invitation_service, mock_dynamodb_client, mock_user_service, mock_space_service):
    invitation_id = "inv123"
    user_id = "new_user_id"
    space_id = "space456"
    invitee_email = "test@example.com"

    mock_invitation = Invitation(
        invitation_id=invitation_id,
        space_id=space_id,
        inviter_user_id="inviter1",
        invitee_email=invitee_email,
        status=InvitationStatus.PENDING
    )
    mock_space = Space(space_id=space_id, name="Test Space", owner_id="owner1", members=[])
    mock_user = User(user_id=user_id, email=invitee_email, spaces=[])

    mock_dynamodb_client.get_item.return_value = {"Item": mock_invitation.model_dump()}
    mock_user_service.get_user_by_email.return_value = mock_user
    mock_space_service.get_space_by_id.return_value = mock_space
    mock_space_service.add_member_to_space.return_value = None
    mock_user_service.add_space_to_user.return_value = None
    mock_dynamodb_client.update_item.return_value = {"Attributes": {**mock_invitation.model_dump(), "status": InvitationStatus.ACCEPTED.value}}

    accepted_invitation = await invitation_service.accept_invitation(invitation_id, user_id)

    assert accepted_invitation.status == InvitationStatus.ACCEPTED
    mock_dynamodb_client.get_item.assert_called_once()
    mock_user_service.get_user_by_email.assert_called_once_with(invitee_email)
    mock_space_service.get_space_by_id.assert_called_once_with(space_id)
    mock_space_service.add_member_to_space.assert_called_once_with(space_id, user_id)
    mock_user_service.add_space_to_user.assert_called_once_with(user_id, space_id)
    mock_dynamodb_client.update_item.assert_called_once()

@pytest.mark.asyncio
async def test_accept_invitation_not_found(invitation_service, mock_dynamodb_client):
    invitation_id = "nonexistent"
    user_id = "user123"
    mock_dynamodb_client.get_item.return_value = {"Item": None}

    with pytest.raises(InvitationNotFoundException):
        await invitation_service.accept_invitation(invitation_id, user_id)
    mock_dynamodb_client.get_item.assert_called_once()

@pytest.mark.asyncio
async def test_accept_invitation_already_accepted(invitation_service, mock_dynamodb_client, mock_user_service, mock_space_service):
    invitation_id = "inv123"
    user_id = "user123"
    mock_invitation = Invitation(
        invitation_id=invitation_id,
        space_id="space1",
        inviter_user_id="inviter1",
        invitee_email="test@example.com",
        status=InvitationStatus.ACCEPTED
    )
    mock_dynamodb_client.get_item.return_value = {"Item": mock_invitation.model_dump()}

    with pytest.raises(ValueError, match="Invitation is not pending"):
        await invitation_service.accept_invitation(invitation_id, user_id)
    mock_dynamodb_client.get_item.assert_called_once()

@pytest.mark.asyncio
async def test_accept_invitation_user_not_found(invitation_service, mock_dynamodb_client, mock_user_service):
    invitation_id = "inv123"
    user_id = "user123"
    invitee_email = "test@example.com"
    mock_invitation = Invitation(
        invitation_id=invitation_id,
        space_id="space1",
        inviter_user_id="inviter1",
        invitee_email=invitee_email,
        status=InvitationStatus.PENDING
    )
    mock_dynamodb_client.get_item.return_value = {"Item": mock_invitation.model_dump()}
    mock_user_service.get_user_by_email.return_value = None

    with pytest.raises(UserNotFoundException):
        await invitation_service.accept_invitation(invitation_id, user_id)
    mock_user_service.get_user_by_email.assert_called_once_with(invitee_email)

@pytest.mark.asyncio
async def test_accept_invitation_space_not_found(invitation_service, mock_dynamodb_client, mock_user_service, mock_space_service):
    invitation_id = "inv123"
    user_id = "user123"
    space_id = "space1"
    invitee_email = "test@example.com"
    mock_invitation = Invitation(
        invitation_id=invitation_id,
        space_id=space_id,
        inviter_user_id="inviter1",
        invitee_email=invitee_email,
        status=InvitationStatus.PENDING
    )
    mock_user = User(user_id=user_id, email=invitee_email, spaces=[])

    mock_dynamodb_client.get_item.return_value = {"Item": mock_invitation.model_dump()}
    mock_user_service.get_user_by_email.return_value = mock_user
    mock_space_service.get_space_by_id.return_value = None

    with pytest.raises(SpaceNotFoundException):
        await invitation_service.accept_invitation(invitation_id, user_id)
    mock_space_service.get_space_by_id.assert_called_once_with(space_id)
