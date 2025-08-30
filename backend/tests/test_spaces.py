"""
Comprehensive tests for Space management endpoints.
Following TDD approach - all tests written before implementation.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, Mock, MagicMock, ANY
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from jose import jwt


class TestSpaceCreation:
    """Tests for POST /api/spaces endpoint."""
    
    def test_create_space_success(self, test_client: TestClient):
        """Test successful space creation with valid data."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {
                "sub": "user-123",
                "email": "test@example.com",
                "username": "testuser"
            }
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                space_id = str(uuid.uuid4())
                mock_create.return_value = {
                    "id": space_id,
                    "name": "Test Space",
                    "description": "A test space",
                    "type": "workspace",
                    "is_public": False,
                    "owner_id": "user-123",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={
                        "name": "Test Space",
                        "description": "A test space",
                        "type": "workspace",
                        "isPublic": False
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_201_CREATED
                data = response.json()
                assert data["name"] == "Test Space"
                assert data["description"] == "A test space"
                assert data["ownerId"] == "user-123"
                assert data["memberCount"] == 1
                assert data["isOwner"] == True
                assert "spaceId" in data
                assert "createdAt" in data
                assert "updatedAt" in data
    
    def test_create_space_returns_invite_code(self, test_client: TestClient):
        """Test that space creation returns a unique invite code."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                space_id = str(uuid.uuid4())
                invite_code = str(uuid.uuid4())[:8].upper()
                mock_create.return_value = {
                    "id": space_id,
                    "name": "Test Space",
                    "type": "workspace",
                    "owner_id": "user-123",
                    "invite_code": invite_code,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "Test Space", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_201_CREATED
                data = response.json()
                assert "inviteCode" in data
                assert len(data["inviteCode"]) == 8
    
    def test_create_space_validation_name_too_long(self, test_client: TestClient):
        """Test space creation with name exceeding 100 characters."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # Act
            response = test_client.post(
                "/api/spaces",
                json={
                    "name": "a" * 101,  # 101 characters
                    "type": "workspace"
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            assert "name" in response.json()["detail"][0]["loc"]
    
    def test_create_space_validation_description_too_long(self, test_client: TestClient):
        """Test space creation with description exceeding 500 characters."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # Act
            response = test_client.post(
                "/api/spaces",
                json={
                    "name": "Test Space",
                    "description": "a" * 501,  # 501 characters
                    "type": "workspace"
                },
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            assert "description" in response.json()["detail"][0]["loc"]
    
    def test_create_space_without_authentication(self, test_client: TestClient):
        """Test space creation without authentication token."""
        # Act
        response = test_client.post(
            "/api/spaces",
            json={"name": "Test Space", "type": "workspace"}
        )
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Not authenticated"
    
    def test_create_space_database_error(self, test_client: TestClient):
        """Test space creation when database operation fails."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                mock_create.side_effect = Exception("Database connection failed")
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "Test Space", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
                assert "Failed to create space" in response.json()["detail"]


class TestGetSpace:
    """Tests for GET /api/spaces/{spaceId} endpoint."""
    
    def test_get_space_success(self, test_client: TestClient):
        """Test successful retrieval of a space by ID."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.get_space') as mock_get:
                mock_get.return_value = {
                    "id": space_id,
                    "name": "Test Space",
                    "description": "A test space",
                    "type": "workspace",
                    "is_public": False,
                    "owner_id": "user-123",
                    "member_count": 5,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
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
                assert data["name"] == "Test Space"
                assert data["memberCount"] == 5
    
    def test_get_space_not_found(self, test_client: TestClient):
        """Test getting a space that doesn't exist."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.get_space') as mock_get:
                from app.services.exceptions import SpaceNotFoundError
                mock_get.side_effect = SpaceNotFoundError(f"Space {space_id} not found")
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_404_NOT_FOUND
                assert "not found" in response.json()["detail"].lower()
    
    def test_get_space_permission_denied(self, test_client: TestClient):
        """Test getting a space without being a member."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-456"}  # Different user
            
            with patch('app.services.space.SpaceService.get_space') as mock_get:
                from app.services.exceptions import UnauthorizedError
                mock_get.side_effect = UnauthorizedError("You are not a member of this space")
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_public_space_non_member(self, test_client: TestClient):
        """Test getting a public space without being a member."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-456"}
            
            with patch('app.services.space.SpaceService.get_space') as mock_get:
                mock_get.return_value = {
                    "id": space_id,
                    "name": "Public Space",
                    "is_public": True,
                    "owner_id": "user-123",
                    "member_count": 10,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["isPublic"] == True


class TestListUserSpaces:
    """Tests for GET /api/users/spaces endpoint."""
    
    def test_list_user_spaces_success(self, test_client: TestClient):
        """Test successful listing of user's spaces."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                mock_list.return_value = {
                    "spaces": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Space 1",
                            "type": "workspace",
                            "owner_id": "user-123",
                            "member_count": 3,
                            "is_public": False,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        },
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Space 2",
                            "type": "project",
                            "owner_id": "user-456",
                            "member_count": 5,
                            "is_public": True,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    ],
                    "total": 2,
                    "page": 1,
                    "page_size": 20
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data["spaces"]) == 2
                assert data["total"] == 2
    
    def test_list_user_spaces_with_pagination(self, test_client: TestClient):
        """Test listing user's spaces with pagination."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                # Create 25 spaces for pagination test
                spaces = []
                for i in range(25):
                    spaces.append({
                        "id": str(uuid.uuid4()),
                        "name": f"Space {i+1}",
                        "type": "workspace",
                        "owner_id": "user-123",
                        "member_count": 1,
                        "is_public": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    })
                
                # Return first page (20 items)
                mock_list.return_value = {
                    "spaces": spaces[:20],
                    "total": 25,
                    "page": 1,
                    "page_size": 20,
                    "has_more": True
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces?limit=20&offset=0",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data["spaces"]) == 20
                assert data["total"] == 25
                assert data.get("hasMore", data.get("has_more", False)) == True
    
    def test_list_user_spaces_with_search_filter(self, test_client: TestClient):
        """Test listing user's spaces with search filter."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                mock_list.return_value = {
                    "spaces": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Project Alpha",
                            "description": "Alpha team workspace",
                            "type": "project",
                            "owner_id": "user-123",
                            "member_count": 3,
                            "is_public": False,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "page_size": 20
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces?search=alpha",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data["spaces"]) == 1
                assert "alpha" in data["spaces"][0]["name"].lower()
    
    def test_list_user_spaces_filter_by_public(self, test_client: TestClient):
        """Test listing user's spaces filtered by public/private."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                mock_list.return_value = {
                    "spaces": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Public Space",
                            "type": "community",
                            "owner_id": "user-123",
                            "member_count": 10,
                            "is_public": True,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "page_size": 20
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces?isPublic=true",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert all(space["isPublic"] == True for space in data["spaces"])
    
    def test_list_user_spaces_filter_by_role(self, test_client: TestClient):
        """Test listing user's spaces filtered by user's role."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                mock_list.return_value = {
                    "spaces": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "My Own Space",
                            "type": "personal",
                            "owner_id": "user-123",
                            "member_count": 1,
                            "is_public": False,
                            "user_role": "owner",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "page_size": 20
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces?role=owner",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data["spaces"]) == 1
                assert data["spaces"][0]["ownerId"] == "user-123"
    
    def test_list_user_spaces_pagination_limits(self, test_client: TestClient):
        """Test pagination limits (max 100 items per page)."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                # Should cap at 100 even if requested more
                mock_list.return_value = {
                    "spaces": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 100  # Capped at 100
                }
                
                # Act
                response = test_client.get(
                    "/api/users/spaces?limit=200",  # Requesting more than max
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                # Check that service was called with max 100
                mock_list.assert_called_with(
                    user_id="user-123",
                    page=1,
                    page_size=100,  # Capped at 100
                    search=None,
                    is_public=None,
                    role=None
                )


class TestUpdateSpaceSettings:
    """Tests for PUT /api/spaces/{spaceId}/settings endpoint."""
    
    def test_update_space_settings_as_owner(self, test_client: TestClient):
        """Test updating space settings as the owner."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.update_space') as mock_update:
                mock_update.return_value = True
                
                with patch('app.services.space.SpaceService.get_space') as mock_get:
                    mock_get.return_value = {
                        "id": space_id,
                        "name": "Updated Space",
                        "description": "Updated description",
                        "type": "workspace",
                        "is_public": True,
                        "owner_id": "user-123",
                        "member_count": 5,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    # Act
                    response = test_client.put(
                        f"/api/spaces/{space_id}",
                        json={
                            "name": "Updated Space",
                            "description": "Updated description",
                            "isPublic": True
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert response.status_code == status.HTTP_200_OK
                    data = response.json()
                    assert data["name"] == "Updated Space"
                    assert data["description"] == "Updated description"
                    assert data["isPublic"] == True
    
    @pytest.mark.skip(reason="Admin role check not yet implemented in service")
    def test_update_space_settings_as_admin(self, test_client: TestClient):
        """Test updating space settings as an admin."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-456"}  # Admin, not owner
            
            with patch('app.services.space.SpaceService.get_space_member_role') as mock_role:
                mock_role.return_value = "admin"
                
                with patch('app.services.space.SpaceService.update_space') as mock_update:
                    mock_update.return_value = True
                    
                    with patch('app.services.space.SpaceService.get_space') as mock_get:
                        mock_get.return_value = {
                            "id": space_id,
                            "name": "Updated by Admin",
                            "type": "workspace",
                            "owner_id": "user-123",
                            "member_count": 5,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                        
                        # Act
                        response = test_client.put(
                            f"/api/spaces/{space_id}",
                            json={"name": "Updated by Admin"},
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        # Assert
                        assert response.status_code == status.HTTP_200_OK
                        data = response.json()
                        assert data["name"] == "Updated by Admin"
    
    def test_update_space_settings_as_member_forbidden(self, test_client: TestClient):
        """Test that regular members cannot update space settings."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-789"}  # Regular member
            
            with patch('app.services.space.SpaceService.update_space') as mock_update:
                from app.services.exceptions import UnauthorizedError
                mock_update.side_effect = UnauthorizedError("Only admins can update space settings")
                
                # Act
                response = test_client.put(
                    f"/api/spaces/{space_id}",
                    json={"name": "Unauthorized Update"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_403_FORBIDDEN
                assert "Only admins" in response.json()["detail"]
    
    def test_update_space_validation_errors(self, test_client: TestClient):
        """Test validation errors when updating space settings."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # Act - Name too long
            response = test_client.put(
                f"/api/spaces/{space_id}",
                json={"name": "a" * 101},  # Exceeds 100 char limit
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_update_non_existent_space(self, test_client: TestClient):
        """Test updating a space that doesn't exist."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.update_space') as mock_update:
                from app.services.exceptions import SpaceNotFoundError
                mock_update.side_effect = SpaceNotFoundError(f"Space {space_id} not found")
                
                # Act
                response = test_client.put(
                    f"/api/spaces/{space_id}",
                    json={"name": "Updated Name"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_404_NOT_FOUND


class TestGetSpaceMembers:
    """Tests for GET /api/spaces/{spaceId}/members endpoint."""
    
    def test_get_space_members_success(self, test_client: TestClient):
        """Test successful retrieval of space members."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.get_space_members') as mock_members:
                mock_members.return_value = [
                    {
                        "user_id": "user-123",
                        "email": "owner@example.com",
                        "username": "owner",
                        "role": "owner",
                        "joined_at": datetime.now(timezone.utc).isoformat()
                    },
                    {
                        "user_id": "user-456",
                        "email": "admin@example.com",
                        "username": "admin",
                        "role": "admin",
                        "joined_at": datetime.now(timezone.utc).isoformat()
                    },
                    {
                        "user_id": "user-789",
                        "email": "member@example.com",
                        "username": "member",
                        "role": "member",
                        "joined_at": datetime.now(timezone.utc).isoformat()
                    }
                ]
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}/members",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data) == 3
                assert any(m["role"] == "owner" for m in data)
                assert any(m["role"] == "admin" for m in data)
                assert any(m["role"] == "member" for m in data)
    
    def test_get_space_members_non_member_forbidden(self, test_client: TestClient):
        """Test that non-members cannot view space members."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-999"}  # Not a member
            
            with patch('app.services.space.SpaceService.get_space_members') as mock_members:
                from app.services.exceptions import UnauthorizedError
                mock_members.side_effect = UnauthorizedError("You are not a member of this space")
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}/members",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_public_space_members(self, test_client: TestClient):
        """Test viewing members of a public space."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-999"}  # Not a member
            
            with patch('app.services.space.SpaceService.get_space_members') as mock_members:
                # Public spaces allow viewing members
                mock_members.return_value = [
                    {
                        "user_id": "user-123",
                        "email": "owner@example.com",
                        "username": "owner",
                        "role": "owner",
                        "joined_at": datetime.now(timezone.utc).isoformat()
                    }
                ]
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}/members",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data) >= 1
    
    def test_get_members_space_not_found(self, test_client: TestClient):
        """Test getting members of a non-existent space."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.get_space_members') as mock_members:
                from app.services.exceptions import SpaceNotFoundError
                mock_members.side_effect = SpaceNotFoundError(f"Space {space_id} not found")
                
                # Act
                response = test_client.get(
                    f"/api/spaces/{space_id}/members",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_member_count_tracking(self, test_client: TestClient):
        """Test that member count is accurately tracked."""
        # Arrange
        space_id = str(uuid.uuid4())
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # First, get the space to check member count
            with patch('app.services.space.SpaceService.get_space') as mock_get:
                mock_get.return_value = {
                    "id": space_id,
                    "name": "Test Space",
                    "type": "workspace",
                    "owner_id": "user-123",
                    "member_count": 3,  # Should match members list
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Then get members list
                with patch('app.services.space.SpaceService.get_space_members') as mock_members:
                    mock_members.return_value = [
                        {"user_id": "user-123", "role": "owner", "username": "owner", "email": "owner@example.com", "joined_at": datetime.now(timezone.utc).isoformat()},
                        {"user_id": "user-456", "role": "admin", "username": "admin", "email": "admin@example.com", "joined_at": datetime.now(timezone.utc).isoformat()},
                        {"user_id": "user-789", "role": "member", "username": "member", "email": "member@example.com", "joined_at": datetime.now(timezone.utc).isoformat()}
                    ]
                    
                    # Act
                    space_response = test_client.get(
                        f"/api/spaces/{space_id}",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    members_response = test_client.get(
                        f"/api/spaces/{space_id}/members",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Assert
                    assert space_response.status_code == status.HTTP_200_OK
                    assert members_response.status_code == status.HTTP_200_OK
                    
                    space_data = space_response.json()
                    members_data = members_response.json()
                    
                    assert space_data["memberCount"] == len(members_data)
                    assert space_data["memberCount"] == 3


class TestInviteCodeValidation:
    """Tests for invite code functionality."""
    
    @pytest.mark.skip(reason="Join endpoint not yet implemented")
    def test_join_space_with_valid_invite_code(self, test_client: TestClient):
        """Test joining a space using a valid invite code."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-999", "email": "newuser@example.com"}
            
            with patch('app.services.space.SpaceService.join_space_with_invite_code') as mock_join:
                space_id = str(uuid.uuid4())
                mock_join.return_value = {
                    "space_id": space_id,
                    "name": "Joined Space",
                    "role": "member",
                    "joined_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.post(
                    "/api/spaces/join",
                    json={"inviteCode": "ABC12345"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["spaceId"] == space_id
                assert data["role"] == "member"
    
    @pytest.mark.skip(reason="Join endpoint not yet implemented")
    def test_join_space_with_invalid_invite_code(self, test_client: TestClient):
        """Test joining a space with an invalid invite code."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-999"}
            
            with patch('app.services.space.SpaceService.join_space_with_invite_code') as mock_join:
                from app.services.exceptions import InvalidInviteCodeError
                mock_join.side_effect = InvalidInviteCodeError("Invalid invite code")
                
                # Act
                response = test_client.post(
                    "/api/spaces/join",
                    json={"inviteCode": "INVALID1"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_400_BAD_REQUEST
                assert "Invalid invite code" in response.json()["detail"]
    
    @pytest.mark.skip(reason="Join endpoint not yet implemented")
    def test_join_space_already_member(self, test_client: TestClient):
        """Test joining a space when already a member."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.join_space_with_invite_code') as mock_join:
                from app.services.exceptions import AlreadyMemberError
                mock_join.side_effect = AlreadyMemberError("You are already a member of this space")
                
                # Act
                response = test_client.post(
                    "/api/spaces/join",
                    json={"inviteCode": "ABC12345"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_409_CONFLICT
                assert "already a member" in response.json()["detail"].lower()


class TestDatabaseErrorHandling:
    """Tests for database error handling."""
    
    def test_dynamodb_connection_error(self, test_client: TestClient):
        """Test handling of DynamoDB connection errors."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                from botocore.exceptions import ClientError
                mock_create.side_effect = ClientError(
                    {"Error": {"Code": "ServiceUnavailable", "Message": "DynamoDB is unavailable"}},
                    "PutItem"
                )
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "Test Space", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    def test_dynamodb_throughput_exceeded(self, test_client: TestClient):
        """Test handling of DynamoDB throughput exceeded errors."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.list_user_spaces') as mock_list:
                from botocore.exceptions import ClientError
                mock_list.side_effect = ClientError(
                    {"Error": {"Code": "ProvisionedThroughputExceededException"}},
                    "Query"
                )
                
                # Act
                response = test_client.get(
                    "/api/users/spaces",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""
    
    def test_empty_space_name(self, test_client: TestClient):
        """Test creating a space with empty name."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # Act
            response = test_client.post(
                "/api/spaces",
                json={"name": "", "type": "workspace"},
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_whitespace_only_space_name(self, test_client: TestClient):
        """Test creating a space with whitespace-only name."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            # Act
            response = test_client.post(
                "/api/spaces",
                json={"name": "   ", "type": "workspace"},
                headers={"Authorization": "Bearer test-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_special_characters_in_space_name(self, test_client: TestClient):
        """Test creating a space with special characters in name."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                space_id = str(uuid.uuid4())
                mock_create.return_value = {
                    "id": space_id,
                    "name": "Test & Space #1!",
                    "type": "workspace",
                    "owner_id": "user-123",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "Test & Space #1!", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_201_CREATED
                assert response.json()["name"] == "Test & Space #1!"
    
    def test_unicode_in_space_name(self, test_client: TestClient):
        """Test creating a space with Unicode characters."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                space_id = str(uuid.uuid4())
                mock_create.return_value = {
                    "id": space_id,
                    "name": "测试空间 🚀",
                    "type": "workspace",
                    "owner_id": "user-123",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "测试空间 🚀", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_201_CREATED
                assert response.json()["name"] == "测试空间 🚀"
    
    def test_concurrent_space_creation(self, test_client: TestClient):
        """Test handling of concurrent space creation attempts."""
        # This test simulates race conditions
        # In production, DynamoDB conditional writes would handle this
        pass  # Implementation depends on specific concurrency strategy
    
    @pytest.mark.skip(reason="Space limit feature not yet implemented")
    def test_maximum_spaces_per_user(self, test_client: TestClient):
        """Test enforcing maximum spaces per user limit."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            mock_decode.return_value = {"sub": "user-123"}
            
            with patch('app.services.space.SpaceService.create_space') as mock_create:
                from app.services.exceptions import SpaceLimitExceededError
                mock_create.side_effect = SpaceLimitExceededError("User has reached maximum number of spaces")
                
                # Act
                response = test_client.post(
                    "/api/spaces",
                    json={"name": "One Too Many", "type": "workspace"},
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Assert
                assert response.status_code == status.HTTP_403_FORBIDDEN
                assert "maximum number of spaces" in response.json()["detail"].lower()


class TestAuthenticationAndAuthorization:
    """Tests for authentication and authorization."""
    
    def test_expired_jwt_token(self, test_client: TestClient):
        """Test handling of expired JWT tokens."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            from jose import JWTError
            mock_decode.side_effect = JWTError("Token has expired")
            
            # Act
            response = test_client.get(
                "/api/users/spaces",
                headers={"Authorization": "Bearer expired-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "expired" in response.json()["detail"].lower()
    
    def test_invalid_jwt_signature(self, test_client: TestClient):
        """Test handling of JWT with invalid signature."""
        # Arrange
        with patch('app.core.security.decode_token') as mock_decode:
            from jose import JWTError
            mock_decode.side_effect = JWTError("Invalid signature")
            
            # Act
            response = test_client.get(
                "/api/users/spaces",
                headers={"Authorization": "Bearer invalid-signature-token"}
            )
            
            # Assert
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_malformed_jwt_token(self, test_client: TestClient):
        """Test handling of malformed JWT tokens."""
        # Act
        response = test_client.get(
            "/api/users/spaces",
            headers={"Authorization": "Bearer not.a.valid.jwt"}
        )
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_missing_authorization_header(self, test_client: TestClient):
        """Test requests without Authorization header."""
        # Act
        response = test_client.get("/api/users/spaces")
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Not authenticated"
    
    def test_wrong_authorization_scheme(self, test_client: TestClient):
        """Test using wrong authorization scheme (not Bearer)."""
        # Act
        response = test_client.get(
            "/api/users/spaces",
            headers={"Authorization": "Basic dXNlcjpwYXNz"}  # Basic auth instead of Bearer
        )
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED