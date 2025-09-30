"""
Integration tests for invite code visibility rules.
Following TDD approach - tests written before implementation.

Tests verify that:
- Space owners can see invite codes when fetching space details
- Space admins can see invite codes when fetching space details
- Regular members CANNOT see invite codes
- Non-members viewing public spaces CANNOT see invite codes
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, Mock
import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestInviteCodeVisibility:
    """Tests for invite code visibility based on user roles."""

    def test_owner_can_see_invite_code(self, test_client):
        """Test that space owner can see invite code when fetching space."""
        # Arrange
        space_id = str(uuid.uuid4())
        owner_id = "owner-123"
        invite_code = "ABCD1234"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": owner_id,
                "email": "owner@example.com",
                "username": "owner"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": owner_id,
                    "username": "owner",
                    "email": "owner@example.com"
                }

                with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
                    mock_service_instance = Mock()
                    mock_service_class.return_value = mock_service_instance

                    # Mock service to return space with invite_code for owner
                    mock_service_instance.get_space.return_value = {
                        "id": space_id,
                        "name": "Test Space",
                        "description": "Test description",
                        "type": "workspace",
                        "is_public": False,
                        "owner_id": owner_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "member_count": 3,
                        "is_owner": True,
                        "invite_code": invite_code  # Should be present for owner
                    }

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["spaceId"] == space_id
                    assert data["inviteCode"] == invite_code
                    assert data["isOwner"] is True

    def test_admin_can_see_invite_code(self, test_client):
        """Test that space admin can see invite code when fetching space."""
        # Arrange
        space_id = str(uuid.uuid4())
        owner_id = "owner-123"
        admin_id = "admin-456"
        invite_code = "EFGH5678"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": admin_id,
                "email": "admin@example.com",
                "username": "admin"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": admin_id,
                    "username": "admin",
                    "email": "admin@example.com"
                }

                with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
                    mock_service_instance = Mock()
                    mock_service_class.return_value = mock_service_instance

                    # Mock service to return space with invite_code for admin
                    mock_service_instance.get_space.return_value = {
                        "id": space_id,
                        "name": "Test Space",
                        "description": "Test description",
                        "type": "workspace",
                        "is_public": False,
                        "owner_id": owner_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "member_count": 5,
                        "is_owner": False,
                        "invite_code": invite_code  # Should be present for admin
                    }

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["spaceId"] == space_id
                    assert data["inviteCode"] == invite_code
                    assert data["isOwner"] is False

    def test_member_cannot_see_invite_code(self, test_client):
        """Test that regular member CANNOT see invite code when fetching space."""
        # Arrange
        space_id = str(uuid.uuid4())
        owner_id = "owner-123"
        member_id = "member-789"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": member_id,
                "email": "member@example.com",
                "username": "member"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": member_id,
                    "username": "member",
                    "email": "member@example.com"
                }

                with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
                    mock_service_instance = Mock()
                    mock_service_class.return_value = mock_service_instance

                    # Mock service to return space WITHOUT invite_code for regular member
                    mock_service_instance.get_space.return_value = {
                        "id": space_id,
                        "name": "Test Space",
                        "description": "Test description",
                        "type": "workspace",
                        "is_public": False,
                        "owner_id": owner_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "member_count": 5,
                        "is_owner": False
                        # invite_code should NOT be present for regular member
                    }

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["spaceId"] == space_id
                    assert "inviteCode" not in data or data["inviteCode"] is None
                    assert data["isOwner"] is False

    def test_non_member_viewing_public_space_cannot_see_invite_code(self, test_client):
        """Test that non-member viewing public space CANNOT see invite code."""
        # Arrange
        space_id = str(uuid.uuid4())
        owner_id = "owner-123"
        viewer_id = "viewer-999"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": viewer_id,
                "email": "viewer@example.com",
                "username": "viewer"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": viewer_id,
                    "username": "viewer",
                    "email": "viewer@example.com"
                }

                with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
                    mock_service_instance = Mock()
                    mock_service_class.return_value = mock_service_instance

                    # Mock service to return public space WITHOUT invite_code for non-member
                    mock_service_instance.get_space.return_value = {
                        "id": space_id,
                        "name": "Public Space",
                        "description": "A public space",
                        "type": "workspace",
                        "is_public": True,
                        "owner_id": owner_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "member_count": 2,
                        "is_owner": False
                        # invite_code should NOT be present for non-member
                    }

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["spaceId"] == space_id
                    assert data["isPublic"] is True
                    assert "inviteCode" not in data or data["inviteCode"] is None
                    assert data["isOwner"] is False

    def test_viewer_role_cannot_see_invite_code(self, test_client):
        """Test that viewer role CANNOT see invite code when fetching space."""
        # Arrange
        space_id = str(uuid.uuid4())
        owner_id = "owner-123"
        viewer_id = "viewer-999"

        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": viewer_id,
                "email": "viewer@example.com",
                "username": "viewer"
            }

            with patch('app.core.dependencies.UserProfileService') as mock_profile_service:
                mock_profile_instance = Mock()
                mock_profile_service.return_value = mock_profile_instance
                mock_profile_instance.get_or_create_user_profile.return_value = {
                    "user_id": viewer_id,
                    "username": "viewer",
                    "email": "viewer@example.com"
                }

                with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
                    mock_service_instance = Mock()
                    mock_service_class.return_value = mock_service_instance

                    # Mock service to return space WITHOUT invite_code for viewer
                    mock_service_instance.get_space.return_value = {
                        "id": space_id,
                        "name": "Test Space",
                        "description": "Test description",
                        "type": "workspace",
                        "is_public": False,
                        "owner_id": owner_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "member_count": 5,
                        "is_owner": False
                        # invite_code should NOT be present for viewer role
                    }

                    # Act
                    response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )

                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["spaceId"] == space_id
                    assert "inviteCode" not in data or data["inviteCode"] is None
                    assert data["isOwner"] is False
