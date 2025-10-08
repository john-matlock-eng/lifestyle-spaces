"""
Tests for NULL profile fixes in user_profile service and dependencies.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from app.services.user_profile import UserProfileService
from app.core.dependencies import get_current_user
from fastapi import HTTPException


class TestNullProfileFixes:
    """Tests for NULL profile detection and auto-repair."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db):
        """Create UserProfileService with mocked database."""
        with patch('app.services.user_profile.get_db', return_value=mock_db):
            return UserProfileService()

    def test_get_or_create_fixes_null_email(self, service, mock_db):
        """Test that get_or_create_user_profile fixes NULL email."""
        user_id = "user-123"

        # Mock existing profile with NULL email
        existing_profile = {
            'id': user_id,
            'email': None,  # NULL email
            'username': 'testuser',
            'display_name': 'Test User'
        }

        mock_db.get_item.return_value = existing_profile
        mock_db.update_item.return_value = {}

        cognito_attributes = {
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User'
        }

        # Mock get_user_profile to return existing then updated profile
        with patch.object(service, 'get_user_profile') as mock_get:
            mock_get.side_effect = [
                existing_profile,  # First call returns profile with NULL
                {**existing_profile, 'email': 'test@example.com'}  # Second call returns fixed
            ]

            result = service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify update was called with email fix
        mock_db.update_item.assert_called()
        update_call = mock_db.update_item.call_args[0]
        assert update_call[0] == f"USER#{user_id}"
        assert update_call[1] == "PROFILE"
        updates = update_call[2]
        assert 'email' in updates
        assert updates['email'] == 'test@example.com'

    def test_get_or_create_fixes_null_username(self, service, mock_db):
        """Test that get_or_create_user_profile fixes NULL username."""
        user_id = "user-456"

        # Mock existing profile with NULL username
        existing_profile = {
            'id': user_id,
            'email': 'test@example.com',
            'username': None,  # NULL username
            'display_name': 'Test User'
        }

        mock_db.get_item.return_value = existing_profile
        mock_db.update_item.return_value = {}

        cognito_attributes = {
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User'
        }

        with patch.object(service, 'get_user_profile') as mock_get:
            mock_get.side_effect = [
                existing_profile,
                {**existing_profile, 'username': 'testuser'}
            ]

            result = service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify update was called with username fix
        mock_db.update_item.assert_called()
        update_call = mock_db.update_item.call_args[0]
        updates = update_call[2]
        assert 'username' in updates
        assert updates['username'] == 'testuser'

    def test_get_or_create_fixes_null_display_name(self, service, mock_db):
        """Test that get_or_create_user_profile fixes NULL display_name."""
        user_id = "user-789"

        # Mock existing profile with NULL display_name
        existing_profile = {
            'id': user_id,
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': None  # NULL display_name
        }

        mock_db.get_item.return_value = existing_profile
        mock_db.update_item.return_value = {}

        cognito_attributes = {
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User'
        }

        with patch.object(service, 'get_user_profile') as mock_get:
            mock_get.side_effect = [
                existing_profile,
                {**existing_profile, 'display_name': 'Test User'}
            ]

            result = service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify update was called with display_name fix
        mock_db.update_item.assert_called()
        update_call = mock_db.update_item.call_args[0]
        updates = update_call[2]
        assert 'display_name' in updates
        assert updates['display_name'] == 'Test User'

    def test_get_or_create_fixes_all_null_fields(self, service, mock_db):
        """Test fixing multiple NULL fields at once."""
        user_id = "user-all-null"

        # Mock profile with all NULL critical fields
        existing_profile = {
            'id': user_id,
            'email': None,
            'username': None,
            'display_name': None
        }

        mock_db.get_item.return_value = existing_profile
        mock_db.update_item.return_value = {}

        cognito_attributes = {
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': 'Test User'
        }

        with patch.object(service, 'get_user_profile') as mock_get:
            fixed_profile = {
                'id': user_id,
                'email': 'test@example.com',
                'username': 'testuser',
                'display_name': 'Test User'
            }
            mock_get.side_effect = [existing_profile, fixed_profile]

            result = service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify all fields were updated
        mock_db.update_item.assert_called()
        update_call = mock_db.update_item.call_args[0]
        updates = update_call[2]
        assert 'email' in updates
        assert 'username' in updates
        assert 'display_name' in updates

    def test_get_or_create_uses_fallback_email(self, service, mock_db):
        """Test that fallback email is used when cognito attributes are empty."""
        user_id = "user-fallback"

        # No existing profile
        mock_db.get_item.return_value = None
        mock_db.put_item.return_value = {}

        cognito_attributes = {
            'email': '',  # Empty email
            'username': 'testuser',
            'display_name': 'Test User'
        }

        with patch.object(service, 'get_user_profile', return_value=None):
            with patch.object(service, 'create_user_profile') as mock_create:
                mock_create.return_value = {'id': user_id}
                service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify create was called with fallback email
        mock_create.assert_called_once()
        profile_data = mock_create.call_args[0][1]
        assert profile_data['email'] == f"user_{user_id}@temp.local"

    def test_get_or_create_uses_fallback_username(self, service, mock_db):
        """Test that fallback username is generated when missing."""
        user_id = "user-12345678"

        mock_db.get_item.return_value = None

        cognito_attributes = {
            'email': 'test@example.com',
            'username': '',  # Empty username
            'display_name': 'Test User'
        }

        with patch.object(service, 'get_user_profile', return_value=None):
            with patch.object(service, 'create_user_profile') as mock_create:
                mock_create.return_value = {'id': user_id}
                service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify username was generated from user_id
        mock_create.assert_called_once()
        profile_data = mock_create.call_args[0][1]
        assert profile_data['username'] == f"user_{user_id[:8]}"

    def test_get_or_create_uses_fallback_display_name(self, service, mock_db):
        """Test that fallback display_name is generated when missing."""
        user_id = "user-display"

        mock_db.get_item.return_value = None

        cognito_attributes = {
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': ''  # Empty display_name
        }

        with patch.object(service, 'get_user_profile', return_value=None):
            with patch.object(service, 'create_user_profile') as mock_create:
                mock_create.return_value = {'id': user_id}
                service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify display_name was generated from username
        mock_create.assert_called_once()
        profile_data = mock_create.call_args[0][1]
        assert profile_data['display_name'] == 'testuser'

    def test_get_or_create_no_update_when_fields_valid(self, service, mock_db):
        """Test that no update occurs when all fields are valid."""
        user_id = "user-valid"

        # Mock existing profile with all valid fields
        existing_profile = {
            'id': user_id,
            'email': 'existing@example.com',
            'username': 'existinguser',
            'display_name': 'Existing User'
        }

        mock_db.get_item.return_value = existing_profile
        mock_db.update_item.return_value = {}

        cognito_attributes = {
            'email': 'new@example.com',
            'username': 'newuser',
            'display_name': 'New User'
        }

        with patch.object(service, 'get_user_profile', return_value=existing_profile):
            result = service.get_or_create_user_profile(user_id, cognito_attributes)

        # Verify profile returned as-is
        assert result == existing_profile
        # Update should still be called for last_seen, but not for other fields
        update_calls = [call for call in mock_db.update_item.call_args_list]
        # Should have exactly one call for last_seen
        assert len(update_calls) == 1
        updates = update_calls[0][0][2]
        assert 'last_seen' in updates
        assert 'email' not in updates
        assert 'username' not in updates
        assert 'display_name' not in updates


