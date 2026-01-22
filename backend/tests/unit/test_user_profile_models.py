"""
Tests for user profile models including PetSettings.
"""
import pytest
from pydantic import ValidationError
from app.models.user_profile import (
    PetSettings,
    UserProfileUpdate,
    NotificationPreferences,
    PrivacySettings,
)


class TestPetSettings:
    """Tests for the PetSettings model."""

    def test_pet_settings_defaults(self):
        """Test PetSettings default values."""
        settings = PetSettings()
        assert settings.pet_name == "Lily"
        assert settings.fur_color == "#FFFFFF"
        assert settings.fur_pattern == "parti"
        assert settings.accent_color == "#000000"
        assert settings.collar_style == "none"
        assert settings.collar_color == "#8B4513"
        assert settings.collar_tag is False

    def test_pet_settings_custom_values(self):
        """Test PetSettings with custom values."""
        settings = PetSettings(
            pet_name="Max",
            fur_color="#D2691E",
            fur_pattern="solid",
            accent_color="#8B4513",
            collar_style="leather",
            collar_color="#000000",
            collar_tag=True,
        )
        assert settings.pet_name == "Max"
        assert settings.fur_color == "#D2691E"
        assert settings.fur_pattern == "solid"
        assert settings.accent_color == "#8B4513"
        assert settings.collar_style == "leather"
        assert settings.collar_color == "#000000"
        assert settings.collar_tag is True

    def test_pet_name_validation_strips_whitespace(self):
        """Test that pet name strips whitespace."""
        settings = PetSettings(pet_name="  Buddy  ")
        assert settings.pet_name == "Buddy"

    def test_pet_name_validation_removes_html(self):
        """Test that pet name removes HTML tags."""
        # HTML tags are stripped, allowing content within
        settings = PetSettings(pet_name="<b>Bold</b>")
        assert settings.pet_name == "Bold"

        settings = PetSettings(pet_name="Test<br/>Name")
        assert settings.pet_name == "TestName"

    def test_pet_name_validation_empty_defaults_to_lily(self):
        """Test that empty pet name defaults to Lily."""
        settings = PetSettings(pet_name="")
        assert settings.pet_name == "Lily"

    def test_pet_name_max_length(self):
        """Test pet name max length validation."""
        # 20 chars should work
        settings = PetSettings(pet_name="A" * 20)
        assert len(settings.pet_name) == 20

        # 21 chars should fail
        with pytest.raises(ValidationError):
            PetSettings(pet_name="A" * 21)

    def test_fur_color_validation_valid_hex(self):
        """Test valid hex color format."""
        settings = PetSettings(fur_color="#ABCDEF")
        assert settings.fur_color == "#ABCDEF"

        settings = PetSettings(fur_color="#abcdef")
        assert settings.fur_color == "#abcdef"

    def test_fur_color_validation_invalid_hex(self):
        """Test invalid hex color format."""
        with pytest.raises(ValidationError):
            PetSettings(fur_color="red")

        with pytest.raises(ValidationError):
            PetSettings(fur_color="#FFF")  # Too short

        with pytest.raises(ValidationError):
            PetSettings(fur_color="#GGGGGG")  # Invalid chars

    def test_fur_pattern_validation(self):
        """Test fur pattern validation."""
        settings = PetSettings(fur_pattern="solid")
        assert settings.fur_pattern == "solid"

        settings = PetSettings(fur_pattern="parti")
        assert settings.fur_pattern == "parti"

        with pytest.raises(ValidationError):
            PetSettings(fur_pattern="striped")

    def test_collar_style_validation(self):
        """Test collar style validation."""
        valid_styles = ["none", "leather", "fabric", "bowtie", "bandana"]
        for style in valid_styles:
            settings = PetSettings(collar_style=style)
            assert settings.collar_style == style

        with pytest.raises(ValidationError):
            PetSettings(collar_style="chain")


class TestUserProfileUpdateWithPetSettings:
    """Tests for UserProfileUpdate with pet_settings field."""

    def test_update_with_pet_settings(self):
        """Test updating profile with pet settings."""
        update = UserProfileUpdate(
            display_name="Test User",
            pet_settings=PetSettings(pet_name="Luna", fur_pattern="solid"),
        )
        assert update.display_name == "Test User"
        assert update.pet_settings.pet_name == "Luna"
        assert update.pet_settings.fur_pattern == "solid"

    def test_update_without_pet_settings(self):
        """Test updating profile without pet settings."""
        update = UserProfileUpdate(display_name="Test User")
        assert update.display_name == "Test User"
        assert update.pet_settings is None
