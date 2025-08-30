"""
Final tests to achieve 100% code coverage - targeting specific missing lines.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from botocore.exceptions import ClientError
import os

# Test app/main.py lines 16-21 (lifespan function)
@pytest.mark.asyncio
async def test_main_lifespan():
    """Test the lifespan context manager prints."""
    from app.main import lifespan
    import io
    import sys
    
    # Mock the app
    app = Mock()
    
    # Capture stdout
    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()
    
    try:
        # Use the async context manager
        async with lifespan(app):
            startup_output = buffer.getvalue()
            # Check that startup print statements were executed
            assert "Starting Lifestyle Spaces API" in startup_output
            assert "Environment:" in startup_output
            assert "DynamoDB Table:" in startup_output
        
        # After exiting the context, shutdown should have been called
        final_output = buffer.getvalue()
        assert "Shutting down Lifestyle Spaces API" in final_output
        
    finally:
        sys.stdout = old_stdout


# Test app/services/space.py remaining lines
class TestSpaceServiceCoverage:
    """Cover remaining SpaceService lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 71-72 - ResourceInUseException handling in _create_table."""
        from app.services.space import SpaceService
        
        # Mock boto3.resource to control the dynamodb resource
        with patch('app.services.space.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First attempt to create table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table after the exception
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            # Initialize service - this will trigger _get_or_create_table
            service = SpaceService()
            
            # Verify that Table was called with the table name
            mock_dynamodb.Table.assert_called_with(service.table_name)
    
    def test_ensure_table_exists_true(self):
        """Test line 79 - Table exists returns True."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.load.return_value = None  # Success
            
            result = service._ensure_table_exists()
            assert result == True
    
    def test_create_space_empty_name(self):
        """Test empty name validation at service level."""
        from app.services.space import SpaceService
        from app.services.exceptions import ValidationError
        from pydantic import ValidationError as PydanticValidationError
        
        service = SpaceService()
        
        # Test validation at model level - empty string
        from app.models.space import SpaceCreate
        with pytest.raises(PydanticValidationError) as exc:
            SpaceCreate(name="", description="Test")
        assert "String should have at least 1 character" in str(exc.value)
        
        # Test validation at service level - whitespace only
        space = SpaceCreate(name="   ", description="Test")  # This passes min_length but validator strips it
        with pytest.raises(ValidationError) as exc:
            service.create_space(space, "owner123")
        assert "Space name is required" in str(exc.value)
    
    def test_get_space_client_error(self):
        """Test ClientError in get_space."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'SomeError'}}, 
                'GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError):
                service.get_space("space123", "user123")
    
    def test_update_space_empty_name(self):
        """Test empty name validation in update."""
        from app.services.space import SpaceService, SpaceUpdate
        from app.services.exceptions import ValidationError
        
        service = SpaceService()
        
        with patch.object(service, 'get_space') as mock_get, \
             patch.object(service, 'can_edit_space') as mock_can:
            
            mock_get.return_value = {'id': 'space123', 'name': 'Old Name'}
            mock_can.return_value = True
            
            update = SpaceUpdate(name="  ")  # Whitespace only
            
            with pytest.raises(ValidationError) as exc:
                service.update_space("space123", update, "user123")
            assert "Space name is required" in str(exc.value)
    
    def test_list_user_spaces_skip_error(self):
        """Test skipping spaces that raise errors during retrieval."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service.table, 'query') as mock_query:
            # User has 2 space memberships
            mock_query.return_value = {
                'Items': [
                    {'PK': 'USER#user123', 'SK': 'SPACE#space1', 'space_id': 'space1', 'role': 'owner'},
                    {'PK': 'USER#user123', 'SK': 'SPACE#space2', 'space_id': 'space2', 'role': 'member'}
                ]
            }
            
            # Mock get_space to succeed for first, raise exception for second
            with patch.object(service, 'get_space') as mock_get:
                mock_get.side_effect = [
                    {'id': 'space1', 'name': 'Space 1', 'updated_at': '2024-01-01T00:00:00Z'},
                    SpaceNotFoundError("Space not found")
                ]
                
                result = service.list_user_spaces("user123")
                assert len(result['spaces']) == 1
                assert result['spaces'][0]['id'] == 'space1'
    
    def test_get_user_role_client_error(self):
        """Test ClientError in get_user_role."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'SomeError'}}, 
                'GetItem'
            )
            
            result = service.get_user_role("space123", "user123")
            assert result is None


# Test app/services/invitation.py remaining lines
class TestInvitationServiceCoverage:
    """Cover remaining InvitationService lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 80-81 - ResourceInUseException handling in _create_table."""
        from app.services.invitation import InvitationService
        
        # Mock boto3.resource to control the dynamodb resource
        with patch('app.services.invitation.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First attempt to create table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table after the exception
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            # Initialize service - this will trigger _get_or_create_table
            service = InvitationService()
            
            # Verify that Table was called with the table name
            mock_dynamodb.Table.assert_called_with(service.table_name)
    
    def test_validate_invitation_code_not_found(self):
        """Test code not found scenario."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Mock the private method that fetches invitation by code
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = None
            
            result = service.validate_invite_code("INVALID")
            assert result == False
    
    def test_validate_invitation_code_not_pending(self):
        """Test not pending status scenario."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Mock the private method to return an accepted invitation
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'accepted',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_expired(self):
        """Test expired invitation scenario."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Mock the private method to return an expired invitation
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_valid(self):
        """Test valid invitation returns True."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Mock the private method to return a valid pending invitation
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == True


# Test app/core/config.py remaining lines
class TestConfigCoverage:
    """Cover remaining config lines."""
    
    def test_config_cors_allowed_origins(self):
        """Test CORS origins parsing."""
        # Set environment variable
        os.environ['CORS_ORIGINS'] = 'http://localhost:3000,https://example.com'
        
        # Create new settings instance with the env var
        from app.core.config import Settings
        settings = Settings()
        
        assert 'http://localhost:3000' in settings.cors_origins
        assert 'https://example.com' in settings.cors_origins
        
        # Clean up
        del os.environ['CORS_ORIGINS']
    
    def test_config_model_validate(self):
        """Test line 109 - model_validate method."""
        from app.core.config import Settings
        
        # Test model_validate exists and works
        config_dict = {
            'environment': 'test',
            'dynamodb_table': 'test-table',
            'aws_region': 'us-east-1'
        }
        
        settings = Settings.model_validate(config_dict)
        assert settings.environment == 'test'
        assert settings.dynamodb_table == 'test-table'


# Test app/models/common.py remaining lines
class TestCommonModelsCoverage:
    """Cover remaining common model lines."""
    
    def test_pagination_params_defaults(self):
        """Test lines 29, 36 - Default values."""
        from app.models.common import PaginationParams
        
        # Test with no parameters (uses defaults)
        params = PaginationParams()
        assert params.page == 1  # Line 29
        assert params.page_size == 20  # Line 36


# Test app/models/user.py remaining line
class TestUserModelCoverage:
    """Cover remaining user model line."""
    
    def test_user_response_defaults(self):
        """Test default values in UserResponse."""
        from app.models.user import UserResponse
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        
        # Create with required fields
        user = UserResponse(
            id="user123",
            email="test@test.com",
            username="testuser",
            created_at=now,
            updated_at=now
        )
        
        # Check defaults
        assert user.is_active == True  # Default value
        assert user.full_name is None  # Optional field