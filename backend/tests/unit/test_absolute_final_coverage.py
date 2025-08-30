"""Absolute final tests to achieve 100% code coverage."""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from botocore.exceptions import ClientError

from app.main import app


class TestAbsoluteFinalCoverage:
    """Test class for the final 30 lines to achieve 100% coverage."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_current_user(self):
        """Mock current user."""
        return {
            "user_id": "test-user-123",
            "email": "test@example.com",
            "username": "testuser"
        }
    
    # app/api/routes/spaces.py - Line 53
    def test_spaces_create_validation_error(self, client, mock_current_user):
        """Test spaces create with ValidationError - Line 53."""
        from app.services.exceptions import ValidationError
        
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.spaces.SpaceService') as mock_service:
                mock_service.return_value.create_space.side_effect = ValidationError("Name required")
                
                response = client.post("/api/spaces", json={"name": "Test", "description": "Test"})
                assert response.status_code == 422
    
    # app/api/routes/spaces.py - Line 63
    def test_spaces_create_other_client_error(self, client, mock_current_user):
        """Test spaces create with other ClientError - Line 63."""
        with patch('app.api.routes.spaces.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.spaces.SpaceService') as mock_service:
                error = ClientError(
                    error_response={'Error': {'Code': 'OtherError'}},
                    operation_name='PutItem'
                )
                mock_service.return_value.create_space.side_effect = error
                
                response = client.post("/api/spaces", json={"name": "Test", "description": "Test"})
                assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Lines 63-65
    def test_profile_get_cognito_exception_ignored(self, client, mock_current_user):
        """Test profile GET ignores Cognito exceptions - Lines 63-65."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                mock_service.return_value.get_user_profile.return_value = {
                    "user_id": "test-user-123",
                    "email": "test@example.com",
                    "username": "testuser",
                    "display_name": None,
                    "bio": None,
                    "avatar_url": None,
                    "phone_number": None,
                    "location": None,
                    "is_verified": False,
                    "is_onboarded": False,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
                
                with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                    mock_cognito.return_value.get_user_attributes.side_effect = Exception("Cognito down")
                    
                    response = client.get("/api/profile")
                    assert response.status_code == 200
    
    # app/api/routes/user_profile.py - Line 75
    def test_profile_get_other_client_error(self, client, mock_current_user):
        """Test profile GET with non-ResourceNotFound ClientError - Line 75."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                error = ClientError(
                    error_response={'Error': {'Code': 'OtherError'}},
                    operation_name='GetItem'
                )
                mock_service.return_value.get_user_profile.side_effect = error
                
                response = client.get("/api/profile")
                assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Lines 81-83
    def test_profile_get_generic_exception(self, client, mock_current_user):
        """Test profile GET with generic exception - Lines 81-83."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                mock_service.return_value.get_user_profile.side_effect = RuntimeError("DB down")
                
                response = client.get("/api/profile")
                assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Line 132
    def test_profile_update_cognito_exception_raised(self, client, mock_current_user):
        """Test profile update Cognito exception is raised - Line 132."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                mock_cognito.return_value.update_user_attributes.side_effect = RuntimeError("Cognito error")
                
                response = client.put("/api/profile", json={"email": "new@example.com"})
                assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Lines 171-173
    def test_profile_update_fallback_exception(self, client, mock_current_user):
        """Test profile update fallback exception - Lines 171-173."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                mock_cognito.return_value.update_user_attributes.side_effect = Exception("Cognito fail")
                
                with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                    mock_service.return_value.update_user_profile.side_effect = Exception("DB fail")
                    
                    response = client.put("/api/profile", json={"display_name": "Test"})
                    assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Lines 179-181
    def test_profile_update_generic_exception(self, client, mock_current_user):
        """Test profile update generic exception - Lines 179-181."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.UserProfileUpdate', side_effect=Exception("Parse error")):
                response = client.put("/api/profile", json={"display_name": "Test"})
                assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Line 246
    def test_onboarding_complete_fallback(self, client, mock_current_user):
        """Test onboarding complete fallback - Line 246."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
                mock_cognito.return_value.update_user_attributes.side_effect = Exception("Fail")
                
                with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
                    mock_service.return_value.complete_onboarding.side_effect = Exception("Fail")
                    
                    response = client.post("/api/onboarding/complete", json={"display_name": "Test"})
                    assert response.status_code == 500
    
    # app/api/routes/user_profile.py - Lines 252-254
    def test_onboarding_complete_generic_exception(self, client, mock_current_user):
        """Test onboarding complete generic exception - Lines 252-254."""
        with patch('app.api.routes.user_profile.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.user_profile.OnboardingData', side_effect=Exception("Parse error")):
                response = client.post("/api/onboarding/complete", json={"display_name": "Test"})
                assert response.status_code == 500
    
    # app/api/routes/users.py - Line 110
    def test_users_spaces_other_client_error(self, client, mock_current_user):
        """Test users spaces with other ClientError - Line 110."""
        with patch('app.api.routes.users.get_current_user', return_value=mock_current_user):
            with patch('app.api.routes.users.SpaceService') as mock_service:
                error = ClientError(
                    error_response={'Error': {'Code': 'OtherError'}},
                    operation_name='Query'
                )
                mock_service.return_value.list_user_spaces.side_effect = error
                
                response = client.get("/api/users/me/spaces")
                assert response.status_code == 500
    
    # app/core/config.py - Line 34
    def test_config_parse_cors_json_non_list(self):
        """Test parse_cors with JSON non-list - Line 34."""
        from app.core.config import parse_cors
        
        result = parse_cors('"single_value"')
        assert result == ["single_value"]
    
    # app/core/config.py - Lines 106-109
    def test_config_cors_origins_default_non_test(self):
        """Test config CORS origins default non-test - Lines 106-109."""
        from app.core.config import Settings
        
        original_env = os.environ.get('PYTEST_CURRENT_TEST')
        try:
            if 'PYTEST_CURRENT_TEST' in os.environ:
                del os.environ['PYTEST_CURRENT_TEST']
            
            settings = Settings(
                app_name="test",
                environment="production",
                dynamodb_table_name="test-table",
                cors_origins_str=None
            )
            
            origins = settings.cors_origins
            assert "http://localhost:3000" in origins
        finally:
            if original_env:
                os.environ['PYTEST_CURRENT_TEST'] = original_env
    
    # app/core/dependencies.py - Line 25
    def test_dependencies_get_authenticated_user_none(self):
        """Test get_authenticated_user with None - Line 25."""
        from app.core.dependencies import get_authenticated_user
        
        with pytest.raises(HTTPException) as exc:
            get_authenticated_user(None)
        assert exc.value.status_code == 401
    
    # app/models/user_profile.py - Line 48
    def test_user_profile_phone_invalid(self):
        """Test user profile phone invalid - Line 48."""
        from app.models.user_profile import UserProfileUpdate
        
        with pytest.raises(ValueError, match="Invalid phone number format"):
            UserProfileUpdate(phone_number="invalid!@#")
    
    # app/services/space.py - Line 394
    def test_space_get_space_client_error(self):
        """Test space get_space ClientError - Line 394."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            service = SpaceService()
            service.table = mock_table
            
            mock_table.get_item.side_effect = ClientError(
                error_response={'Error': {'Code': 'Error'}},
                operation_name='GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError):
                service.get_space("space123", "user123")
    
    # app/services/space.py - Lines 453-454
    def test_space_get_user_role_error(self):
        """Test space get_user_role error - Lines 453-454."""
        from app.services.space import SpaceService
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            service = SpaceService()
            service.table = mock_table
            
            mock_table.get_item.side_effect = ClientError(
                error_response={'Error': {'Code': 'Error'}},
                operation_name='GetItem'
            )
            
            result = service.get_user_role("space123", "user123")
            assert result is None
    
    # app/services/space.py - Line 508
    def test_space_join_success_return(self):
        """Test space join success return - Line 508."""
        from app.services.space import SpaceService
        
        with patch('app.services.space.boto3.resource') as mock_resource:
            mock_table = Mock()
            mock_resource.return_value.Table.return_value = mock_table
            service = SpaceService()
            service.table = mock_table
            
            # Mock successful flow
            mock_table.get_item.side_effect = [
                {'Item': {'space_id': 'space123'}},  # Invite lookup
                {},  # Member check (not member)
                {'Item': {'space_id': 'space123', 'name': 'Test', 'is_public': True}}  # Space data
            ]
            mock_table.query.return_value = {'Items': []}
            mock_table.put_item.return_value = {}
            
            result = service.join_space_with_invite_code("CODE", "user123", "user", "user@test.com")
            assert result['space_id'] == 'space123'