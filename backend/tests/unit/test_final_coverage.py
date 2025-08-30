"""Final tests to reach 100% coverage - targeting specific missing lines."""

import json
import os
from unittest.mock import Mock, patch, AsyncMock
import pytest
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from fastapi import HTTPException
from pydantic import ValidationError

# Import modules to test
from app.api.routes import user_profile, users
from app.core import config, dependencies
from app.models import common, user as user_models, user_profile as profile_models
from app.services import invitation, space as space_service
from app.models import space as space_models
from app.services.exceptions import ValidationError as ServiceValidationError


class TestUserProfileRouteMissing:
    """Cover missing lines in user_profile.py"""
    
    @pytest.mark.asyncio
    async def test_update_profile_resource_in_use_max_retries(self):
        """Test line 132 - Max retries for ResourceInUseException."""
        from app.services.user_profile import UserProfileService
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock(spec=UserProfileService)
            error_response = {'Error': {'Code': 'ResourceInUseException'}}
            # Always raise the exception to trigger max retries
            mock_service.update_user_profile.side_effect = ClientError(error_response, 'UpdateItem')
            mock_service_class.return_value = mock_service
            
            with patch('asyncio.sleep', new_callable=AsyncMock):  # Speed up test
                with pytest.raises(HTTPException) as exc_info:
                    await user_profile.update_user_profile(
                        profile_update=profile_models.UserProfileUpdate(bio="New bio"),
                        current_user={"sub": "user123"}
                    )
                assert exc_info.value.status_code == 503
                assert "temporarily unavailable" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_profile_cognito_attrs_exception(self):
        """Test lines 171-172 - Exception in Cognito attributes sync."""
        from app.services.user_profile import UserProfileService
        from app.services.cognito import CognitoService
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_profile_class:
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito_class:
                # Mock profile service returns data
                mock_service = Mock(spec=UserProfileService)
                mock_service.create_user_profile.return_value = {
                    "user_id": "user123",
                    "username": "testuser",
                    "email": "old@test.com",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                mock_profile_class.return_value = mock_service
                
                # Mock Cognito service throws exception
                mock_cognito = Mock(spec=CognitoService)
                mock_cognito.get_user_attributes.side_effect = Exception("Cognito error")
                mock_cognito_class.return_value = mock_cognito
                
                # Should still return profile even if Cognito sync fails
                result = await user_profile.create_user_profile(
                    profile=profile_models.UserProfileCreate(
                        username="testuser",
                        email="test@test.com"
                    ),
                    current_user={"sub": "user123"}
                )
                assert result.user_id == "user123"
    
    @pytest.mark.asyncio
    async def test_create_profile_generic_exception(self):
        """Test lines 179-181 - Generic exception in create_user_profile."""
        from app.services.user_profile import UserProfileService
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock(spec=UserProfileService)
            mock_service.create_user_profile.side_effect = Exception("Database error")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.create_user_profile(
                    profile=profile_models.UserProfileCreate(
                        username="testuser",
                        email="test@test.com"
                    ),
                    current_user={"sub": "user123"}
                )
            assert exc_info.value.status_code == 500
            assert "Failed to create user profile" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_delete_profile_not_found(self):
        """Test line 246 - ResourceNotFoundException in delete."""
        from app.services.user_profile import UserProfileService
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock(spec=UserProfileService)
            error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
            mock_service.delete_user_profile.side_effect = ClientError(error_response, 'DeleteItem')
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.delete_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 404
            assert "User profile not found" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_delete_profile_generic_exception(self):
        """Test lines 252-254 - Generic exception in delete."""
        from app.services.user_profile import UserProfileService
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock(spec=UserProfileService)
            mock_service.delete_user_profile.side_effect = Exception("Database error")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.delete_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 500
            assert "Failed to delete user profile" in str(exc_info.value.detail)


class TestUsersRouteMissing:
    """Cover missing line in users.py"""
    
    @pytest.mark.asyncio
    async def test_register_generic_exception(self):
        """Test line 110 - Generic exception in register."""
        from app.services.user import UserService
        
        with patch('app.api.routes.users.UserService') as mock_service_class:
            mock_service = Mock(spec=UserService)
            mock_service.create_user.side_effect = Exception("Unexpected error")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await users.register_user(
                    user=user_models.UserCreate(
                        email="test@test.com",
                        username="testuser",
                        password="Password123!"
                    )
                )
            assert exc_info.value.status_code == 500
            assert "Registration failed" in str(exc_info.value.detail)


class TestConfigMissing:
    """Cover missing lines in config.py"""
    
    def test_parse_cors_origins_none(self):
        """Test line 18."""
        result = config.parse_cors_origins(None)
        assert result == []
    
    def test_parse_cors_origins_list(self):
        """Test line 21."""
        result = config.parse_cors_origins(["http://localhost:3000"])
        assert result == ["http://localhost:3000"]
    
    def test_parse_cors_origins_star(self):
        """Test line 26."""
        result = config.parse_cors_origins("*")
        assert result == ["*"]
    
    def test_parse_cors_origins_json_number(self):
        """Test lines 34-35."""
        result = config.parse_cors_origins('[123]')
        assert result == [123]
        
        result = config.parse_cors_origins('456')
        assert result == ['456']
    
    def test_parse_cors_origins_invalid_json(self):
        """Test line 36."""
        result = config.parse_cors_origins('[invalid')
        assert result == ['[invalid']
    
    def test_parse_cors_origins_comma_separated(self):
        """Test line 39."""
        result = config.parse_cors_origins('http://localhost:3000,http://localhost:5173')
        assert result == ['http://localhost:3000', 'http://localhost:5173']
    
    def test_parse_cors_origins_other_type(self):
        """Test lines 41-42."""
        result = config.parse_cors_origins(123)
        assert result == ['123']
        
        result = config.parse_cors_origins(True)
        assert result == ['True']
    
    def test_settings_from_env(self):
        """Test lines 106-109."""
        with patch.dict(os.environ, {
            'TABLE_NAME': 'test-table',
            'AWS_REGION': 'us-east-1',
            'ENVIRONMENT': 'test',
            'CORS_ORIGINS': '["http://localhost:3000"]'
        }, clear=True):
            settings = config.Settings.from_env()
            assert settings.table_name == 'test-table'
            assert settings.aws_region == 'us-east-1'
            assert settings.environment == 'test'


class TestDependenciesMissing:
    """Cover missing line in dependencies.py"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_http_exception(self):
        """Test line 25 - HTTPException re-raise."""
        from app.services.cognito import CognitoService
        
        with patch('app.core.dependencies.CognitoService') as mock_cognito_class:
            mock_cognito = Mock(spec=CognitoService)
            mock_cognito.verify_token.side_effect = HTTPException(
                status_code=401, 
                detail="Token expired"
            )
            mock_cognito_class.return_value = mock_cognito
            
            with pytest.raises(HTTPException) as exc_info:
                await dependencies.get_current_user("expired_token")
            assert exc_info.value.status_code == 401
            assert "Token expired" in str(exc_info.value.detail)


class TestCommonModelsMissing:
    """Cover missing lines in common.py"""
    
    def test_error_response_with_validation_errors(self):
        """Test line 29."""
        error = common.ErrorResponse(
            error="ValidationError",
            message="Invalid input",
            validation_errors={"field": ["required"]}
        )
        assert error.error == "ValidationError"
        assert error.validation_errors == {"field": ["required"]}
    
    def test_pagination_response_with_next_page(self):
        """Test line 36."""
        response = common.PaginationResponse(
            items=["item1", "item2"],
            total=10,
            page=1,
            page_size=2,
            next_page=2
        )
        assert response.next_page == 2
        assert response.total == 10


class TestUserModelMissing:
    """Cover missing line in user.py"""
    
    def test_user_create_email_validator(self):
        """Test line 24 - email lowercase validator."""
        user = user_models.UserCreate(
            email="TEST@EXAMPLE.COM",
            username="testuser",
            password="Password123!"
        )
        assert user.email == "test@example.com"


class TestUserProfileModelsMissing:
    """Cover missing lines in user_profile.py"""
    
    def test_profile_update_username_validator(self):
        """Test line 48."""
        profile = profile_models.UserProfileUpdate(username="  testuser  ")
        assert profile.username == "testuser"
        
        # Test with None
        profile = profile_models.UserProfileUpdate(username=None)
        assert profile.username is None
    
    def test_profile_update_bio_validator(self):
        """Test line 55."""
        profile = profile_models.UserProfileUpdate(bio="  My bio  ")
        assert profile.bio == "My bio"
        
        # Test with None
        profile = profile_models.UserProfileUpdate(bio=None)
        assert profile.bio is None


class TestInvitationServiceMissing:
    """Cover missing line in invitation.py"""
    
    def test_validate_invite_code_not_found(self):
        """Test line 82 - ClientError handling."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service, 'table') as mock_table:
            error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
            mock_table.get_item.side_effect = ClientError(error_response, 'GetItem')
            
            result = service.validate_invite_code("INVALID")
            assert result is None


class TestSpaceServiceMissing:
    """Cover missing lines in space.py service"""
    
    def test_ensure_table_exists_already_exists(self):
        """Test line 73 - Table already exists."""
        service = space_service.SpaceService()
        
        with patch.object(service, 'dynamodb') as mock_dynamodb:
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            error_response = {'Error': {'Code': 'ResourceInUseException'}}
            mock_dynamodb.create_table.side_effect = ClientError(error_response, 'CreateTable')
            
            # This should return the existing table
            result = service._ensure_table_exists()
            assert result == mock_table
    
    def test_create_space_name_validation_in_service(self):
        """Test line 84 - Service-level validation."""
        service = space_service.SpaceService()
        
        # Create a space with whitespace-only name (bypassing Pydantic)
        with pytest.raises(ServiceValidationError) as exc_info:
            # We need to bypass Pydantic validation by using a mock
            mock_space = Mock(spec=space_models.SpaceCreate)
            mock_space.name = "   "  # Whitespace only
            mock_space.description = ""
            mock_space.is_public = False
            mock_space.type = "workspace"
            mock_space.metadata = None
            
            service.create_space(
                space=mock_space,
                owner_id="user123"
            )
        assert "Space name is required" in str(exc_info.value)
    
    def test_update_space_name_validation_in_service(self):
        """Test line 207 - Update with empty name."""
        service = space_service.SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            # Mock space exists
            mock_table.get_item.return_value = {
                'Item': {
                    'space_id': 'space123',
                    'owner_id': 'user123',
                    'name': 'Old Name'
                }
            }
            
            with patch.object(service, 'can_edit_space', return_value=True):
                # Create update with whitespace-only name (bypassing Pydantic)
                mock_update = Mock(spec=space_models.SpaceUpdate)
                mock_update.name = "   "  # Whitespace only
                mock_update.description = None
                mock_update.is_public = None
                mock_update.metadata = None
                
                with pytest.raises(ServiceValidationError) as exc_info:
                    service.update_space(
                        space_id="space123",
                        user_id="user123",
                        update=mock_update
                    )
                assert "Space name cannot be empty" in str(exc_info.value)