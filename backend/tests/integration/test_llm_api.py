"""
Integration tests for LLM API endpoints
"""
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.exceptions import ExternalServiceError
from app.models.user import User


@pytest.fixture
def mock_claude_service():
    """Mock Claude LLM service"""
    with patch('app.api.routes.llm.get_claude_service') as mock:
        service = Mock()
        mock.return_value = service
        yield service


@pytest.fixture
def mock_auth_user():
    """Create a mock user for authentication"""
    user = User(
        user_id="test-user-123",
        email="test@example.com",
        display_name="Test User"
    )
    return user


@pytest.fixture
def override_get_current_user(mock_auth_user):
    """Override the get_current_user dependency"""
    from app.core.dependencies import get_current_user

    async def _get_current_user():
        return mock_auth_user

    app.dependency_overrides[get_current_user] = _get_current_user
    yield
    app.dependency_overrides.clear()


class TestLLMGenerateEndpoint:
    """Test cases for POST /api/llm/generate"""

    def test_generate_success(self, mock_claude_service, override_get_current_user):
        """Test successful LLM response generation"""
        # Setup mock response
        mock_claude_service.generate_response.return_value = {
            "response": "AI-generated response here",
            "model": "claude-3-5-sonnet-20241022",
            "usage": {
                "input_tokens": 30,
                "output_tokens": 100
            }
        }

        # Make request
        client = TestClient(app)
        response = client.post(
            "/api/llm/generate",
            json={
                "prompt": "What is the best way to journal?",
                "systemPrompt": "You are a helpful assistant.",
                "maxTokens": 500,
                "temperature": 0.7,
                "model": "claude-3-5-sonnet-20241022"
            }
        )

        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "AI-generated response here"
        assert data["model"] == "claude-3-5-sonnet-20241022"
        assert data["usage"]["inputTokens"] == 30
        assert data["usage"]["outputTokens"] == 100

        # Verify service was called correctly
        mock_claude_service.generate_response.assert_called_once()
        call_args = mock_claude_service.generate_response.call_args[1]
        assert call_args["prompt"] == "What is the best way to journal?"
        assert call_args["system_prompt"] == "You are a helpful assistant."
        assert call_args["max_tokens"] == 500
        assert call_args["temperature"] == 0.7

    def test_generate_with_defaults(self, mock_claude_service, override_get_current_user):
        """Test generation with default parameters"""
        mock_claude_service.generate_response.return_value = {
            "response": "Default response",
            "model": "claude-3-5-sonnet-20241022",
            "usage": {"input_tokens": 10, "output_tokens": 20}
        }

        client = TestClient(app)
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Simple question"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data

        # Verify defaults were used
        call_args = mock_claude_service.generate_response.call_args[1]
        assert call_args["max_tokens"] == 1024  # default
        assert call_args["temperature"] == 1.0  # default

    def test_generate_invalid_model(self, override_get_current_user):
        """Test validation error for invalid model"""
        client = TestClient(app)
        response = client.post(
            "/api/llm/generate",
            json={
                "prompt": "Test",
                "model": "invalid-model-name"
            }
        )

        assert response.status_code == 422  # Validation error

    def test_generate_service_error(self, mock_claude_service, override_get_current_user):
        """Test handling of service errors"""
        mock_claude_service.generate_response.side_effect = ExternalServiceError(
            "API key not configured"
        )

        client = TestClient(app)
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Test"}
        )

        assert response.status_code == 503
        data = response.json()
        assert "LLM service error" in data["detail"]

    def test_generate_empty_prompt(self, override_get_current_user):
        """Test validation error for empty prompt"""
        client = TestClient(app)
        response = client.post(
            "/api/llm/generate",
            json={"prompt": ""}
        )

        assert response.status_code == 422  # Validation error

    def test_generate_max_tokens_validation(self, override_get_current_user):
        """Test validation for max_tokens boundaries"""
        client = TestClient(app)

        # Test too low
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Test", "maxTokens": 0}
        )
        assert response.status_code == 422

        # Test too high
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Test", "maxTokens": 5000}
        )
        assert response.status_code == 422

    def test_generate_temperature_validation(self, override_get_current_user):
        """Test validation for temperature boundaries"""
        client = TestClient(app)

        # Test negative
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Test", "temperature": -0.1}
        )
        assert response.status_code == 422

        # Test too high
        response = client.post(
            "/api/llm/generate",
            json={"prompt": "Test", "temperature": 2.5}
        )
        assert response.status_code == 422


