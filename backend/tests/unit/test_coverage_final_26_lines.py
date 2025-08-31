"""
Final tests to reach 100% coverage - targeting the exact 26 missing lines.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta
from botocore.exceptions import ClientError
import asyncio
import os
import sys


def test_lifespan_context_manager():
    """Test app/main.py lines 16-21 - lifespan function."""
    from app.main import lifespan
    from app.core.config import settings
    
    # Mock the logger instead of capturing stdout
    with patch('app.main.logger') as mock_logger:
        # Create async function to test the lifespan
        async def run_lifespan():
            app = Mock()
            async with lifespan(app):
                pass
        
        # Run the async function
        asyncio.run(run_lifespan())
        
        # Verify logger.info was called with expected messages
        calls = [str(call) for call in mock_logger.info.call_args_list]
        
        # Check that the expected log messages were called
        mock_logger.info.assert_any_call(f"Starting Lifestyle Spaces API v{__import__('app').__version__}")
        mock_logger.info.assert_any_call(f"Environment: {settings.environment}")
        mock_logger.info.assert_any_call(f"DynamoDB Table: {settings.dynamodb_table}")
        mock_logger.info.assert_any_call("Shutting down Lifestyle Spaces API")


def test_config_cors_allowed_origins():
    """Test app/core/config.py CORS origins parsing."""
    # Save original value
    original = os.environ.get('CORS_ORIGINS')
    
    try:
        # Set environment variable
        os.environ['CORS_ORIGINS'] = 'http://localhost:3000,https://example.com'
        
        # Create new settings instance
        from app.core.config import Settings
        settings = Settings()
        
        assert 'http://localhost:3000' in settings.cors_origins
        assert 'https://example.com' in settings.cors_origins
        
    finally:
        # Restore original
        if original:
            os.environ['CORS_ORIGINS'] = original
        else:
            os.environ.pop('CORS_ORIGINS', None)


def test_config_model_validate():
    """Test app/core/config.py line 109 - model_validate."""
    from app.core.config import Settings
    
    # Create settings from dict
    data = {
        'environment': 'testing',
        'dynamodb_table': 'test-table',
        'aws_region': 'us-west-2'
    }
    
    settings = Settings.model_validate(data)
    assert settings.environment == 'testing'
    assert settings.dynamodb_table == 'test-table'


def test_pagination_params_defaults():
    """Test app/models/common.py lines 29, 36 - default values."""
    from app.models.common import PaginationParams
    
    # Create with defaults
    params = PaginationParams()
    assert params.page == 1  # Line 29
    assert params.page_size == 20  # Line 36


def test_user_response_default_username():
    """Test UserResponse model creation."""
    from app.models.user import UserResponse
    from datetime import datetime, timezone
    
    now = datetime.now(timezone.utc)
    
    # Create with all required fields
    user = UserResponse(
        id="user123",
        email="test@example.com",
        username="testuser",
        created_at=now,
        updated_at=now
    )
    assert user.is_active == True  # Default value
    assert user.full_name is None  # Optional field


class TestSpaceServiceMissingLines:
    """Test app/services/space.py missing lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 71-72 - ResourceInUseException handling."""
        from app.services.space import SpaceService
        
        # Mock boto3.resource
        with patch('app.services.space.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First create_table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            service = SpaceService()
            
            # Verify Table was called after ResourceInUseException
            mock_dynamodb.Table.assert_called_with(service.table_name)
    
    def test_create_space_empty_name_validation(self):
        """Test empty name validation error."""
        from app.services.space import SpaceService, SpaceCreate
        from pydantic import ValidationError as PydanticValidationError
        
        service = SpaceService()
        
        # The validator catches whitespace-only names at the Pydantic level
        with pytest.raises(PydanticValidationError) as exc:
            space = SpaceCreate(name="   ", description="Test")
        assert "Space name is required" in str(exc.value)
    
    def test_get_space_client_error(self):
        """Test ClientError in get_space."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            # Any ClientError (not just ResourceNotFoundException)
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'InternalError'}}, 
                'GetItem'
            )
            
            # ClientError should propagate as-is
            with pytest.raises(ClientError):
                service.get_space("space123", "user123")
    
    def test_update_space_empty_name(self):
        """Test empty name in update."""
        from app.services.space import SpaceService
        from app.models.space import SpaceUpdate
        from pydantic import ValidationError
        
        service = SpaceService()
        
        # Expect Pydantic to validate at model creation
        with pytest.raises(ValidationError) as exc:
            # Update with whitespace-only name
            update = SpaceUpdate(name="   ")
        
        assert "Space name cannot be empty" in str(exc.value)
    
    def test_list_user_spaces_handle_errors(self):
        """Test handling SpaceNotFoundError and ClientError."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service.table, 'query') as mock_query:
            # User has 3 space memberships - need GSI1 keys
            mock_query.return_value = {
                'Items': [
                    {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space1', 'space_id': 'space1', 'role': 'owner'},
                    {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space2', 'space_id': 'space2', 'role': 'member'},
                    {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space3', 'space_id': 'space3', 'role': 'member'}
                ]
            }
            
            with patch.object(service.table, 'get_item') as mock_get_item:
                # First space exists, second doesn't, third errors
                mock_get_item.side_effect = [
                    {'Item': {'id': 'space1', 'name': 'Space 1', 'updated_at': '2024-01-01T00:00:00Z', 'owner_id': 'user123', 'created_at': '2024-01-01T00:00:00Z'}},
                    {'ResponseMetadata': {}},  # No 'Item' key - space not found
                    ClientError({'Error': {'Code': 'InternalError'}}, 'GetItem')
                ]
                
                # Also mock the member count queries
                mock_query.side_effect = [
                    # Initial query for user's spaces
                    {
                        'Items': [
                            {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space1', 'space_id': 'space1', 'role': 'owner'},
                            {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space2', 'space_id': 'space2', 'role': 'member'},
                            {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space3', 'space_id': 'space3', 'role': 'member'}
                        ]
                    },
                    # Member count query for space1
                    {'Items': [{'PK': 'SPACE#space1', 'SK': 'MEMBER#user123'}]}
                ]
                
                result = service.list_user_spaces("user123")
                
                # Should only return the first space
                assert len(result['spaces']) == 1
                assert result['spaces'][0]['id'] == 'space1'
    
    def test_get_user_role_client_error(self):
        """Test ClientError returns None."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            # Any ClientError should return None
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'InternalError'}}, 
                'GetItem'
            )
            
            result = service.get_space_member_role("space123", "user123")
            assert result is None


class TestInvitationServiceMissingLines:
    """Test app/services/invitation.py missing lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 80-81 - ResourceInUseException handling."""
        from app.services.invitation import InvitationService
        
        # Mock boto3.resource
        with patch('app.services.invitation.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First create_table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            service = InvitationService()
            
            # Verify Table was called after ResourceInUseException
            mock_dynamodb.Table.assert_called_with(service.table_name)
    
    def test_validate_invitation_code_scenarios(self):
        """Test all validation scenarios."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Test 1: Code not found
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = None
            assert service.validate_invite_code("INVALID") == False
        
        # Test 2: Not pending status
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'accepted',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            assert service.validate_invite_code("CODE") == False
        
        # Test 3: Expired
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            }
            assert service.validate_invite_code("CODE") == False
        
        # Test 4: Valid (returns True)
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            assert service.validate_invite_code("CODE") == True