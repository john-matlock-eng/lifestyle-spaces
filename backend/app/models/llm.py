"""
LLM Models - Pydantic models for LLM API requests and responses
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class LLMPromptRequest(BaseModel):
    """Request model for LLM prompt generation"""

    prompt: str = Field(..., min_length=1, max_length=10000, description="User prompt/input")
    system_prompt: Optional[str] = Field(
        None,
        max_length=2000,
        description="Optional system prompt to guide the model"
    )
    max_tokens: int = Field(
        default=1024,
        ge=1,
        le=4096,
        description="Maximum tokens in response"
    )
    temperature: float = Field(
        default=1.0,
        ge=0.0,
        le=2.0,
        description="Sampling temperature"
    )
    model: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="Claude model to use"
    )

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: str) -> str:
        """Validate that the model is a supported Claude model"""
        allowed_models = [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ]
        if v not in allowed_models:
            raise ValueError(f"Model must be one of: {', '.join(allowed_models)}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "What are some good habits for journaling?",
                "system_prompt": "You are a helpful journaling assistant.",
                "max_tokens": 800,
                "temperature": 0.7,
                "model": "claude-3-5-sonnet-20241022"
            }
        }


class LLMUsageInfo(BaseModel):
    """Token usage information"""

    input_tokens: int = Field(alias="inputTokens", description="Number of input tokens")
    output_tokens: int = Field(alias="outputTokens", description="Number of output tokens")

    class Config:
        populate_by_name = True
        by_alias = True


class LLMPromptResponse(BaseModel):
    """Response model for LLM prompt generation"""

    response: str = Field(..., description="Generated response text")
    model: str = Field(..., description="Model used for generation")
    usage: LLMUsageInfo = Field(..., description="Token usage information")

    class Config:
        populate_by_name = True
        by_alias = True
        json_schema_extra = {
            "example": {
                "response": "Here are some good habits for effective journaling...",
                "model": "claude-3-5-sonnet-20241022",
                "usage": {
                    "inputTokens": 25,
                    "outputTokens": 150
                }
            }
        }


class JournalInsightsRequest(BaseModel):
    """Request model for journal insights generation"""

    journal_content: str = Field(
        ...,
        alias="journalContent",
        min_length=1,
        max_length=20000,
        description="The journal entry content"
    )
    journal_title: Optional[str] = Field(
        None,
        alias="journalTitle",
        max_length=200,
        description="Optional title of the journal entry"
    )
    emotions: Optional[list[str]] = Field(
        None,
        max_length=20,
        description="Optional list of emotions tagged in the entry"
    )

    class Config:
        populate_by_name = True
        by_alias = True
        json_schema_extra = {
            "example": {
                "journalContent": "Today was a challenging day at work...",
                "journalTitle": "Reflections on a Busy Week",
                "emotions": ["stressed", "hopeful", "determined"]
            }
        }


class JournalInsightsResponse(BaseModel):
    """Response model for journal insights"""

    response: str = Field(..., description="Generated insights and reflections")
    model: str = Field(..., description="Model used for generation")
    usage: LLMUsageInfo = Field(..., description="Token usage information")

    class Config:
        populate_by_name = True
        by_alias = True
