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
