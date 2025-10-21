"""
Unit tests for Claude LLM Service
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from app.services.claude_llm import ClaudeLLMService, get_claude_service
from app.services.exceptions import ExternalServiceError


@pytest.fixture
def mock_secret_response():
    """Mock AWS Secrets Manager response"""
    return {
        "SecretString": json.dumps({"api_key": "test-api-key-12345"})
    }


@pytest.fixture
def mock_anthropic_message():
    """Mock Anthropic message response"""
    mock_content = Mock()
    mock_content.text = "This is a test response from Claude."

    mock_usage = Mock()
    mock_usage.input_tokens = 25
    mock_usage.output_tokens = 50

    mock_message = Mock()
    mock_message.content = [mock_content]
    mock_message.model = "claude-3-5-sonnet-20241022"
    mock_message.usage = mock_usage

    return mock_message


class TestClaudeLLMService:
    """Test cases for ClaudeLLMService"""

    @patch.dict('os.environ', {'CLAUDE_API_KEY_SECRET_ARN': 'arn:aws:secretsmanager:us-east-1:123456789:secret:test'})
    @patch('boto3.session.Session')
    def test_get_secret_success(self, mock_session, mock_secret_response):
        """Test successful retrieval of secret from AWS Secrets Manager"""
        # Setup mock
        mock_client = Mock()
        mock_client.get_secret_value.return_value = mock_secret_response
        mock_session.return_value.client.return_value = mock_client

        # Create service
        service = ClaudeLLMService()

        # Assert
        assert service.api_key == "test-api-key-12345"

    @patch.dict('os.environ', {}, clear=True)
    def test_get_secret_no_env_var(self):
        """Test error when CLAUDE_API_KEY_SECRET_ARN is not set"""
        with pytest.raises(ExternalServiceError) as exc_info:
            service = ClaudeLLMService()
            service._get_secret()

        assert "environment variable not set" in str(exc_info.value)

    @patch.dict('os.environ', {'CLAUDE_API_KEY_SECRET_ARN': 'arn:aws:secretsmanager:us-east-1:123456789:secret:test'})
    @patch('boto3.session.Session')
    def test_get_secret_placeholder(self, mock_session):
        """Test error when secret contains placeholder value"""
        # Setup mock with placeholder
        mock_client = Mock()
        mock_client.get_secret_value.return_value = {
            "SecretString": json.dumps({"api_key": "PLACEHOLDER_UPDATE_MANUALLY"})
        }
        mock_session.return_value.client.return_value = mock_client

        # Test
        with pytest.raises(ExternalServiceError) as exc_info:
            service = ClaudeLLMService()
            service._get_secret()

        assert "not configured" in str(exc_info.value)

    @patch.dict('os.environ', {'CLAUDE_API_KEY_SECRET_ARN': 'arn:aws:secretsmanager:us-east-1:123456789:secret:test'})
    @patch('boto3.session.Session')
    @patch('app.services.claude_llm.Anthropic')
    def test_generate_response_success(
        self,
        mock_anthropic,
        mock_session,
        mock_secret_response,
        mock_anthropic_message
    ):
        """Test successful LLM response generation"""
        # Setup mocks
        mock_client = Mock()
        mock_client.get_secret_value.return_value = mock_secret_response
        mock_session.return_value.client.return_value = mock_client

        mock_anthropic_instance = Mock()
        mock_anthropic_instance.messages.create.return_value = mock_anthropic_message
        mock_anthropic.return_value = mock_anthropic_instance

        # Create service and generate response
        service = ClaudeLLMService()
        result = service.generate_response(
            prompt="What is the meaning of life?",
            system_prompt="You are a helpful assistant.",
            max_tokens=500,
            temperature=0.7
        )

        # Assertions
        assert result["response"] == "This is a test response from Claude."
        assert result["model"] == "claude-3-5-sonnet-20241022"
        assert result["usage"]["input_tokens"] == 25
        assert result["usage"]["output_tokens"] == 50

        # Verify API call
        mock_anthropic_instance.messages.create.assert_called_once()
        call_args = mock_anthropic_instance.messages.create.call_args[1]
        assert call_args["model"] == "claude-3-5-sonnet-20241022"
        assert call_args["max_tokens"] == 500
        assert call_args["temperature"] == 0.7
        assert call_args["messages"][0]["content"] == "What is the meaning of life?"
        assert call_args["system"] == "You are a helpful assistant."

    def test_generate_response_no_client(self):
        """Test error when client is not initialized"""
        service = ClaudeLLMService()
        service.client = None  # Force uninitialized state

        with pytest.raises(ExternalServiceError) as exc_info:
            service.generate_response(prompt="Test")

        assert "not initialized" in str(exc_info.value)

    @patch.dict('os.environ', {'CLAUDE_API_KEY_SECRET_ARN': 'arn:aws:secretsmanager:us-east-1:123456789:secret:test'})
    @patch('boto3.session.Session')
    @patch('app.services.claude_llm.Anthropic')
    def test_generate_response_api_error(self, mock_anthropic, mock_session, mock_secret_response):
        """Test handling of API errors"""
        # Setup mocks
        mock_client = Mock()
        mock_client.get_secret_value.return_value = mock_secret_response
        mock_session.return_value.client.return_value = mock_client

        mock_anthropic_instance = Mock()
        mock_anthropic_instance.messages.create.side_effect = Exception("API Error")
        mock_anthropic.return_value = mock_anthropic_instance

        # Test
        service = ClaudeLLMService()
        with pytest.raises(ExternalServiceError) as exc_info:
            service.generate_response(prompt="Test")

        assert "Failed to generate" in str(exc_info.value)

    @patch.dict('os.environ', {'CLAUDE_API_KEY_SECRET_ARN': 'arn:aws:secretsmanager:us-east-1:123456789:secret:test'})
    @patch('boto3.session.Session')
    @patch('app.services.claude_llm.Anthropic')
    def test_generate_journal_insights(
        self,
        mock_anthropic,
        mock_session,
        mock_secret_response,
        mock_anthropic_message
    ):
        """Test journal insights generation"""
        # Setup mocks
        mock_client = Mock()
        mock_client.get_secret_value.return_value = mock_secret_response
        mock_session.return_value.client.return_value = mock_client

        mock_anthropic_instance = Mock()
        mock_anthropic_instance.messages.create.return_value = mock_anthropic_message
        mock_anthropic.return_value = mock_anthropic_instance

        # Test
        service = ClaudeLLMService()
        result = service.generate_journal_insights(
            journal_content="Today was a great day!",
            journal_title="A Great Day",
            emotions=["happy", "grateful"]
        )

        # Assertions
        assert "response" in result
        assert "model" in result
        assert "usage" in result

        # Verify API call includes context
        call_args = mock_anthropic_instance.messages.create.call_args[1]
        prompt_text = call_args["messages"][0]["content"]
        assert "A Great Day" in prompt_text
        assert "happy" in prompt_text
        assert "grateful" in prompt_text
        assert "Today was a great day!" in prompt_text

    @patch('app.services.claude_llm.ClaudeLLMService')
    def test_get_claude_service_singleton(self, mock_service_class):
        """Test that get_claude_service returns a singleton"""
        # Clear any existing instance
        import app.services.claude_llm as module
        module._claude_service = None

        # Get service twice
        service1 = get_claude_service()
        service2 = get_claude_service()

        # Should be the same instance
        assert service1 is service2
