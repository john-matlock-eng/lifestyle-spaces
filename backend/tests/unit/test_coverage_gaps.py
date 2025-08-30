"""Test file to cover exact missing lines for 100% coverage."""

import json
import os
from unittest.mock import Mock, patch, MagicMock
import pytest
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from fastapi import HTTPException
from pydantic import ValidationError

# Import modules to test
from app.api.routes import spaces, user_profile, users
from app.core import config, dependencies
from app.models import common, space as space_models, user as user_models, user_profile as profile_models
from app.services import space as space_service
from app.services.exceptions import (
    SpaceNotFoundError, 
    UnauthorizedError, 
    ValidationError as ServiceValidationError,
    InvalidInviteCodeError,
    AlreadyMemberError
)


class TestSpacesRoute:
    """Test missing lines in spaces.py route."""
    
    @pytest.mark.asyncio
    async def test_create_space_validation_error(self):
        """Test line 53 - ValidationError handling in create_space."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
            mock_service = Mock()
            mock_service.create_space.side_effect = ServiceValidationError("Invalid space name")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await spaces.create_space(
                    space=space_models.SpaceCreate(name="Test", description=""),
                    current_user={"sub": "user123", "email": "test@test.com", "username": "testuser"}
                )
            assert exc_info.value.status_code == 422
            assert "Invalid space name" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_space_generic_client_error(self):
        """Test line 63 - Generic ClientError handling in create_space."""
        with patch('app.api.routes.spaces.SpaceService') as mock_service_class:
            mock_service = Mock()
            error_response = {'Error': {'Code': 'UnknownError'}}
            mock_service.create_space.side_effect = ClientError(error_response, 'PutItem')
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await spaces.create_space(
                    space=space_models.SpaceCreate(name="Test", description=""),
                    current_user={"sub": "user123", "email": "test@test.com", "username": "testuser"}
                )
            assert exc_info.value.status_code == 500
            assert "Failed to create space" in str(exc_info.value.detail)


class TestUserProfileRoute:
    """Test missing lines in user_profile.py route."""
    
    @pytest.mark.asyncio  
    async def test_get_profile_cognito_sync_failure(self):
        """Test lines 63-65 - Cognito sync failure handling."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_profile_class:
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito_class:
                mock_service = Mock()
                mock_service.get_user_profile.return_value = {
                    "user_id": "user123",
                    "username": "testuser",
                    "email": "test@test.com",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                mock_profile_class.return_value = mock_service
                
                mock_cognito = Mock()
                mock_cognito.get_user_attributes.side_effect = Exception("Cognito error")
                mock_cognito_class.return_value = mock_cognito
                
                result = await user_profile.get_user_profile({"sub": "user123"})
                assert result.user_id == "user123"
    
    @pytest.mark.asyncio
    async def test_get_profile_generic_client_error(self):
        """Test line 75 - Generic ClientError in get_user_profile."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            error_response = {'Error': {'Code': 'UnknownError'}}
            mock_service.get_user_profile.side_effect = ClientError(error_response, 'GetItem')
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.get_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_get_profile_generic_exception(self):
        """Test lines 81-83 - Generic exception handling."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service.get_user_profile.side_effect = Exception("Unexpected error")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.get_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_update_profile_max_retries(self):
        """Test line 132 - Max retries exceeded in update_profile."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            error_response = {'Error': {'Code': 'ResourceInUseException'}}
            mock_service.update_user_profile.side_effect = ClientError(error_response, 'UpdateItem')
            mock_service_class.return_value = mock_service
            
            with patch('asyncio.sleep'):  # Speed up test
                with pytest.raises(HTTPException) as exc_info:
                    await user_profile.update_user_profile(
                        profile_update=profile_models.UserProfileUpdate(bio="New bio"),
                        current_user={"sub": "user123"}
                    )
                assert exc_info.value.status_code == 503
    
    @pytest.mark.asyncio
    async def test_create_profile_cognito_sync_failure(self):
        """Test lines 171-173 - Cognito sync failure in create_profile."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_profile_class:
            with patch('app.api.routes.user_profile.CognitoService') as mock_cognito_class:
                mock_service = Mock()
                mock_service.create_user_profile.return_value = {
                    "user_id": "user123",
                    "username": "testuser",
                    "email": "test@test.com",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                mock_profile_class.return_value = mock_service
                
                mock_cognito = Mock()
                mock_cognito.get_user_attributes.side_effect = Exception("Cognito error")
                mock_cognito_class.return_value = mock_cognito
                
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
        """Test lines 179-181 - Generic exception in create_profile."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service.create_user_profile.side_effect = Exception("Unexpected error")
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
    
    @pytest.mark.asyncio
    async def test_delete_profile_not_found(self):
        """Test line 246 - Profile not found in delete."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
            mock_service.delete_user_profile.side_effect = ClientError(error_response, 'DeleteItem')
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.delete_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_profile_generic_exception(self):
        """Test lines 252-254 - Generic exception in delete."""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service.delete_user_profile.side_effect = Exception("Unexpected error")
            mock_service_class.return_value = mock_service
            
            with pytest.raises(HTTPException) as exc_info:
                await user_profile.delete_user_profile({"sub": "user123"})
            assert exc_info.value.status_code == 500


class TestUsersRoute:
    """Test missing lines in users.py route."""
    
    @pytest.mark.asyncio
    async def test_register_generic_exception(self):
        """Test line 110 - Generic exception in register."""
        with patch('app.api.routes.users.UserService') as mock_service_class:
            mock_service = Mock()
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


class TestConfig:
    """Test missing lines in config.py."""
    
    def test_parse_cors_origins_none(self):
        """Test line 18 - None value handling."""
        result = config.parse_cors_origins(None)
        assert result == []
    
    def test_parse_cors_origins_list(self):
        """Test line 21 - List value handling."""
        result = config.parse_cors_origins(["http://localhost:3000", "http://localhost:5173"])
        assert result == ["http://localhost:3000", "http://localhost:5173"]
    
    def test_parse_cors_origins_star(self):
        """Test line 26 - Star value handling."""
        result = config.parse_cors_origins("*")
        assert result == ["*"]
    
    def test_parse_cors_origins_json_non_list(self):
        """Test lines 34-35 - JSON non-list handling."""
        result = config.parse_cors_origins('123')
        assert result == ['123']
    
    def test_parse_cors_origins_invalid_json(self):
        """Test lines 36 - Invalid JSON handling."""
        result = config.parse_cors_origins('[invalid json')
        assert result == ['[invalid json']
    
    def test_parse_cors_origins_other_type(self):
        """Test lines 41-42 - Other type handling."""
        result = config.parse_cors_origins(123)
        assert result == ['123']
    
    def test_settings_from_env(self):
        """Test lines 106-109 - from_env class method."""
        with patch.dict('os.environ', {
            'TABLE_NAME': 'test-table',
            'AWS_REGION': 'us-east-1',
            'ENVIRONMENT': 'test'
        }):
            settings = config.Settings.from_env()
            assert settings.table_name == 'test-table'
            assert settings.aws_region == 'us-east-1'
            assert settings.environment == 'test'


class TestDependencies:
    """Test missing lines in dependencies.py."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_http_exception(self):
        """Test line 25 - HTTPException re-raise."""
        with patch('app.core.dependencies.CognitoService') as mock_cognito_class:
            mock_cognito = Mock()
            mock_cognito.verify_token.side_effect = HTTPException(status_code=401, detail="Invalid token")
            mock_cognito_class.return_value = mock_cognito
            
            with pytest.raises(HTTPException) as exc_info:
                await dependencies.get_current_user("invalid_token")
            assert exc_info.value.status_code == 401


class TestCommonModels:
    """Test missing lines in common.py."""
    
    def test_error_response_validation_errors(self):
        """Test line 29 - validation_errors property."""
        error = common.ErrorResponse(
            error="Validation failed",
            message="Invalid input",
            validation_errors={"field": ["error message"]}
        )
        assert error.validation_errors == {"field": ["error message"]}
    
    def test_pagination_response_next_page(self):
        """Test line 36 - next_page property."""
        pagination = common.PaginationResponse(
            items=[],
            total=100,
            page=1,
            page_size=10,
            next_page=2
        )
        assert pagination.next_page == 2


class TestSpaceModels:
    """Test missing lines in space.py models."""
    
    def test_space_create_validate_description_none(self):
        """Test line 36 - None description validation."""
        space = space_models.SpaceCreate(name="Test Space", description=None)
        assert space.description is None
    
    def test_space_update_validate_name_empty(self):
        """Test line 54 - Empty name validation."""
        with pytest.raises(ValidationError) as exc_info:
            space_models.SpaceUpdate(name="   ")
        assert "Space name cannot be empty" in str(exc_info.value)
    
    def test_space_update_validate_description_none(self):
        """Test line 62 - None description validation."""
        space = space_models.SpaceUpdate(description=None)
        assert space.description is None


class TestUserModels:
    """Test missing lines in user.py models."""
    
    def test_user_create_validate_email(self):
        """Test line 24 - email validation."""
        user = user_models.UserCreate(
            email="  TEST@TEST.COM  ",
            username="testuser",
            password="Password123!"
        )
        assert user.email == "test@test.com"


class TestUserProfileModels:
    """Test missing lines in user_profile.py models."""
    
    def test_profile_update_validate_username_strip(self):
        """Test line 48 - username strip validation."""
        profile = profile_models.UserProfileUpdate(username="  testuser  ")
        assert profile.username == "testuser"
    
    def test_profile_update_validate_bio_strip(self):
        """Test line 55 - bio strip validation."""
        profile = profile_models.UserProfileUpdate(bio="  My bio  ")
        assert profile.bio == "My bio"


class TestInvitationService:
    """Test missing lines in invitation.py service."""
    
    def test_validate_invite_code_client_error(self):
        """Test line 82 - ClientError in validate_invite_code."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        mock_table = Mock()
        error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
        mock_table.get_item.side_effect = ClientError(error_response, 'GetItem')
        
        with patch.object(service, 'table', mock_table):
            result = service.validate_invite_code("INVALID")
            assert result is None


class TestSpaceService:
    """Test missing lines in space.py service."""
    
    def test_ensure_table_exists_resource_in_use(self):
        """Test line 73 - ResourceInUseException handling."""
        service = space_service.SpaceService()
        mock_dynamodb = Mock()
        mock_table = Mock()
        mock_dynamodb.Table.return_value = mock_table
        
        error_response = {'Error': {'Code': 'ResourceInUseException'}}
        mock_dynamodb.create_table.side_effect = ClientError(error_response, 'CreateTable')
        
        with patch.object(service, 'dynamodb', mock_dynamodb):
            result = service._ensure_table_exists()
            assert result == mock_table
    
    def test_create_space_empty_name_validation(self):
        """Test line 84 - Empty name validation."""
        service = space_service.SpaceService()
        
        with pytest.raises(ServiceValidationError) as exc_info:
            service.create_space(
                space=space_models.SpaceCreate(name="   ", description=""),
                owner_id="user123"
            )
        assert "Space name is required" in str(exc_info.value)
    
    def test_update_space_not_found_client_error(self):
        """Test line 199 - ClientError in update_space."""
        service = space_service.SpaceService()
        mock_table = Mock()
        error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
        mock_table.get_item.side_effect = ClientError(error_response, 'GetItem')
        
        with patch.object(service, 'table', mock_table):
            with pytest.raises(SpaceNotFoundError):
                service.update_space(
                    space_id="space123",
                    user_id="user123",
                    update=space_models.SpaceUpdate(name="New Name")
                )
    
    def test_update_space_empty_name_validation(self):
        """Test line 207 - Empty name update validation."""
        service = space_service.SpaceService()
        mock_table = Mock()
        mock_table.get_item.return_value = {
            'Item': {
                'space_id': 'space123',
                'owner_id': 'user123',
                'name': 'Old Name'
            }
        }
        
        with patch.object(service, 'table', mock_table):
            with patch.object(service, 'can_edit_space', return_value=True):
                with pytest.raises(ServiceValidationError) as exc_info:
                    service.update_space(
                        space_id="space123",
                        user_id="user123",
                        update=space_models.SpaceUpdate(name="   ")
                    )
                assert "Space name cannot be empty" in str(exc_info.value)
    
    def test_list_user_spaces_error_handling(self):
        """Test lines 326-327 - Error handling in list_user_spaces."""
        service = space_service.SpaceService()
        mock_table = Mock()
        
        # Mock query to return spaces
        mock_table.query.return_value = {
            'Items': [
                {'space_id': 'space1', 'GSI1SK': 'SPACE#space1'}
            ]
        }
        
        # Mock get_item to raise SpaceNotFoundError for space metadata
        mock_table.get_item.side_effect = ClientError({'Error': {'Code': 'ResourceNotFoundException'}}, 'GetItem')
        
        with patch.object(service, 'table', mock_table):
            result = service.list_user_spaces("user123")
            assert result['spaces'] == []
            assert result['total'] == 0
    
    def test_add_member_unauthorized(self):
        """Test line 349 - Unauthorized in add_member."""
        service = space_service.SpaceService()
        
        with patch.object(service, 'can_edit_space', return_value=False):
            with pytest.raises(UnauthorizedError):
                service.add_member(
                    space_id="space123",
                    user_id="user456",
                    username="newuser",
                    email="new@test.com",
                    role="member",
                    added_by="user789"
                )
    
    def test_remove_member_unauthorized(self):
        """Test line 371 - Unauthorized in remove_member."""
        service = space_service.SpaceService()
        
        with patch.object(service, 'can_edit_space', return_value=False):
            with pytest.raises(UnauthorizedError):
                service.remove_member(
                    space_id="space123",
                    member_id="user456",
                    removed_by="user789"
                )
    
    def test_get_space_members_not_found_client_error(self):
        """Test line 394 - ClientError in get_space_members."""
        service = space_service.SpaceService()
        mock_table = Mock()
        error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
        mock_table.get_item.side_effect = ClientError(error_response, 'GetItem')
        
        with patch.object(service, 'table', mock_table):
            with pytest.raises(SpaceNotFoundError):
                service.get_space_members("space123", "user123")
    
    def test_get_space_member_role_client_error(self):
        """Test lines 453-454 - ClientError in get_space_member_role."""
        service = space_service.SpaceService()
        mock_table = Mock()
        error_response = {'Error': {'Code': 'ResourceNotFoundException'}}
        mock_table.get_item.side_effect = ClientError(error_response, 'GetItem')
        
        with patch.object(service, 'table', mock_table):
            result = service.get_space_member_role("space123", "user123")
            assert result is None
    
    def test_join_space_no_space_id_in_invite(self):
        """Test line 476 - No space_id in invite response."""
        service = space_service.SpaceService()
        mock_table = Mock()
        
        # Mock invite lookup to return item without space_id
        mock_table.get_item.return_value = {
            'Item': {'PK': 'INVITE#ABC123', 'SK': 'SPACE#ABC123'}
        }
        
        with patch.object(service, 'table', mock_table):
            with pytest.raises(InvalidInviteCodeError):
                service.join_space_with_invite_code("ABC123", "user123")
    
    def test_join_space_no_space_id_fallback(self):
        """Test line 479 - No space_id in fallback query."""
        service = space_service.SpaceService()
        mock_table = Mock()
        
        # First get_item returns nothing
        mock_table.get_item.return_value = {}
        
        # Query returns item without space_id
        mock_table.query.return_value = {
            'Items': [{'PK': 'INVITE#ABC123'}]
        }
        
        with patch.object(service, 'table', mock_table):
            with pytest.raises(InvalidInviteCodeError):
                service.join_space_with_invite_code("ABC123", "user123")
    
    def test_join_space_success_path(self):
        """Test lines 490-508 - Success path for join_space_with_invite_code."""
        service = space_service.SpaceService()
        mock_table = Mock()
        
        # Mock invite lookup
        mock_table.get_item.side_effect = [
            {'Item': {'space_id': 'space123'}},  # Invite lookup
            {}  # Member check - not a member
        ]
        
        # Mock put_item for adding member
        mock_table.put_item.return_value = {}
        
        # Mock get_space
        with patch.object(service, 'table', mock_table):
            with patch.object(service, 'get_space', return_value={'name': 'Test Space'}):
                result = service.join_space_with_invite_code(
                    invite_code="ABC123",
                    user_id="user123",
                    username="testuser",
                    email="test@test.com"
                )
                assert result['space_id'] == 'space123'
                assert result['name'] == 'Test Space'
                assert result['role'] == 'member'
    
    def test_join_space_generic_exception(self):
        """Test lines 519-520 - Generic exception in join_space."""
        service = space_service.SpaceService()
        mock_table = Mock()
        mock_table.get_item.side_effect = Exception("Unexpected error")
        
        with patch.object(service, 'table', mock_table):
            with pytest.raises(InvalidInviteCodeError) as exc_info:
                service.join_space_with_invite_code("ABC123", "user123")
            assert "Invalid invite code" in str(exc_info.value)