class TestJournalInsightsEndpoint:
    """Test cases for POST /api/llm/journal-insights"""

    def test_journal_insights_success(self, mock_claude_service, override_get_current_user):
        """Test successful journal insights generation"""
        mock_claude_service.generate_journal_insights.return_value = {
            "response": "Here are some insights about your journal entry...",
            "model": "claude-3-5-sonnet-20241022",
            "usage": {"input_tokens": 150, "output_tokens": 200}
        }

        client = TestClient(app)
        response = client.post(
            "/api/llm/journal-insights",
            json={
                "journalContent": "Today was a productive day. I completed all my tasks.",
                "journalTitle": "Productive Day",
                "emotions": ["satisfied", "accomplished"]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "insights" in data["response"] or "Here are" in data["response"]
        assert data["model"] == "claude-3-5-sonnet-20241022"

        # Verify service was called with correct params
        mock_claude_service.generate_journal_insights.assert_called_once()
        call_args = mock_claude_service.generate_journal_insights.call_args[1]
        assert "productive day" in call_args["journal_content"].lower()
        assert call_args["journal_title"] == "Productive Day"
        assert call_args["emotions"] == ["satisfied", "accomplished"]

    def test_journal_insights_minimal(self, mock_claude_service, override_get_current_user):
        """Test journal insights with only content"""
        mock_claude_service.generate_journal_insights.return_value = {
            "response": "Minimal insights",
            "model": "claude-3-5-sonnet-20241022",
            "usage": {"input_tokens": 50, "output_tokens": 30}
        }

        client = TestClient(app)
        response = client.post(
            "/api/llm/journal-insights",
            json={"journalContent": "Just a simple entry."}
        )

        assert response.status_code == 200
        call_args = mock_claude_service.generate_journal_insights.call_args[1]
        assert call_args["journal_title"] is None
        assert call_args["emotions"] is None

    def test_journal_insights_empty_content(self, override_get_current_user):
        """Test validation error for empty journal content"""
        client = TestClient(app)
        response = client.post(
            "/api/llm/journal-insights",
            json={"journalContent": ""}
        )

        assert response.status_code == 422  # Validation error

    def test_journal_insights_service_error(self, mock_claude_service, override_get_current_user):
        """Test handling of service errors in journal insights"""
        mock_claude_service.generate_journal_insights.side_effect = ExternalServiceError(
            "Failed to connect to Claude API"
        )

        client = TestClient(app)
        response = client.post(
            "/api/llm/journal-insights",
            json={"journalContent": "Test entry"}
        )

        assert response.status_code == 503
        assert "LLM service error" in response.json()["detail"]

    def test_journal_insights_long_content(self, mock_claude_service, override_get_current_user):
        """Test journal insights with very long content"""
        mock_claude_service.generate_journal_insights.return_value = {
            "response": "Insights for long entry",
            "model": "claude-3-5-sonnet-20241022",
            "usage": {"input_tokens": 500, "output_tokens": 150}
        }

        client = TestClient(app)
        long_content = "This is a very long journal entry. " * 100
        response = client.post(
            "/api/llm/journal-insights",
            json={"journalContent": long_content}
        )

        assert response.status_code == 200

    def test_journal_insights_too_long_content(self, override_get_current_user):
        """Test validation error for content exceeding max length"""
        client = TestClient(app)
        too_long_content = "X" * 25000  # Exceeds 20000 char limit
        response = client.post(
            "/api/llm/journal-insights",
            json={"journalContent": too_long_content}
        )

        assert response.status_code == 422  # Validation error
