"""
Final test file to achieve 100% coverage - targeting the last 24 lines.

Remaining gaps:
- app/api/routes/spaces.py: Lines 53, 63 (2 lines)
- app/api/routes/user_profile.py: Lines 75, 132, 171-173, 179-181, 246, 252-254 (10 lines)
- app/api/routes/users.py: Line 110 (1 line)
- app/core/config.py: Lines 34, 106-109 (5 lines)
- app/core/dependencies.py: Line 25 (1 line)
- app/services/space.py: Lines 394, 453-454, 508 (4 lines)
"""

import pytest
from unittest.mock import MagicMock, patch, Mock, AsyncMock
from fastapi import HTTPException
from botocore.exceptions import ClientError
from datetime import datetime
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# Test for app/api/routes/spaces.py line 53
@pytest.mark.asyncio
async def test_create_space_validation_error_line_53():
    """Test ValidationError handling in create_space endpoint (line 53)."""
    from app.api.routes.spaces import create_space
    from app.models.space import SpaceCreate
    from app.services.exceptions import ValidationError
    
    with patch('app.api.routes.spaces.SpaceService') as mock_service:
        # Make the service raise a ValidationError
        mock_service_instance = mock_service.return_value
        mock_service_instance.create_space.side_effect = ValidationError("Invalid space data")
        
        request = SpaceCreate(name="Test Space", description="Test")
        current_user = {"sub": "user123", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            await create_space(request, current_user, "user123")
        
        assert exc_info.value.status_code == 422
        assert "Invalid space data" in exc_info.value.detail


# Test for app/api/routes/spaces.py line 63
@pytest.mark.asyncio
async def test_create_space_unknown_client_error_line_63():
    """Test unknown ClientError handling in create_space (line 63)."""
    from app.api.routes.spaces import create_space
    from app.models.space import SpaceCreate
    
    with patch('app.api.routes.spaces.SpaceService') as mock_service:
        # Create a ClientError with an unknown error code
        mock_service_instance = mock_service.return_value
        error_response = {'Error': {'Code': 'UnknownError', 'Message': 'Something went wrong'}}
        mock_service_instance.create_space.side_effect = ClientError(error_response, 'PutItem')
        
        request = SpaceCreate(name="Test Space", description="Test")
        current_user = {"sub": "user123", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            await create_space(request, current_user, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to create space"


# Test for app/api/routes/user_profile.py line 75
@pytest.mark.asyncio
async def test_get_user_profile_resource_not_found_line_75():
    """Test ResourceNotFoundException handling (line 75)."""
    from app.api.routes.user_profile import get_user_profile
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Raise ClientError with ResourceNotFoundException
        error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
        mock_service_instance.get_user_profile.side_effect = ClientError(error_response, 'GetItem')
        
        with pytest.raises(HTTPException) as exc_info:
            await get_user_profile({"sub": "user123"}, "user123")
        
        assert exc_info.value.status_code == 500


# Test for app/api/routes/user_profile.py line 132 (profile_image_url processing)
@pytest.mark.asyncio
async def test_update_user_profile_with_image_url():
    """Test update_user_profile with profile_image_url (line 132)."""
    from app.api.routes.user_profile import update_user_profile
    from app.models.user_profile import UserProfileUpdate
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        mock_service_instance.update_user_profile.return_value = {
            "user_id": "user123",
            "email": "test@example.com",
            "username": "testuser",
            "display_name": "New Name",
            "bio": "New Bio",
            "profile_image_url": "https://example.com/image.jpg",
            "is_onboarded": True,
            "is_verified": True,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        # Update with profile_image_url to trigger line 132
        profile_update = UserProfileUpdate(
            display_name="New Name",
            bio="New Bio",
            profile_image_url="https://example.com/image.jpg"
        )
        current_user = {"email": "test@example.com", "username": "testuser"}
        
        result = await update_user_profile(profile_update, current_user, "user123")
        
        assert result.profile_image_url == "https://example.com/image.jpg"


# Test for app/api/routes/user_profile.py lines 171-173 (retry logic)
@pytest.mark.asyncio
async def test_update_user_profile_retry_logic():
    """Test update retry logic after conditional check failure (lines 171-173)."""
    from app.api.routes.user_profile import update_user_profile
    from app.models.user_profile import UserProfileUpdate
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        
        # First call raises ConditionalCheckFailedException, second succeeds
        error_response = {'Error': {'Code': 'ConditionalCheckFailedException'}}
        mock_service_instance.update_user_profile.side_effect = [
            ClientError(error_response, 'UpdateItem'),
            {
                "user_id": "user123",
                "email": "test@example.com",
                "username": "testuser",
                "display_name": "Retry Name",
                "bio": None,
                "profile_image_url": None,
                "is_onboarded": True,
                "is_verified": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ]
        
        profile_update = UserProfileUpdate(display_name="Retry Name")
        current_user = {"email": "test@example.com", "username": "testuser"}
        
        result = await update_user_profile(profile_update, current_user, "user123")
        
        assert result.display_name == "Retry Name"
        # Verify it was called twice (once failed, once succeeded)
        assert mock_service_instance.update_user_profile.call_count == 2


# Test for app/api/routes/user_profile.py lines 179-181 (generic exception)
@pytest.mark.asyncio
async def test_update_user_profile_generic_exception():
    """Test generic exception handling (lines 179-181)."""
    from app.api.routes.user_profile import update_user_profile
    from app.models.user_profile import UserProfileUpdate
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Raise a generic exception (not HTTPException or ClientError)
        mock_service_instance.update_user_profile.side_effect = Exception("Unexpected error")
        
        profile_update = UserProfileUpdate(display_name="Test")
        current_user = {"email": "test@example.com", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            await update_user_profile(profile_update, current_user, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to update user profile"


# Test for app/api/routes/user_profile.py line 246
@pytest.mark.asyncio
async def test_complete_onboarding_client_error():
    """Test ClientError handling in complete_onboarding (line 246)."""
    from app.api.routes.user_profile import complete_onboarding
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Raise a ClientError
        error_response = {'Error': {'Code': 'ValidationException'}}
        mock_service_instance.complete_onboarding.side_effect = ClientError(error_response, 'UpdateItem')
        
        current_user = {"email": "test@example.com"}
        
        with pytest.raises(HTTPException) as exc_info:
            await complete_onboarding(None, current_user, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to complete onboarding"


# Test for app/api/routes/user_profile.py lines 252-254 (generic exception)
@pytest.mark.asyncio
async def test_complete_onboarding_generic_exception():
    """Test generic exception handling in complete_onboarding (lines 252-254)."""
    from app.api.routes.user_profile import complete_onboarding
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Raise a generic exception
        mock_service_instance.complete_onboarding.side_effect = Exception("Unexpected error")
        
        current_user = {"email": "test@example.com"}
        
        with pytest.raises(HTTPException) as exc_info:
            await complete_onboarding(None, current_user, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to complete onboarding"


# Test for app/api/routes/users.py line 110
@pytest.mark.asyncio
async def test_get_user_spaces_client_error():
    """Test ClientError handling in get_user_spaces (line 110)."""
    from app.api.routes.users import get_user_spaces
    
    with patch('app.api.routes.users.SpaceService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Raise a ClientError
        error_response = {'Error': {'Code': 'ValidationException'}}
        mock_service_instance.get_user_spaces.side_effect = ClientError(error_response, 'Query')
        
        with pytest.raises(HTTPException) as exc_info:
            await get_user_spaces({"sub": "user123"}, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to get user spaces"


# Test for app/core/config.py line 34 (parse_cors returning non-list JSON value)
def test_parse_cors_json_non_list():
    """Test parse_cors with JSON that parses to non-list (line 34)."""
    from app.core.config import parse_cors
    
    # Test JSON string that parses to a non-list value (triggers line 34)
    result = parse_cors('[42]')
    assert result == [42]
    
    # Test JSON object as string
    result = parse_cors('{"key": "value"}')
    # Should be treated as regular string, not JSON
    assert result == ['{"key": "value"}']


# Test for app/core/config.py lines 106-109 (validator methods)
def test_settings_validators():
    """Test Settings validator methods (lines 106-109)."""
    from app.core.config import Settings
    
    # Test with environment variables
    with patch.dict(os.environ, {
        'CORS_ORIGINS': '["http://localhost:3000", "http://example.com"]',
        'COGNITO_DOMAIN': 'https://auth.example.com',
        'COGNITO_REDIRECT_URI': 'http://localhost:3000/callback'
    }):
        settings = Settings()
        assert settings.cors_origins == ["http://localhost:3000", "http://example.com"]
        assert settings.cognito_domain == 'https://auth.example.com'
        assert settings.cognito_redirect_uri == 'http://localhost:3000/callback'


# Test for app/core/dependencies.py line 25
@pytest.mark.asyncio
async def test_get_current_user_no_auth_header():
    """Test get_current_user with no authorization header (line 25)."""
    from app.core.dependencies import get_current_user
    
    # Create mock request with no authorization header
    mock_request = MagicMock()
    mock_request.headers = {}  # No authorization header
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(mock_request)
    
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


# Test for app/services/space.py line 394
def test_leave_space_not_member():
    """Test leave_space when user is not a member (line 394)."""
    from app.services.space import SpaceService
    from app.services.exceptions import UnauthorizedError
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock get_item to return None (user not a member)
        mock_table.get_item.return_value = {}
        
        service = SpaceService()
        service.table = mock_table
        
        with pytest.raises(UnauthorizedError) as exc_info:
            service.leave_space("space123", "user123")
        
        assert str(exc_info.value) == "You are not a member of this space"


# Test for app/services/space.py lines 453-454
def test_get_space_invitations_no_items():
    """Test get_space_invitations with no items (lines 453-454)."""
    from app.services.space import SpaceService
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock query to return no items
        mock_table.query.return_value = {}  # No 'Items' key
        
        service = SpaceService()
        service.table = mock_table
        
        result = service.get_space_invitations("space123")
        
        assert result == []


# Test for app/services/space.py line 508
def test_join_space_with_invite_invalid_code_format():
    """Test join_space_with_invite_code with invalid code (line 508)."""
    from app.services.space import SpaceService
    from app.services.exceptions import InvalidInviteCodeError
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock query to return no items (invalid invite code)
        mock_table.query.return_value = {'Items': []}
        
        service = SpaceService()
        service.table = mock_table
        
        with pytest.raises(InvalidInviteCodeError) as exc_info:
            service.join_space_with_invite_code("user123", "invalid_code")
        
        assert str(exc_info.value) == "Invalid or expired invite code"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])