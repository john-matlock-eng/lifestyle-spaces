"""
AWS Secrets Manager helper for retrieving secrets.

Provides a simple interface for fetching secrets from AWS Secrets Manager
with caching to minimize API calls.
"""

import os
import json
import logging
from typing import Optional, Any
from functools import lru_cache

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SecretsManagerError(Exception):
    """Exception raised when secrets cannot be retrieved."""

    pass


def _get_secrets_client():
    """Get boto3 Secrets Manager client."""
    # Check if running in test environment
    if os.getenv("PYTEST_CURRENT_TEST"):
        # Return None to indicate tests should use mocks
        return None

    region = os.getenv("AWS_REGION", "us-east-1")
    return boto3.client("secretsmanager", region_name=region)


@lru_cache(maxsize=32)
def get_secret(secret_name: str) -> str:
    """
    Retrieve a secret value from AWS Secrets Manager.

    Uses LRU cache to minimize API calls for repeated requests.

    Args:
        secret_name: The name or ARN of the secret to retrieve.

    Returns:
        The secret string value.

    Raises:
        SecretsManagerError: If the secret cannot be retrieved.
    """
    # For testing, check environment variable first
    env_key = secret_name.replace("/", "_").replace("-", "_").upper()
    env_value = os.getenv(env_key)
    if env_value:
        logger.debug(f"Using environment variable for secret: {env_key}")
        return env_value

    # Also check for a direct override (useful for local development)
    if os.getenv("PINECONE_API_KEY") and "pinecone" in secret_name.lower():
        return os.getenv("PINECONE_API_KEY")

    client = _get_secrets_client()
    if client is None:
        raise SecretsManagerError(
            f"Secrets Manager client not available in test environment. "
            f"Set environment variable {env_key} for testing."
        )

    try:
        response = client.get_secret_value(SecretId=secret_name)

        # Handle both string and binary secrets
        if "SecretString" in response:
            return response["SecretString"]
        else:
            raise SecretsManagerError(
                f"Binary secrets not supported for {secret_name}"
            )

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "ResourceNotFoundException":
            raise SecretsManagerError(f"Secret not found: {secret_name}")
        elif error_code == "AccessDeniedException":
            raise SecretsManagerError(
                f"Access denied to secret: {secret_name}. "
                "Check IAM permissions."
            )
        else:
            logger.error(f"Error retrieving secret {secret_name}: {e}")
            raise SecretsManagerError(f"Failed to retrieve secret: {secret_name}")


def get_secret_json(secret_name: str) -> dict[str, Any]:
    """
    Retrieve a secret and parse it as JSON.

    Args:
        secret_name: The name or ARN of the secret to retrieve.

    Returns:
        The parsed JSON as a dictionary.

    Raises:
        SecretsManagerError: If the secret cannot be retrieved or parsed.
    """
    secret_string = get_secret(secret_name)
    try:
        return json.loads(secret_string)
    except json.JSONDecodeError as e:
        raise SecretsManagerError(
            f"Secret {secret_name} is not valid JSON: {e}"
        )


def clear_secret_cache() -> None:
    """
    Clear the secrets cache.

    Useful for testing or when secrets need to be refreshed.
    """
    get_secret.cache_clear()
