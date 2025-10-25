"""
Integration tests for template API endpoints.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.template import TemplateNotFoundError


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_template_service():
    """Mock template service."""
    with patch("app.api.routes.templates.TemplateService") as mock:
        service = Mock()
        mock.return_value = service
        yield service


class TestTemplatesAPI:
    """Tests for templates API endpoints."""

    def test_list_templates_success(self, client, mock_template_service):
        """Test listing all templates successfully."""
        from app.models.template import TemplateListResponse, Template

        # Mock service response
        templates = TemplateListResponse(
            templates=[
                Template(
                    id="daily_log",
                    name="Daily Log",
                    description="Track your daily activities",
                    version=1,
                    sections=[]
                ),
                Template(
                    id="gratitude",
                    name="Gratitude Journal",
                    description="Practice gratitude",
                    version=1,
                    sections=[]
                )
            ],
            total=2
        )
        mock_template_service.list_templates.return_value = templates

        # Make request
        response = client.get("/api/templates")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 2
        assert data["templates"][0]["id"] == "daily_log"

    def test_list_templates_error(self, client, mock_template_service):
        """Test listing templates with service error."""
        # Mock service to raise exception
        mock_template_service.list_templates.side_effect = Exception("Database error")

        # Make request
        response = client.get("/api/templates")

        # Verify error response
        assert response.status_code == 500
        assert "Failed to list templates" in response.json()["detail"]

    def test_get_template_success(self, client, mock_template_service):
        """Test getting a specific template successfully."""
        from app.models.template import Template, TemplateSection

        # Mock service response
        template = Template(
            id="daily_log",
            name="Daily Log",
            description="Track your daily activities",
            version=1,
            sections=[
                TemplateSection(
                    id="section-1",
                    title="Morning Reflection",
                    type="paragraph",
                    placeholder="Write about your morning..."
                )
            ]
        )
        mock_template_service.get_template.return_value = template

        # Make request
        response = client.get("/api/templates/daily_log")

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "daily_log"
        assert data["name"] == "Daily Log"
        assert len(data["sections"]) == 1

    def test_get_template_not_found(self, client, mock_template_service):
        """Test getting a template that doesn't exist."""
        # Mock service to raise TemplateNotFoundError
        mock_template_service.get_template.side_effect = TemplateNotFoundError("Template 'nonexistent' not found")

        # Make request
        response = client.get("/api/templates/nonexistent")

        # Verify error response
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_template_error(self, client, mock_template_service):
        """Test getting a template with service error."""
        # Mock service to raise generic exception
        mock_template_service.get_template.side_effect = Exception("File system error")

        # Make request
        response = client.get("/api/templates/daily_log")

        # Verify error response
        assert response.status_code == 500
        assert "Failed to get template" in response.json()["detail"]


class TestWeeklyGratitudeReflectionAPI:
    """Integration tests for Weekly Gratitude & Reflection template."""

    def test_get_weekly_gratitude_template_success(self, client):
        """Test getting Weekly Gratitude & Reflection template successfully."""
        # Make request (using real template service, not mocked)
        response = client.get("/api/templates/weekly_gratitude_reflection")

        # Verify response
        assert response.status_code == 200
        data = response.json()

        # Verify metadata
        assert data["id"] == "weekly_gratitude_reflection"
        assert data["name"] == "🌟 Weekly Gratitude & Reflection"
        assert data["icon"] == "🌟"
        assert data["color"] == "#FBBF24"
        assert "meaningful moments" in data["description"].lower()

        # Verify has 4 sections
        assert len(data["sections"]) == 4

        # Verify section structure
        sections = {s["id"]: s for s in data["sections"]}

        # Section 1: Meaningful Moments & Connections
        assert "meaningful_moments" in sections
        assert sections["meaningful_moments"]["type"] == "list"
        assert sections["meaningful_moments"]["title"] == "Meaningful Moments & Connections"

        # Section 2: Savoring an Experience
        assert "savoring_experience" in sections
        assert sections["savoring_experience"]["type"] == "q_and_a"
        assert sections["savoring_experience"]["title"] == "Savoring an Experience"

        # Section 3: The Emotional Landscape
        assert "emotional_landscape" in sections
        assert sections["emotional_landscape"]["type"] == "paragraph"
        assert sections["emotional_landscape"]["title"] == "The Emotional Landscape"

        # Section 4: Cultivating Joy
        assert "cultivating_joy" in sections
        assert sections["cultivating_joy"]["type"] == "list"
        assert sections["cultivating_joy"]["title"] == "Cultivating Joy"

    def test_weekly_gratitude_template_in_list(self, client):
        """Test that Weekly Gratitude & Reflection appears in template list."""
        response = client.get("/api/templates")

        assert response.status_code == 200
        data = response.json()

        # Find the weekly gratitude template
        template_ids = [t["id"] for t in data["templates"]]
        assert "weekly_gratitude_reflection" in template_ids

        # Get the template from the list
        weekly_template = next(t for t in data["templates"] if t["id"] == "weekly_gratitude_reflection")

        # Verify it's positioned after daily gratitude
        gratitude_daily_idx = next(i for i, t in enumerate(data["templates"]) if t["id"] == "gratitude_daily")
        weekly_idx = next(i for i, t in enumerate(data["templates"]) if t["id"] == "weekly_gratitude_reflection")

        # Weekly should come after daily gratitude
        assert weekly_idx == gratitude_daily_idx + 1

    def test_weekly_gratitude_ellie_configuration(self, client):
        """Test that Weekly Gratitude template has proper Ellie configuration."""
        response = client.get("/api/templates/weekly_gratitude_reflection")

        assert response.status_code == 200
        data = response.json()

        # Verify template-level Ellie config
        assert "ellie" in data
        assert "onStart" in data["ellie"]
        assert "onComplete" in data["ellie"]
        assert "onSave" in data["ellie"]

        # Verify onStart has delay
        assert data["ellie"]["onStart"]["delay"] == 2000

        # Verify all sections have Ellie guidance
        for section in data["sections"]:
            assert "ellie" in section
            assert "onStart" in section["ellie"]
            assert "onComplete" in section["ellie"]
            assert "hints" in section["ellie"]
            assert "encouragement" in section["ellie"]

    def test_weekly_gratitude_section_configs(self, client):
        """Test that Weekly Gratitude sections have proper configurations."""
        response = client.get("/api/templates/weekly_gratitude_reflection")

        assert response.status_code == 200
        data = response.json()

        sections = {s["id"]: s for s in data["sections"]}

        # Verify section 1 config (list)
        assert sections["meaningful_moments"]["config"]["max"] == 10

        # Verify section 2 config (q_and_a)
        assert sections["savoring_experience"]["config"]["max_pairs"] == 3
        assert len(sections["savoring_experience"]["config"]["suggested_questions"]) == 3

        # Verify section 3 config (paragraph)
        assert sections["emotional_landscape"]["config"]["minWords"] == 50
        assert sections["emotional_landscape"]["config"]["recommendedWords"] == 100

        # Verify section 4 config (list)
        assert sections["cultivating_joy"]["config"]["max"] == 8
        assert sections["cultivating_joy"]["config"]["suggestedItems"] == "2-3"
