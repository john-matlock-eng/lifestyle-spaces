"""
Application configuration settings.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    environment: str = "development"
    debug: bool = False
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    dynamodb_table: str = "lifestyle-spaces"
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    
    # Security
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS Configuration
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.cloudfront.net",
        "https://*.execute-api.us-east-1.amazonaws.com",
        "https://*.vercel.app",
        "https://*.amplifyapp.com"
    ]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }


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