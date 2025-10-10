"""
Unit tests for template service.
"""
import pytest
from app.services.template import TemplateService, TemplateNotFoundError
from app.services.exceptions import ValidationError


class TestTemplateService:
    """Tests for TemplateService."""

    @pytest.fixture
    def template_service(self):
        """Create a template service instance."""
        return TemplateService()

    def test_list_templates(self, template_service):
        """Test listing all templates."""
        result = template_service.list_templates()

        assert result.total > 0
        assert len(result.templates) == result.total
        assert all(hasattr(t, 'id') for t in result.templates)
        assert all(hasattr(t, 'name') for t in result.templates)
        assert all(hasattr(t, 'description') for t in result.templates)
        assert all(hasattr(t, 'sections') for t in result.templates)

    def test_get_template_success(self, template_service):
        """Test getting a specific template."""
        template = template_service.get_template('gratitude_daily')

        assert template.id == 'gratitude_daily'
        assert template.name == 'Daily Gratitude'
        assert len(template.sections) > 0
        assert template.icon is not None
        assert template.color is not None

    def test_get_template_not_found(self, template_service):
        """Test getting a non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.get_template('nonexistent_template')

    def test_validate_template_data_valid(self, template_service):
        """Test validating valid template data."""
        template_data = {
            'gratitude_list': 'Thing 1, Thing 2, Thing 3',
            'reflection': 'These matter because...',
            'tomorrow': 'Tomorrow I will...'
        }

        assert template_service.validate_template_data('gratitude_daily', template_data) is True

    def test_validate_template_data_invalid_sections(self, template_service):
        """Test validating template data with invalid sections."""
        template_data = {
            'invalid_section': 'Some content',
            'another_invalid': 'More content'
        }

        with pytest.raises(ValidationError) as exc_info:
            template_service.validate_template_data('gratitude_daily', template_data)

        assert 'Invalid sections' in str(exc_info.value)

    def test_validate_template_data_template_not_found(self, template_service):
        """Test validating data for non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.validate_template_data('nonexistent', {})

    def test_apply_template_defaults(self, template_service):
        """Test getting default template data."""
        defaults = template_service.apply_template_defaults('gratitude_daily')

        assert isinstance(defaults, dict)
        assert 'gratitude_list' in defaults
        assert 'reflection' in defaults
        assert 'tomorrow' in defaults
        # All defaults should be empty strings
        assert all(isinstance(v, str) for v in defaults.values())

    def test_apply_template_defaults_not_found(self, template_service):
        """Test getting defaults for non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.apply_template_defaults('nonexistent')

    def test_template_has_all_required_fields(self, template_service):
        """Test that all templates have required fields."""
        result = template_service.list_templates()

        for template in result.templates:
            assert template.id
            assert template.name
            assert template.description
            assert template.version >= 1
            assert len(template.sections) > 0

            # Check section structure
            for section in template.sections:
                assert section.id
                assert section.title
                assert section.type
                assert section.placeholder

    def test_specific_templates_exist(self, template_service):
        """Test that expected default templates exist."""
        expected_templates = [
            'gratitude_daily',
            'daily_log',
            'mood_tracker',
            'goal_progress',
            'blank'
        ]

        result = template_service.list_templates()
        template_ids = [t.id for t in result.templates]

        for expected_id in expected_templates:
            assert expected_id in template_ids, f"Template '{expected_id}' not found"
