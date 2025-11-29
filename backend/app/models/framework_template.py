"""
Framework template models for structured data collection.
"""
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer


class ScaleConfig(BaseModel):
    """Configuration for scale fields."""
    min_value: int = Field(..., alias="minValue", description="Minimum value")
    max_value: int = Field(..., alias="maxValue", description="Maximum value")
    min_label: Optional[str] = Field(None, alias="minLabel", description="Label for minimum value")
    max_label: Optional[str] = Field(None, alias="maxLabel", description="Label for maximum value")
    step: int = Field(default=1, description="Step between values")

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateField(BaseModel):
    """Individual field in a framework template."""
    field_id: str = Field(..., alias="fieldId", description="Unique field identifier")
    field_name: str = Field(..., alias="fieldName", description="Display name for the field")
    field_type: Literal[
        "text", "textarea", "date", "number",
        "scale_1_7", "scale_0_10", "scale_custom",
        "checkbox", "select", "multi_select"
    ] = Field(..., alias="fieldType", description="Type of field")
    required: bool = Field(default=False, description="Whether field is required")
    help_text: Optional[str] = Field(None, alias="helpText", description="Inline help text for the field")
    default_value: Optional[Union[str, int, bool, List[str]]] = Field(
        None,
        alias="defaultValue",
        description="Default value for the field"
    )
    placeholder: Optional[str] = Field(None, description="Placeholder text")

    # Configuration for specific field types
    scale_config: Optional[ScaleConfig] = Field(None, alias="scaleConfig", description="Config for scale fields")
    options: Optional[List[str]] = Field(None, description="Options for select/multi_select fields")

    # Auto-dating configuration
    auto_date: bool = Field(default=False, alias="autoDate", description="Auto-populate with current date")

    order: int = Field(default=0, description="Display order within section")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('field_type')
    @classmethod
    def validate_field_type(cls, v: str) -> str:
        """Validate field type and set appropriate scale config."""
        valid_types = [
            "text", "textarea", "date", "number",
            "scale_1_7", "scale_0_10", "scale_custom",
            "checkbox", "select", "multi_select"
        ]
        if v not in valid_types:
            raise ValueError(f"Invalid field type. Must be one of: {', '.join(valid_types)}")
        return v


class FrameworkTemplateSection(BaseModel):
    """Section grouping fields in a framework template."""
    section_id: str = Field(..., alias="sectionId", description="Unique section identifier")
    section_name: str = Field(..., alias="sectionName", description="Display name for the section")
    description: Optional[str] = Field(None, description="Section description")
    fields: List[FrameworkTemplateField] = Field(default_factory=list, description="Fields in this section")
    order: int = Field(default=0, description="Display order of section")
    collapsible: bool = Field(default=False, description="Whether section can be collapsed")

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateBase(BaseModel):
    """Base framework template model."""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: str = Field(..., description="Template description")
    sections: List[FrameworkTemplateSection] = Field(default_factory=list, description="Template sections")
    icon: Optional[str] = Field(None, description="Icon/emoji for the template")
    color: Optional[str] = Field(None, description="Color theme for the template")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateCreate(FrameworkTemplateBase):
    """Framework template creation request."""
    pass


class FrameworkTemplateUpdate(BaseModel):
    """Framework template update model."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    sections: Optional[List[FrameworkTemplateSection]] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplate(FrameworkTemplateBase):
    """Complete framework template model."""
    template_id: str = Field(..., alias="templateId", description="Unique template identifier")
    version: int = Field(default=1, description="Template version")
    created_by: str = Field(..., alias="createdBy", description="User ID of creator")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")
    is_active: bool = Field(default=True, alias="isActive", description="Whether template is active")
    space_id: Optional[str] = Field(None, alias="spaceId", description="Space ID if template is space-specific")

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )


class FrameworkTemplateListResponse(BaseModel):
    """Response model for listing framework templates."""
    templates: List[FrameworkTemplate]
    total: int

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateCompletion(BaseModel):
    """Represents a completed framework template."""
    completion_id: str = Field(..., alias="completionId", description="Unique completion identifier")
    template_id: str = Field(..., alias="templateId", description="Template used")
    template_version: int = Field(..., alias="templateVersion", description="Version of template used")
    user_id: str = Field(..., alias="userId", description="User who completed the template")
    space_id: str = Field(..., alias="spaceId", description="Space context")

    # Field values stored as flat dictionary: field_id -> value
    field_values: Dict[str, Any] = Field(..., alias="fieldValues", description="Field values")

    # Metadata
    completed_at: datetime = Field(..., alias="completedAt", description="Completion timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")
    auto_dated_fields: List[str] = Field(
        default_factory=list,
        alias="autoDatedFields",
        description="Fields that were auto-dated"
    )

    @field_serializer('completed_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime fields to ISO format."""
        return dt.isoformat() if dt else None

    model_config = ConfigDict(
        populate_by_name=True,
        by_alias=True
    )


class FrameworkTemplateCompletionCreate(BaseModel):
    """Request model for creating a template completion."""
    template_id: str = Field(..., alias="templateId")
    field_values: Dict[str, Any] = Field(..., alias="fieldValues")

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateCompletionUpdate(BaseModel):
    """Request model for updating a template completion."""
    field_values: Dict[str, Any] = Field(..., alias="fieldValues")

    model_config = ConfigDict(populate_by_name=True)


class FrameworkTemplateCompletionListResponse(BaseModel):
    """Response model for listing template completions."""
    completions: List[FrameworkTemplateCompletion]
    total: int

    model_config = ConfigDict(populate_by_name=True)
