"""
Application configuration settings.
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = Field(
        default_factory=lambda: "test" if os.getenv("PYTEST_CURRENT_TEST") else "development",
        description="Application environment"
    )
    debug: bool = Field(
        default_factory=lambda: True if os.getenv("PYTEST_CURRENT_TEST") else False,
        description="Debug mode"
    )
    
    # AWS Configuration
    aws_region: str = Field(
        default="us-east-1",
        description="AWS region"
    )
    dynamodb_table: str = Field(
        default_factory=lambda: "lifestyle-spaces-test" if os.getenv("PYTEST_CURRENT_TEST") else "lifestyle-spaces",
        description="DynamoDB table name"
    )
    
    # API Configuration
    api_v1_prefix: str = Field(
        default="/api/v1",
        description="API v1 prefix"
    )
    
    # Security
    jwt_secret_key: str = Field(
        default_factory=lambda: "test-secret-key-for-testing-only" if os.getenv("PYTEST_CURRENT_TEST") else os.getenv("JWT_SECRET_KEY", "default-dev-key"),
        description="JWT secret key for token signing"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration in minutes"
    )
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://testserver"] if os.getenv("PYTEST_CURRENT_TEST") else [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://*.cloudfront.net",
            "https://*.execute-api.us-east-1.amazonaws.com",
            "https://*.vercel.app",
            "https://*.amplifyapp.com"
        ],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS"
    )
    cors_allow_methods: List[str] = Field(
        default=["*"],
        description="Allowed CORS methods"
    )
    cors_allow_headers: List[str] = Field(
        default=["*"],
        description="Allowed CORS headers"
    )
    
    model_config = SettingsConfigDict(
        env_file=".env.test" if os.getenv("PYTEST_CURRENT_TEST") else ".env",
        env_file_encoding="utf-8",
        case_sensitive=False
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