class TestGetCurrentUserDependency:
    """Tests for get_current_user dependency with NULL fixes."""

    def test_raises_error_when_no_user_id(self):
        """Test that HTTPException is raised when user_id is missing."""
        current_user = {
            'email': 'test@example.com'
            # Missing 'sub' and 'userId'
        }

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(current_user=current_user, x_id_token=None)

        assert exc_info.value.status_code == 401
        assert "User ID not found in token" in str(exc_info.value.detail)

    def test_applies_email_fallback(self):
        """Test that email fallback is applied when missing."""
        user_id = "user-123"
        current_user = {
            'sub': user_id,
            'email': '',  # Empty email
            'username': 'testuser'
        }

        with patch('app.core.dependencies.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.get_or_create_user_profile.return_value = {'id': user_id}

            result = get_current_user(current_user=current_user, x_id_token=None)

        # Verify fallback email was applied
        call_args = mock_service.get_or_create_user_profile.call_args[1]
        cognito_attrs = call_args['cognito_attributes']
        assert cognito_attrs['email'] == f"user_{user_id}@temp.local"

    def test_applies_username_fallback(self):
        """Test that username fallback is applied when missing."""
        user_id = "user-456"
        current_user = {
            'sub': user_id,
            'email': 'test@example.com',
            'username': ''  # Empty username
        }

        with patch('app.core.dependencies.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.get_or_create_user_profile.return_value = {'id': user_id}

            result = get_current_user(current_user=current_user, x_id_token=None)

        # Verify username was generated from email
        call_args = mock_service.get_or_create_user_profile.call_args[1]
        cognito_attrs = call_args['cognito_attributes']
        assert cognito_attrs['username'] == 'test'

    def test_applies_display_name_fallback(self):
        """Test that display_name fallback is applied when missing."""
        user_id = "user-789"
        current_user = {
            'sub': user_id,
            'email': 'test@example.com',
            'username': 'testuser',
            'display_name': ''  # Empty display_name
        }

        with patch('app.core.dependencies.UserProfileService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.get_or_create_user_profile.return_value = {'id': user_id}

            result = get_current_user(current_user=current_user, x_id_token=None)

        # Verify display_name was generated from username
        call_args = mock_service.get_or_create_user_profile.call_args[1]
        cognito_attrs = call_args['cognito_attributes']
        assert cognito_attrs['display_name'] == 'testuser'

    def test_extracts_custom_attributes_from_id_token(self):
        """Test that custom attributes from ID token are used."""
        user_id = "user-custom"
        current_user = {
            'sub': user_id,
            'email': '',
            'username': ''
        }

        with patch('app.core.dependencies.UserProfileService') as mock_service_class:
            with patch('app.core.dependencies.extract_user_attributes_from_id_token') as mock_extract:
                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.get_or_create_user_profile.return_value = {'id': user_id}

                mock_extract.return_value = {
                    'email': 'real@example.com',
                    'username': 'customuser',
                    'display_name': 'Custom Display'
                }

                result = get_current_user(current_user=current_user, x_id_token='test-id-token')

        # Verify custom attributes from ID token were used
        call_args = mock_service.get_or_create_user_profile.call_args[1]
        cognito_attrs = call_args['cognito_attributes']
        assert cognito_attrs['email'] == 'real@example.com'
        assert cognito_attrs['username'] == 'customuser'
        assert cognito_attrs['display_name'] == 'Custom Display'

    def test_no_id_token_extraction_when_header_missing(self):
        """Test that ID token extraction is not attempted when header is missing."""
        user_id = "user-no-id-token"
        current_user = {
            'sub': user_id,
            'email': 'test@example.com',
            'username': 'testuser'
        }

        with patch('app.core.dependencies.UserProfileService') as mock_service_class:
            with patch('app.core.dependencies.extract_user_attributes_from_id_token') as mock_extract:
                mock_service = Mock()
                mock_service_class.return_value = mock_service
                mock_service.get_or_create_user_profile.return_value = {'id': user_id}

                result = get_current_user(current_user=current_user, x_id_token=None)

        # Verify ID token extraction was not called
        mock_extract.assert_not_called()
