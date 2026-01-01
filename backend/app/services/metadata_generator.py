"""
AI Metadata Generator Service

Generates synopsis, themes, insights, and sentiment for journal entries
using Claude API.
"""

import logging
import json
import os
from datetime import datetime, timezone
from typing import Optional, List, Any

import anthropic

from app.core.config import settings
from app.core.secrets import get_secret
from app.models.ai_metadata import JournalAIMetadata, SentimentType
from app.services.section_parser import get_section_parser

logger = logging.getLogger(__name__)


# =============================================================================
# PROMPT TEMPLATE
# =============================================================================

METADATA_SYSTEM_PROMPT = (
    "You are an AI assistant that analyzes personal journal entries to extract "
    "meaningful metadata. Your goal is to help users discover patterns and "
    "insights in their reflections.\n\n"
    "You will receive a journal entry and must return a JSON object with the "
    "following structure:\n\n"
    "{\n"
    '  "synopsis": "A 2-3 sentence summary capturing the essence of this entry.",\n'
    '  "themes": ["theme1", "theme2", "theme3"],\n'
    '  "insights": ["Key realization or takeaway 1", "Key realization 2"],\n'
    '  "sentiment": "one of: reflective, positive, challenging, grateful, '
    'anxious, hopeful, neutral, mixed",\n'
    '  "emotionalTone": "A brief, nuanced description of the emotional quality"\n'
    "}\n\n"
    "Guidelines:\n"
    "- Synopsis: Be specific to THIS entry. Mention key topics or events.\n"
    "- Themes: 3-7 single words or short phrases. Include topic and emotional themes.\n"
    "- Insights: Extract actual realizations the author had, not generic observations.\n"
    "- Sentiment: Choose the dominant tone. Use 'mixed' if genuinely conflicted.\n"
    "- Emotional Tone: Be nuanced and specific, not just repeating the sentiment.\n\n"
    "Return ONLY the JSON object, no other text."
)


METADATA_USER_PROMPT = """Analyze this journal entry and return the metadata JSON:

Title: {title}

{content}"""


# =============================================================================
# SERVICE
# =============================================================================

