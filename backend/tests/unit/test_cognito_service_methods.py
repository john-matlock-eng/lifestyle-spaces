"""
Tests for Cognito service main methods.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
import sys
import os


class TestCognitoServiceMethods:
    """Test Cognito service main methods for coverage."""
    
    def test_sign_up_success(self):
        """Test successful user sign up."""
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
                from app.models.user import UserCreate
                
                # Create service instance
                service = CognitoService()
                
                # Mock sign_up response
                mock_client.sign_up.return_value = {
                    'UserSub': 'test-user-sub-123'
                }
                
                # Create test user
                user = UserCreate(
                    email="test@example.com",
                    username="testuser",
                    password="Test123!@#",
                    full_name="Test User"
                )
                
                # Call sign_up
                result = service.sign_up(user)
                
                # Verify the result
                assert result['user_sub'] == 'test-user-sub-123'
                assert result['username'] == 'testuser'
                assert result['email'] == 'test@example.com'
                
                # Verify sign_up was called correctly
                mock_client.sign_up.assert_called_once()
                call_args = mock_client.sign_up.call_args
                assert call_args.kwargs['ClientId'] == 'test-client-id'
                assert call_args.kwargs['Username'] == 'test@example.com'
                assert call_args.kwargs['Password'] == 'Test123!@#'
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_confirm_user_success(self):
        """Test successful user confirmation."""
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
                
                # Mock admin_confirm_sign_up to succeed
                mock_client.admin_confirm_sign_up.return_value = {}
                
                # Call confirm_user
                service.confirm_user('test@example.com')
                
                # Verify admin_confirm_sign_up was called
                mock_client.admin_confirm_sign_up.assert_called_once_with(
                    UserPoolId='test-pool-id',
                    Username='test@example.com'
                )
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_confirm_user_error_ignored(self):
        """Test user confirmation with error (should be ignored)."""
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
                
                # Mock admin_confirm_sign_up to raise error (already confirmed)
                mock_client.admin_confirm_sign_up.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}},
                    operation_name='AdminConfirmSignUp'
                )
                
                # Call confirm_user - should not raise
                service.confirm_user('test@example.com')
                
                # Verify admin_confirm_sign_up was called
                mock_client.admin_confirm_sign_up.assert_called_once()
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_up_user_already_exists(self):
        """Test sign up when user already exists."""
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
                from app.models.user import UserCreate
                from app.services.exceptions import UserAlreadyExistsError
                
                # Create service instance
                service = CognitoService()
                
                # Mock sign_up to raise UsernameExistsException
                mock_client.sign_up.side_effect = ClientError(
                    error_response={'Error': {'Code': 'UsernameExistsException'}},
                    operation_name='SignUp'
                )
                
                # Create test user
                user = UserCreate(
                    email="test@example.com",
                    username="testuser",
                    password="Test123!@#",
                    full_name="Test User"
                )
                
                # Call sign_up and expect error
                with pytest.raises(UserAlreadyExistsError) as exc_info:
                    service.sign_up(user)
                
                assert "already exists" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_up_generic_error(self):
        """Test sign up with generic error."""
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
                from app.models.user import UserCreate
                
                # Create service instance
                service = CognitoService()
                
                # Mock sign_up to raise generic error
                mock_client.sign_up.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='SignUp'
                )
                
                # Create test user
                user = UserCreate(
                    email="test@example.com",
                    username="testuser",
                    password="Test123!@#",
                    full_name="Test User"
                )
                
                # Call sign_up and expect re-raise
                with pytest.raises(ClientError):
                    service.sign_up(user)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_in_success(self):
        """Test successful sign in."""
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
                from app.models.user import LoginRequest
                
                # Create service instance
                service = CognitoService()
                
                # Mock initiate_auth response
                mock_client.initiate_auth.return_value = {
                    'AuthenticationResult': {
                        'AccessToken': 'test-access-token',
                        'IdToken': 'test-id-token',
                        'RefreshToken': 'test-refresh-token',
                        'ExpiresIn': 3600
                    }
                }
                
                # Create login request
                login = LoginRequest(
                    email="test@example.com",
                    password="Test123!@#"
                )
                
                # Call sign_in
                result = service.sign_in(login)
                
                # Verify the result
                assert result['access_token'] == 'test-access-token'
                assert result['id_token'] == 'test-id-token'
                assert result['refresh_token'] == 'test-refresh-token'
                assert result['expires_in'] == 3600
                
                # Verify initiate_auth was called correctly
                mock_client.initiate_auth.assert_called_once()
                call_args = mock_client.initiate_auth.call_args
                assert call_args.kwargs['ClientId'] == 'test-client-id'
                assert call_args.kwargs['AuthFlow'] == 'USER_PASSWORD_AUTH'
                assert call_args.kwargs['AuthParameters']['USERNAME'] == 'test@example.com'
                assert call_args.kwargs['AuthParameters']['PASSWORD'] == 'Test123!@#'
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_in_invalid_credentials(self):
        """Test sign in with invalid credentials."""
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
                from app.models.user import LoginRequest
                from app.services.exceptions import InvalidCredentialsError
                
                # Create service instance
                service = CognitoService()
                
                # Mock initiate_auth to raise NotAuthorizedException
                mock_client.initiate_auth.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}},
                    operation_name='InitiateAuth'
                )
                
                # Create login request
                login = LoginRequest(
                    email="test@example.com",
                    password="WrongPassword"
                )
                
                # Call sign_in and expect error
                with pytest.raises(InvalidCredentialsError) as exc_info:
                    service.sign_in(login)
                
                assert "Invalid email or password" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_in_generic_error(self):
        """Test sign in with generic error."""
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
                from app.models.user import LoginRequest
                
                # Create service instance
                service = CognitoService()
                
                # Mock initiate_auth to raise generic error
                mock_client.initiate_auth.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='InitiateAuth'
                )
                
                # Create login request
                login = LoginRequest(
                    email="test@example.com",
                    password="Test123!@#"
                )
                
                # Call sign_in and expect re-raise
                with pytest.raises(ClientError):
                    service.sign_in(login)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_in_user_not_found(self):
        """Test sign in when user not found."""
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
                from app.models.user import LoginRequest
                from app.services.exceptions import InvalidCredentialsError
                
                # Create service instance
                service = CognitoService()
                
                # Mock initiate_auth to raise UserNotFoundException
                mock_client.initiate_auth.side_effect = ClientError(
                    error_response={'Error': {'Code': 'UserNotFoundException'}},
                    operation_name='InitiateAuth'
                )
                
                # Create login request
                login = LoginRequest(
                    email="notfound@example.com",
                    password="Test123!@#"
                )
                
                # Call sign_in and expect error
                with pytest.raises(InvalidCredentialsError) as exc_info:
                    service.sign_in(login)
                
                assert "Invalid email or password" in str(exc_info.value)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_username_by_email_not_found(self):
        """Test _get_username_by_email when user not found."""
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
                
                # Mock list_users to return empty
                mock_client.list_users.return_value = {
                    'Users': []
                }
                
                result = service._get_username_by_email("notfound@example.com")
                assert result is None
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_username_by_email_client_error(self):
        """Test _get_username_by_email when ClientError occurs."""
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
                
                # Mock list_users to raise ClientError
                mock_client.list_users.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='ListUsers'
                )
                
                result = service._get_username_by_email("error@example.com")
                assert result is None
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_refresh_token_success(self):
        """Test successful token refresh."""
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
                
                # Mock initiate_auth response
                mock_client.initiate_auth.return_value = {
                    'AuthenticationResult': {
                        'AccessToken': 'new-access-token',
                        'IdToken': 'new-id-token',
                        'ExpiresIn': 3600
                    }
                }
                
                # Call refresh_token
                result = service.refresh_token('test-refresh-token')
                
                # Verify the result
                assert result['access_token'] == 'new-access-token'
                assert result['id_token'] == 'new-id-token'
                assert result['expires_in'] == 3600
                
                # Verify initiate_auth was called correctly
                mock_client.initiate_auth.assert_called_once_with(
                    ClientId='test-client-id',
                    AuthFlow='REFRESH_TOKEN_AUTH',
                    AuthParameters={'REFRESH_TOKEN': 'test-refresh-token'}
                )
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_refresh_token_generic_error(self):
        """Test refresh_token with generic error."""
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
                
                # Mock initiate_auth to raise generic ClientError
                mock_client.initiate_auth.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='InitiateAuth'
                )
                
                # Call refresh_token and expect re-raise
                with pytest.raises(ClientError):
                    service.refresh_token('test-refresh-token')
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_out_success(self):
        """Test successful sign out."""
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
                
                # Mock global_sign_out to succeed
                mock_client.global_sign_out.return_value = {}
                
                # Call sign_out
                service.sign_out('test-access-token')
                
                # Verify global_sign_out was called
                mock_client.global_sign_out.assert_called_once_with(
                    AccessToken='test-access-token'
                )
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_sign_out_with_error(self):
        """Test sign out with error (should be ignored)."""
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
                
                # Mock global_sign_out to raise error
                mock_client.global_sign_out.side_effect = ClientError(
                    error_response={'Error': {'Code': 'NotAuthorizedException'}},
                    operation_name='GlobalSignOut'
                )
                
                # Call sign_out - should not raise
                service.sign_out('invalid-token')
                
                # Verify global_sign_out was called
                mock_client.global_sign_out.assert_called_once()
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_user_success(self):
        """Test successful get user."""
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
                
                # Mock get_user response
                mock_client.get_user.return_value = {
                    'Username': 'testuser',
                    'UserAttributes': [
                        {'Name': 'sub', 'Value': 'user-sub-123'},
                        {'Name': 'email', 'Value': 'test@example.com'},
                        {'Name': 'name', 'Value': 'Test User'},
                        {'Name': 'preferred_username', 'Value': 'testuser'}
                    ]
                }
                
                # Call get_user
                result = service.get_user('test-access-token')
                
                # Verify the result
                assert result['username'] == 'testuser'
                assert result['id'] == 'user-sub-123'
                assert result['email'] == 'test@example.com'
                assert result['full_name'] == 'Test User'
                assert result['preferred_username'] == 'testuser'
                
                # Verify get_user was called
                mock_client.get_user.assert_called_once_with(
                    AccessToken='test-access-token'
                )
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_get_user_generic_error(self):
        """Test get_user with generic error."""
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
                
                # Mock get_user to raise generic error
                mock_client.get_user.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='GetUser'
                )
                
                # Call get_user and expect re-raise
                with pytest.raises(ClientError):
                    service.get_user('test-access-token')
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_update_user_with_email(self):
        """Test update user with email change."""
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
                
                # Create service instance
                service = CognitoService()
                
                # Mock update_user_attributes to succeed
                mock_client.update_user_attributes.return_value = {}
                
                # Create update with email
                update = UserUpdate(email="newemail@example.com", full_name="New Name")
                
                # Call update_user
                service.update_user('test-access-token', update)
                
                # Verify update_user_attributes was called with correct attributes
                mock_client.update_user_attributes.assert_called_once()
                call_args = mock_client.update_user_attributes.call_args
                assert call_args.kwargs['AccessToken'] == 'test-access-token'
                attrs = call_args.kwargs['UserAttributes']
                assert len(attrs) == 2
                assert {'Name': 'email', 'Value': 'newemail@example.com'} in attrs
                assert {'Name': 'name', 'Value': 'New Name'} in attrs
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_update_user_generic_error(self):
        """Test update_user with generic error."""
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
                
                # Create service instance
                service = CognitoService()
                
                # Mock update_user_attributes to raise generic error
                mock_client.update_user_attributes.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InternalError'}},
                    operation_name='UpdateUserAttributes'
                )
                
                # Create update
                update = UserUpdate(full_name="New Name")
                
                # Call update_user and expect re-raise
                with pytest.raises(ClientError):
                    service.update_user('test-access-token', update)
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_create_test_pool_already_exists(self):
        """Test _create_test_pool when pool already exists."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Don't set pool ID to trigger creation
        os.environ.pop('COGNITO_USER_POOL_ID', None)
        os.environ['COGNITO_CLIENT_ID'] = 'test-client-id'
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Mock create_user_pool to raise error (pool exists)
                mock_client.create_user_pool.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InvalidParameterException'}},
                    operation_name='CreateUserPool'
                )
                
                # Mock list_user_pools to return the existing pool
                mock_client.list_user_pools.return_value = {
                    'UserPools': [
                        {'Name': 'lifestyle-spaces-test', 'Id': 'existing-pool-id'}
                    ]
                }
                
                # Now import the module - this will trigger pool creation
                from app.services.cognito import CognitoService
                
                # Create service instance
                service = CognitoService()
                
                # Verify the pool ID was set from the existing pool
                assert service.user_pool_id == 'existing-pool-id'
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']
    
    def test_create_test_client_already_exists(self):
        """Test _create_test_client when client already exists."""
        # Remove the module if it was already imported
        if 'app.services.cognito' in sys.modules:
            del sys.modules['app.services.cognito']
        
        # Don't set client ID to trigger creation
        os.environ['COGNITO_USER_POOL_ID'] = 'test-pool-id'
        os.environ.pop('COGNITO_CLIENT_ID', None)
        
        try:
            # Mock boto3.client before importing the module
            with patch('boto3.client') as mock_boto_client:
                mock_client = MagicMock()
                mock_boto_client.return_value = mock_client
                
                # Mock create_user_pool_client to raise error (client exists)
                mock_client.create_user_pool_client.side_effect = ClientError(
                    error_response={'Error': {'Code': 'InvalidParameterException'}},
                    operation_name='CreateUserPoolClient'
                )
                
                # Mock list_user_pool_clients to return the existing client
                mock_client.list_user_pool_clients.return_value = {
                    'UserPoolClients': [
                        {'ClientName': 'lifestyle-spaces-test-client', 'ClientId': 'existing-client-id'}
                    ]
                }
                
                # Now import the module - this will trigger client creation
                from app.services.cognito import CognitoService
                
                # Create service instance
                service = CognitoService()
                
                # Verify the client ID was set from the existing client
                assert service.client_id == 'existing-client-id'
                    
        finally:
            # Clean up environment
            os.environ.pop('COGNITO_USER_POOL_ID', None)
            os.environ.pop('COGNITO_CLIENT_ID', None)
            # Remove the module to ensure clean state for other tests
            if 'app.services.cognito' in sys.modules:
                del sys.modules['app.services.cognito']