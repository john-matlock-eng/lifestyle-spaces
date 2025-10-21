"""
Common Pydantic models used across the application.
"""
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator


class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str
    status_code: int


class SuccessResponse(BaseModel):
    """Success response model."""
    message: str
    data: Optional[Dict[str, Any]] = None


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @field_validator("page")
    @classmethod
    def validate_page(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Page must be >= 1")
        return v
    
    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v: int) -> int:
        if v < 1 or v > 100:
            raise ValueError("Page size must be between 1 and 100")
        return v


class PaginationResponse(BaseModel):
    """Paginated response model."""
    items: list = Field(description="List of items in the current page")
    total: int = Field(description="Total number of items across all pages")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of items per page")
    has_next: bool = Field(description="Whether there are more pages available")