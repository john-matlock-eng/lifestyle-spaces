"""
Simple coverage tests for routes and configuration.
Focus on uncovered lines in user_profile routes, users routes, config, and models.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from botocore.exceptions import ClientError
from datetime import datetime, timezone

from app.api.routes.user_profile import (
    get_user_profile,
    update_user_profile,
    complete_onboarding
)
from app.api.routes.users import (
    register_user,
    get_user_spaces
)
from app.core.config import Settings, parse_cors
from app.models.common import PaginationParams
from app.models.user import UserCreate
from app.models.user_profile import (
    UserProfileUpdate,
    OnboardingCompleteRequest,
    UserProfileBase
)
from app.services.exceptions import UserAlreadyExistsError, ValidationError as ServiceValidationError


class TestUserProfileRouteCoverage:
    """Test uncovered lines in user_profile routes."""
    
    @pytest.mark.asyncio
    async def test_update_profile_cognito_user_not_found(self):
        """Test line 132 - update_profile when Cognito user not found."""
        from app.models.user_profile import UserProfileUpdate
        
        profile_update = UserProfileUpdate(phone_number="+1234567890")
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito_class:
                mock_cognito = Mock()
                mock_cognito_class.return_value = mock_cognito
                
                error_response = {'Error': {'Code': 'UserNotFoundException'}}
                mock_cognito.update_user_attributes.side_effect = ClientError(
                    error_response, 'UpdateUserAttributes'
                )
                
                with pytest.raises(HTTPException) as exc_info:
                    await update_user_profile(
                        profile_update,
                        current_user,
                        "user123"
                    )
                
                assert exc_info.value.status_code == 500
                assert "authentication provider" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_update_profile_conditional_check_retry(self):
        """Test lines 177-179 - update_profile ConditionalCheckFailedException retry."""
        profile_update = UserProfileUpdate(bio="New bio")
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # First call fails with ConditionalCheckFailedException
            error_response = {'Error': {'Code': 'ConditionalCheckFailedException'}}
            mock_service.update_user_profile.side_effect = [
                ClientError(error_response, 'UpdateItem'),
                {'id': 'user123', 'bio': 'New bio', 'email': 'test@example.com',
                 'username': 'test', 'onboarding_completed': False,
                 'onboarding_step': 0, 'created_at': '2024-01-01',
                 'updated_at': '2024-01-01', 'is_active': True, 'is_verified': False}
            ]
            
            result = await update_user_profile(
                profile_update,
                current_user,
                "user123"
            )
            
            assert result.id == 'user123'
            assert result.bio == 'New bio'
            # Verify retry happened
            assert mock_service.update_user_profile.call_count == 2
    
    @pytest.mark.asyncio
    async def test_update_profile_conditional_check_retry_fails(self):
        """Test lines 177-179 - update_profile when retry also fails."""
        profile_update = UserProfileUpdate(location="New York")
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            # Both calls fail
            error_response = {'Error': {'Code': 'ConditionalCheckFailedException'}}
            mock_service.update_user_profile.side_effect = [
                ClientError(error_response, 'UpdateItem'),
                Exception("Retry failed")
            ]
            
            with pytest.raises(HTTPException) as exc_info:
                await update_user_profile(
                    profile_update,
                    current_user,
                    "user123"
                )
            
            assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_update_profile_generic_exception(self):
        """Test lines 185-187 - update_profile generic exception handling."""
        profile_update = UserProfileUpdate(timezone="America/New_York")
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.update_user_profile.side_effect = RuntimeError("Unexpected error")
            
            with pytest.raises(HTTPException) as exc_info:
                await update_user_profile(
                    profile_update,
                    current_user,
                    "user123"
                )
            
            assert exc_info.value.status_code == 500
            assert "Failed to update user profile" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_conditional_check_failed(self):
        """Test line 252 - complete_onboarding ConditionalCheckFailedException."""
        request = OnboardingCompleteRequest(completion_source="web")
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            error_response = {'Error': {'Code': 'ConditionalCheckFailedException'}}
            mock_service.complete_onboarding.side_effect = ClientError(
                error_response, 'UpdateItem'
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await complete_onboarding(request, current_user, "user123")
            
            assert exc_info.value.status_code == 500
            assert "Failed to complete onboarding" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_generic_exception(self):
        """Test lines 258-260 - complete_onboarding generic exception."""
        current_user = {"sub": "user123", "email": "test@example.com"}
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.complete_onboarding.side_effect = RuntimeError("Database error")
            
            with pytest.raises(HTTPException) as exc_info:
                await complete_onboarding(None, current_user, "user123")
            
            assert exc_info.value.status_code == 500
            assert "Failed to complete onboarding" in exc_info.value.detail


class TestUsersRouteCoverage:
    """Test uncovered lines in users routes."""
    
    @pytest.mark.asyncio
    async def test_register_user_success(self):
        """Test line 26 - register_user successful path."""
        user_data = UserCreate(
            email="new@example.com",
            username="newuser",
            password="securepass123",
            full_name="New User"
        )
        
        with patch('app.api.routes.users.UserService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.register_user.return_value = {
                'id': 'user123',
                'email': 'new@example.com',
                'username': 'newuser',
                'full_name': 'New User',
                'is_active': True,
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            }
            
            result = await register_user(user_data)
            
            assert result.email == 'new@example.com'
            assert result.username == 'newuser'
    
    @pytest.mark.asyncio
    async def test_register_user_already_exists(self):
        """Test line 28 - register_user when user already exists."""
        user_data = UserCreate(
            email="existing@example.com",
            username="existing",
            password="password123"
        )
        
        with patch('app.api.routes.users.UserService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.register_user.side_effect = UserAlreadyExistsError("User exists")
            
            with pytest.raises(HTTPException) as exc_info:
                await register_user(user_data)
            
            assert exc_info.value.status_code == 409
            assert "User exists" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_register_user_validation_error(self):
        """Test line 33 - register_user validation error."""
        # Create mock user data to avoid Pydantic validation
        user_data = Mock()
        user_data.email = "test@example.com"
        user_data.username = "testuser"
        user_data.password = "validpass123"
        
        with patch('app.api.routes.users.UserService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.register_user.side_effect = ServiceValidationError("Invalid data")
            
            with pytest.raises(HTTPException) as exc_info:
                await register_user(user_data)
            
            assert exc_info.value.status_code == 400
            assert "Invalid data" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_get_user_spaces_throughput_exceeded(self):
        """Test line 136 - get_user_spaces generic ClientError."""
        current_user = {"sub": "user123"}
        
        with patch('app.api.routes.users.SpaceService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            error_response = {'Error': {'Code': 'UnknownError'}}
            mock_service.list_user_spaces.side_effect = ClientError(
                error_response, 'Query'
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await get_user_spaces(
                    limit=20,
                    offset=0,
                    search=None,
                    isPublic=None,
                    role=None,
                    current_user=current_user
                )
            
            assert exc_info.value.status_code == 500
            assert "Failed to get user spaces" in exc_info.value.detail


class TestConfigCoverage:
    """Test uncovered lines in config module."""
    
    def test_parse_cors_json_parse_non_list(self):
        """Test line 34 - parse_cors when JSON parsing yields non-list."""
        result = parse_cors('{"key": "value"}')
        assert result == ['{"key": "value"}']
    
    def test_settings_cors_origins_test_environment(self):
        """Test lines 106-109 - cors_origins property for test environment."""
        with patch.dict('os.environ', {'PYTEST_CURRENT_TEST': 'test_something'}):
            settings = Settings()
            # Clear cached property if it exists
            if hasattr(settings, '_cors_origins_parsed'):
                delattr(settings, '_cors_origins_parsed')
            settings.cors_origins_str = None
            
            origins = settings.cors_origins
            assert origins == ["http://testserver"]
    
    def test_settings_cors_origins_cached(self):
        """Test cors_origins property returns cached value."""
        settings = Settings()
        settings._cors_origins_parsed = ["cached_origin"]
        
        origins = settings.cors_origins
        assert origins == ["cached_origin"]


class TestModelsCoverage:
    """Test uncovered lines in models."""
    
    def test_pagination_params_invalid_page(self):
        """Test line 29 - PaginationParams page validation."""
        # Pydantic v2 validation happens at model creation
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=0)
        
        # Check that validation error occurred
        assert exc_info.value.errors()[0]['type'] == 'greater_than_equal'
    
    def test_pagination_params_invalid_page_size(self):
        """Test line 36 - PaginationParams page_size validation."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page_size=101)
        
        # Check that validation error occurred
        assert exc_info.value.errors()[0]['type'] == 'less_than_equal'
    
    def test_user_create_password_validation(self):
        """Test line 24 - UserCreate password validation."""
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                username="testuser",
                password="short"
            )
        
        # Check that validation error occurred for password
        assert exc_info.value.errors()[0]['type'] == 'string_too_short'
    
    def test_user_profile_phone_validation_invalid_format(self):
        """Test line 48 - UserProfileBase phone validation with invalid format."""
        # Phone number too short (less than 10 chars)
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            UserProfileBase(phone_number="abc@#$%")
        
        # Check that validation error occurred
        assert "Phone number must be at least 10 characters" in str(exc_info.value)
    
    def test_user_profile_phone_validation_regex_format(self):
        """Test line 48 - UserProfileBase phone validation with regex mismatch."""
        # Phone number with invalid characters (passes length check)
        from pydantic import ValidationError
        with pytest.raises(ValidationError) as exc_info:
            UserProfileBase(phone_number="abc@#$%def123")  # 14 chars, invalid format
        
        # Check that validation error occurred
        assert "Invalid phone number format" in str(exc_info.value)
    
    def test_user_profile_avatar_url_validation(self):
        """Test line 55 - UserProfileBase avatar_url validation."""
        with pytest.raises(ValueError) as exc_info:
            UserProfileBase(avatar_url="not-a-url")
        
        assert "Invalid URL format" in str(exc_info.value)


class TestEdgeCases:
    """Additional edge case tests for complete coverage."""
    
    def test_parse_cors_empty_string(self):
        """Test parse_cors with empty values in comma-separated string."""
        result = parse_cors("origin1,,origin2,")
        assert result == ["origin1", "origin2"]
    
    def test_parse_cors_single_origin(self):
        """Test parse_cors with single origin."""
        result = parse_cors("https://example.com")
        assert result == ["https://example.com"]
    
    def test_parse_cors_json_array(self):
        """Test parse_cors with valid JSON array."""
        result = parse_cors('["origin1", "origin2"]')
        assert result == ["origin1", "origin2"]
    
    def test_user_profile_bio_with_script_tags(self):
        """Test bio validation removes script tags."""
        profile = UserProfileBase(
            bio="<script>alert('xss')</script>Normal text<b>bold</b>"
        )
        assert profile.bio == "Normal textbold"
    
    def test_user_profile_bio_strip_whitespace(self):
        """Test bio validation strips whitespace."""
        profile = UserProfileBase(bio="  Some bio text  ")
        assert profile.bio == "Some bio text"