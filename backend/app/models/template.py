"""
Journal template models.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class TemplateSection(BaseModel):
    """Template section model."""
    id: str = Field(..., description="Unique section identifier")
    title: str = Field(..., description="Section title")
    type: str = Field(default="paragraph", description="Section type (paragraph, list, etc.)")
    placeholder: str = Field(..., description="Placeholder text for the section")
    default_value: Optional[str] = Field(None, alias="defaultValue", description="Default content")

    model_config = ConfigDict(populate_by_name=True)


class Template(BaseModel):
    """Journal template model."""
    id: str = Field(..., description="Unique template identifier")
    name: str = Field(..., description="Template display name")
    description: str = Field(..., description="Template description")
    version: int = Field(default=1, description="Template version")
    sections: List[TemplateSection] = Field(default_factory=list, description="Template sections")
    icon: Optional[str] = Field(None, description="Icon/emoji for the template")
    color: Optional[str] = Field(None, description="Color theme for the template")

    model_config = ConfigDict(populate_by_name=True)


class TemplateListResponse(BaseModel):
    """Response model for listing templates."""
    templates: List[Template]
    total: int

    model_config = ConfigDict(populate_by_name=True)
