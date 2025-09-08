"""
Final push tests to achieve 100% code coverage.
Specifically targeting the remaining 74 uncovered lines.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from fastapi import HTTPException
from botocore.exceptions import ClientError
from datetime import datetime, timezone, timedelta
import json

# Import modules to test
from app.api.routes import user_profile as user_profile_routes
from app.services.space import SpaceService
from app.services.invitation import InvitationService
from app.services.user_profile import UserProfileService
from app.services.exceptions import (
    SpaceNotFoundError, 
    UnauthorizedError,
    ValidationError,
    InvalidInviteCodeError,
    AlreadyMemberError,
    InvitationAlreadyExistsError
)
from app.models.user_profile import UserProfileUpdate, OnboardingCompleteRequest
from app.models.space import SpaceUpdate
from app.models.invitation import InvitationCreate
from app.main import lifespan
from app.core.config import settings


class TestUserProfileRouteErrors:
    """Test error handling in user_profile routes - Lines 49, 59-62, 71, 80, 112, 149, 156, 161, 223-239, 242, 257"""
    
    @pytest.mark.asyncio
    async def test_get_profile_not_found(self):
        """Test line 49 - 404 when profile not found"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.get_user_profile.return_value = None
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.get_user_profile(
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 404
            assert "User profile not found" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_profile_cognito_sync_with_email(self):
        """Test lines 59-62 - Cognito sync with email attributes"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.CognitoService') as mock_cognito:
            
            now = datetime.now(timezone.utc).isoformat()
            mock_profile = {
                'id': 'user123',
                'username': 'testuser',
                'email': 'old@test.com',
                'is_verified': False,
                'created_at': now,
                'updated_at': now
            }
            mock_service.return_value.get_user_profile.return_value = mock_profile
            
            # Mock Cognito returns new email and verification
            mock_cognito.return_value.get_user_attributes.return_value = {
                'email': 'new@test.com',
                'email_verified': True
            }
            
            result = await user_profile_routes.get_user_profile(
                current_user={'email': 'test@test.com'},
                user_id='user123'
            )
            
            # Check that email and verification were updated
            assert result.email == 'new@test.com'
            assert result.is_verified == True
    
    @pytest.mark.asyncio
    async def test_get_profile_resource_not_found_error(self):
        """Test line 71 - ResourceNotFoundException handling"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            error = ClientError(
                {'Error': {'Code': 'ResourceNotFoundException'}},
                'GetItem'
            )
            mock_service.return_value.get_user_profile.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.get_user_profile(
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 500
            assert "Failed to retrieve user profile" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_profile_reraise_http_exception(self):
        """Test line 80 - Re-raise HTTPException"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.get_user_profile.side_effect = HTTPException(
                status_code=403, detail="Forbidden"
            )
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.get_user_profile(
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 403
    
    @pytest.mark.asyncio
    async def test_update_profile_no_fields(self):
        """Test line 112 - No fields to update"""
        update_data = UserProfileUpdate()
        
        with pytest.raises(HTTPException) as exc:
            await user_profile_routes.update_user_profile(
                profile_update=update_data,
                current_user={'email': 'test@test.com'},
                user_id='user123'
            )
        assert exc.value.status_code == 400
        assert "No fields to update" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_profile_value_error(self):
        """Test line 149 - ValueError handling"""
        update_data = UserProfileUpdate(display_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.update_user_profile.side_effect = ValueError("Invalid value")
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.update_user_profile(
                    profile_update=update_data,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 400
            assert "Invalid value" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_profile_too_many_requests(self):
        """Test line 156 - TooManyRequestsException"""
        update_data = UserProfileUpdate(display_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            error = ClientError(
                {'Error': {'Code': 'TooManyRequestsException'}},
                'UpdateItem'
            )
            mock_service.return_value.update_user_profile.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.update_user_profile(
                    profile_update=update_data,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 429
            assert "Too many requests" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_profile_provisioned_throughput_exceeded(self):
        """Test line 161 - ProvisionedThroughputExceededException"""
        update_data = UserProfileUpdate(display_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            error = ClientError(
                {'Error': {'Code': 'ProvisionedThroughputExceededException'}},
                'UpdateItem'
            )
            mock_service.return_value.update_user_profile.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.update_user_profile(
                    profile_update=update_data,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 503
            assert "Service temporarily unavailable" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_not_found(self):
        """Test lines 223-227 - User not found during onboarding"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.complete_onboarding.return_value = None
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.complete_onboarding(
                    request=None,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 404
            assert "User not found" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_send_email_success(self):
        """Test lines 230-234 - Successfully send welcome email"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.EmailService') as mock_email:
            
            now = datetime.now(timezone.utc).isoformat()
            mock_profile = {
                'id': 'user123',
                'email': 'test@test.com',
                'username': 'testuser',
                'onboarding_completed': True,
                'created_at': now,
                'updated_at': now
            }
            mock_service.return_value.complete_onboarding.return_value = mock_profile
            mock_email.return_value.send_welcome_email.return_value = None
            
            result = await user_profile_routes.complete_onboarding(
                request=OnboardingCompleteRequest(timezone="UTC"),
                current_user={'email': 'test@test.com'},
                user_id='user123'
            )
            
            # Verify email was sent
            mock_email.return_value.send_welcome_email.assert_called_once_with('test@test.com', 'user123')
            assert result.onboarding_completed == True
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_email_failure(self):
        """Test lines 235-237 - Email send failure doesn't block response"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service, \
             patch('app.api.routes.user_profile.EmailService') as mock_email, \
             patch('app.api.routes.user_profile.logger') as mock_logger:
            
            now = datetime.now(timezone.utc).isoformat()
            mock_profile = {
                'id': 'user123',
                'email': 'test@test.com',
                'username': 'testuser',
                'onboarding_completed': True,
                'created_at': now,
                'updated_at': now
            }
            mock_service.return_value.complete_onboarding.return_value = mock_profile
            mock_email.return_value.send_welcome_email.side_effect = Exception("Email service down")
            
            # Should not raise exception
            result = await user_profile_routes.complete_onboarding(
                request=None,
                current_user={'email': 'test@test.com'},
                user_id='user123'
            )
            
            # Verify error was logged but didn't block
            mock_logger.error.assert_called_once()
            assert result.onboarding_completed == True
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_value_error(self):
        """Test line 242 - ValueError during onboarding"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.complete_onboarding.side_effect = ValueError("Invalid data")
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.complete_onboarding(
                    request=None,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 400
            assert "Invalid data" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_reraise_http(self):
        """Test line 257 - Re-raise HTTPException in onboarding"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            mock_service.return_value.complete_onboarding.side_effect = HTTPException(
                status_code=403, detail="Forbidden"
            )
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.complete_onboarding(
                    request=None,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 403


class TestSpaceServiceErrors:
    """Test SpaceService error handling - Lines 73, 77-81, 92, 207, 215, 334-335, 357, 379, 402, 461-462, 484, 487, 498-516, 527-528"""
    
    def test_get_table_resource_in_use_fallback(self):
        """Test line 71-72 - ResourceInUseException fallback"""
        # Mock boto3.resource to control table creation
        with patch('app.services.space.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First create_table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table after exception
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            # Initialize service - this triggers _get_or_create_table
            service = SpaceService()
            
            # Verify table was obtained via Table() after exception
            assert service.table == mock_table
    
    def test_ensure_table_exists_false(self):
        """Test lines 77-81 - Table doesn't exist"""
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.load.side_effect = ClientError(
                {'Error': {'Code': 'ResourceNotFoundException'}},
                'DescribeTable'
            )
            
            result = service._ensure_table_exists()
            assert result == False
    
    def test_create_space_validation_error(self):
        """Test validation error in create_space"""
        from app.models.space import SpaceCreate
        from pydantic import ValidationError as PydanticValidationError
        
        # The validator catches whitespace-only names at the Pydantic level
        with pytest.raises(PydanticValidationError) as exc:
            space_data = SpaceCreate(name="   ", description="Test")
        assert "Space name is required" in str(exc.value)
    
    def test_get_space_not_found_client_error(self):
        """Test ClientError propagates as-is"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'ResourceNotFoundException'}},
                'GetItem'
            )
            
            # ClientError should propagate as-is
            with pytest.raises(ClientError) as exc:
                service.get_space("space123", "user123")
            assert exc.value.response['Error']['Code'] == 'ResourceNotFoundException'
    
    def test_update_space_empty_name_validation(self):
        """Test empty name validation"""
        from pydantic import ValidationError
        
        # Pydantic validates at model creation
        with pytest.raises(ValidationError) as exc:
            update = SpaceUpdate(name="   ")  # Whitespace only
        
        assert "Space name cannot be empty" in str(exc.value)
    
    def test_list_user_spaces_skip_deleted(self):
        """Test skipping deleted/errored spaces"""
        service = SpaceService()
        
        with patch.object(service.table, 'query') as mock_query, \
             patch.object(service.table, 'get_item') as mock_get_item:
            
            # Mock user has 2 spaces, one will error - need GSI1 keys
            mock_query.side_effect = [
                # Initial query for user's spaces
                {
                    'Items': [
                        {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space1', 'space_id': 'space1', 'role': 'owner'},
                        {'GSI1PK': 'USER#user123', 'GSI1SK': 'SPACE#space2', 'space_id': 'space2', 'role': 'member'}
                    ]
                },
                # Member count query for space1
                {'Items': [{'PK': 'SPACE#space1', 'SK': 'MEMBER#user123'}]}
            ]
            
            # First space exists, second doesn't (deleted)
            mock_get_item.side_effect = [
                {'Item': {'id': 'space1', 'name': 'Space 1', 'updated_at': '2024-01-01T00:00:00Z', 'owner_id': 'user123', 'created_at': '2024-01-01T00:00:00Z'}},
                {'ResponseMetadata': {}}  # No 'Item' key - space not found
            ]
            
            result = service.list_user_spaces("user123")
            
            # Should only return the existing space
            assert len(result['spaces']) == 1
            assert result['spaces'][0]['id'] == 'space1'
    
    def test_add_member_unauthorized(self):
        """Test line 357 - Unauthorized to add member"""
        service = SpaceService()
        
        with patch.object(service, 'can_edit_space') as mock_can_edit:
            mock_can_edit.return_value = False
            
            with pytest.raises(UnauthorizedError) as exc:
                service.add_member("space123", "newuser", "member", "user123")
            assert "cannot add members" in str(exc.value)
    
    def test_remove_member_unauthorized(self):
        """Test line 379 - Unauthorized to remove member"""
        service = SpaceService()
        
        with patch.object(service, 'can_edit_space') as mock_can_edit:
            mock_can_edit.return_value = False
            
            with pytest.raises(UnauthorizedError) as exc:
                service.remove_member("space123", "member123", "user123")
            assert "cannot remove members" in str(exc.value)
    
    def test_get_space_members_not_found_client_error(self):
        """Test line 402 - ClientError in get_space_members"""
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            mock_table.get_item.side_effect = ClientError(
                {'Error': {'Code': 'ResourceNotFoundException'}},
                'GetItem'
            )
            
            with pytest.raises(SpaceNotFoundError) as exc:
                service.get_space_members("space123", "user123")
            assert "Space space123 not found" in str(exc.value)
    
    def test_get_user_role_client_error(self):
        """Test ClientError returns None for role"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = ClientError(
                {'Error': {'Code': 'ResourceNotFoundException'}},
                'GetItem'
            )
            
            result = service.get_space_member_role("space123", "user123")
            assert result is None
    
    def test_join_space_with_invite_code_space_id_from_item(self):
        """Test getting space_id from direct item"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get_item, \
             patch.object(service.table, 'put_item') as mock_put, \
             patch.object(service, 'get_space') as mock_get:
            
            # Direct item lookup succeeds
            mock_get_item.side_effect = [
                {'Item': {'space_id': 'space123'}},  # Invite lookup
                {}  # Member check - not a member
            ]
            mock_put.return_value = {}
            mock_get.return_value = {'id': 'space123', 'name': 'Test Space'}
            
            result = service.join_space_with_invite_code("INVITE123", "user123")
            
            assert result['space_id'] == 'space123'
            assert result['role'] == 'member'
    
    def test_join_space_no_space_id(self):
        """Test no space_id in invite"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get_item:
            mock_get_item.return_value = {'Item': {}}  # No space_id
            
            with pytest.raises(InvalidInviteCodeError) as exc:
                service.join_space_with_invite_code("INVITE123", "user123")
            assert "Invalid invite code" in str(exc.value)
    
    def test_join_space_full_flow(self):
        """Test full join space flow with member creation"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get_item, \
             patch.object(service.table, 'query') as mock_query, \
             patch.object(service.table, 'put_item') as mock_put, \
             patch.object(service, 'get_space') as mock_get:
            
            # Setup mocks for full flow
            mock_get_item.side_effect = [
                {},  # No direct invite item
                {}   # Not already a member
            ]
            mock_query.return_value = {
                'Items': [{'space_id': 'space123'}]
            }
            mock_put.return_value = {}
            mock_get.return_value = {'id': 'space123', 'name': 'Test Space', 'owner_id': 'owner123'}
            
            result = service.join_space_with_invite_code("INVITE123", "user123", "testuser", "test@test.com")
            
            # Verify member was created with correct data
            put_call = mock_put.call_args
            member_item = put_call[1]['Item']
            assert member_item['PK'] == 'SPACE#space123'
            assert member_item['SK'] == 'MEMBER#user123'
            assert member_item['GSI1PK'] == 'USER#user123'
            assert member_item['GSI1SK'] == 'SPACE#space123'
            assert member_item['user_id'] == 'user123'
            assert member_item['username'] == 'testuser'
            assert member_item['email'] == 'test@test.com'
            assert member_item['role'] == 'member'
            assert 'joined_at' in member_item
            
            # Verify response
            assert result['space_id'] == 'space123'
            assert result['name'] == 'Test Space'
            assert result['role'] == 'member'
    
    def test_join_space_generic_exception(self):
        """Test generic exception handling"""
        service = SpaceService()
        
        with patch.object(service.table, 'get_item') as mock_get:
            mock_get.side_effect = Exception("Unexpected error")
            
            with pytest.raises(InvalidInviteCodeError) as exc:
                service.join_space_with_invite_code("INVITE123", "user123")
            assert "Invalid invite code" in str(exc.value)


class TestInvitationServiceErrors:
    """Test InvitationService error handling - Lines 82, 296-302"""
    
    def test_get_table_resource_in_use_fallback(self):
        """Test line 80-81 - ResourceInUseException fallback in invitation service"""
        # Mock boto3.resource to control table creation
        with patch('app.services.invitation.boto3.resource') as mock_boto3:
            mock_dynamodb = Mock()
            mock_boto3.return_value = mock_dynamodb
            
            # First create_table raises ResourceInUseException
            mock_dynamodb.create_table.side_effect = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}}, 
                'CreateTable'
            )
            
            # Table method returns a mock table after exception
            mock_table = Mock()
            mock_dynamodb.Table.return_value = mock_table
            
            # Initialize service - this triggers _get_or_create_table
            service = InvitationService()
            
            # Verify table was obtained via Table() after exception
            assert service.table == mock_table
    
    def test_validate_invitation_code_not_found(self):
        """Test invitation code not found"""
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = None
            
            result = service.validate_invite_code("INVALID")
            assert result == False
    
    def test_validate_invitation_code_not_pending(self):
        """Test invitation not pending"""
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'accepted',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_expired(self):
        """Test invitation expired"""
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == False
    
    def test_validate_invitation_code_valid(self):
        """Test valid invitation"""
        service = InvitationService()
        
        with patch.object(service, '_get_invitation_by_code') as mock_get:
            mock_get.return_value = {
                'status': 'pending',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
            
            result = service.validate_invite_code("CODE123")
            assert result == True


class TestUserProfileServiceMethods:
    """Test UserProfileService methods - Lines 167-182, 197-199"""
    
    def test_create_user_profile(self):
        """Test lines 167-182 - Create user profile"""
        service = UserProfileService()
        
        with patch.object(service, 'db') as mock_db:
            mock_db.put_item.return_value = True
            
            profile_data = {
                'email': 'test@test.com',
                'username': 'testuser',
                'display_name': 'Test User'
            }
            
            result = service.create_user_profile('user123', profile_data)
            
            # Verify put_item was called with correct data
            put_call = mock_db.put_item.call_args
            item = put_call[0][0]
            
            assert item['PK'] == 'USER#user123'
            assert item['SK'] == 'PROFILE'
            assert item['id'] == 'user123'
            assert item['email'] == 'test@test.com'
            assert item['username'] == 'testuser'
            assert item['display_name'] == 'Test User'
            assert item['is_active'] == True
            assert item['is_verified'] == False
            assert item['onboarding_completed'] == False
            assert item['onboarding_step'] == 0
            assert 'created_at' in item
            assert 'updated_at' in item
            
            # Verify response
            assert result['id'] == 'user123'
            assert result['email'] == 'test@test.com'
    
    def test_delete_user_profile(self):
        """Test lines 197-199 - Delete user profile"""
        service = UserProfileService()
        
        with patch.object(service, 'db') as mock_db:
            mock_db.delete_item.return_value = True
            
            result = service.delete_user_profile('user123')
            
            # Verify delete_item was called with correct keys
            mock_db.delete_item.assert_called_once_with('USER#user123', 'PROFILE')
            assert result == True


class TestMainLifespan:
    """Test main.py lifespan - Lines 16-21"""
    
    @pytest.mark.asyncio
    async def test_lifespan_startup_shutdown(self):
        """Test lines 16-21 - Application lifespan events"""
        # Mock the logger
        with patch('app.main.logger') as mock_logger:
            # Use the async context manager
            async with lifespan(None):
                pass
            
            # Check logged output
            mock_logger.info.assert_any_call(f"Starting Lifestyle Spaces API v{__import__('app').__version__}")
            mock_logger.info.assert_any_call(f"Environment: {settings.environment}")
            mock_logger.info.assert_any_call(f"DynamoDB Table: {settings.dynamodb_table}")
            mock_logger.info.assert_any_call("Shutting down Lifestyle Spaces API")


# Additional edge case tests for complete coverage
class TestAdditionalEdgeCases:
    """Additional tests for edge cases and error conditions"""
    
    @pytest.mark.asyncio
    async def test_update_profile_resource_in_use(self):
        """Test ResourceInUseException in update profile"""
        update_data = UserProfileUpdate(display_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            error = ClientError(
                {'Error': {'Code': 'ResourceInUseException'}},
                'UpdateItem'
            )
            mock_service.return_value.update_user_profile.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.update_user_profile(
                    profile_update=update_data,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 503
            assert "Service temporarily unavailable" in str(exc.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_profile_conditional_check_retry_success(self):
        """Test ConditionalCheckFailedException with successful retry"""
        update_data = UserProfileUpdate(preferred_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            # First attempt fails with ConditionalCheckFailedException
            first_service = Mock()
            error = ClientError(
                {'Error': {'Code': 'ConditionalCheckFailedException'}},
                'UpdateItem'
            )
            first_service.update_user_profile.side_effect = error
            
            # Setup for retry - need a new service instance
            retry_service = Mock()
            now = datetime.now(timezone.utc).isoformat()
            retry_service.update_user_profile.return_value = {
                'id': 'user123',
                'preferred_name': 'Test',
                'email': 'test@test.com',
                'username': 'testuser',
                'created_at': now,
                'updated_at': now,
                'onboarding_completed': False,
                'onboarding_step': 0,
                'is_active': True,
                'is_verified': False
            }
            
            # Return different service instances
            mock_service_class.side_effect = [first_service, retry_service]
            
            result = await user_profile_routes.update_user_profile(
                profile_update=update_data,
                current_user={'email': 'test@test.com', 'username': 'testuser'},
                user_id='user123'
            )
            
            assert result.preferred_name == 'Test'
    
    @pytest.mark.asyncio
    async def test_update_profile_conditional_check_retry_fail(self):
        """Test ConditionalCheckFailedException with failed retry"""
        update_data = UserProfileUpdate(preferred_name="Test")
        
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service_class:
            # Both attempts fail
            error = ClientError(
                {'Error': {'Code': 'ConditionalCheckFailedException'}},
                'UpdateItem'
            )
            mock_service_class.return_value.update_user_profile.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.update_user_profile(
                    profile_update=update_data,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_complete_onboarding_conditional_check_failed(self):
        """Test ConditionalCheckFailedException in complete_onboarding"""
        with patch('app.api.routes.user_profile.UserProfileService') as mock_service:
            error = ClientError(
                {'Error': {'Code': 'ConditionalCheckFailedException'}},
                'UpdateItem'
            )
            mock_service.return_value.complete_onboarding.side_effect = error
            
            with pytest.raises(HTTPException) as exc:
                await user_profile_routes.complete_onboarding(
                    request=None,
                    current_user={'email': 'test@test.com'},
                    user_id='user123'
                )
            assert exc.value.status_code == 500
            assert "Failed to complete onboarding" in str(exc.value.detail)
    
    def test_space_service_already_member_error(self):
        """Test AlreadyMemberError in join_space_with_invite_code"""
        service = SpaceService()
        
        with patch.object(service, 'table') as mock_table:
            # Invite exists
            mock_table.get_item.side_effect = [
                {'Item': {'space_id': 'space123'}},  # Invite lookup
                {'Item': {'role': 'member'}}  # Already a member
            ]
            
            with pytest.raises(AlreadyMemberError) as exc:
                service.join_space_with_invite_code("INVITE123", "user123")
            assert "already a member" in str(exc.value)