"""
Tests for uncovered lines in cognito.py to achieve 100% coverage.
"""
import os
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError


class TestCognitoUncoveredLines:
    """Test uncovered lines in Cognito service."""
    
    def test_create_test_pool_reraise_exception(self):
        """Test _create_test_pool re-raises exception when pool not found (line 62)."""
        # Remove env vars to force pool creation
        old_pool_id = os.environ.pop('COGNITO_USER_POOL_ID', None)
        old_client_id = os.environ.pop('COGNITO_CLIENT_ID', None)
        
        try:
            with patch('app.services.cognito.boto3.client') as mock_boto:
                mock_client = Mock()
                mock_boto.return_value = mock_client
                
                # First, mock successful pool creation for init
                mock_client.create_user_pool.return_value = {
                    'UserPool': {'Id': 'created-pool-id'}
                }
                mock_client.create_user_pool_client.return_value = {
                    'UserPoolClient': {'ClientId': 'created-client-id'}
                }
                
                from app.services.cognito import CognitoService
                service = CognitoService()
                
                # Now set up mocks for the actual test
                # Reset the mock for our specific test
                mock_client.create_user_pool.reset_mock()
                mock_client.create_user_pool.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}}, 
                    operation_name='CreateUserPool'
                )
                
                # Mock list_user_pools to return no matching pool
                mock_client.list_user_pools.return_value = {
                    'UserPools': [
                        {'Name': 'different-pool', 'Id': 'different-id'}
                    ]
                }
                
                # Should re-raise the original exception
                with pytest.raises(ClientError) as exc_info:
                    service._create_test_pool()
                assert exc_info.value.response['Error']['Code'] == 'InternalError'
                
        finally:
            # Restore env vars
            if old_pool_id:
                os.environ['COGNITO_USER_POOL_ID'] = old_pool_id
            if old_client_id:
                os.environ['COGNITO_CLIENT_ID'] = old_client_id
    
    def test_create_test_client_reraise_exception(self):
        """Test _create_test_client re-raises exception when client not found (line 86)."""
        # We need to set pool ID but not client ID
        old_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
        old_client_id = os.environ.pop('COGNITO_CLIENT_ID', None)
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        
        try:
            with patch('app.services.cognito.boto3.client') as mock_boto:
                mock_client = Mock()
                mock_boto.return_value = mock_client
                
                # First, mock successful client creation for init
                mock_client.create_user_pool_client.return_value = {
                    'UserPoolClient': {'ClientId': 'created-client-id'}
                }
                
                from app.services.cognito import CognitoService
                service = CognitoService()
                
                # Now set up mocks for the actual test
                mock_client.create_user_pool_client.reset_mock()
                mock_client.create_user_pool_client.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}}, 
                    operation_name='CreateUserPoolClient'
                )
                
                # Mock list_user_pool_clients to return no matching client
                mock_client.list_user_pool_clients.return_value = {
                    'UserPoolClients': [
                        {'ClientName': 'different-client', 'ClientId': 'different-id'}
                    ]
                }
                
                # Should re-raise the original exception
                with pytest.raises(ClientError) as exc_info:
                    service._create_test_client()
                assert exc_info.value.response['Error']['Code'] == 'InternalError'
                
        finally:
            # Restore env vars
            if old_pool_id:
                os.environ['COGNITO_USER_POOL_ID'] = old_pool_id
            else:
                os.environ.pop('COGNITO_USER_POOL_ID', None)
            if old_client_id:
                os.environ['COGNITO_CLIENT_ID'] = old_client_id
    
    def test_get_username_by_email_returns_found_user(self):
        """Test _get_username_by_email returns username when user found (line 153)."""
        # Set env vars to prevent pool/client creation
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        with patch('app.services.cognito.boto3.client') as mock_boto:
            mock_client = Mock()
            mock_boto.return_value = mock_client
            
            from app.services.cognito import CognitoService
            service = CognitoService()
            
            # Mock list_users to return a user
            mock_client.list_users.return_value = {
                'Users': [
                    {'Username': 'user123', 'Attributes': []}
                ]
            }
            
            result = service._get_username_by_email("test@example.com")
            assert result == 'user123'
    
    def test_refresh_token_invalid_credentials_error(self):
        """Test refresh_token raises InvalidCredentialsError (line 176)."""
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        with patch('app.services.cognito.boto3.client') as mock_boto:
            mock_client = Mock()
            mock_boto.return_value = mock_client
            
            from app.services.cognito import CognitoService
            from app.services.exceptions import InvalidCredentialsError
            
            service = CognitoService()
            
            # Mock to raise NotAuthorizedException
            mock_client.initiate_auth.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='InitiateAuth'
            )
            
            with pytest.raises(InvalidCredentialsError) as exc_info:
                service.refresh_token("invalid_token")
            assert "Invalid refresh token" in str(exc_info.value)
    
    def test_get_user_invalid_credentials_error(self):
        """Test get_user raises InvalidCredentialsError (line 208)."""
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        with patch('app.services.cognito.boto3.client') as mock_boto:
            mock_client = Mock()
            mock_boto.return_value = mock_client
            
            from app.services.cognito import CognitoService
            from app.services.exceptions import InvalidCredentialsError
            
            service = CognitoService()
            
            # Mock to raise NotAuthorizedException
            mock_client.get_user.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='GetUser'
            )
            
            with pytest.raises(InvalidCredentialsError) as exc_info:
                service.get_user("invalid_token")
            assert "Invalid access token" in str(exc_info.value)
    
    def test_update_user_invalid_credentials_error(self):
        """Test update_user raises InvalidCredentialsError (line 228)."""
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        with patch('app.services.cognito.boto3.client') as mock_boto:
            mock_client = Mock()
            mock_boto.return_value = mock_client
            
            from app.services.cognito import CognitoService
            from app.services.exceptions import InvalidCredentialsError
            from app.models.user import UserUpdate
            
            service = CognitoService()
            update = UserUpdate(full_name="New Name")
            
            # Mock to raise NotAuthorizedException
            mock_client.update_user_attributes.side_effect = ClientError(
                error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                operation_name='UpdateUserAttributes'
            )
            
            with pytest.raises(InvalidCredentialsError) as exc_info:
                service.update_user("invalid_token", update)
            assert "Invalid access token" in str(exc_info.value)