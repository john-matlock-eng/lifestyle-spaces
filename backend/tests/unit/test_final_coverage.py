"""
Final tests to achieve 100% code coverage - targeting specific missing lines.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from botocore.exceptions import ClientError
import os

# Test app/main.py lines 16-21 (lifespan function)
def test_main_lifespan():
    """Test the lifespan context manager prints."""
    from app.main import lifespan
    
    # Mock the app
    app = Mock()
    
    # Create a generator from lifespan
    gen = lifespan(app)
    
    # Test startup - this should execute print statements
    import io
    import sys
    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()
    
    try:
        # Run startup
        next(gen)
        output = buffer.getvalue()
        
        # Check that print statements were executed
        assert "Starting Lifestyle Spaces API" in output
        assert "Environment:" in output
        assert "DynamoDB Table:" in output
        
        # Run shutdown
        try:
            next(gen)
        except StopIteration:
            pass
        
        output = buffer.getvalue()
        assert "Shutting down Lifestyle Spaces API" in output
        
    finally:
        sys.stdout = old_stdout


# Test app/services/space.py remaining lines
class TestSpaceServiceCoverage:
    """Cover remaining SpaceService lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 73 - ResourceInUseException handling."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        # Mock the table to raise ResourceInUseException then succeed
        with patch.object(service, 'table') as mock_table:
            mock_table.load.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'DescribeTable'
            )
            
            # Mock dynamodb.Table to return a table
            mock_new_table = Mock()
            service.dynamodb.Table = Mock(return_value=mock_new_table)
            
            result = service._get_table()
            assert result == mock_new_table
    
    def test_ensure_table_exists_true(self):
        """Test line 79 - Table exists returns True."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.load.return_value = None  # Success
            
            result = service._ensure_table_exists()
            assert result == True
    
    def test_create_space_empty_name(self):
        """Test line 92 - Empty name validation."""
        from app.services.space import SpaceService, SpaceCreate
        from app.services.exceptions import ValidationError
        
        service = SpaceService()
        space = SpaceCreate(name="", description="Test")
        
        with pytest.raises(ValidationError) as exc:
            service.create_space(space, "owner123")
        assert "Space name cannot be empty" in str(exc.value)
    
    def test_get_space_client_error(self):
        """Test line 207 - ClientError in get_space."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.get_item.side_effect = ClientError(
                {'Error': {'Code': 'SomeError'}}, 
                'GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError):
                service.get_space("space123", "user123")
    
    def test_update_space_empty_name(self):
        """Test line 215 - Empty name in update."""
        from app.services.space import SpaceService, SpaceUpdate
        from app.services.exceptions import ValidationError
        
        service = SpaceService()
        
        with patch.object(service, 'get_space') as mock_get, \
             patch.object(service, 'can_edit_space') as mock_can:
            
            mock_get.return_value = {'id': 'space123'}
            mock_can.return_value = True
            
            update = SpaceUpdate(name="  ")  # Whitespace only
            
            with pytest.raises(ValidationError) as exc:
                service.update_space("space123", update, "user123")
            assert "Space name cannot be empty" in str(exc.value)
    
    def test_list_user_spaces_skip_error(self):
        """Test lines 334-335 - Skip spaces with errors."""
        from app.services.space import SpaceService
        from app.services.exceptions import SpaceNotFoundError
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table, \
             patch.object(service, 'get_space') as mock_get:
            
            # User has 2 spaces
            mock_table.query.return_value = {
                'Items': [
                    {'space_id': 'space1', 'role': 'owner'},
                    {'space_id': 'space2', 'role': 'member'}
                ]
            }
            
            # First succeeds, second fails (ClientError)
            mock_get.side_effect = [
                {'id': 'space1', 'name': 'Space 1', 'updated_at': '2024-01-01T00:00:00Z'},
                ClientError({'Error': {'Code': 'NotFound'}}, 'GetItem')
            ]
            
            result = service.list_user_spaces("user123")
            assert len(result['spaces']) == 1
            assert result['spaces'][0]['id'] == 'space1'
    
    def test_get_user_role_client_error(self):
        """Test lines 461-462 - ClientError in get_user_role."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.get_item.side_effect = ClientError(
                {'Error': {'Code': 'SomeError'}}, 
                'GetItem'
            )
            
            result = service.get_user_role("space123", "user123")
            assert result is None


# Test app/services/invitation.py remaining lines
class TestInvitationServiceCoverage:
    """Cover remaining InvitationService lines."""
    
    def test_get_table_resource_in_use(self):
        """Test line 82 - ResourceInUseException handling."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        # Mock the table to raise ResourceInUseException then succeed
        with patch.object(service, 'table') as mock_table:
            mock_table.load.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'DescribeTable'
            )
            
            # Mock dynamodb.Table to return a table
            mock_new_table = Mock()
            service.dynamodb.Table = Mock(return_value=mock_new_table)
            
            result = service._get_table()
            assert result == mock_new_table
    
    def test_validate_invitation_code_not_found(self):
        """Test lines 296-298 - Code not found."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = None
            
            result = service.validate_invitation_code("INVALID")
            assert result == False
    
    def test_validate_invitation_code_not_pending(self):
        """Test lines 299-300 - Not pending status."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'accepted',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invitation_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_expired(self):
        """Test lines 301-302 - Expired invitation."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invitation_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_valid(self):
        """Test line 302 - Valid invitation returns True."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invitation_code("CODE123")
            assert result == True


# Test app/core/config.py remaining lines
class TestConfigCoverage:
    """Cover remaining config lines."""
    
    def test_config_cors_allowed_origins(self):
        """Test line 34 - CORS allowed origins."""
        # Set environment variable
        os.environ['CORS_ALLOWED_ORIGINS'] = 'http://localhost:3000,https://example.com'
        
        # Reimport to pick up new env var
        import importlib
        import app.core.config
        importlib.reload(app.core.config)
        
        from app.core.config import settings
        assert 'http://localhost:3000' in settings.cors_allowed_origins
        assert 'https://example.com' in settings.cors_allowed_origins
        
        # Clean up
        del os.environ['CORS_ALLOWED_ORIGINS']
    
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
        """Test line 24 - Default values."""
        from app.models.user import UserResponse
        
        # Create with minimal data
        user = UserResponse(
            id="user123",
            email="test@test.com"
        )
        
        # Check defaults
        assert user.username == ""  # Line 24