"""
Journal template models.
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class QAPair(BaseModel):
    """Question and Answer pair."""
    question: str = Field(..., description="The question")
    answer: str = Field(..., description="The answer")
    id: str = Field(..., description="Unique ID for this Q&A pair")


class TemplateSection(BaseModel):
    """Enhanced template section model."""
    id: str = Field(..., description="Unique section identifier")
    title: str = Field(..., description="Section title")
    type: Literal["paragraph", "q_and_a", "list", "checkbox", "scale", "time_log", "table"] = Field(
        default="paragraph",
        description="Section type"
    )
    placeholder: str = Field(..., description="Placeholder text for the section")
    default_value: Optional[Any] = Field(None, alias="defaultValue", description="Default content")

    # Type-specific configurations
    config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Type-specific configuration"
    )

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
