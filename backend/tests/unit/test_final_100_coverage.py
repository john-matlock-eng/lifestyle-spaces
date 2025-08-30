"""Final tests to achieve 100% code coverage for remaining lines."""

import pytest
import os
import json
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError

from app.main import app


class TestFinal100Coverage:
    """Test class for achieving 100% coverage on remaining lines."""
    
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
    
    # Test for app/api/routes/spaces.py - Line 53
    def test_create_space_validation_error_from_service(self, client, mock_current_user):
        """Test POST /spaces handles ValidationError from service - Line 53."""
        space_data = {
            "name": "Test Space",
            "description": "Test description"
        }
        
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.spaces.SpaceService') as mock_service:
                from app.services.exceptions import ValidationError
                # Mock service to raise ValidationError
                mock_service.return_value.create_space.side_effect = ValidationError("Invalid space data")
                
                response = client.post("/api/spaces", json=space_data)
                assert response.status_code == 422
                assert "Invalid space data" in response.json()["detail"]
    
    # Test for app/api/routes/spaces.py - Line 63
    def test_create_space_generic_client_error_fallback(self, client, mock_current_user):
        """Test POST /spaces handles non-ServiceUnavailable ClientError - Line 63."""
        space_data = {
            "name": "Test Space",
            "description": "Test description"
        }
        
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.spaces.SpaceService') as mock_service:
                # Mock service to raise ClientError with different code
                error = ClientError(
                    error_response={'Error': {'Code': 'UnknownError'}},
                    operation_name='PutItem'
                )
                mock_service.return_value.create_space.side_effect = error
                
                response = client.post("/api/spaces", json=space_data)
                assert response.status_code == 500
    
    # Test for app/api/routes/users.py - Line 110
    def test_get_user_spaces_non_throughput_client_error(self, client, mock_current_user):
        """Test GET /users/me/spaces handles non-throughput ClientError - Line 110."""
        with patch('app.api.routes.users.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.users.SpaceService') as mock_service:
                # Mock service to raise ClientError with non-throughput code
                error = ClientError(
                    error_response={'Error': {'Code': 'AccessDeniedException'}},
                    operation_name='Query'
                )
                mock_service.return_value.list_user_spaces.side_effect = error
                
                response = client.get("/api/users/me/spaces")
                assert response.status_code == 500
                assert "Failed to get user spaces" in response.json()["detail"]
    
    # Test for app/api/routes/user_profile.py - Lines 63-65 (Cognito sync failure)
    def test_get_profile_cognito_attributes_none(self, client, mock_current_user):
        """Test GET /profile when Cognito returns None attributes - Lines 63-65."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock profile service to return profile
                mock_profile = {
                    "user_id": "test-user-123",
                    "email": "old@example.com",
                    "username": "olduser",
                    "display_name": "Test User",
                    "bio": "Test bio",
                    "avatar_url": None,
                    "phone_number": None,
                    "location": None,
                    "is_verified": False,
                    "is_onboarded": True,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
                mock_service.return_value.get_user_profile.return_value = mock_profile
                
                # Mock Cognito service to raise generic exception
                with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                    mock_cognito.return_value.get_user_attributes.side_effect = ValueError("Invalid user")
                    
                    response = client.get("/api/profile")
                    assert response.status_code == 200
                    # Should still return profile even if Cognito sync fails
                    data = response.json()
                    assert data["user_id"] == "test-user-123"
    
    # Test for app/api/routes/user_profile.py - Line 75
    def test_get_profile_other_client_error(self, client, mock_current_user):
        """Test GET /profile handles other ClientError codes - Line 75."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock service to raise ClientError with different code
                error = ClientError(
                    error_response={'Error': {'Code': 'ValidationException'}},
                    operation_name='GetItem'
                )
                mock_service.return_value.get_user_profile.side_effect = error
                
                response = client.get("/api/profile")
                assert response.status_code == 500
                assert "Failed to retrieve user profile" in response.json()["detail"]
    
    # Test for app/api/routes/user_profile.py - Lines 81-83
    def test_get_profile_non_client_exception(self, client, mock_current_user):
        """Test GET /profile handles non-HTTPException errors - Lines 81-83."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                # Mock service to raise generic exception
                mock_service.return_value.get_user_profile.side_effect = ValueError("Invalid data")
                
                response = client.get("/api/profile")
                assert response.status_code == 500
                assert "Failed to retrieve user profile" in response.json()["detail"]
    
    # Test for app/models/user_profile.py - Line 48 
    def test_user_profile_phone_invalid_format(self):
        """Test UserProfile phone validation with invalid format - Line 48."""
        from app.models.user_profile import UserProfileUpdate
        
        # Phone with invalid characters should fail validation
        with pytest.raises(ValueError, match="Invalid phone number format"):
            UserProfileUpdate(phone_number="abc!@#$")
    
    # Test for app/models/user_profile.py - Line 55
    def test_user_profile_avatar_url_invalid_format(self):
        """Test UserProfile avatar_url validation with invalid URL - Line 55."""
        from app.models.user_profile import UserProfileUpdate
        
        # URL that doesn't start with http:// or https:// should fail
        with pytest.raises(ValueError, match="Invalid URL format"):
            UserProfileUpdate(avatar_url="ftp://example.com/image.jpg")
    
    # Test for app/core/dependencies.py - Line 25
    def test_get_authenticated_user_with_none(self):
        """Test get_authenticated_user raises exception for None user - Line 25."""
        from app.core.dependencies import get_authenticated_user
        
        with pytest.raises(HTTPException) as exc_info:
            get_authenticated_user(None)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"
    
    # Test for app/core/config.py - Line 34
    def test_parse_cors_json_single_value(self):
        """Test parse_cors with JSON non-list value - Line 34."""
        from app.core.config import parse_cors
        
        # JSON string that parses to a non-list value
        json_string = '"http://example.com"'
        result = parse_cors(json_string)
        assert result == ["http://example.com"]
        
        # JSON number
        json_string = '123'
        result = parse_cors(json_string)
        assert result == ["123"]
    
    # Test for app/core/config.py - Lines 106-109
    def test_settings_cors_origins_non_test_environment(self):
        """Test Settings.cors_origins in non-test environment - Lines 106-109."""
        from app.core.config import Settings
        
        # Clear PYTEST_CURRENT_TEST to simulate non-test environment
        with patch.dict(os.environ, {}, clear=True):
            # Ensure PYTEST_CURRENT_TEST is not set
            if 'PYTEST_CURRENT_TEST' in os.environ:
                del os.environ['PYTEST_CURRENT_TEST']
            
            settings = Settings(
                app_name="test",
                environment="production",
                dynamodb_table_name="test-table",
                cors_origins_str=None
            )
            
            # Should return default production origins
            origins = settings.cors_origins
            assert "http://localhost:3000" in origins
            assert "https://*.cloudfront.net" in origins
    
    # Test for app/services/space.py - Line 207
    def test_space_service_update_space_empty_name(self):
        """Test SpaceService.update_space with empty name after strip - Line 207."""
        from app.services.space import SpaceService
        from app.services.exceptions import ValidationError
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            
            service = SpaceService()
            service.table = mock_table
            
            # Mock get_item to return space
            mock_table.get_item.return_value = {
                'Item': {'space_id': 'space123', 'owner_id': 'user123'}
            }
            
            # Mock can_edit_space
            with patch.object(service, 'can_edit_space', return_value=True):
                # Create update with Mock to bypass Pydantic validation
                update = Mock()
                update.name = "   "  # Empty after strip
                update.description = None
                update.is_public = None
                update.metadata = None
                
                with pytest.raises(ValidationError, match="Space name cannot be empty"):
                    service.update_space("space123", update, "user123")
    
    # Test for app/services/space.py - Line 394
    def test_space_service_get_space_client_error(self):
        """Test SpaceService.get_space with ClientError - Line 394."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            
            service = SpaceService()
            service.table = mock_table
            
            # Mock get_item to raise ClientError
            mock_table.get_item.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalServerError'}},
                operation_name='GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError, match="Space space123 not found"):
                service.get_space("space123", "user123")
    
    # Test for app/services/space.py - Lines 453-454
    def test_space_service_get_user_role_client_error(self):
        """Test SpaceService.get_user_role with ClientError - Lines 453-454."""
        from app.services.space import SpaceService
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            
            service = SpaceService()
            service.table = mock_table
            
            # Mock get_item to raise ClientError
            mock_table.get_item.side_effect = ClientError(
                error_response={'Error': {'Code': 'AccessDeniedException'}},
                operation_name='GetItem'
            )
            
            result = service.get_user_role("space123", "user123")
            assert result is None
    
    # Test for app/services/space.py - Line 508
    def test_space_service_join_space_get_space_success(self):
        """Test SpaceService.join_space_with_invite_code success path - Line 508."""
        from app.services.space import SpaceService
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            
            service = SpaceService()
            service.table = mock_table
            
            # Setup successful flow
            def get_item_side_effect(Key):
                if 'INVITE#' in Key.get('PK', ''):
                    return {'Item': {'space_id': 'space123'}}
                elif 'MEMBER#' in Key.get('SK', ''):
                    return {}  # Not a member yet
                else:
                    # Space metadata
                    return {
                        'Item': {
                            'space_id': 'space123',
                            'name': 'Test Space',
                            'owner_id': 'owner123',
                            'is_public': True
                        }
                    }
            
            mock_table.get_item.side_effect = get_item_side_effect
            mock_table.query.return_value = {'Items': []}
            mock_table.put_item.return_value = {}
            
            result = service.join_space_with_invite_code(
                "ABC123", "user123", "testuser", "test@example.com"
            )
            
            assert result['space_id'] == 'space123'
            assert result['name'] == 'Test Space'
            assert result['role'] == 'member'