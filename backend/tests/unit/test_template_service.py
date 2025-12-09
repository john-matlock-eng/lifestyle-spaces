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
        assert all(hasattr(t, "id") for t in result.templates)
        assert all(hasattr(t, "name") for t in result.templates)
        assert all(hasattr(t, "description") for t in result.templates)
        assert all(hasattr(t, "sections") for t in result.templates)

    def test_get_template_success(self, template_service):
        """Test getting a specific template."""
        template = template_service.get_template("gratitude_daily")

        assert template.id == "gratitude_daily"
        assert template.name == "Daily Gratitude"
        assert len(template.sections) > 0
        assert template.icon is not None
        assert template.color is not None

    def test_get_template_not_found(self, template_service):
        """Test getting a non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.get_template("nonexistent_template")

    def test_validate_template_data_valid(self, template_service):
        """Test validating valid template data."""
        template_data = {
            "gratitude_list": "Thing 1, Thing 2, Thing 3",
            "reflection": "These matter because...",
            "tomorrow": "Tomorrow I will...",
        }

        assert template_service.validate_template_data("gratitude_daily", template_data) is True

    def test_validate_template_data_invalid_sections(self, template_service):
        """Test validating template data with invalid sections."""
        template_data = {"invalid_section": "Some content", "another_invalid": "More content"}

        with pytest.raises(ValidationError) as exc_info:
            template_service.validate_template_data("gratitude_daily", template_data)

        assert "Invalid sections" in str(exc_info.value)

    def test_validate_template_data_template_not_found(self, template_service):
        """Test validating data for non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.validate_template_data("nonexistent", {})

    def test_apply_template_defaults(self, template_service):
        """Test getting default template data."""
        defaults = template_service.apply_template_defaults("gratitude_daily")

        assert isinstance(defaults, dict)
        assert "gratitude_list" in defaults
        assert "reflection" in defaults
        assert "tomorrow" in defaults
        # All defaults should be empty strings
        assert all(isinstance(v, str) for v in defaults.values())

    def test_apply_template_defaults_not_found(self, template_service):
        """Test getting defaults for non-existent template."""
        with pytest.raises(TemplateNotFoundError):
            template_service.apply_template_defaults("nonexistent")

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
            "gratitude_daily",
            "weekly_gratitude_reflection",
            "daily_log",
            "mood_tracker",
            "goal_progress",
            "blank",
        ]

        result = template_service.list_templates()
        template_ids = [t.id for t in result.templates]

        for expected_id in expected_templates:
            assert expected_id in template_ids, f"Template '{expected_id}' not found"

    def test_weekly_gratitude_reflection_template_structure(self, template_service):
        """Test Weekly Gratitude & Reflection template has correct structure."""
        template = template_service.get_template("weekly_gratitude_reflection")

        # Test metadata
        assert template.id == "weekly_gratitude_reflection"
        assert template.name == "🌟 Weekly Gratitude & Reflection"
        assert template.icon == "🌟"
        assert template.color == "#FBBF24"
        assert "meaningful moments" in template.description.lower()

        # Test has exactly 4 sections
        assert len(template.sections) == 4

        # Test section 1: Meaningful Moments & Connections (list)
        section1 = template.sections[0]
        assert section1.id == "meaningful_moments"
        assert section1.title == "Meaningful Moments & Connections"
        assert section1.type == "list"
        assert section1.config is not None
        assert section1.config.get("max") == 10

        # Test section 2: Savoring an Experience (q_and_a)
        section2 = template.sections[1]
        assert section2.id == "savoring_experience"
        assert section2.title == "Savoring an Experience"
        assert section2.type == "q_and_a"
        assert section2.config is not None
        assert section2.config.get("max_pairs") == 3
        assert "suggested_questions" in section2.config

        # Test section 3: The Emotional Landscape (paragraph)
        section3 = template.sections[2]
        assert section3.id == "emotional_landscape"
        assert section3.title == "The Emotional Landscape"
        assert section3.type == "paragraph"
        assert section3.config is not None
        assert section3.config.get("minWords") == 50

        # Test section 4: Cultivating Joy (list)
        section4 = template.sections[3]
        assert section4.id == "cultivating_joy"
        assert section4.title == "Cultivating Joy"
        assert section4.type == "list"
        assert section4.config is not None
        assert section4.config.get("max") == 8

    def test_weekly_gratitude_reflection_ellie_guidance(self, template_service):
        """Test Weekly Gratitude & Reflection template has Ellie guidance."""
        template = template_service.get_template("weekly_gratitude_reflection")

        # Template-level Ellie configuration
        assert template.ellie is not None
        assert "onStart" in template.ellie
        assert "onComplete" in template.ellie
        assert "onSave" in template.ellie

        # Check onStart message has delay
        assert template.ellie["onStart"].get("delay") == 2000

        # Check all sections have Ellie guidance
        for section in template.sections:
            assert section.ellie is not None
            assert "onStart" in section.ellie
            assert "onComplete" in section.ellie
            assert "hints" in section.ellie
            assert "encouragement" in section.ellie

        # Section 2 should have sparkle particles on start
        section2 = template.sections[1]
        assert section2.ellie["onStart"].get("particleEffect") == "sparkles"

    def test_weekly_gratitude_reflection_validation(self, template_service):
        """Test validating Weekly Gratitude & Reflection template data."""
        # Valid data
        valid_data = {
            "meaningful_moments": '["moment1", "moment2"]',
            "savoring_experience": "[]",
            "emotional_landscape": "This week felt like...",
            "cultivating_joy": '["intention1", "intention2"]',
        }

        assert (
            template_service.validate_template_data("weekly_gratitude_reflection", valid_data)
            is True
        )

        # Invalid data with wrong section IDs
        invalid_data = {"wrong_section": "Some content"}

        with pytest.raises(ValidationError) as exc_info:
            template_service.validate_template_data("weekly_gratitude_reflection", invalid_data)

        assert "Invalid sections" in str(exc_info.value)

    def test_weekly_gratitude_reflection_defaults(self, template_service):
        """Test default values for Weekly Gratitude & Reflection template."""
        defaults = template_service.apply_template_defaults("weekly_gratitude_reflection")

        assert "meaningful_moments" in defaults
        assert "savoring_experience" in defaults
        assert "emotional_landscape" in defaults
        assert "cultivating_joy" in defaults

        # List sections should have empty array defaults
        assert defaults["meaningful_moments"] == []
        assert defaults["savoring_experience"] == []
        assert defaults["cultivating_joy"] == []

        # Paragraph section should have empty string default
        assert defaults["emotional_landscape"] == ""
