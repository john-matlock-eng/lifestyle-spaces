"""
Tests to achieve 100% coverage for cognito service.
"""
import pytest
from unittest.mock import Mock, patch
from moto import mock_cognitoidp
from botocore.exceptions import ClientError


class TestCognitoServiceMissingCoverage:
    """Test missing coverage areas in Cognito service."""

    def test_create_test_pool_client_exists(self):
        """Test initialization with environment variables set."""
        import os
        
        # Set environment variables to bypass initialization
        original_pool = os.environ.get('COGNITO_USER_POOL_ID')
        original_client = os.environ.get('COGNITO_CLIENT_ID')
        
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Import inside try block to ensure env vars are set
            from app.services.cognito import CognitoService
            
            # Use patch to mock boto3 client
            with patch('app.services.cognito.boto3.client') as mock_boto_client:
                mock_client = Mock()
                # Mock the create_user_pool method to return proper structure
                mock_client.create_user_pool.return_value = {
                    'UserPool': {'Id': 'test-pool-id'}
                }
                # Mock the create_user_pool_client method
                mock_client.create_user_pool_client.return_value = {
                    'UserPoolClient': {'ClientId': 'test-client-id'}
                }
                mock_boto_client.return_value = mock_client
                
                service = CognitoService()
                assert service.client_id == 'test-client-id'
                assert service.user_pool_id == 'test-pool-id'
        finally:
            # Restore original values or remove if they didn't exist
            if original_pool:
                os.environ['COGNITO_USER_POOL_ID'] = original_pool
            else:
                os.environ.pop('COGNITO_USER_POOL_ID', None)
            if original_client:
                os.environ['COGNITO_CLIENT_ID'] = original_client
            else:
                os.environ.pop('COGNITO_CLIENT_ID', None)

    @mock_cognitoidp
    def test_create_test_pool_already_exists(self):
        """Test when user pool already exists - tests the catch block."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Now test the exception handling in _create_test_pool
        with patch.object(service.client, 'create_user_pool') as mock_create, \
             patch.object(service.client, 'list_user_pools') as mock_list:
            
            # Mock create_user_pool to raise ClientError
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceInUseException'}}, 
                operation_name='CreateUserPool'
            )
            
            # Mock list_user_pools to return existing pool
            mock_list.return_value = {
                'UserPools': [
                    {'Name': 'lifestyle-spaces-test', 'Id': 'existing-pool-id'}
                ]
            }
            
            result = service._create_test_pool()
            assert result == 'existing-pool-id'
    
    @mock_cognitoidp
    def test_create_test_client_already_exists(self):
        """Test when user pool client already exists - tests the catch block."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Now test the exception handling in _create_test_client
        with patch.object(service.client, 'create_user_pool_client') as mock_create, \
             patch.object(service.client, 'list_user_pool_clients') as mock_list:
            
            # Mock create_user_pool_client to raise ClientError
            mock_create.side_effect = ClientError(
                error_response={'Error': {'Code': 'ResourceInUseException'}}, 
                operation_name='CreateUserPoolClient'
            )
            
            # Mock list_user_pool_clients to return existing client
            mock_list.return_value = {
                'UserPoolClients': [
                    {'ClientName': 'lifestyle-spaces-test-client', 'ClientId': 'existing-client-id'}
                ]
            }
            
            result = service._create_test_client()
            assert result == 'existing-client-id'

    @mock_cognitoidp
    def test_sign_up_generic_error(self):
        """Test sign_up with generic error."""
        from app.services.cognito import CognitoService
        from app.models.user import UserCreate
        from app.services.exceptions import UserAlreadyExistsError
        
        service = CognitoService()
        user = UserCreate(
            email="test@example.com",
            username="testuser", 
            password="Test123!@#",
            full_name="Test User"
        )
        
        # Mock the Cognito client to raise a generic ClientError
        with patch.object(service.client, 'sign_up') as mock_signup:
            mock_signup.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='SignUp'
            )
            
            # This should re-raise the ClientError as-is since it's not a known error
            with pytest.raises(ClientError):
                service.sign_up(user)

    @mock_cognitoidp
    def test_sign_in_user_not_confirmed_error(self):
        """Test sign_in when user is not confirmed - this is handled as InvalidCredentialsError."""
        from app.services.cognito import CognitoService
        from app.models.user import LoginRequest
        from app.services.exceptions import InvalidCredentialsError
        
        service = CognitoService()
        
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        
        # Mock the sign in to raise UserNotConfirmedException - handled same as NotAuthorizedException
        with patch.object(service.client, 'initiate_auth') as mock_auth:
            mock_auth.side_effect = ClientError(
                error_response={'Error': {'Code': 'UserNotConfirmedException', 'Message': 'User not confirmed'}}, 
                operation_name='InitiateAuth'
            )
            
            # UserNotConfirmedException is not in the handled exceptions list, so it re-raises
            with pytest.raises(ClientError):
                service.sign_in(login)

    @mock_cognitoidp
    def test_sign_in_generic_error(self):
        """Test sign_in with generic error."""
        from app.services.cognito import CognitoService
        from app.models.user import LoginRequest
        
        service = CognitoService()
        login = LoginRequest(
            email="test@example.com",
            password="Test123!@#"
        )
        
        # Mock the Cognito client to raise a generic ClientError
        with patch.object(service.client, 'initiate_auth') as mock_auth:
            mock_auth.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='InitiateAuth'
            )
            
            # This should re-raise the ClientError as-is since it's not a known error
            with pytest.raises(ClientError):
                service.sign_in(login)

    @mock_cognitoidp
    def test_refresh_token_generic_error(self):
        """Test refresh_token with generic error."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Mock the Cognito client to raise a generic ClientError
        with patch.object(service.client, 'initiate_auth') as mock_auth:
            mock_auth.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='InitiateAuth'
            )
            
            # This should re-raise the ClientError as-is since it's not a known error
            with pytest.raises(ClientError):
                service.refresh_token("refresh_token")

    @mock_cognitoidp
    def test_get_user_generic_error(self):
        """Test get_user with generic error."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Mock the Cognito client to raise a generic ClientError
        with patch.object(service.client, 'get_user') as mock_get:
            mock_get.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='GetUser'
            )
            
            # This should re-raise the ClientError as-is since it's not a known error
            with pytest.raises(ClientError):
                service.get_user("access_token")

    @mock_cognitoidp
    def test_update_user_generic_error(self):
        """Test update_user with generic error."""
        from app.services.cognito import CognitoService
        from app.models.user import UserUpdate
        
        service = CognitoService()
        update = UserUpdate(full_name="Updated Name")
        
        # Mock the Cognito client to raise a generic ClientError
        with patch.object(service.client, 'update_user_attributes') as mock_update:
            mock_update.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='UpdateUserAttributes'
            )
            
            # This should re-raise the ClientError as-is since it's not a known error
            with pytest.raises(ClientError):
                service.update_user("access_token", update)

    @mock_cognitoidp
    def test_sign_out_error_ignored(self):
        """Test sign_out ignores errors."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Mock the Cognito client to raise a ClientError
        with patch.object(service.client, 'global_sign_out') as mock_signout:
            mock_signout.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException', 'Message': 'Internal error'}}, 
                operation_name='GlobalSignOut'
            )
            
            # Sign out should not raise - errors are ignored
            service.sign_out("access_token")
            # Test passes if no exception is raised
    
    @mock_cognitoidp 
    def test_update_user_with_email(self):
        """Test update_user with email update."""
        from app.services.cognito import CognitoService
        from app.models.user import UserUpdate
        
        service = CognitoService()
        update = UserUpdate(email="newemail@example.com")
        
        with patch.object(service.client, 'update_user_attributes') as mock_update:
            mock_update.return_value = {}
            
            service.update_user("access_token", update)
            
            # Verify email attribute was sent
            mock_update.assert_called_once()
            call_args = mock_update.call_args
            attrs = call_args[1]['UserAttributes']
            assert any(attr['Name'] == 'email' and attr['Value'] == 'newemail@example.com' for attr in attrs)
    
    @mock_cognitoidp
    def test_confirm_user_already_confirmed(self):
        """Test confirm_user when user is already confirmed."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        # Mock admin_confirm_sign_up to raise an error (user already confirmed)
        with patch.object(service.client, 'admin_confirm_sign_up') as mock_confirm:
            mock_confirm.side_effect = ClientError(
                error_response={'Error': {'Code': 'InvalidParameterException'}}, 
                operation_name='AdminConfirmSignUp'
            )
            
            # Should not raise, just pass silently
            service.confirm_user("test@example.com")
    
    @mock_cognitoidp
    def test_get_username_by_email_not_found(self):
        """Test _get_username_by_email when no user is found."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        with patch.object(service.client, 'list_users') as mock_list:
            mock_list.return_value = {'Users': []}
            
            result = service._get_username_by_email("notfound@example.com")
            assert result is None
    
    @mock_cognitoidp
    def test_get_username_by_email_error(self):
        """Test _get_username_by_email when error occurs."""
        from app.services.cognito import CognitoService
        
        service = CognitoService()
        
        with patch.object(service.client, 'list_users') as mock_list:
            mock_list.side_effect = ClientError(
                error_response={'Error': {'Code': 'InternalErrorException'}}, 
                operation_name='ListUsers'
            )
            
            result = service._get_username_by_email("error@example.com")
            assert result is None