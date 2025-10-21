"""
Tests to achieve 100% code coverage for Cognito service.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
import sys
import os


class TestCognitoServiceCoverage:
    """Test Cognito service coverage."""
    
    def test_create_test_pool_exception_no_match(self):
        """Test _create_test_pool when exception and no pool matches."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                
                # Create service instance
                service = CognitoService()
                
                # Clear the environment variables to trigger pool creation
                del os.environ['COGNITO_USER_POOL_ID']
                service.user_pool_id = None
                
                # Mock create_user_pool to raise ClientError
                mock_client.create_user_pool.side_effect = ClientError(
                    error_response={'Error': {'Code': 'SomeOtherError'}}, 
                    operation_name='CreateUserPool'
                )
                
                # Mock list_user_pools to return no matching pool
                mock_client.list_user_pools.return_value = {
                    'UserPools': [
                        {'Name': 'other-pool', 'Id': 'other-id'}
                    ]
                }
                
                # Should re-raise the original exception
                with pytest.raises(ClientError):
                    service._create_test_pool()
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_create_test_client_exception_no_match(self):
        """Test _create_test_client when exception and no client matches."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                
                # Create service instance
                service = CognitoService()
                
                # Clear the client ID to trigger client creation
                del os.environ['COGNITO_CLIENT_ID']
                service.client_id = None
                service.user_pool_id = 'test-pool-id'  # Ensure pool ID is set
                
                # Mock create_user_pool_client to raise ClientError
                mock_client.create_user_pool_client.side_effect = ClientError(
                    error_response={'Error': {'Code': 'SomeOtherError'}}, 
                    operation_name='CreateUserPoolClient'
                )
                
                # Mock list_user_pool_clients to return no matching client
                mock_client.list_user_pool_clients.return_value = {
                    'UserPoolClients': [
                        {'ClientName': 'other-client', 'ClientId': 'other-id'}
                    ]
                }
                
                # Should re-raise the original exception
                with pytest.raises(ClientError):
                    service._create_test_client()
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_username_by_email_found(self):
        """Test _get_username_by_email when user is found."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                
                # Create service instance
                service = CognitoService()
                
                # Mock list_users response
                mock_client.list_users.return_value = {
                    'Users': [
                        {'Username': 'test-username', 'Attributes': []}
                    ]
                }
                
                result = service._get_username_by_email("test@example.com")
                assert result == 'test-username'
                
                # Verify list_users was called with correct parameters
                mock_client.list_users.assert_called_once_with(
                    UserPoolId='test-pool-id',
                    Filter='email = "test@example.com"',
                    Limit=1
                )
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_refresh_token_not_authorized(self):
        """Test refresh_token with NotAuthorizedException."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                from app.services.exceptions import InvalidCredentialsError
                
                # Create service instance
                service = CognitoService()
                
                # Mock initiate_auth to raise NotAuthorizedException
                mock_client.initiate_auth.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                    operation_name='InitiateAuth'
                )
                
                with pytest.raises(InvalidCredentialsError) as exc_info:
                    service.refresh_token("invalid_token")
                
                assert "Invalid refresh token" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_user_not_authorized(self):
        """Test get_user with NotAuthorizedException."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                from app.services.exceptions import InvalidCredentialsError
                
                # Create service instance
                service = CognitoService()
                
                # Mock get_user to raise NotAuthorizedException
                mock_client.get_user.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                    operation_name='GetUser'
                )
                
                with pytest.raises(InvalidCredentialsError) as exc_info:
                    service.get_user("invalid_token")
                
                assert "Invalid access token" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_update_user_not_authorized(self):
        """Test update_user with NotAuthorizedException."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Set environment variables before import
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Now import the module with the mock in place
                from app.services.cognito import CognitoService
                from app.models.user import UserUpdate
                from app.services.exceptions import InvalidCredentialsError
                
                # Create service instance
                service = CognitoService()
                
                # Create update object
                update = UserUpdate(full_name="New Name")
                
                # Mock update_user_attributes to raise NotAuthorizedException
                mock_client.update_user_attributes.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}}, 
                    operation_name='UpdateUserAttributes'
                )
                
                with pytest.raises(InvalidCredentialsError) as exc_info:
                    service.update_user("invalid_token", update)
                
                assert "Invalid access token" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']