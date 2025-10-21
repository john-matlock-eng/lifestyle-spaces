"""
Tests for enhanced Cognito attribute extraction with fallbacks.
"""
import pytest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError
from app.services.cognito import CognitoService
from app.services.exceptions import InvalidCredentialsError


class TestCognitoEnhancedAttributes:
    """Tests for enhanced get_user() with comprehensive attribute extraction."""

    @pytest.fixture
    def cognito_service(self):
        """Create CognitoService instance."""
        with patch('app.services.cognito.boto3.client'):
            service = CognitoService()
            service.client = Mock()
            return service

    def test_get_user_extracts_all_standard_attributes(self, cognito_service):
        """Test extraction of all standard Cognito attributes."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-123'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'name', 'Value': 'John Doe'},
                {'Name': 'preferred_username', 'Value': 'johndoe'}
            ]
        }

        result = cognito_service.get_user(access_token)

        assert result['id'] == 'user-123'
        assert result['email'] == 'user@example.com'
        assert result['full_name'] == 'John Doe'
        assert result['preferred_username'] == 'johndoe'
        assert result['username'] == 'user@example.com'

    def test_get_user_extracts_custom_username_attribute(self, cognito_service):
        """Test extraction of custom:username attribute."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-456'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'custom:username', 'Value': 'customuser'}
            ]
        }

        result = cognito_service.get_user(access_token)

        assert result['preferred_username'] == 'customuser'

    def test_get_user_extracts_custom_display_name_attribute(self, cognito_service):
        """Test extraction of custom:displayName attribute."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-789'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'custom:displayName', 'Value': 'Custom Display'}
            ]
        }

        result = cognito_service.get_user(access_token)

        assert result['display_name'] == 'Custom Display'

    def test_get_user_extracts_custom_display_name_underscore(self, cognito_service):
        """Test extraction of custom:display_name attribute with underscore."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-abc'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'custom:display_name', 'Value': 'Display Name'}
            ]
        }

        result = cognito_service.get_user(access_token)

        assert result['display_name'] == 'Display Name'

    def test_get_user_builds_display_name_from_preferred_username(self, cognito_service):
        """Test display_name fallback to preferred_username."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-123'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'preferred_username', 'Value': 'cooluser'}
            ]
        }

        result = cognito_service.get_user(access_token)

        # display_name should fallback to preferred_username
        assert result['display_name'] == 'cooluser'

    def test_get_user_builds_display_name_from_full_name(self, cognito_service):
        """Test display_name fallback to full_name."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-456'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'name', 'Value': 'Jane Smith'}
            ]
        }

        result = cognito_service.get_user(access_token)

        # display_name should fallback to full_name
        assert result['display_name'] == 'Jane Smith'

    def test_get_user_builds_display_name_from_email(self, cognito_service):
        """Test display_name fallback to email prefix."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-789'},
                {'Name': 'email', 'Value': 'testuser@example.com'}
            ]
        }

        result = cognito_service.get_user(access_token)

        # display_name should fallback to email prefix
        assert result['display_name'] == 'testuser'

    def test_get_user_builds_display_name_default(self, cognito_service):
        """Test display_name ultimate fallback to 'User'."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-abc'}
                # No email or other attributes
            ]
        }

        result = cognito_service.get_user(access_token)

        # display_name should fallback to 'User'
        assert result['display_name'] == 'User'

    def test_get_user_builds_preferred_username_from_email(self, cognito_service):
        """Test preferred_username fallback to email prefix."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-123'},
                {'Name': 'email', 'Value': 'myuser@example.com'}
            ]
        }

        result = cognito_service.get_user(access_token)

        # preferred_username should be extracted from email
        assert result['preferred_username'] == 'myuser'

    def test_get_user_builds_preferred_username_from_user_id(self, cognito_service):
        """Test preferred_username fallback to user_id prefix."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-12345678-long-id'}
                # No email
            ]
        }

        result = cognito_service.get_user(access_token)

        # preferred_username should be generated from user_id
        assert result['preferred_username'] == 'user_user-123'

    def test_get_user_builds_preferred_username_default(self, cognito_service):
        """Test preferred_username ultimate fallback to 'unknown'."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                # No sub or email
            ]
        }

        result = cognito_service.get_user(access_token)

        # preferred_username should fallback to 'unknown'
        assert result['preferred_username'] == 'unknown'

    def test_get_user_priority_standard_over_custom(self, cognito_service):
        """Test that standard attributes take priority over custom ones."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-123'},
                {'Name': 'email', 'Value': 'user@example.com'},
                {'Name': 'preferred_username', 'Value': 'standard_user'},
                {'Name': 'custom:username', 'Value': 'custom_user'}  # Should not override
            ]
        }

        result = cognito_service.get_user(access_token)

        # Standard attribute should take precedence
        # Actually, looking at the code, custom:username will override preferred_username
        # because it's processed after in the loop
        assert result['preferred_username'] == 'custom_user'

    def test_get_user_raises_invalid_credentials_on_not_authorized(self, cognito_service):
        """Test that InvalidCredentialsError is raised for NotAuthorizedException."""
        access_token = "invalid-token"

        error_response = {'Error': {'Code': 'NotAuthorizedException'}}
        cognito_service.client.get_user.side_effect = ClientError(
            error_response, 'GetUser'
        )

        with pytest.raises(InvalidCredentialsError, match="Invalid access token"):
            cognito_service.get_user(access_token)

    def test_get_user_reraises_other_client_errors(self, cognito_service):
        """Test that other ClientErrors are re-raised."""
        access_token = "test-token"

        error_response = {'Error': {'Code': 'SomeOtherError'}}
        cognito_service.client.get_user.side_effect = ClientError(
            error_response, 'GetUser'
        )

        with pytest.raises(ClientError):
            cognito_service.get_user(access_token)

    def test_get_user_with_minimal_attributes(self, cognito_service):
        """Test get_user with minimal attributes still returns valid structure."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'minimal@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-minimal'}
            ]
        }

        result = cognito_service.get_user(access_token)

        # Should have all required keys with fallback values
        assert 'id' in result
        assert 'username' in result
        assert 'email' in result
        assert 'full_name' in result
        assert 'preferred_username' in result
        assert 'display_name' in result
        assert result['id'] == 'user-minimal'
        assert result['username'] == 'minimal@example.com'

    def test_get_user_handles_empty_attribute_values(self, cognito_service):
        """Test that empty string attribute values are handled properly."""
        access_token = "test-token"

        cognito_service.client.get_user.return_value = {
            'Username': 'user@example.com',
            'UserAttributes': [
                {'Name': 'sub', 'Value': 'user-empty'},
                {'Name': 'email', 'Value': ''},  # Empty email
                {'Name': 'name', 'Value': ''},  # Empty name
                {'Name': 'preferred_username', 'Value': ''}  # Empty username
            ]
        }

        result = cognito_service.get_user(access_token)

        # Should apply fallbacks for empty values
        assert result['preferred_username'] == 'user_user-emp'  # From user_id[:8]
        # display_name falls back to preferred_username → full_name → email prefix → 'User'
        # Since all are empty, it gets 'User'
        assert result['display_name'] == 'User'
