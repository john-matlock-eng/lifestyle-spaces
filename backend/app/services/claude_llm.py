"""
Claude LLM Service - Integration with Anthropic's Claude API
"""
import os
import json
import boto3
from typing import Optional, Dict, Any
from anthropic import Anthropic
from app.services.exceptions import ExternalServiceError


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
        secret_arn = os.environ.get("CLAUDE_API_KEY_SECRET_ARN")

        if not secret_arn:
            raise ExternalServiceError(
                "CLAUDE_API_KEY_SECRET_ARN environment variable not set"
            )

        try:
            # Create a Secrets Manager client
            session = boto3.session.Session()
            client = session.client(service_name="secretsmanager")

            # Retrieve the secret value
            get_secret_value_response = client.get_secret_value(SecretId=secret_arn)

            # Parse the secret string
            secret = json.loads(get_secret_value_response["SecretString"])
            api_key = secret.get("api_key")

            if not api_key or api_key == "PLACEHOLDER_UPDATE_MANUALLY":
                raise ExternalServiceError(
                    "Claude API key not configured. Please update the secret in AWS Secrets Manager."
                )

            return api_key

        except Exception as e:
            raise ExternalServiceError(f"Failed to retrieve Claude API key from Secrets Manager: {str(e)}")

    def _initialize_client(self):
        """Initialize the Anthropic client with API key from Secrets Manager"""
        try:
            self.api_key = self._get_secret()
            self.client = Anthropic(api_key=self.api_key)
        except ExternalServiceError:
            # Client will remain None if initialization fails
            # This allows the service to exist but fail gracefully when called
            pass

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

        system_prompt = """You are a thoughtful journal companion that helps people reflect on their experiences.
Provide supportive, non-judgmental insights that encourage self-reflection and personal growth.
Keep responses concise and actionable."""

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
        _claude_service = ClaudeLLMService()
    return _claude_service
