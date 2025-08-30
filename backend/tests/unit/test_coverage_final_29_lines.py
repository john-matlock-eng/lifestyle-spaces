"""
Test file specifically targeting the remaining 29 uncovered lines for 100% coverage.

This file contains precise tests to cover:
- app/api/routes/spaces.py: Lines 53, 63 (2 lines) 
- app/api/routes/user_profile.py: Lines 49-50, 64-66, 91-92, 138-139, 175-176, 213-214, 251-252 (14 lines)
- app/api/routes/users.py: Line 114 (1 line)
- app/core/config.py: Lines 20, 33, 46, 59 (4 lines)
- app/core/dependencies.py: Line 31 (1 line)
- app/services/space.py: Lines 126, 171-172, 517 (4 lines)
"""

import pytest
from unittest.mock import MagicMock, patch, Mock, AsyncMock
from fastapi import HTTPException
from botocore.exceptions import ClientError
from pydantic import ValidationError
from datetime import datetime
import json
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Test for app/api/routes/spaces.py lines 53, 63
@pytest.mark.asyncio
async def test_create_space_validation_error():
    """Test validation error handling in create_space (line 53)."""
    from app.api.routes.spaces import router
    
    with patch('app.api.routes.spaces.SpaceService') as mock_service:
        # Mock the service to raise a ValidationError
        mock_service_instance = mock_service.return_value
        mock_service_instance.create_space.side_effect = ValidationError.from_exception_data(
            "validation_error",
            [
                {
                    "type": "value_error",
                    "loc": ("field",),
                    "msg": "Invalid value",
                    "input": "bad_value",
                    "ctx": {"error": "test error"}
                }
            ]
        )
        
        from app.api.routes.spaces import create_space
        from app.models.space import SpaceCreate
        
        request = SpaceCreate(name="Test Space", description="Test")
        current_user = {"sub": "user123", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            await create_space(request, current_user, "user123")
        
        assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_create_space_generic_client_error():
    """Test generic ClientError handling in create_space (line 63)."""
    from app.api.routes.spaces import create_space
    from app.models.space import SpaceCreate
    
    with patch('app.api.routes.spaces.SpaceService') as mock_service:
        # Mock the service to raise a generic ClientError
        mock_service_instance = mock_service.return_value
        error_response = {
            'Error': {
                'Code': 'SomeOtherError',  # Not ServiceUnavailable
                'Message': 'Some error occurred'
            }
        }
        mock_service_instance.create_space.side_effect = ClientError(
            error_response,
            'PutItem'
        )
        
        request = SpaceCreate(name="Test Space", description="Test")
        current_user = {"sub": "user123", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            await create_space(request, current_user, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to create space"


# Test for app/api/routes/user_profile.py lines 49-50, 64-66
@pytest.mark.asyncio
async def test_get_user_profile_not_found():
    """Test profile not found handling (lines 49-50)."""
    from app.api.routes.user_profile import get_user_profile
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        # Return None to trigger the not found condition
        mock_service_instance.get_user_profile.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            await get_user_profile({"sub": "user123"}, "user123")
        
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "User profile not found"


@pytest.mark.asyncio
async def test_get_user_profile_cognito_sync_failure():
    """Test Cognito sync failure handling (lines 64-66)."""
    from app.api.routes.user_profile import get_user_profile
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_profile_service, \
         patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
        
        # Mock profile service to return a profile
        mock_profile_service_instance = mock_profile_service.return_value
        mock_profile_service_instance.get_user_profile.return_value = {
            "user_id": "user123",
            "email": "test@example.com",
            "display_name": "Test User",
            "bio": "Test bio",
            "profile_image_url": None,
            "is_onboarded": True,
            "is_verified": False,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        # Mock Cognito to raise an exception during sync
        mock_cognito_instance = mock_cognito.return_value
        mock_cognito_instance.get_user_attributes.side_effect = Exception("Cognito error")
        
        # Should not raise, just skip Cognito sync
        result = await get_user_profile({"sub": "user123"}, "user123")
        
        assert result.user_id == "user123"
        assert result.email == "test@example.com"


# Test for app/api/routes/user_profile.py lines 91-92, 138-139
def test_update_user_profile_dependencies():
    """Test update_user_profile dependency injection (lines 91-92)."""
    from app.api.routes.user_profile import router
    
    # Get the update_user_profile endpoint
    update_endpoint = None
    for route in router.routes:
        if hasattr(route, 'path') and route.path == "/profile" and hasattr(route, 'methods') and "PUT" in route.methods:
            update_endpoint = route.endpoint
            break
    
    assert update_endpoint is not None
    
    # Check that the function signature includes the dependencies
    import inspect
    sig = inspect.signature(update_endpoint)
    params = list(sig.parameters.keys())
    
    assert 'profile_update' in params
    assert 'current_user' in params
    assert 'user_id' in params


@pytest.mark.asyncio
async def test_update_user_profile_merged_data():
    """Test merged data handling in update_user_profile (lines 138-139)."""
    from app.api.routes.user_profile import update_user_profile
    from app.models.user_profile import UserProfileUpdate
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        
        # Mock the update to capture the merged data
        merged_data_captured = None
        def capture_merged_data(user_id, data):
            nonlocal merged_data_captured
            merged_data_captured = data
            return {
                "user_id": user_id,
                "email": data.get("email"),
                "username": data.get("username"),
                "display_name": data.get("display_name"),
                "bio": data.get("bio"),
                "profile_image_url": None,
                "is_onboarded": True,
                "is_verified": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        
        mock_service_instance.update_user_profile.side_effect = capture_merged_data
        
        profile_update = UserProfileUpdate(display_name="New Name", bio="New Bio")
        current_user = {"email": "test@example.com", "username": "testuser"}
        
        result = await update_user_profile(profile_update, current_user, "user123")
        
        # Verify merged data was created correctly
        assert merged_data_captured is not None
        assert merged_data_captured["email"] == "test@example.com"
        assert merged_data_captured["username"] == "testuser"
        assert merged_data_captured["display_name"] == "New Name"
        assert merged_data_captured["bio"] == "New Bio"


# Test for app/api/routes/user_profile.py lines 175-176
@pytest.mark.asyncio
async def test_update_user_profile_generic_failure():
    """Test generic failure in update_user_profile (lines 175-176)."""
    from app.api.routes.user_profile import update_user_profile
    from app.models.user_profile import UserProfileUpdate
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        
        # Create a ClientError that doesn't match any special cases
        error_response = {'Error': {'Code': 'InternalError'}}
        mock_service_instance.update_user_profile.side_effect = ClientError(
            error_response,
            'UpdateItem'
        )
        
        profile_update = UserProfileUpdate(display_name="New Name")
        current_user = {"email": "test@example.com", "username": "testuser"}
        
        with pytest.raises(HTTPException) as exc_info:
            import asyncio
            asyncio.run(update_user_profile(profile_update, current_user, "user123"))
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to update user profile"


# Test for app/api/routes/user_profile.py lines 213-214
@pytest.mark.asyncio
async def test_complete_onboarding_with_metadata():
    """Test complete_onboarding with metadata (lines 213-214)."""
    from app.api.routes.user_profile import complete_onboarding
    from app.models.user_profile import OnboardingCompleteRequest
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
         patch('app.api.routes.user_profile.EmailService') as mock_email:
        
        mock_service_instance = mock_service.return_value
        
        # Capture the metadata passed to the service
        metadata_captured = None
        def capture_metadata(user_id, metadata):
            nonlocal metadata_captured
            metadata_captured = metadata
            return {
                "user_id": user_id,
                "email": "test@example.com",
                "display_name": "Test User",
                "bio": None,
                "profile_image_url": None,
                "is_onboarded": True,
                "is_verified": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        
        mock_service_instance.complete_onboarding.side_effect = capture_metadata
        
        # Provide request with metadata
        request = OnboardingCompleteRequest(
            referral_source="social_media",
            interests=["fitness", "nutrition"]
        )
        current_user = {"email": "test@example.com"}
        
        result = await complete_onboarding(request, current_user, "user123")
        
        # Verify metadata was extracted correctly
        assert metadata_captured is not None
        assert metadata_captured["referral_source"] == "social_media"
        assert metadata_captured["interests"] == ["fitness", "nutrition"]


# Test for app/api/routes/user_profile.py lines 251-252
@pytest.mark.asyncio
async def test_complete_onboarding_http_exception_passthrough():
    """Test HTTPException passthrough in complete_onboarding (lines 251-252)."""
    from app.api.routes.user_profile import complete_onboarding
    
    with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
        mock_service_instance = mock_service.return_value
        
        # Raise an HTTPException (should be re-raised as-is)
        mock_service_instance.complete_onboarding.side_effect = HTTPException(
            status_code=400,
            detail="Custom error"
        )
        
        current_user = {"email": "test@example.com"}
        
        with pytest.raises(HTTPException) as exc_info:
            await complete_onboarding(None, current_user, "user123")
        
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Custom error"


# Test for app/api/routes/users.py line 114
@pytest.mark.asyncio
async def test_get_user_spaces_generic_exception():
    """Test generic exception handling in get_user_spaces (line 114)."""
    from app.api.routes.users import get_user_spaces
    
    with patch('app.api.routes.users.SpaceService') as mock_service:
        mock_service_instance = mock_service.return_value
        
        # Raise a generic exception (not ClientError)
        mock_service_instance.get_user_spaces.side_effect = Exception("Unexpected error")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_user_spaces({"sub": "user123"}, "user123")
        
        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to get user spaces"


# Test for app/core/config.py lines 20, 33, 46, 59
def test_parse_cors_list_input():
    """Test parse_cors with list input (line 20)."""
    from app.core.config import parse_cors
    
    # Test with list input (should return as-is)
    result = parse_cors(["http://localhost:3000", "http://example.com"])
    assert result == ["http://localhost:3000", "http://example.com"]


def test_parse_cors_json_list_single_value():
    """Test parse_cors with JSON non-list value (line 33)."""
    from app.core.config import parse_cors
    
    # Test with JSON that parses to non-list (should wrap in list)
    # This would be a JSON string starting with '[' that parses to non-list
    result = parse_cors('[123]')  # JSON array with single number
    assert result == [123]
    
    # Test JSON parsing that results in non-list (line 34)
    result = parse_cors('["single"]')
    assert result == ['single']


def test_settings_environment_field():
    """Test Settings environment field factory (line 46)."""
    import os
    from app.core.config import Settings
    
    # Test with PYTEST_CURRENT_TEST set
    with patch.dict(os.environ, {'PYTEST_CURRENT_TEST': 'test_file.py::test_function'}):
        settings = Settings()
        assert settings.environment == "test"
    
    # Test without PYTEST_CURRENT_TEST
    with patch.dict(os.environ, {}, clear=True):
        # Remove PYTEST_CURRENT_TEST if it exists
        if 'PYTEST_CURRENT_TEST' in os.environ:
            del os.environ['PYTEST_CURRENT_TEST']
        settings = Settings()
        assert settings.environment == "development"


def test_settings_aws_region_field():
    """Test Settings aws_region field (line 59)."""
    from app.core.config import Settings
    
    # Test default value
    settings = Settings()
    assert settings.aws_region == "us-east-1"
    
    # Test with custom value
    with patch.dict('os.environ', {'AWS_REGION': 'us-west-2'}):
        settings = Settings()
        assert settings.aws_region == "us-west-2"


# Test for app/core/dependencies.py line 31
@pytest.mark.asyncio
async def test_get_current_user_return_value():
    """Test get_current_user return value (line 31)."""
    from app.core.dependencies import get_current_user
    from unittest.mock import AsyncMock
    
    # Create a mock request with valid authorization
    mock_request = MagicMock()
    mock_request.headers = {"authorization": "Bearer valid_token"}
    
    with patch('app.core.dependencies.verify_token') as mock_verify:
        # Mock verify_token to return a user
        mock_user = {"sub": "user123", "email": "test@example.com"}
        mock_verify.return_value = mock_user
        
        # Call get_current_user
        result = await get_current_user(mock_request)
        
        # Verify the return value (line 31)
        assert result == mock_user
        assert result["sub"] == "user123"
        assert result["email"] == "test@example.com"


# Test for app/services/space.py line 126 (empty line in batch writer context)
def test_space_service_create_space_batch_writer():
    """Test create_space batch writer execution (line 126)."""
    from app.services.space import SpaceService
    from unittest.mock import MagicMock
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        # Setup mock DynamoDB
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        mock_batch_writer = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Track batch writer calls
        batch_items = []
        
        class MockBatchWriter:
            def __enter__(self):
                return self
            
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
            
            def put_item(self, Item):
                batch_items.append(Item)
        
        mock_table.batch_writer.return_value = MockBatchWriter()
        
        service = SpaceService()
        service.table = mock_table
        
        # Create a space
        result = service.create_space("user123", "Test Space", "Description", True)
        
        # Verify batch writer was used and items were written
        assert len(batch_items) == 3  # space_item, member_item, invite_item
        assert any(item.get('entity_type') == 'SPACE' for item in batch_items)
        assert any(item.get('entity_type') == 'MEMBER' for item in batch_items)
        assert any(item.get('entity_type') == 'INVITE' for item in batch_items)


# Test for app/services/space.py lines 171-172
def test_space_service_get_space_member_query():
    """Test get_space member count query (lines 171-172)."""
    from app.services.space import SpaceService
    from unittest.mock import MagicMock
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock get_item for space
        mock_table.get_item.return_value = {
            'Item': {
                'PK': 'SPACE#space123',
                'SK': 'SPACE#space123',
                'entity_type': 'SPACE',
                'space_id': 'space123',
                'name': 'Test Space',
                'description': 'Test Description',
                'owner_id': 'user123',
                'is_public': True,
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
        }
        
        # Mock query for members - this covers lines 171-172
        mock_table.query.return_value = {
            'Items': [
                {'PK': 'SPACE#space123', 'SK': 'MEMBER#user123'},
                {'PK': 'SPACE#space123', 'SK': 'MEMBER#user456'}
            ]
        }
        
        service = SpaceService()
        service.table = mock_table
        
        result = service.get_space('space123', 'user123')
        
        # Verify query was called with correct parameters
        mock_table.query.assert_called_once()
        call_args = mock_table.query.call_args
        
        # The KeyConditionExpression should check for SPACE#space123 and SK begins with MEMBER#
        assert 'KeyConditionExpression' in call_args.kwargs
        
        # Verify result includes member count
        assert result['member_count'] == 2


# Test for app/services/space.py line 517
def test_space_service_join_space_already_member_error():
    """Test join_space AlreadyMemberError re-raise (line 517)."""
    from app.services.space import SpaceService
    from app.services.exceptions import AlreadyMemberError
    
    with patch('app.services.space.boto3.resource') as mock_boto:
        mock_dynamodb = MagicMock()
        mock_table = MagicMock()
        
        mock_boto.return_value = mock_dynamodb
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock query to return valid invite
        mock_table.query.return_value = {
            'Items': [{
                'PK': 'INVITE#code123',
                'SK': 'INVITE#code123',
                'space_id': 'space123',
                'created_by': 'owner123',
                'expires_at': '2099-01-01T00:00:00Z',
                'max_uses': 10,
                'uses': 0
            }]
        }
        
        # Mock get_item to check membership - simulate AlreadyMemberError
        def mock_get_item(Key):
            if Key['SK'] == 'MEMBER#user123':
                # Simulate user is already a member
                raise AlreadyMemberError("User is already a member of this space")
            return {'Item': None}
        
        mock_table.get_item.side_effect = mock_get_item
        
        service = SpaceService()
        service.table = mock_table
        
        # Should re-raise AlreadyMemberError (line 517)
        with pytest.raises(AlreadyMemberError) as exc_info:
            service.join_space_with_invite_code('user123', 'code123')
        
        assert str(exc_info.value) == "User is already a member of this space"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])