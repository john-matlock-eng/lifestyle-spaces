"""
Tests for user profile service module to achieve 100% coverage.
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from app.services.user_profile import UserProfileService, CognitoService, EmailService


class TestUserProfileService:
    """Test user profile service methods."""
    
    @patch('app.services.user_profile.get_db')
    def test_get_user_profile_success(self, mock_get_db):
        """Test successful profile retrieval."""
        # Mock database response
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'email': 'test@example.com',
            'username': 'testuser',
            'onboarding_completed': True,
            'onboarding_step': 5,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }
        mock_db.get_item.return_value = mock_profile
        
        service = UserProfileService()
        result = service.get_user_profile('123')
        
        assert result is not None
        assert result['id'] == '123'
        assert result['email'] == 'test@example.com'
        assert 'PK' not in result
        assert 'SK' not in result
        mock_db.get_item.assert_called_once_with('USER#123', 'PROFILE')
    
    @patch('app.services.user_profile.get_db')
    def test_get_user_profile_not_found(self, mock_get_db):
        """Test profile retrieval when user not found."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.get_item.return_value = None
        
        service = UserProfileService()
        result = service.get_user_profile('nonexistent')
        
        assert result is None
        mock_db.get_item.assert_called_once_with('USER#nonexistent', 'PROFILE')
    
    @patch('app.services.user_profile.get_db')
    def test_get_user_profile_database_error(self, mock_get_db):
        """Test profile retrieval with database error."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.get_item.side_effect = ClientError(
            {'Error': {'Code': 'InternalServerError'}}, 
            'GetItem'
        )
        
        service = UserProfileService()
        with pytest.raises(ClientError):
            service.get_user_profile('123')
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_existing(self, mock_get_db):
        """Test updating existing user profile."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock existing profile
        existing_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'email': 'test@example.com',
            'username': 'testuser'
        }
        mock_db.get_item.return_value = existing_profile
        
        # Mock update response
        updated_profile = {
            **existing_profile,
            'bio': 'Updated bio',
            'updated_at': '2024-01-02T00:00:00Z'
        }
        mock_db.update_item.return_value = updated_profile
        
        service = UserProfileService()
        update_data = {'bio': 'Updated bio'}
        result = service.update_user_profile('123', update_data)
        
        assert result['bio'] == 'Updated bio'
        assert 'PK' not in result
        assert 'SK' not in result
        mock_db.get_item.assert_called_once_with('USER#123', 'PROFILE')
        mock_db.update_item.assert_called_once()
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_new(self, mock_get_db):
        """Test creating new user profile."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # No existing profile
        mock_db.get_item.return_value = None
        
        service = UserProfileService()
        update_data = {
            'email': 'new@example.com',
            'username': 'newuser'
        }
        result = service.update_user_profile('456', update_data)
        
        # Verify put_item was called with new profile
        mock_db.put_item.assert_called_once()
        put_args = mock_db.put_item.call_args[0][0]
        assert put_args['PK'] == 'USER#456'
        assert put_args['SK'] == 'PROFILE'
        assert put_args['id'] == '456'
        assert put_args['email'] == 'new@example.com'
        assert put_args['is_active'] is True
        assert put_args['is_verified'] is False
        assert put_args['onboarding_completed'] is False
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_valid_timezone(self, mock_get_db):
        """Test updating profile with valid timezone."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.get_item.return_value = None
        
        service = UserProfileService()
        update_data = {'timezone': 'America/New_York'}
        result = service.update_user_profile('789', update_data)
        
        # Should not raise error for valid timezone
        mock_db.put_item.assert_called_once()
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_invalid_timezone(self, mock_get_db):
        """Test updating profile with invalid timezone."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        service = UserProfileService()
        update_data = {'timezone': 'Invalid/Timezone'}
        
        with pytest.raises(ValueError, match="Invalid timezone"):
            service.update_user_profile('789', update_data)
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_valid_language(self, mock_get_db):
        """Test updating profile with valid language code."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.get_item.return_value = None
        
        service = UserProfileService()
        update_data = {'language': 'en'}
        result = service.update_user_profile('789', update_data)
        
        # Should not raise error for valid language
        mock_db.put_item.assert_called_once()
    
    @patch('app.services.user_profile.get_db')
    def test_update_user_profile_invalid_language(self, mock_get_db):
        """Test updating profile with invalid language code."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        service = UserProfileService()
        update_data = {'language': 'invalid'}
        
        with pytest.raises(ValueError, match="Invalid language code"):
            service.update_user_profile('789', update_data)
    
    @patch('app.services.user_profile.get_db')
    def test_complete_onboarding_success(self, mock_get_db):
        """Test successful onboarding completion."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        # Mock existing profile with onboarding in progress
        existing_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'onboarding_completed': False,
            'onboarding_step': 3
        }
        mock_db.get_item.return_value = existing_profile
        
        # Mock update response
        updated_profile = {
            **existing_profile,
            'onboarding_completed': True,
            'onboarding_step': 5,
            'onboarding_completed_at': '2024-01-02T00:00:00Z'
        }
        mock_db.update_item.return_value = updated_profile
        
        service = UserProfileService()
        result = service.complete_onboarding('123')
        
        assert result['onboarding_completed'] is True
        assert result['onboarding_step'] == 5
        mock_db.update_item.assert_called_once()
    
    @patch('app.services.user_profile.get_db')
    def test_complete_onboarding_with_metadata(self, mock_get_db):
        """Test onboarding completion with metadata."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        existing_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'onboarding_completed': False,
            'onboarding_step': 4
        }
        mock_db.get_item.return_value = existing_profile
        
        updated_profile = {
            **existing_profile,
            'onboarding_completed': True,
            'onboarding_metadata': {'source': 'mobile'}
        }
        mock_db.update_item.return_value = updated_profile
        
        service = UserProfileService()
        metadata = {'source': 'mobile'}
        result = service.complete_onboarding('123', metadata)
        
        assert result is not None
        update_call_args = mock_db.update_item.call_args[0][2]
        assert 'onboarding_metadata' in update_call_args
        assert update_call_args['onboarding_metadata'] == metadata
    
    @patch('app.services.user_profile.get_db')
    def test_complete_onboarding_user_not_found(self, mock_get_db):
        """Test onboarding completion when user not found."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_db.get_item.return_value = None
        
        service = UserProfileService()
        result = service.complete_onboarding('nonexistent')
        
        assert result is None
        mock_db.get_item.assert_called_once_with('USER#nonexistent', 'PROFILE')
    
    @patch('app.services.user_profile.get_db')
    def test_complete_onboarding_already_completed(self, mock_get_db):
        """Test onboarding completion when already completed."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        existing_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'onboarding_completed': True,
            'onboarding_step': 5
        }
        mock_db.get_item.return_value = existing_profile
        
        service = UserProfileService()
        
        with pytest.raises(ValueError, match="Onboarding already completed"):
            service.complete_onboarding('123')
    
    @patch('app.services.user_profile.get_db')
    def test_complete_onboarding_steps_not_finished(self, mock_get_db):
        """Test onboarding completion when steps not finished."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        
        existing_profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'onboarding_completed': False,
            'onboarding_step': 2  # Less than required 3
        }
        mock_db.get_item.return_value = existing_profile
        
        service = UserProfileService()
        
        with pytest.raises(ValueError, match="Required onboarding steps not completed"):
            service.complete_onboarding('123')
    
    def test_transform_profile_response_with_all_fields(self):
        """Test transforming profile with all fields."""
        service = UserProfileService()
        
        profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE',
            'id': '123',
            'email': 'test@example.com',
            'username': 'testuser',
            'bio': 'Test bio',
            'onboarding_completed': True,
            'onboarding_step': 5,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-02T00:00:00Z',
            'is_active': True,
            'is_verified': True
        }
        
        result = service._transform_profile_response(profile)
        
        assert 'PK' not in result
        assert 'SK' not in result
        assert result['id'] == '123'
        assert result['email'] == 'test@example.com'
        assert result['bio'] == 'Test bio'
    
    def test_transform_profile_response_with_minimal_fields(self):
        """Test transforming profile with minimal fields."""
        service = UserProfileService()
        
        profile = {
            'PK': 'USER#123',
            'SK': 'PROFILE'
        }
        
        result = service._transform_profile_response(profile)
        
        # Check defaults are set
        assert result['id'] == ''
        assert result['email'] == ''
        assert result['username'] == ''
        assert result['onboarding_completed'] is False
        assert result['onboarding_step'] == 0
        assert result['is_active'] is True
        assert result['is_verified'] is False
        assert 'created_at' in result
        assert 'updated_at' in result


class TestCognitoService:
    """Test Cognito service methods."""
    
    def test_get_user_attributes(self):
        """Test getting user attributes from Cognito."""
        service = CognitoService()
        result = service.get_user_attributes('user123')
        
        assert result['email'] == 'user@example.com'
        assert result['email_verified'] is True
    
    def test_update_user_attributes(self):
        """Test updating user attributes in Cognito."""
        service = CognitoService()
        # Should not raise any errors
        service.update_user_attributes('user123', {'email': 'new@example.com'})


class TestEmailService:
    """Test email service methods."""
    
    def test_send_welcome_email(self):
        """Test sending welcome email."""
        service = EmailService()
        # Should not raise any errors
        service.send_welcome_email('test@example.com', 'user123')