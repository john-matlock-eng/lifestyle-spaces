"""
Application configuration settings.
"""
import os
import json
from typing import List, Optional, Any, Union, Annotated
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator, BeforeValidator
from functools import lru_cache


def parse_cors(v: Any) -> List[str]:
    """
    Parse CORS origins from various formats.
    Handles both string values like "*" and JSON arrays like ["*"].
    """
    if v is None:
        return []

    if isinstance(v, list):
        return v

    if isinstance(v, str):
        # Handle special case of "*" (allow all origins)
        if v == "*":
            return ["*"]

        # Try to parse as JSON array
        if v.startswith("["):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [str(parsed)]
            except (json.JSONDecodeError, ValueError):
                pass

        # Treat as comma-separated string
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    # For any other type, convert to string and wrap in list
    return [str(v)]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    environment: str = Field(
        default_factory=lambda: "test" if os.getenv("PYTEST_CURRENT_TEST") else "development",
        description="Application environment",
    )
    debug: bool = Field(
        default_factory=lambda: True if os.getenv("PYTEST_CURRENT_TEST") else False,
        description="Debug mode",
    )

    # AWS Configuration
    aws_region: str = Field(default="us-east-1", description="AWS region")
    dynamodb_table: str = Field(
        default_factory=lambda: "lifestyle-spaces-test"
        if os.getenv("PYTEST_CURRENT_TEST")
        else "lifestyle-spaces",
        description="DynamoDB table name",
    )

    # API Configuration
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 prefix")

    # Security
    jwt_secret_key: str = Field(
        default_factory=lambda: "test-secret-key-for-testing-only"
        if os.getenv("PYTEST_CURRENT_TEST")
        else os.getenv("JWT_SECRET_KEY", "default-dev-key"),
        description="JWT secret key for token signing",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration in minutes"
    )

    # CORS Configuration - stored as string initially to avoid auto-JSON parsing
    cors_origins_str: Optional[str] = Field(
        default=None, alias="CORS_ORIGINS", description="Allowed CORS origins (string format)"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Get parsed CORS origins list."""
        if hasattr(self, "_cors_origins_parsed"):
            return self._cors_origins_parsed

        # Parse the CORS origins
        cors_value = self.cors_origins_str

        # Use defaults if not set
        if cors_value is None:
            if os.getenv("PYTEST_CURRENT_TEST"):
                self._cors_origins_parsed = ["http://testserver"]
            else:
                self._cors_origins_parsed = [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://*.cloudfront.net",
                    "https://*.execute-api.us-east-1.amazonaws.com",
                    "https://*.vercel.app",
                    "https://*.amplifyapp.com",
                ]
        else:
            self._cors_origins_parsed = parse_cors(cors_value)

        return self._cors_origins_parsed

    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")
    cors_allow_methods: List[str] = Field(default=["*"], description="Allowed CORS methods")
    cors_allow_headers: List[str] = Field(default=["*"], description="Allowed CORS headers")

    # Pinecone Vector Store Configuration
    pinecone_host: str = Field(
        default="https://journals-5pzznwb.svc.aped-4627-b74a.pinecone.io",
        description="Pinecone index host URL",
    )
    pinecone_secret_name: str = Field(
        default="lifestyle-spaces/dev/pinecone-api-key",
        description="AWS Secrets Manager secret name for Pinecone API key",
    )
    pinecone_index_name: str = Field(
        default="journals",
        description="Pinecone index name",
    )
    pinecone_embedding_model: str = Field(
        default="llama-text-embed-v2",
        description="Pinecone integrated embedding model",
    )

    # Claude/Anthropic Configuration
    anthropic_secret_name: str = Field(
        default="lifestyle-spaces/dev/claude-api-key",
        description="AWS Secrets Manager secret name for Anthropic API key",
    )
    anthropic_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Claude model to use for chat",
    )
    chat_max_context_tokens: int = Field(
        default=8000,
        description="Max tokens reserved for journal context",
    )
    chat_max_response_tokens: int = Field(
        default=1024,
        description="Max tokens for AI response",
    )
    chat_max_history_messages: int = Field(
        default=20,
        description="Max conversation history messages to include",
    )
    chat_max_journal_results: int = Field(
        default=5,
        description="Max journals to include in context",
    )

    # Search scoring configuration
    search_semantic_weight: float = Field(
        default=0.7,
        description="Weight for semantic similarity in hybrid search scoring (0-1)",
    )
    search_recency_weight: float = Field(
        default=0.3,
        description="Weight for recency in hybrid search scoring (0-1)",
    )
    search_max_age_days: int = Field(
        default=365,
        description="Maximum age in days for recency scoring (older entries get 0 recency)",
    )

    model_config = SettingsConfigDict(
        env_file=".env.test" if os.getenv("PYTEST_CURRENT_TEST") else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns:
        Settings: Application settings
    """
    return Settings()


# Create a single instance for import
settings = get_settings()