class MetadataGenerator:
    """
    Service for generating AI metadata for journals.

    Uses Claude API to analyze journal content and extract:
    - Synopsis (summary)
    - Themes (topic tags)
    - Insights (key takeaways)
    - Sentiment (emotional tone)
    """

    def __init__(self):
        self._client: Optional[anthropic.Anthropic] = None
        self.section_parser = get_section_parser()

    @property
    def client(self) -> anthropic.Anthropic:
        """Lazy-load Anthropic client.

        Uses the same secret retrieval pattern as ChatService:
        - Gets secret ARN from CLAUDE_API_KEY_SECRET_ARN environment variable
        - Parses JSON and extracts 'api_key' field
        - Falls back to ANTHROPIC_API_KEY env var for local dev
        """
        if self._client is None:
            api_key = None

            # Primary method: Use secret ARN (production)
            secret_arn = os.environ.get("CLAUDE_API_KEY_SECRET_ARN")
            if secret_arn:
                try:
                    secret_string = get_secret(secret_arn)
                    try:
                        secret_data = json.loads(secret_string)
                        api_key = secret_data.get("api_key")
                    except json.JSONDecodeError:
                        # If not JSON, use raw string
                        api_key = secret_string
                    logger.info("[METADATA] Retrieved API key from secret ARN")
                except Exception as e:
                    logger.warning(f"[METADATA] Could not get secret from ARN: {e}")

            # Fallback: Direct env var (local dev/testing)
            if not api_key:
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if api_key:
                    logger.info("[METADATA] Using ANTHROPIC_API_KEY env var")

            # Legacy fallback: Secret name from settings
            if not api_key:
                try:
                    api_key = get_secret(settings.anthropic_secret_name)
                    logger.info("[METADATA] Using legacy secret name")
                except Exception as e:
                    logger.warning(f"[METADATA] Could not get Anthropic API key: {e}")

            if not api_key or api_key == "PLACEHOLDER_UPDATE_MANUALLY":
                raise ValueError("Anthropic API key not configured")

            self._client = anthropic.Anthropic(api_key=api_key)
            logger.info("[METADATA] Anthropic client initialized successfully")

        return self._client

    def _extract_text_content(self, content: Any) -> str:
        """Extract plain text from journal content."""
        if content is None:
            return ""

        if isinstance(content, str):
            return content

        if isinstance(content, dict):
            # Check if it's a section dict (contentTiptap format)
            if self._is_section_dict(content):
                return self._extract_from_section_dict(content)
            # Single TipTap doc
            return self._extract_tiptap_text(content)

        return str(content)

    def _is_section_dict(self, content: dict) -> bool:
        """Check if content is a dict of section TipTap docs."""
        section_keys = [k for k in content.keys() if k != 'content']
        for key in section_keys:
            value = content.get(key)
            if isinstance(value, dict) and value.get('type') == 'doc':
                return True
        return False

    def _extract_from_section_dict(self, content: dict) -> str:
        """Extract text from section dict format (contentTiptap)."""
        texts = []

        # Section key order for readable output
        section_order = [
            'raw_thoughts', 'deep_dive', 'action_plan',  # Express/Examine/Evolve
            'scene', 'reaction', 'takeaway',              # Daily Lens
            'gratitude', 'reflection',                    # Gratitude
            'identity', 'values', 'mission', 'commitments',
        ]

        # Process in order, then remaining keys
        processed = set()
        keys_to_process = []

        for key in section_order:
            if key in content:
                keys_to_process.append(key)
                processed.add(key)

        for key in content.keys():
            if key not in processed and key != 'content':
                keys_to_process.append(key)

        for key in keys_to_process:
            value = content.get(key)
            if value is None:
                continue

            section_text = ""
            if isinstance(value, dict) and value.get('type') == 'doc':
                section_text = self._extract_tiptap_text(value)
            elif isinstance(value, str):
                # Try to parse as JSON for Q&A format
                if value.strip().startswith('['):
                    try:
                        qa_list = json.loads(value)
                        if isinstance(qa_list, list):
                            qa_texts = []
                            for item in qa_list:
                                if isinstance(item, dict):
                                    q = item.get('question', '')
                                    a = item.get('answer', '')
                                    if q and a:
                                        qa_texts.append(f"Q: {q}\nA: {a}")
                            if qa_texts:
                                section_text = "\n\n".join(qa_texts)
                            else:
                                section_text = value
                        else:
                            section_text = value
                    except (json.JSONDecodeError, AttributeError):
                        section_text = value
                else:
                    section_text = value
            elif isinstance(value, list):
                # Q&A list directly
                qa_texts = []
                for item in value:
                    if isinstance(item, dict):
                        q = item.get('question', '')
                        a = item.get('answer', '')
                        if q and a:
                            qa_texts.append(f"Q: {q}\nA: {a}")
                if qa_texts:
                    section_text = "\n\n".join(qa_texts)

            if section_text and section_text.strip():
                texts.append(section_text.strip())

        return "\n\n".join(texts)

    def _extract_tiptap_text(self, node: dict) -> str:
        """Recursively extract text from TipTap document."""
        texts = []

        if node.get("type") == "text":
            texts.append(node.get("text", ""))

        for child in node.get("content", []):
            if isinstance(child, dict):
                texts.append(self._extract_tiptap_text(child))

        return " ".join(filter(None, texts))

    async def generate_metadata(
        self,
        journal_id: str,
        title: str,
        content: Any,
        template_id: Optional[str] = None,
        content_tiptap: Any = None
    ) -> JournalAIMetadata:
        """
        Generate AI metadata for a journal entry.

        Args:
            journal_id: Journal ID (for logging)
            title: Journal title
            content: Journal content (markdown string or TipTap JSON)
            template_id: Optional template ID for context
            content_tiptap: TipTap content structure (preferred if available)

        Returns:
            JournalAIMetadata with generated fields
        """
        # Prefer contentTiptap, fall back to content
        text_content = ""
        if content_tiptap:
            text_content = self._extract_text_content(content_tiptap)
        if not text_content and content:
            text_content = self._extract_text_content(content)

        if not text_content or len(text_content.strip()) < 50:
            logger.warning(f"Journal {journal_id} has insufficient content for metadata")
            return self._create_minimal_metadata(title)

        # Truncate if too long (save tokens)
        max_chars = 6000  # ~1500 tokens
        if len(text_content) > max_chars:
            text_content = text_content[:max_chars] + "\n\n[Content truncated for analysis]"

        # Build prompt
        user_prompt = METADATA_USER_PROMPT.format(
            title=title or "Untitled",
            content=text_content
        )

        try:
            response = self.client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1000,
                system=METADATA_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}]
            )

            # Parse JSON response
            response_text = response.content[0].text.strip()

            # Handle potential markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            metadata_dict = json.loads(response_text)

            # Validate and create metadata
            return JournalAIMetadata(
                synopsis=metadata_dict.get("synopsis", "")[:500],
                themes=self._normalize_themes(metadata_dict.get("themes", [])),
                insights=metadata_dict.get("insights", [])[:5],
                sentiment=self._normalize_sentiment(metadata_dict.get("sentiment", "neutral")),
                emotionalTone=metadata_dict.get("emotionalTone", "")[:100],
                generatedAt=datetime.now(timezone.utc),
                modelUsed=settings.anthropic_model
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse metadata JSON for {journal_id}: {e}")
            return self._create_minimal_metadata(title)

        except anthropic.APIError as e:
            logger.error(f"Claude API error generating metadata for {journal_id}: {e}")
            raise

        except Exception as e:
            logger.error(f"Unexpected error generating metadata for {journal_id}: {e}")
            return self._create_minimal_metadata(title)

    def _normalize_themes(self, themes: list) -> List[str]:
        """Normalize and validate themes."""
        if not themes:
            return ["reflection"]

        normalized = []
        for theme in themes[:10]:
            if isinstance(theme, str):
                # Lowercase, strip, limit length
                clean = theme.lower().strip()[:30]
                if clean and clean not in normalized:
                    normalized.append(clean)

        return normalized[:7] if normalized else ["reflection"]

    def _normalize_sentiment(self, sentiment: str) -> SentimentType:
        """Normalize sentiment to valid enum value."""
        valid_sentiments = {
            "reflective", "positive", "challenging", "grateful",
            "anxious", "hopeful", "neutral", "mixed"
        }

        if sentiment and sentiment.lower() in valid_sentiments:
            return sentiment.lower()  # type: ignore

        return "neutral"

    def _create_minimal_metadata(self, title: str) -> JournalAIMetadata:
        """Create minimal metadata for short/empty journals."""
        return JournalAIMetadata(
            synopsis=f"A brief journal entry titled '{title or 'Untitled'}'.",
            themes=["reflection"],
            insights=[],
            sentiment="neutral",
            emotionalTone="",
            generatedAt=datetime.now(timezone.utc),
            modelUsed="none"
        )


# Singleton
_metadata_generator: Optional[MetadataGenerator] = None


def get_metadata_generator() -> MetadataGenerator:
    """Get singleton metadata generator instance."""
    global _metadata_generator
    if _metadata_generator is None:
        _metadata_generator = MetadataGenerator()
    return _metadata_generator


def reset_metadata_generator() -> None:
    """Reset singleton (for testing)."""
    global _metadata_generator
    _metadata_generator = None
