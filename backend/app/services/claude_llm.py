"""
Claude LLM Service - Integration with Anthropic's Claude API
"""
import os
import json
import boto3
import logging
from typing import Optional, Dict, Any
from anthropic import Anthropic
from app.services.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class ClaudeLLMService:
    """Service for interacting with Claude LLM API"""

    def __init__(self):
        self.api_key: Optional[str] = None
        self.client: Optional[Anthropic] = None
        self._initialize_client()

    def _get_secret(self) -> str:
        """
        Retrieve Claude API key from AWS Secrets Manager

        Returns:
            str: Claude API key

        Raises:
            ExternalServiceError: If secret cannot be retrieved
        """
        logger.info("=== Claude API Key Retrieval START ===")
        secret_arn = os.environ.get("CLAUDE_API_KEY_SECRET_ARN")
        logger.info(f"Secret ARN from environment: {secret_arn}")

        if not secret_arn:
            logger.error("CLAUDE_API_KEY_SECRET_ARN environment variable not set")
            raise ExternalServiceError(
                "CLAUDE_API_KEY_SECRET_ARN environment variable not set"
            )

        try:
            # Create a Secrets Manager client
            logger.info("Creating AWS Secrets Manager client...")
            session = boto3.session.Session()
            client = session.client(service_name="secretsmanager")
            logger.info("Secrets Manager client created successfully")

            # Retrieve the secret value
            logger.info(f"Attempting to retrieve secret: {secret_arn}")
            get_secret_value_response = client.get_secret_value(SecretId=secret_arn)
            logger.info("Secret retrieved successfully from AWS")

            # Parse the secret string
            secret_string = get_secret_value_response["SecretString"]
            logger.info(f"Secret string length: {len(secret_string)}")
            logger.info(f"Secret string preview: {secret_string[:50]}...")

            secret = json.loads(secret_string)
            logger.info(f"Secret parsed as JSON. Keys: {list(secret.keys())}")

            api_key = secret.get("api_key")
            logger.info(f"API key present: {bool(api_key)}")

            if api_key:
                logger.info(f"API key length: {len(api_key)}")
                logger.info(f"API key prefix: {api_key[:15]}...")
                logger.info(f"Is placeholder: {api_key == 'PLACEHOLDER_UPDATE_MANUALLY'}")

            if not api_key or api_key == "PLACEHOLDER_UPDATE_MANUALLY":
                logger.error("Claude API key is placeholder or missing")
                raise ExternalServiceError(
                    "Claude API key not configured. Please update the secret in "
                    "AWS Secrets Manager."
                )

            logger.info("=== Claude API Key Retrieval SUCCESS ===")
            return api_key

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            secret_str = get_secret_value_response.get('SecretString', 'N/A')
            logger.error(f"Secret string was: {secret_str}")
            raise ExternalServiceError(
                f"Failed to parse Claude API key secret as JSON: {str(e)}"
            )
        except Exception as e:
            logger.error("=== Claude API Key Retrieval FAILED ===")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}", exc_info=True)
            raise ExternalServiceError(
                f"Failed to retrieve Claude API key from Secrets Manager: {str(e)}"
            )

    def _initialize_client(self):
        """Initialize the Anthropic client with API key from Secrets Manager"""
        logger.info("=== Claude Client Initialization START ===")
        try:
            logger.info("Retrieving API key from Secrets Manager...")
            self.api_key = self._get_secret()
            logger.info(f"API key retrieved. Length: {len(self.api_key) if self.api_key else 0}")

            logger.info("Creating Anthropic client...")
            self.client = Anthropic(api_key=self.api_key)
            logger.info("Anthropic client created successfully")
            logger.info("=== Claude Client Initialization SUCCESS ===")

        except ExternalServiceError as e:
            logger.error("=== Claude Client Initialization FAILED ===")
            logger.error(f"Initialization error: {str(e)}")
            # Client will remain None if initialization fails
            # This allows the service to exist but fail gracefully when called
            self.client = None
            self.api_key = None
        except Exception as e:
            logger.error("=== Claude Client Initialization FAILED (Unexpected) ===")
            logger.error(f"Unexpected error type: {type(e).__name__}")
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            self.client = None
            self.api_key = None

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 1.0,
        model: str = "claude-3-5-sonnet-20241022"
    ) -> Dict[str, Any]:
        """
        Generate a response from Claude LLM

        Args:
            prompt: User prompt/input
            system_prompt: Optional system prompt to guide the model
            max_tokens: Maximum tokens in response (default: 1024)
            temperature: Sampling temperature 0-1 (default: 1.0)
            model: Claude model to use (default: claude-3-5-sonnet-20241022)

        Returns:
            Dict containing:
                - response: The generated text response
                - model: Model used
                - usage: Token usage information

        Raises:
            ExternalServiceError: If the client is not initialized or request fails
        """
        if not self.client:
            raise ExternalServiceError(
                "Claude LLM client not initialized. Please check API key configuration."
            )

        try:
            # Build message params
            message_params = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }

            # Add system prompt if provided
            if system_prompt:
                message_params["system"] = system_prompt

            # Call Claude API
            message = self.client.messages.create(**message_params)

            # Extract response text
            response_text = ""
            if message.content:
                # Content is a list of content blocks
                for block in message.content:
                    if hasattr(block, 'text'):
                        response_text += block.text

            # Return structured response
            return {
                "response": response_text,
                "model": message.model,
                "usage": {
                    "input_tokens": message.usage.input_tokens if message.usage else 0,
                    "output_tokens": message.usage.output_tokens if message.usage else 0,
                }
            }

        except Exception as e:
            raise ExternalServiceError(f"Failed to generate Claude LLM response: {str(e)}")

    def generate_journal_insights(
        self,
        journal_content: str,
        journal_title: Optional[str] = None,
        emotions: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Generate insights and suggestions for a journal entry

        Args:
            journal_content: The journal entry content
            journal_title: Optional title of the journal entry
            emotions: Optional list of emotions tagged in the entry

        Returns:
            Dict containing insights and suggestions
        """
        # Build context
        context_parts = []
        if journal_title:
            context_parts.append(f"Title: {journal_title}")
        if emotions:
            context_parts.append(f"Tagged emotions: {', '.join(emotions)}")

        context = "\n".join(context_parts) if context_parts else ""

        # Build prompt
        prompt = f"""Please analyze this journal entry and provide helpful insights:

{context}

Journal Entry:
{journal_content}

Please provide:
1. A brief summary of the main themes
2. Reflection questions to deepen self-awareness
3. Positive observations or patterns
"""

        system_prompt = (
            "You are a thoughtful journal companion that helps people reflect on "
            "their experiences. Provide supportive, non-judgmental insights that "
            "encourage self-reflection and personal growth. Keep responses concise "
            "and actionable."
        )

        return self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=800,
            temperature=0.7
        )


# Singleton instance
_claude_service: Optional[ClaudeLLMService] = None


def get_claude_service() -> ClaudeLLMService:
    """
    Get or create the Claude LLM service singleton

    Returns:
        ClaudeLLMService instance
    """
    global _claude_service
    if _claude_service is None:
        logger.info("Creating new Claude LLM service singleton...")
        _claude_service = ClaudeLLMService()
        logger.info(f"Service created. Client initialized: {_claude_service.client is not None}")
    else:
        logger.info("Returning existing Claude LLM service singleton")
        logger.info(f"Existing client status: {_claude_service.client is not None}")
    return _claude_service
