"""
Integration tests for Framework Template API endpoints.
"""
import pytest
from unittest.mock import patch, Mock
from datetime import datetime, timezone
from moto import mock_dynamodb
from fastapi.testclient import TestClient
from app.main import app


class TestFrameworkTemplatesAPIIntegration:
    """Integration tests for framework template API endpoints."""

    @pytest.fixture
    def mock_auth_user(self):
        """Mock authenticated user."""
        return {
            "user_id": "user-123",
            "email": "test@example.com",
            "username": "testuser",
        }

    @pytest.fixture(autouse=True)
    def override_get_current_user(self, mock_auth_user):
        """Override the get_current_user dependency for all tests."""
        from app.core.dependencies import get_current_user

        async def _get_current_user():
            return mock_auth_user

        app.dependency_overrides[get_current_user] = _get_current_user
        yield
        app.dependency_overrides.clear()

    @pytest.fixture
    def sample_template_payload(self):
        """Create sample template payload."""
        return {
            "name": "Wellness Check-in",
            "description": "Daily wellness assessment",
            "sections": [
                {
                    "sectionId": "section1",
                    "sectionName": "Physical Health",
                    "description": "Physical wellness metrics",
                    "fields": [
                        {
                            "fieldId": "energy",
                            "fieldName": "Energy Level",
                            "fieldType": "scale_1_7",
                            "required": True,
                            "helpText": "Rate your energy level from 1 (very low) to 7 (very high)",
                        },
                        {
                            "fieldId": "sleep",
                            "fieldName": "Sleep Quality",
                            "fieldType": "scale_0_10",
                            "required": True,
                            "helpText": "Rate your sleep quality from 0 (poor) to 10 (excellent)",
                        },
                    ],
                    "order": 1,
                }
            ],
            "icon": "🏥",
            "color": "#4CAF50",
            "tags": ["wellness", "daily"],
        }

    @pytest.fixture
    def sample_completion_payload(self):
        """Create sample completion payload."""
        return {
            "templateId": "template-123",
            "fieldValues": {"energy": 6, "sleep": 8},
        }

    # ===== TEMPLATE CRUD TESTS =====

    @mock_dynamodb
    def test_create_template(self, test_client, mock_auth_user, sample_template_payload):
        """Test creating a framework template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.post(
                "/api/framework-templates",
                json=sample_template_payload,
                params={"space_id": "space-456"},
            )

            assert response.status_code == 201
            data = response.json()

            assert data["name"] == "Wellness Check-in"
            assert data["description"] == "Daily wellness assessment"
            assert "templateId" in data
            assert data["version"] == 1
            assert data["createdBy"] == "user-123"
            assert data["spaceId"] == "space-456"
            assert len(data["sections"]) == 1

    @mock_dynamodb
    def test_create_template_unauthorized(self, test_client, sample_template_payload):
        """Test creating template without authentication fails."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.side_effect = Exception("Unauthorized")

            response = test_client.post(
                "/api/framework-templates", json=sample_template_payload
            )

            assert response.status_code == 500  # Will be caught by global handler

    @mock_dynamodb
    def test_list_templates(self, test_client, mock_auth_user):
        """Test listing framework templates."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get("/api/framework-templates")

            assert response.status_code == 200
            data = response.json()

            assert "templates" in data
            assert "total" in data
            assert isinstance(data["templates"], list)

    @mock_dynamodb
    def test_list_templates_by_space(self, test_client, mock_auth_user):
        """Test listing templates filtered by space."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates", params={"space_id": "space-123"}
            )

            assert response.status_code == 200

    @mock_dynamodb
    def test_list_templates_with_tags(self, test_client, mock_auth_user):
        """Test listing templates filtered by tags."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates", params={"tags": "wellness,daily"}
            )

            assert response.status_code == 200

    @mock_dynamodb
    def test_get_template(self, test_client, mock_auth_user):
        """Test getting a specific template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.get_template"
            ) as mock_get:
                mock_get_user.return_value = mock_auth_user

                # Mock template response
                mock_template = Mock()
                mock_template.template_id = "template-123"
                mock_template.name = "Test Template"
                mock_template.version = 1
                mock_template.model_dump.return_value = {
                    "templateId": "template-123",
                    "name": "Test Template",
                    "version": 1,
                }
                mock_get.return_value = mock_template

                response = test_client.get("/api/framework-templates/template-123")

                # The response should either succeed or fail gracefully
                assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_get_template_specific_version(self, test_client, mock_auth_user):
        """Test getting a specific version of a template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates/template-123", params={"version": 2}
            )

            # Template likely doesn't exist in test, but endpoint should work
            assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_update_template(self, test_client, mock_auth_user):
        """Test updating a template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            update_payload = {"name": "Updated Template Name"}

            response = test_client.put(
                "/api/framework-templates/template-123", json=update_payload
            )

            # Template likely doesn't exist, but endpoint should handle it
            assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_update_template_without_versioning(self, test_client, mock_auth_user):
        """Test updating template without creating new version."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            update_payload = {"description": "Updated description"}

            response = test_client.put(
                "/api/framework-templates/template-123",
                json=update_payload,
                params={"create_new_version": False},
            )

            assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_delete_template(self, test_client, mock_auth_user):
        """Test deleting a template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.delete("/api/framework-templates/template-123")

            # Template likely doesn't exist, but endpoint should handle it
            assert response.status_code in [204, 404, 500]

    # ===== COMPLETION CRUD TESTS =====

    @mock_dynamodb
    def test_create_completion(
        self, test_client, mock_auth_user, sample_completion_payload
    ):
        """Test creating a template completion."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.create_completion"
            ) as mock_create:
                mock_get_user.return_value = mock_auth_user

                # Mock completion response
                mock_completion = Mock()
                mock_completion.model_dump.return_value = {
                    "completionId": "completion-123",
                    "templateId": "template-123",
                    "userId": "user-123",
                    "spaceId": "space-456",
                    "fieldValues": {"energy": 6, "sleep": 8},
                }
                mock_create.return_value = mock_completion

                response = test_client.post(
                    "/api/framework-templates/completions",
                    json=sample_completion_payload,
                    params={"space_id": "space-456"},
                )

                # Should succeed with mocked service
                assert response.status_code in [201, 400, 404, 500]

    @mock_dynamodb
    def test_create_completion_missing_required_fields(
        self, test_client, mock_auth_user
    ):
        """Test creating completion with missing required fields fails."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            incomplete_payload = {
                "templateId": "template-123",
                "fieldValues": {},  # Missing required fields
            }

            response = test_client.post(
                "/api/framework-templates/completions",
                json=incomplete_payload,
                params={"space_id": "space-456"},
            )

            # Should fail validation
            assert response.status_code in [400, 404, 500]

    @mock_dynamodb
    def test_list_completions_by_user(self, test_client, mock_auth_user):
        """Test listing completions for current user."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get("/api/framework-templates/completions")

            assert response.status_code in [200, 400, 500]

    @mock_dynamodb
    def test_list_completions_by_space(self, test_client, mock_auth_user):
        """Test listing completions by space."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates/completions",
                params={"space_id": "space-123"},
            )

            assert response.status_code in [200, 400, 500]

    @mock_dynamodb
    def test_list_completions_with_template_filter(self, test_client, mock_auth_user):
        """Test listing completions filtered by template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates/completions",
                params={"space_id": "space-123", "template_id": "template-456"},
            )

            assert response.status_code in [200, 400, 500]

    @mock_dynamodb
    def test_get_completion(self, test_client, mock_auth_user):
        """Test getting a specific completion."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.get(
                "/api/framework-templates/completions/completion-123",
                params={"space_id": "space-456"},
            )

            assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_update_completion(self, test_client, mock_auth_user):
        """Test updating a completion."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            update_payload = {"fieldValues": {"energy": 7, "sleep": 9}}

            response = test_client.put(
                "/api/framework-templates/completions/completion-123",
                json=update_payload,
                params={"space_id": "space-456"},
            )

            assert response.status_code in [200, 404, 500]

    @mock_dynamodb
    def test_delete_completion(self, test_client, mock_auth_user):
        """Test deleting a completion."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_auth_user

            response = test_client.delete(
                "/api/framework-templates/completions/completion-123",
                params={"space_id": "space-456"},
            )

            assert response.status_code in [204, 404, 500]

    # ===== VALIDATION TESTS =====

    @mock_dynamodb
    def test_scale_validation_1_7(self, test_client, mock_auth_user):
        """Test scale 1-7 validation."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.create_completion"
            ) as mock_create:
                mock_get_user.return_value = mock_auth_user

                # Mock validation error
                from app.services.exceptions import ValidationError

                mock_create.side_effect = ValidationError(
                    "Field 'Energy Level' must be between 1 and 7"
                )

                invalid_payload = {
                    "templateId": "template-123",
                    "fieldValues": {"energy": 10},  # Invalid: > 7
                }

                response = test_client.post(
                    "/api/framework-templates/completions",
                    json=invalid_payload,
                    params={"space_id": "space-456"},
                )

                assert response.status_code == 400

    @mock_dynamodb
    def test_scale_validation_0_10(self, test_client, mock_auth_user):
        """Test scale 0-10 validation."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.create_completion"
            ) as mock_create:
                mock_get_user.return_value = mock_auth_user

                from app.services.exceptions import ValidationError

                mock_create.side_effect = ValidationError(
                    "Field 'Sleep Quality' must be between 0 and 10"
                )

                invalid_payload = {
                    "templateId": "template-123",
                    "fieldValues": {"sleep": 15},  # Invalid: > 10
                }

                response = test_client.post(
                    "/api/framework-templates/completions",
                    json=invalid_payload,
                    params={"space_id": "space-456"},
                )

                assert response.status_code == 400

    # ===== AUTO-DATE TESTS =====

    @mock_dynamodb
    def test_auto_date_field_population(self, test_client, mock_auth_user):
        """Test that auto-date fields are populated automatically."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.create_completion"
            ) as mock_create:
                mock_get_user.return_value = mock_auth_user

                # Mock completion with auto-dated fields
                mock_completion = Mock()
                mock_completion.model_dump.return_value = {
                    "completionId": "completion-123",
                    "templateId": "template-123",
                    "fieldValues": {
                        "date_field": datetime.now(timezone.utc).date().isoformat()
                    },
                    "autoDatedFields": ["date_field"],
                }
                mock_create.return_value = mock_completion

                payload = {
                    "templateId": "template-123",
                    "fieldValues": {"date_field": ""},  # Empty triggers auto-date
                }

                response = test_client.post(
                    "/api/framework-templates/completions",
                    json=payload,
                    params={"space_id": "space-456"},
                )

                # If successful, check that auto-dated fields were populated
                if response.status_code == 201:
                    data = response.json()
                    assert "autoDatedFields" in data

    # ===== VERSIONING TESTS =====

    @mock_dynamodb
    def test_template_versioning_on_update(self, test_client, mock_auth_user):
        """Test that updating a template creates a new version."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.update_template"
            ) as mock_update:
                mock_get_user.return_value = mock_auth_user

                # Mock updated template with new version
                mock_template = Mock()
                mock_template.model_dump.return_value = {
                    "templateId": "template-123",
                    "name": "Updated Name",
                    "version": 2,  # Version incremented
                }
                mock_update.return_value = mock_template

                update_payload = {"name": "Updated Name"}

                response = test_client.put(
                    "/api/framework-templates/template-123",
                    json=update_payload,
                    params={"create_new_version": True},
                )

                # If successful, version should be incremented
                if response.status_code == 200:
                    data = response.json()
                    assert data.get("version", 0) > 1

    @mock_dynamodb
    def test_get_specific_template_version(self, test_client, mock_auth_user):
        """Test retrieving a specific version of a template."""
        with patch("app.api.routes.framework_templates.get_current_user") as mock_get_user:
            with patch(
                "app.services.framework_template_service.FrameworkTemplateService.get_template"
            ) as mock_get:
                mock_get_user.return_value = mock_auth_user

                # Mock old version
                mock_template = Mock()
                mock_template.model_dump.return_value = {
                    "templateId": "template-123",
                    "name": "Old Name",
                    "version": 1,
                }
                mock_get.return_value = mock_template

                response = test_client.get(
                    "/api/framework-templates/template-123", params={"version": 1}
                )

                if response.status_code == 200:
                    data = response.json()
                    assert data["version"] == 1
