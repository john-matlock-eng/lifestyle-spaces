"""Tests for achieving 100% coverage on minor files with missing lines."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError

from app.main import app


class TestMinorFiles100Coverage:
    """Test class for 100% coverage of minor files."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_current_user(self):
        """Mock current user for authentication."""
        return {
            "user_id": "test-user-123",
            "email": "test@example.com",
            "username": "testuser"
        }
    
    # Tests for app/api/routes/spaces.py - Lines 53, 63
    def test_create_space_validation_error(self, client, mock_current_user):
        """Test POST /spaces handles ValidationError - Line 53."""
        space_data = {
            "name": "",  # Invalid empty name
            "description": "Test space"
        }
        
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            response = client.post("/api/spaces", json=space_data)
            # Pydantic validation should catch this first
            assert response.status_code in [422, 400]
    
    def test_create_space_generic_client_error(self, client, mock_current_user):
        """Test POST /spaces handles generic ClientError - Line 63."""
        space_data = {
            "name": "Test Space",
            "description": "Test description"
        }
        
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.spaces.SpaceService') as mock_service:
                # Mock service to raise generic ClientError
                error = ClientError(
                    error_response={'Error': {'Code': 'InternalServerError'}},
                    operation_name='PutItem'
                )
                mock_service.return_value.create_space.side_effect = error
                
                response = client.post("/api/spaces", json=space_data)
                assert response.status_code == 500
    
    # Tests for app/api/routes/users.py - Line 110
    def test_get_user_spaces_generic_client_error(self, client, mock_current_user):
        """Test GET /users/me/spaces handles generic ClientError - Line 110."""
        with patch('app.api.routes.users.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.users.SpaceService') as mock_service:
                # Mock service to raise generic ClientError
                error = ClientError(
                    error_response={'Error': {'Code': 'UnknownError'}},
                    operation_name='Query'
                )
                mock_service.return_value.list_user_spaces.side_effect = error
                
                response = client.get("/api/users/me/spaces")
                assert response.status_code == 500
                assert "Failed to get user spaces" in response.json()["detail"]
    
    # Tests for app/models/space.py - Lines 36, 54, 62
    def test_space_create_validate_description_empty(self):
        """Test SpaceCreate.validate_description with empty value - Line 36."""
        from app.models.space import SpaceCreate
        
        # Test with None
        space = SpaceCreate(name="Test", description=None)
        assert space.description is None
        
        # The validator is called during model initialization
        # Let's test it directly
        result = SpaceCreate.validate_description(None)
        assert result is None
    
    def test_space_update_validate_name_raises_error(self):
        """Test SpaceUpdate.validate_name raises error for empty name - Line 54."""
        from app.models.space import SpaceUpdate
        
        with pytest.raises(ValueError, match="Space name cannot be empty"):
            SpaceUpdate(name="   ")  # Only whitespace
    
    def test_space_update_validate_description_empty(self):
        """Test SpaceUpdate.validate_description with empty value - Line 62."""
        from app.models.space import SpaceUpdate
        
        # Test with None
        update = SpaceUpdate(description=None)
        assert update.description is None
        
        # The validator returns None for None values
        result = SpaceUpdate.validate_description(None)
        assert result is None
    
    # Tests for app/models/user_profile.py - Lines 48, 55
    def test_user_profile_validate_phone_invalid_format(self):
        """Test UserProfile phone validation with invalid format - Line 48."""
        from app.models.user_profile import UserProfile
        
        with pytest.raises(ValueError, match="Invalid phone number format"):
            UserProfile(
                user_id="test123",
                email="test@example.com",
                username="testuser",
                phone_number="abc123"  # Invalid characters
            )
    
    def test_user_profile_validate_avatar_url_invalid(self):
        """Test UserProfile avatar_url validation with invalid URL - Line 55."""
        from app.models.user_profile import UserProfile
        
        with pytest.raises(ValueError, match="Invalid URL format"):
            UserProfile(
                user_id="test123",
                email="test@example.com",
                username="testuser",
                avatar_url="not-a-url"  # Doesn't start with http:// or https://
            )
    
    # Test for app/core/dependencies.py - Line 25
    def test_get_authenticated_user_none(self):
        """Test get_authenticated_user raises exception when user is None - Line 25."""
        from app.core.dependencies import get_authenticated_user
        
        with pytest.raises(HTTPException) as exc_info:
            get_authenticated_user(None)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc_info.value.detail == "Not authenticated"
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}