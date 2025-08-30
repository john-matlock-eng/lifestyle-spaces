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
    
    # Capture print output
    import io
    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()
    
    try:
        # Create async function to test the lifespan
        async def run_lifespan():
            app = Mock()
            async with lifespan(app):
                pass
        
        # Run the async function
        asyncio.run(run_lifespan())
        
        # Get output
        output = buffer.getvalue()
        
        # Verify print statements were executed
        assert "Starting Lifestyle Spaces API" in output
        assert f"Environment: {settings.environment}" in output
        assert f"DynamoDB Table: {settings.dynamodb_table}" in output
        assert "Shutting down Lifestyle Spaces API" in output
        
    finally:
        sys.stdout = old_stdout


def test_config_cors_allowed_origins():
    """Test app/core/config.py line 34 - CORS_ALLOWED_ORIGINS parsing."""
    # Save original value
    original = os.environ.get('CORS_ALLOWED_ORIGINS')
    
    try:
        # Set environment variable
        os.environ['CORS_ALLOWED_ORIGINS'] = 'http://localhost:3000,https://example.com'
        
        # Force reimport
        import importlib
        import app.core.config
        importlib.reload(app.core.config)
        
        from app.core.config import settings
        assert 'http://localhost:3000' in settings.cors_allowed_origins
        assert 'https://example.com' in settings.cors_allowed_origins
        
    finally:
        # Restore original
        if original:
            os.environ['CORS_ALLOWED_ORIGINS'] = original
        else:
            os.environ.pop('CORS_ALLOWED_ORIGINS', None)
        
        # Reload with original settings
        import app.core.config
        importlib.reload(app.core.config)


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
    """Test app/models/user.py line 24 - default username."""
    from app.models.user import UserResponse
    
    # Create without username
    user = UserResponse(
        id="user123",
        email="test@example.com"
    )
    assert user.username == ""  # Line 24


class TestSpaceServiceMissingLines:
    """Test app/services/space.py missing lines."""
    
    @patch('app.services.space.boto3')
    def test_get_table_resource_in_use(self, mock_boto3):
        """Test line 73 - ResourceInUseException handling."""
        from app.services.space import SpaceService
        
        # Setup mock
        mock_resource = Mock()
        mock_table = Mock()
        mock_boto3.resource.return_value = mock_resource
        
        # First call raises ResourceInUseException, second succeeds
        mock_resource.Table.side_effect = [
            ClientError({'Error': {'Code': 'ResourceInUseException'}}, 'DescribeTable'),
            mock_table
        ]
        
        service = SpaceService()
        
        # The table should be the second call result
        assert service.table == mock_table
    
    def test_create_space_empty_name_validation(self):
        """Test line 92 - Empty name validation error."""
        from app.services.space import SpaceService
        from app.services.exceptions import ValidationError
        from app.models.space import SpaceCreate
        
        service = SpaceService()
        
        # Mock table
        with patch.object(service, 'table'):
            # Use valid model but override name in the method
            space = Mock()
            space.name = ""  # Empty name
            space.description = "Test"
            
            with pytest.raises(ValidationError) as exc:
                service.create_space(space, "owner123")
            assert "Space name cannot be empty" in str(exc.value)
    
    def test_get_space_client_error(self):
        """Test line 207 - ClientError in get_space."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            # Any ClientError (not just ResourceNotFoundException)
            mock_table.get_item.side_effect = ClientError(
                {'Error': {'Code': 'InternalError'}}, 
                'GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError):
                service.get_space("space123", "user123")
    
    def test_update_space_empty_name(self):
        """Test line 215 - Empty name in update."""
        from app.services.space import SpaceService
        from app.models.space import SpaceUpdate
        from app.services.exceptions import ValidationError
        
        service = SpaceService()
        
        with patch.object(service, 'get_space') as mock_get, \
             patch.object(service, 'can_edit_space') as mock_can:
            
            mock_get.return_value = {'id': 'space123', 'name': 'Old'}
            mock_can.return_value = True
            
            # Update with whitespace-only name
            update = SpaceUpdate(name="   ")
            
            with pytest.raises(ValidationError) as exc:
                service.update_space("space123", update, "user123")
            assert "Space name cannot be empty" in str(exc.value)
    
    def test_list_user_spaces_handle_errors(self):
        """Test lines 334-335 - Handle SpaceNotFoundError and ClientError."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table, \
             patch.object(service, 'get_space') as mock_get:
            
            # User has 3 spaces
            mock_table.query.return_value = {
                'Items': [
                    {'space_id': 'space1', 'role': 'owner'},
                    {'space_id': 'space2', 'role': 'member'},
                    {'space_id': 'space3', 'role': 'member'}
                ]
            }
            
            # First succeeds, second raises SpaceNotFoundError, third raises ClientError
            mock_get.side_effect = [
                {'id': 'space1', 'name': 'Space 1', 'updated_at': '2024-01-01T00:00:00Z'},
                SpaceNotFoundError("Not found"),  # Line 334
                ClientError({'Error': {'Code': 'Error'}}, 'GetItem')  # Line 335
            ]
            
            result = service.list_user_spaces("user123")
            
            # Should only return the first space
            assert len(result['spaces']) == 1
            assert result['spaces'][0]['id'] == 'space1'
    
    def test_get_user_role_client_error(self):
        """Test lines 461-462 - ClientError returns None."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            # Any ClientError should return None
            mock_table.get_item.side_effect = ClientError(
                {'Error': {'Code': 'InternalError'}}, 
                'GetItem'
            )
            
            result = service.get_user_role("space123", "user123")
            assert result is None


class TestInvitationServiceMissingLines:
    """Test app/services/invitation.py missing lines."""
    
    @patch('app.services.invitation.boto3')
    def test_get_table_resource_in_use(self, mock_boto3):
        """Test line 82 - ResourceInUseException handling."""
        from app.services.invitation import InvitationService
        
        # Setup mock
        mock_resource = Mock()
        mock_table = Mock()
        mock_boto3.resource.return_value = mock_resource
        
        # First call raises ResourceInUseException, second succeeds
        mock_resource.Table.side_effect = [
            ClientError({'Error': {'Code': 'ResourceInUseException'}}, 'DescribeTable'),
            mock_table
        ]
        
        service = InvitationService()
        
        # The table should be the second call result
        assert service.table == mock_table
    
    def test_validate_invitation_code_scenarios(self):
        """Test lines 296-302 - All validation scenarios."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Test 1: Code not found (lines 296-298)
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = None
            assert service.validate_invitation_code("INVALID") == False
        
        # Test 2: Not pending status (lines 299-300)
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'accepted',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            assert service.validate_invitation_code("CODE") == False
        
        # Test 3: Expired (lines 301-302)
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            }
            assert service.validate_invitation_code("CODE") == False
        
        # Test 4: Valid (line 302 - returns True)
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            assert service.validate_invitation_code("CODE") == True