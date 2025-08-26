"""
Tests to achieve 100% code coverage.
"""
import pytest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError


class TestFinalCognito:
    """Test final missing Cognito coverage."""
    
    def test_create_test_pool_exception_no_match(self):
        """Test _create_test_pool when exception and no pool matches."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        with patch.object(service.client, 'create_user_pool') as mock_create, \
             patch.object(service.client, 'list_user_pools') as mock_list:
            
            # Mock create_user_pool to raise ClientError
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'SomeOtherError'}}, 
                operation_name='CreateUserPool'
            )
            
            # Mock list_user_pools to return no matching pool
            mock_list.return_value = {
                'UserPools': [
                    {'Name': 'other-pool', 'Id': 'other-id'}
                ]
            }
            
            # Should re-raise the original exception
            with pytest.raises(ClientError):
                service._create_test_pool()
    
    def test_create_test_client_exception_no_match(self):
        """Test _create_test_client when exception and no client matches."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        with patch.object(service.client, 'create_user_pool_client') as mock_create, \
             patch.object(service.client, 'list_user_pool_clients') as mock_list:
            
            # Mock create_user_pool_client to raise ClientError
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'SomeOtherError'}}, 
                operation_name='CreateUserPoolClient'
            )
            
            # Mock list_user_pool_clients to return no matching client
            mock_list.return_value = {
                'UserPoolClients': [
                    {'ClientName': 'other-client', 'ClientId': 'other-id'}
                ]
            }
            
            # Should re-raise the original exception
            with pytest.raises(ClientError):
                service._create_test_client()
    
    def test_get_username_by_email_found(self):
        """Test _get_username_by_email when user is found."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        with patch.object(service.client, 'list_users') as mock_list:
            mock_list.return_value = {
                'Users': [
                    {'Username': 'test-username', 'Attributes': []}
                ]
            }
            
            result = service._get_username_by_email("test@example.com")
            assert result == 'test-username'
    
    def test_refresh_token_not_authorized(self):
        """Test refresh_token with NotAuthorizedException."""
        from app.services.cognito import CognitoService
        from app.services.exceptions import InvalidCredentialsError
        
        service = CognitoService()
        
        with patch.object(service.client, 'initiate_auth') as mock_auth:
            mock_auth.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='InitiateAuth'
            )
            
            with pytest.raises(InvalidCredentialsError):
                service.refresh_token("invalid_token")
    
    def test_get_user_not_authorized(self):
        """Test get_user with NotAuthorizedException."""
        from app.services.cognito import CognitoService
        from app.services.exceptions import InvalidCredentialsError
        
        service = CognitoService()
        
        with patch.object(service.client, 'get_user') as mock_get:
            mock_get.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='GetUser'
            )
            
            with pytest.raises(InvalidCredentialsError):
                service.get_user("invalid_token")
    
    def test_update_user_not_authorized(self):
        """Test update_user with NotAuthorizedException."""
        from app.services.cognito import CognitoService
        from app.models.user import UserUpdate
        from app.services.exceptions import InvalidCredentialsError
        
        service = CognitoService()
        update = UserUpdate(full_name="New Name")
        
        with patch.object(service.client, 'update_user_attributes') as mock_update:
            mock_update.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='UpdateUserAttributes'
            )
            
            with pytest.raises(InvalidCredentialsError):
                service.update_user("invalid_token", update)


class TestFinalSpace:
    """Test final missing Space coverage."""
    
    def test_create_table_exception_reraise(self):
        """Test _create_table when exception is not ResourceInUseException."""
        from app.services.space import SpaceService
        
        service = SpaceService()
        
        with patch.object(service.dynamodb, 'create_table') as mock_create:
            # Mock create_table to raise a different error
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalError'}}, 
                operation_name='CreateTable'
            )
            
            # Should re-raise the original exception
            with pytest.raises(ClientError):
                service._create_table()
    
    def test_delete_space_not_owner(self):
        """Test delete_space when user is not the owner."""
        from app.services.space import SpaceService
        from app.services.exceptions import UnauthorizedError
        
        service = SpaceService()
        
        with patch.object(service, 'get_space') as mock_get:
            mock_get.return_value = {
                'owner_id': 'other_user',
                'id': 'space123'
            }
            
            with pytest.raises(UnauthorizedError) as exc_info:
                service.delete_space('space123', 'not_owner')
            
            assert "Only owner can delete" in str(exc_info.value)
    
    def test_add_member_no_permission(self):
        """Test add_member when user has no permission."""
        from app.services.space import SpaceService
        from app.services.exceptions import UnauthorizedError
        
        service = SpaceService()
        
        with patch.object(service, 'can_edit_space') as mock_can_edit:
            mock_can_edit.return_value = False
            
            with pytest.raises(UnauthorizedError):
                service.add_member('space123', 'user123', 'username', 'email@test.com', 'member', 'adder123')
    
    def test_remove_member_no_permission(self):
        """Test remove_member when user has no permission."""
        from app.services.space import SpaceService
        from app.services.exceptions import UnauthorizedError
        
        service = SpaceService()
        
        with patch.object(service, 'can_edit_space') as mock_can_edit:
            mock_can_edit.return_value = False
            
            with pytest.raises(UnauthorizedError):
                service.remove_member('space123', 'member123', 'remover123')


class TestFinalInvitation:
    """Test final missing Invitation coverage."""
    
    def test_create_table_exception_reraise(self):
        """Test _create_table when exception is not ResourceInUseException."""
        from app.services.invitation import InvitationService
        
        service = InvitationService()
        
        with patch.object(service.dynamodb, 'create_table') as mock_create:
            # Mock create_table to raise a different error
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalError'}}, 
                operation_name='CreateTable'
            )
            
            # Should re-raise the original exception
            with pytest.raises(ClientError):
                service._create_table()


class TestFinalModels:
    """Test final missing Models coverage."""
    
    def test_pagination_validator_edge_cases(self):
        """Test PaginationParams validators with edge cases."""
        from app.models.common import PaginationParams
        
        # Test valid edge values
        p1 = PaginationParams(page=1, page_size=1)
        assert p1.validate_page(1) == 1
        assert p1.validate_page_size(1) == 1
        
        p2 = PaginationParams(page=100, page_size=100)
        assert p2.validate_page(100) == 100
        assert p2.validate_page_size(100) == 100
        
        # Test invalid values raise errors
        with pytest.raises(ValueError) as exc_info:
            p1.validate_page(0)
        assert "Page must be >= 1" in str(exc_info.value)
        
        with pytest.raises(ValueError) as exc_info:
            p1.validate_page_size(0)
        assert "Page size must be between 1 and 100" in str(exc_info.value)
        
        with pytest.raises(ValueError) as exc_info:
            p1.validate_page_size(101)
        assert "Page size must be between 1 and 100" in str(exc_info.value)
    
    def test_user_create_password_validator(self):
        """Test UserCreate password validator."""
        from app.models.user import UserCreate
        
        # Test valid password
        user = UserCreate(
            email="test@example.com",
            username="testuser",
            password="ValidPass123",
            full_name="Test User"
        )
        assert user.validate_password("ValidPass123") == "ValidPass123"
        
        # Test invalid password
        with pytest.raises(ValueError) as exc_info:
            user.validate_password("short")
        assert "Password must be at least 8 characters" in str(exc_info.value)