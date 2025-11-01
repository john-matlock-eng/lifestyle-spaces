"""
Unit tests for FrameworkTemplateService.
"""
import pytest
from unittest.mock import Mock, MagicMock
from datetime import datetime, timezone
from decimal import Decimal

from app.services.framework_template_service import (
    FrameworkTemplateService,
    FrameworkTemplateNotFoundError,
    FrameworkTemplateCompletionNotFoundError,
)
from app.services.exceptions import ValidationError, UnauthorizedError
from app.models.framework_template import (
    FrameworkTemplateCreate,
    FrameworkTemplateUpdate,
    FrameworkTemplateSection,
    FrameworkTemplateField,
    ScaleConfig,
    FrameworkTemplateCompletionCreate,
    FrameworkTemplateCompletionUpdate,
)


class TestFrameworkTemplateService:
    """Tests for FrameworkTemplateService class."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock DynamoDB client."""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db):
        """Create a FrameworkTemplateService instance with mocked DB."""
        return FrameworkTemplateService(db=mock_db)

    @pytest.fixture
    def sample_field(self):
        """Create a sample field."""
        return FrameworkTemplateField(
            field_id="field1",
            field_name="Test Field",
            field_type="text",
            required=True,
            help_text="Test help text",
        )

    @pytest.fixture
    def sample_scale_field(self):
        """Create a sample scale field."""
        return FrameworkTemplateField(
            field_id="scale1",
            field_name="Scale 1-7",
            field_type="scale_1_7",
            required=True,
            help_text="Rate from 1 to 7",
        )

    @pytest.fixture
    def sample_date_field(self):
        """Create a sample auto-date field."""
        return FrameworkTemplateField(
            field_id="date1",
            field_name="Date",
            field_type="date",
            required=False,
            auto_date=True,
        )

    @pytest.fixture
    def sample_section(self, sample_field, sample_scale_field):
        """Create a sample section."""
        return FrameworkTemplateSection(
            section_id="section1",
            section_name="Test Section",
            description="Test section description",
            fields=[sample_field, sample_scale_field],
            order=1,
        )

    @pytest.fixture
    def sample_template_data(self, sample_section):
        """Create sample template data."""
        return FrameworkTemplateCreate(
            name="Test Template",
            description="Test description",
            sections=[sample_section],
            icon="📋",
            color="#FF0000",
            tags=["test", "sample"],
        )

    # ===== TEMPLATE CREATION TESTS =====

    def test_create_template(self, service, mock_db, sample_template_data):
        """Test creating a template."""
        template = service.create_template(
            template_data=sample_template_data,
            user_id="user-123",
            space_id="space-456",
        )

        assert template.name == "Test Template"
        assert template.description == "Test description"
        assert template.version == 1
        assert template.created_by == "user-123"
        assert template.space_id == "space-456"
        assert len(template.sections) == 1
        assert mock_db.put_item.call_count == 2  # Metadata + Version

    def test_create_template_without_space(self, service, mock_db, sample_template_data):
        """Test creating a global template without space_id."""
        template = service.create_template(
            template_data=sample_template_data,
            user_id="user-123",
            space_id=None,
        )

        assert template.space_id is None
        assert mock_db.put_item.call_count == 2

    # ===== TEMPLATE RETRIEVAL TESTS =====

    def test_get_template_latest(self, service, mock_db):
        """Test getting latest version of a template."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test desc",
            "Sections": [],
            "Version": 2,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
            "IsActive": True,
        }

        template = service.get_template("template-123")

        assert template.template_id == "template-123"
        assert template.version == 2
        mock_db.get_item.assert_called_once_with(
            pk="FRAMEWORK_TEMPLATE#template-123", sk="METADATA"
        )

    def test_get_template_specific_version(self, service, mock_db):
        """Test getting specific version of a template."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test desc",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        template = service.get_template("template-123", version=1)

        assert template.version == 1
        mock_db.get_item.assert_called_once_with(
            pk="FRAMEWORK_TEMPLATE#template-123", sk="VERSION#1"
        )

    def test_get_template_not_found(self, service, mock_db):
        """Test getting non-existent template raises error."""
        mock_db.get_item.return_value = None

        with pytest.raises(FrameworkTemplateNotFoundError):
            service.get_template("nonexistent")

    def test_get_template_with_decimal_conversion(self, service, mock_db):
        """Test that Decimal values are converted properly."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test desc",
            "Sections": [],
            "Version": Decimal("1"),  # DynamoDB returns Decimals
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        template = service.get_template("template-123")

        assert template.version == 1
        assert isinstance(template.version, int)

    # ===== TEMPLATE LISTING TESTS =====

    def test_list_templates_by_space(self, service, mock_db):
        """Test listing templates by space."""
        now = datetime.now(timezone.utc)
        mock_db.query.return_value = [
            {
                "TemplateId": "template-1",
                "Name": "Template 1",
                "Description": "Desc 1",
                "Sections": [],
                "Version": 1,
                "CreatedBy": "user-123",
                "CreatedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
                "Tags": ["tag1"],
            }
        ]

        result = service.list_templates(space_id="space-123")

        assert result.total == 1
        assert len(result.templates) == 1
        mock_db.query.assert_called_once()

    def test_list_templates_with_tag_filter(self, service, mock_db):
        """Test listing templates with tag filter."""
        now = datetime.now(timezone.utc)
        mock_db.scan.return_value = [
            {
                "TemplateId": "template-1",
                "Name": "Template 1",
                "Description": "Desc 1",
                "Sections": [],
                "Version": 1,
                "CreatedBy": "user-123",
                "CreatedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
                "Tags": ["wellness", "daily"],
            },
            {
                "TemplateId": "template-2",
                "Name": "Template 2",
                "Description": "Desc 2",
                "Sections": [],
                "Version": 1,
                "CreatedBy": "user-123",
                "CreatedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
                "Tags": ["work"],
            },
        ]

        result = service.list_templates(tags=["wellness"])

        assert result.total == 1
        assert result.templates[0].template_id == "template-1"

    # ===== TEMPLATE UPDATE TESTS =====

    def test_update_template(self, service, mock_db):
        """Test updating a template."""
        now = datetime.now(timezone.utc)
        # Mock get_template
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Old Name",
            "Description": "Old desc",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        update_data = FrameworkTemplateUpdate(name="New Name")

        template = service.update_template(
            template_id="template-123",
            update_data=update_data,
            user_id="user-123",
            create_new_version=True,
        )

        assert template.name == "New Name"
        assert template.version == 2
        mock_db.update_item.assert_called_once()
        assert mock_db.put_item.call_count == 1  # New version stored

    def test_update_template_unauthorized(self, service, mock_db):
        """Test updating template by non-owner raises error."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Old Name",
            "Description": "Old desc",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        update_data = FrameworkTemplateUpdate(name="New Name")

        with pytest.raises(UnauthorizedError):
            service.update_template(
                template_id="template-123",
                update_data=update_data,
                user_id="different-user",
                create_new_version=True,
            )

    def test_update_template_without_versioning(self, service, mock_db):
        """Test updating template without creating new version."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Old Name",
            "Description": "Old desc",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        update_data = FrameworkTemplateUpdate(description="New desc")

        template = service.update_template(
            template_id="template-123",
            update_data=update_data,
            user_id="user-123",
            create_new_version=False,
        )

        assert template.version == 1  # Version unchanged
        assert template.description == "New desc"
        mock_db.put_item.assert_not_called()  # No new version stored

    # ===== TEMPLATE DELETION TESTS =====

    def test_delete_template(self, service, mock_db):
        """Test deleting a template."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test",
            "Description": "Test",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        service.delete_template(template_id="template-123", user_id="user-123")

        mock_db.update_item.assert_called_once()

    def test_delete_template_unauthorized(self, service, mock_db):
        """Test deleting template by non-owner raises error."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test",
            "Description": "Test",
            "Sections": [],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        with pytest.raises(UnauthorizedError):
            service.delete_template(template_id="template-123", user_id="different-user")

    # ===== COMPLETION CREATION TESTS =====

    def test_create_completion(self, service, mock_db, sample_section):
        """Test creating a completion."""
        now = datetime.now(timezone.utc)

        # Mock get_template for validation
        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test",
            "Sections": [sample_section.model_dump(by_alias=True)],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        completion_data = FrameworkTemplateCompletionCreate(
            template_id="template-123",
            field_values={"field1": "test value", "scale1": 5},
        )

        completion = service.create_completion(
            completion_data=completion_data,
            user_id="user-123",
            space_id="space-456",
        )

        assert completion.template_id == "template-123"
        assert completion.user_id == "user-123"
        assert completion.space_id == "space-456"
        assert completion.field_values["field1"] == "test value"
        assert completion.field_values["scale1"] == 5
        mock_db.put_item.assert_called_once()

    def test_create_completion_with_auto_date(self, service, mock_db):
        """Test creating completion with auto-date field."""
        now = datetime.now(timezone.utc)

        # Create section with auto-date field
        date_field = FrameworkTemplateField(
            field_id="date1",
            field_name="Date",
            field_type="date",
            auto_date=True,
        )
        section = FrameworkTemplateSection(
            section_id="section1",
            section_name="Section",
            fields=[date_field],
        )

        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test",
            "Sections": [section.model_dump(by_alias=True)],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        completion_data = FrameworkTemplateCompletionCreate(
            template_id="template-123", field_values={"date1": ""}  # Empty triggers auto-date
        )

        completion = service.create_completion(
            completion_data=completion_data,
            user_id="user-123",
            space_id="space-456",
        )

        assert "date1" in completion.auto_dated_fields
        assert completion.field_values["date1"] != ""  # Should be populated

    def test_create_completion_missing_required_field(self, service, mock_db, sample_section):
        """Test creating completion with missing required field raises error."""
        now = datetime.now(timezone.utc)

        mock_db.get_item.return_value = {
            "TemplateId": "template-123",
            "Name": "Test Template",
            "Description": "Test",
            "Sections": [sample_section.model_dump(by_alias=True)],
            "Version": 1,
            "CreatedBy": "user-123",
            "CreatedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        completion_data = FrameworkTemplateCompletionCreate(
            template_id="template-123", field_values={}  # Missing required field1
        )

        with pytest.raises(ValidationError, match="Required field"):
            service.create_completion(
                completion_data=completion_data,
                user_id="user-123",
                space_id="space-456",
            )

    # ===== FIELD VALIDATION TESTS =====

    def test_validate_scale_1_7_valid(self, service, mock_db):
        """Test validating scale 1-7 with valid value."""
        field = FrameworkTemplateField(
            field_id="scale1", field_name="Scale", field_type="scale_1_7"
        )

        # Should not raise
        service._validate_field_value(field, 5)

    def test_validate_scale_1_7_invalid_low(self, service, mock_db):
        """Test validating scale 1-7 with value too low."""
        field = FrameworkTemplateField(
            field_id="scale1", field_name="Scale", field_type="scale_1_7"
        )

        with pytest.raises(ValidationError, match="must be between 1 and 7"):
            service._validate_field_value(field, 0)

    def test_validate_scale_1_7_invalid_high(self, service, mock_db):
        """Test validating scale 1-7 with value too high."""
        field = FrameworkTemplateField(
            field_id="scale1", field_name="Scale", field_type="scale_1_7"
        )

        with pytest.raises(ValidationError, match="must be between 1 and 7"):
            service._validate_field_value(field, 8)

    def test_validate_scale_0_10_valid(self, service, mock_db):
        """Test validating scale 0-10 with valid value."""
        field = FrameworkTemplateField(
            field_id="scale2", field_name="Scale", field_type="scale_0_10"
        )

        service._validate_field_value(field, 7)

    def test_validate_scale_0_10_invalid(self, service, mock_db):
        """Test validating scale 0-10 with invalid value."""
        field = FrameworkTemplateField(
            field_id="scale2", field_name="Scale", field_type="scale_0_10"
        )

        with pytest.raises(ValidationError, match="must be between 0 and 10"):
            service._validate_field_value(field, 11)

    def test_validate_scale_custom(self, service, mock_db):
        """Test validating custom scale."""
        field = FrameworkTemplateField(
            field_id="scale3",
            field_name="Custom Scale",
            field_type="scale_custom",
            scale_config=ScaleConfig(min_value=10, max_value=100, step=5),
        )

        service._validate_field_value(field, 50)

        with pytest.raises(ValidationError, match="must be between 10 and 100"):
            service._validate_field_value(field, 5)

    def test_validate_number_field(self, service, mock_db):
        """Test validating number field."""
        field = FrameworkTemplateField(
            field_id="num1", field_name="Number", field_type="number"
        )

        service._validate_field_value(field, 42)
        service._validate_field_value(field, 3.14)

        with pytest.raises(ValidationError, match="must be a number"):
            service._validate_field_value(field, "not a number")

    def test_validate_checkbox_field(self, service, mock_db):
        """Test validating checkbox field."""
        field = FrameworkTemplateField(
            field_id="check1", field_name="Checkbox", field_type="checkbox"
        )

        service._validate_field_value(field, True)
        service._validate_field_value(field, False)

        with pytest.raises(ValidationError, match="must be a boolean"):
            service._validate_field_value(field, "yes")

    def test_validate_select_field(self, service, mock_db):
        """Test validating select field."""
        field = FrameworkTemplateField(
            field_id="select1",
            field_name="Select",
            field_type="select",
            options=["option1", "option2", "option3"],
        )

        service._validate_field_value(field, "option2")

        with pytest.raises(ValidationError, match="must be one of"):
            service._validate_field_value(field, "invalid_option")

    def test_validate_multi_select_field(self, service, mock_db):
        """Test validating multi-select field."""
        field = FrameworkTemplateField(
            field_id="multi1",
            field_name="Multi Select",
            field_type="multi_select",
            options=["opt1", "opt2", "opt3"],
        )

        service._validate_field_value(field, ["opt1", "opt2"])

        with pytest.raises(ValidationError, match="must be a list"):
            service._validate_field_value(field, "not a list")

        with pytest.raises(ValidationError, match="Invalid value"):
            service._validate_field_value(field, ["opt1", "invalid"])

    # ===== COMPLETION RETRIEVAL TESTS =====

    def test_get_completion(self, service, mock_db):
        """Test getting a completion."""
        now = datetime.now(timezone.utc)
        mock_db.get_item.return_value = {
            "CompletionId": "completion-123",
            "TemplateId": "template-123",
            "TemplateVersion": 1,
            "UserId": "user-123",
            "SpaceId": "space-456",
            "FieldValues": {"field1": "value1"},
            "CompletedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
            "AutoDatedFields": [],
        }

        completion = service.get_completion("completion-123", "space-456")

        assert completion.completion_id == "completion-123"
        assert completion.user_id == "user-123"
        mock_db.get_item.assert_called_once()

    def test_get_completion_not_found(self, service, mock_db):
        """Test getting non-existent completion raises error."""
        mock_db.get_item.return_value = None

        with pytest.raises(FrameworkTemplateCompletionNotFoundError):
            service.get_completion("nonexistent", "space-456")

    # ===== COMPLETION LISTING TESTS =====

    def test_list_completions_by_user(self, service, mock_db):
        """Test listing completions by user."""
        now = datetime.now(timezone.utc)
        mock_db.query.return_value = [
            {
                "CompletionId": "completion-1",
                "TemplateId": "template-123",
                "TemplateVersion": 1,
                "UserId": "user-123",
                "SpaceId": "space-456",
                "FieldValues": {},
                "CompletedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            }
        ]

        result = service.list_completions(user_id="user-123")

        assert result.total == 1
        mock_db.query.assert_called_once()

    def test_list_completions_by_space(self, service, mock_db):
        """Test listing completions by space."""
        now = datetime.now(timezone.utc)
        mock_db.query.return_value = [
            {
                "CompletionId": "completion-1",
                "TemplateId": "template-123",
                "TemplateVersion": 1,
                "UserId": "user-123",
                "SpaceId": "space-456",
                "FieldValues": {},
                "CompletedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            }
        ]

        result = service.list_completions(space_id="space-456")

        assert result.total == 1

    def test_list_completions_with_template_filter(self, service, mock_db):
        """Test listing completions filtered by template."""
        now = datetime.now(timezone.utc)
        mock_db.query.return_value = [
            {
                "CompletionId": "completion-1",
                "TemplateId": "template-123",
                "TemplateVersion": 1,
                "UserId": "user-123",
                "SpaceId": "space-456",
                "FieldValues": {},
                "CompletedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            },
            {
                "CompletionId": "completion-2",
                "TemplateId": "template-456",
                "TemplateVersion": 1,
                "UserId": "user-123",
                "SpaceId": "space-456",
                "FieldValues": {},
                "CompletedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            },
        ]

        result = service.list_completions(space_id="space-456", template_id="template-123")

        assert result.total == 1
        assert result.completions[0].template_id == "template-123"

    def test_list_completions_without_filters_raises_error(self, service, mock_db):
        """Test listing completions without space or user raises error."""
        with pytest.raises(ValidationError, match="Must provide either space_id or user_id"):
            service.list_completions()

    # ===== COMPLETION UPDATE TESTS =====

    def test_update_completion(self, service, mock_db, sample_section):
        """Test updating a completion."""
        now = datetime.now(timezone.utc)

        # Mock get_completion
        mock_db.get_item.side_effect = [
            {
                "CompletionId": "completion-123",
                "TemplateId": "template-123",
                "TemplateVersion": 1,
                "UserId": "user-123",
                "SpaceId": "space-456",
                "FieldValues": {"field1": "old value"},
                "CompletedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            },
            # Mock get_template
            {
                "TemplateId": "template-123",
                "Name": "Test",
                "Description": "Test",
                "Sections": [sample_section.model_dump(by_alias=True)],
                "Version": 1,
                "CreatedBy": "user-123",
                "CreatedAt": now.isoformat(),
                "UpdatedAt": now.isoformat(),
            },
        ]

        update_data = FrameworkTemplateCompletionUpdate(
            field_values={"field1": "new value", "scale1": 6}
        )

        completion = service.update_completion(
            completion_id="completion-123",
            space_id="space-456",
            update_data=update_data,
            user_id="user-123",
        )

        assert completion.field_values["field1"] == "new value"
        assert completion.field_values["scale1"] == 6
        mock_db.update_item.assert_called_once()

    def test_update_completion_unauthorized(self, service, mock_db):
        """Test updating completion by different user raises error."""
        now = datetime.now(timezone.utc)

        mock_db.get_item.return_value = {
            "CompletionId": "completion-123",
            "TemplateId": "template-123",
            "TemplateVersion": 1,
            "UserId": "user-123",
            "SpaceId": "space-456",
            "FieldValues": {},
            "CompletedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        update_data = FrameworkTemplateCompletionUpdate(field_values={"field1": "new"})

        with pytest.raises(UnauthorizedError):
            service.update_completion(
                completion_id="completion-123",
                space_id="space-456",
                update_data=update_data,
                user_id="different-user",
            )

    # ===== COMPLETION DELETION TESTS =====

    def test_delete_completion(self, service, mock_db):
        """Test deleting a completion."""
        now = datetime.now(timezone.utc)

        mock_db.get_item.return_value = {
            "CompletionId": "completion-123",
            "TemplateId": "template-123",
            "TemplateVersion": 1,
            "UserId": "user-123",
            "SpaceId": "space-456",
            "FieldValues": {},
            "CompletedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        service.delete_completion(
            completion_id="completion-123", space_id="space-456", user_id="user-123"
        )

        mock_db.delete_item.assert_called_once()

    def test_delete_completion_unauthorized(self, service, mock_db):
        """Test deleting completion by different user raises error."""
        now = datetime.now(timezone.utc)

        mock_db.get_item.return_value = {
            "CompletionId": "completion-123",
            "TemplateId": "template-123",
            "TemplateVersion": 1,
            "UserId": "user-123",
            "SpaceId": "space-456",
            "FieldValues": {},
            "CompletedAt": now.isoformat(),
            "UpdatedAt": now.isoformat(),
        }

        with pytest.raises(UnauthorizedError):
            service.delete_completion(
                completion_id="completion-123",
                space_id="space-456",
                user_id="different-user",
            )
