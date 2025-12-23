"""
Chat Service with RAG (Retrieval Augmented Generation)

Orchestrates:
1. Semantic search for relevant journals
2. Context building with retrieved content
3. Claude API calls with streaming
4. Response parsing with citations
"""

import os
import logging
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, AsyncGenerator, Tuple, Dict, Any
from uuid import uuid4

import anthropic
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.core.secrets import get_secret
from app.models.chat import (
    ChatConversation,
    ChatMessage,
    JournalCitation,
    CreateChatConversationRequest,
    SendMessageRequest,
    ChatMode,
    ChatContext,
)
from app.services.journal_indexer import get_journal_indexer
from app.services.chat_mode import detect_chat_mode, get_author_display_name
from app.services.chat_prompts import get_system_prompt
from app.services.search_scoring import get_recency_tier

logger = logging.getLogger(__name__)


# =============================================================================
# SYSTEM PROMPT - Moved to chat_prompts.py
# Mode-specific prompts (author/supporter) are now in chat_prompts.py
# =============================================================================


# =============================================================================
# CHAT SERVICE
# =============================================================================


class ChatService:
    """
    Service for AI chat with journal context.

    Implements RAG pattern:
    1. Search relevant journals via Pinecone
    2. Retrieve full content from DynamoDB
    3. Build context-aware prompt
    4. Stream response from Claude
    """

    def __init__(self):
        """Initialize the chat service."""
        self.settings = get_settings()
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.table_name = os.getenv("DYNAMODB_TABLE", "lifestyle-spaces")

        self.dynamodb = boto3.resource("dynamodb", region_name=aws_region)
        self.table = self.dynamodb.Table(self.table_name)
        self.journal_indexer = get_journal_indexer()
        self._client: Optional[anthropic.Anthropic] = None

    @property
    def client(self) -> anthropic.Anthropic:
        """Lazy-load Anthropic client.

        Uses the same secret retrieval pattern as ClaudeLLMService:
        - Gets secret ARN from CLAUDE_API_KEY_SECRET_ARN environment variable
        - Parses JSON and extracts 'api_key' field
        """
        if self._client is None:
            secret_arn = os.environ.get("CLAUDE_API_KEY_SECRET_ARN")
            logger.info(f"[CHAT] Initializing Anthropic client, secret_arn present: {bool(secret_arn)}")

            if not secret_arn:
                logger.error("[CHAT] CLAUDE_API_KEY_SECRET_ARN environment variable not set")
                raise ValueError("CLAUDE_API_KEY_SECRET_ARN environment variable not set")

            # Get secret and parse JSON
            try:
                secret_string = get_secret(secret_arn)
                logger.info(f"[CHAT] Retrieved secret, length: {len(secret_string) if secret_string else 0}")
            except Exception as e:
                logger.error(f"[CHAT] Failed to retrieve secret: {e}")
                raise

            try:
                secret_data = json.loads(secret_string)
                api_key = secret_data.get("api_key")
                logger.info(f"[CHAT] Parsed JSON secret, api_key present: {bool(api_key)}")
            except json.JSONDecodeError:
                # If not JSON, use the raw string as the API key
                api_key = secret_string
                logger.info("[CHAT] Secret is not JSON, using raw string")

            if not api_key or api_key == "PLACEHOLDER_UPDATE_MANUALLY":
                logger.error("[CHAT] Claude API key not configured or is placeholder")
                raise ValueError("Claude API key not configured in Secrets Manager")

            logger.info(f"[CHAT] Creating Anthropic client with key prefix: {api_key[:10]}...")
            self._client = anthropic.Anthropic(api_key=api_key)
            logger.info("[CHAT] Anthropic client created successfully")
        return self._client

    # =========================================================================
    # DYNAMODB HELPERS
    # =========================================================================

    def _make_pk(self, space_id: str) -> str:
        return f"SPACE#{space_id}"

    def _make_sk(self, conversation_id: str) -> str:
        return f"CHAT#{conversation_id}"

    def _make_gsi1pk(self, user_id: str) -> str:
        return f"USER#{user_id}"

    def _make_gsi1sk(self, created_at: datetime) -> str:
        return f"CHAT#{created_at.isoformat()}"

    def _to_dynamodb_item(self, conversation: ChatConversation) -> dict:
        """Convert conversation to DynamoDB item."""
        return {
            "PK": self._make_pk(conversation.space_id),
            "SK": self._make_sk(conversation.conversation_id),
            "GSI1PK": self._make_gsi1pk(conversation.user_id),
            "GSI1SK": self._make_gsi1sk(conversation.created_at),
            "entityType": "ChatConversation",
            "conversationId": conversation.conversation_id,
            "spaceId": conversation.space_id,
            "userId": conversation.user_id,
            "title": conversation.title,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "citations": [
                        {
                            "journalId": c.journal_id,
                            "title": c.title,
                            "sectionTitle": c.section_title,
                            "sectionIndex": c.section_index,
                            "relevanceScore": Decimal(str(c.relevance_score)),
                            "excerpt": c.excerpt,
                            "createdAt": c.created_at,
                        }
                        for c in msg.citations
                    ],
                    "createdAt": msg.created_at.isoformat(),
                }
                for msg in conversation.messages
            ],
            "createdAt": conversation.created_at.isoformat(),
            "updatedAt": conversation.updated_at.isoformat(),
        }

    def _from_dynamodb_item(self, item: dict) -> ChatConversation:
        """Convert DynamoDB item to conversation."""
        messages = []
        for msg_data in item.get("messages", []):
            citations = [
                JournalCitation(
                    journalId=c["journalId"],
                    title=c["title"],
                    sectionTitle=c.get("sectionTitle", ""),
                    sectionIndex=c.get("sectionIndex", 0),
                    relevanceScore=float(c.get("relevanceScore", 0.0)),
                    excerpt=c.get("excerpt", ""),
                    createdAt=c.get("createdAt"),
                )
                for c in msg_data.get("citations", [])
            ]
            messages.append(
                ChatMessage(
                    id=msg_data["id"],
                    role=msg_data["role"],
                    content=msg_data["content"],
                    citations=citations,
                    createdAt=datetime.fromisoformat(msg_data["createdAt"]),
                )
            )

        return ChatConversation(
            conversationId=item["conversationId"],
            spaceId=item["spaceId"],
            userId=item["userId"],
            title=item.get("title"),
            messages=messages,
            createdAt=datetime.fromisoformat(item["createdAt"]),
            updatedAt=datetime.fromisoformat(item["updatedAt"]),
        )

    # =========================================================================
    # CONVERSATION MANAGEMENT
    # =========================================================================

    async def create_conversation(
        self,
        space_id: str,
        user_id: str,
        request: Optional[CreateChatConversationRequest] = None,
    ) -> ChatConversation:
        """Create a new conversation."""
        now = datetime.now(timezone.utc)
        conversation = ChatConversation(
            conversationId=str(uuid4()),
            spaceId=space_id,
            userId=user_id,
            title=None,
            messages=[],
            createdAt=now,
            updatedAt=now,
        )

        item = self._to_dynamodb_item(conversation)

        try:
            self.table.put_item(
                Item=item, ConditionExpression="attribute_not_exists(PK)"
            )
            logger.info(f"Created conversation {conversation.conversation_id}")
            return conversation

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise ValueError("Conversation already exists")
            raise

    async def get_conversation(
        self, space_id: str, conversation_id: str
    ) -> Optional[ChatConversation]:
        """Get a conversation by ID."""
        try:
            response = self.table.get_item(
                Key={
                    "PK": self._make_pk(space_id),
                    "SK": self._make_sk(conversation_id),
                }
            )

            item = response.get("Item")
            if not item:
                return None

            return self._from_dynamodb_item(item)

        except ClientError as e:
            logger.error(f"Failed to get conversation: {e}")
            raise

    async def update_conversation(
        self, conversation: ChatConversation
    ) -> ChatConversation:
        """Update a conversation (typically to add messages)."""
        conversation.updated_at = datetime.now(timezone.utc)
        item = self._to_dynamodb_item(conversation)

        try:
            self.table.put_item(Item=item)
            logger.info(f"Updated conversation {conversation.conversation_id}")
            return conversation

        except ClientError as e:
            logger.error(f"Failed to update conversation: {e}")
            raise

    async def list_conversations(
        self, space_id: str, limit: int = 20
    ) -> List[ChatConversation]:
        """List conversations in a space."""
        try:
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(self._make_pk(space_id))
                & Key("SK").begins_with("CHAT#"),
                ScanIndexForward=False,
                Limit=limit,
            )

            return [self._from_dynamodb_item(item) for item in response.get("Items", [])]

        except ClientError as e:
            logger.error(f"Failed to list conversations: {e}")
            raise

    async def delete_conversation(self, space_id: str, conversation_id: str) -> bool:
        """Delete a conversation."""
        try:
            self.table.delete_item(
                Key={
                    "PK": self._make_pk(space_id),
                    "SK": self._make_sk(conversation_id),
                }
            )
            logger.info(f"Deleted conversation {conversation_id}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete conversation: {e}")
            raise

    # =========================================================================
    # RAG: RETRIEVAL
    # =========================================================================

    async def _search_relevant_journals(
        self,
        query: str,
        space_id: str,
        user_id: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Search for journal sections relevant to the query.

        Uses grouped search to get journals with their best matching sections.

        Args:
            query: Search query
            space_id: Space to search within
            user_id: Optional user filter. If None, searches all users' journals.
            top_k: Number of results
        """
        try:
            results = await self.journal_indexer.search_space_grouped(
                query=query,
                space_id=space_id,
                user_id=user_id,
                top_k=top_k,
            )
            return results
        except Exception as e:
            logger.error(f"Journal search failed: {e}")
            return []

    async def _detect_mode_and_get_prompt(
        self,
        search_results: List[Dict[str, Any]],
        current_user_id: str,
    ) -> Tuple[ChatContext, str]:
        """
        Detect chat mode and return appropriate system prompt.

        Args:
            search_results: Journal search results with author info
            current_user_id: ID of the user sending the message

        Returns:
            Tuple of (ChatContext, system_prompt_string)
        """
        # Detect mode based on journal authorship
        chat_context = detect_chat_mode(
            current_user_id=current_user_id,
            journals=search_results,
        )

        # Get author name if in supporter mode
        if chat_context.mode == ChatMode.SUPPORTER and chat_context.primary_author_id:
            author_name = await get_author_display_name(
                chat_context.primary_author_id,
                self.table,
            )
            # Update context with name
            chat_context = ChatContext(
                mode=chat_context.mode,
                primary_author_id=chat_context.primary_author_id,
                primary_author_name=author_name,
                author_percentage=chat_context.author_percentage,
            )

        # Get appropriate system prompt
        system_prompt = get_system_prompt(
            mode=chat_context.mode,
            author_name=chat_context.primary_author_name,
        )

        return chat_context, system_prompt

    async def _retrieve_journal_content(
        self, journal_ids: List[str], space_id: str
    ) -> List[Dict[str, Any]]:
        """Retrieve full journal content from DynamoDB."""
        journals = []

        for journal_id in journal_ids:
            try:
                response = self.table.get_item(
                    Key={
                        "PK": f"SPACE#{space_id}",
                        "SK": f"JOURNAL#{journal_id}",
                    }
                )
                item = response.get("Item")
                if item:
                    journals.append(item)
            except Exception as e:
                logger.warning(f"Failed to retrieve journal {journal_id}: {e}")

        return journals

    def _extract_journal_text(self, journal: dict) -> str:
        """Extract text content from journal."""
        content = journal.get("content", "")

        # Handle TipTap JSON
        if isinstance(content, dict):
            return self._extract_tiptap_text(content)

        return str(content) if content else ""

    def _extract_tiptap_text(self, node: dict) -> str:
        """Recursively extract text from TipTap document."""
        texts = []

        if node.get("type") == "text":
            texts.append(node.get("text", ""))

        for child in node.get("content", []):
            if isinstance(child, dict):
                texts.append(self._extract_tiptap_text(child))

        return " ".join(filter(None, texts))

    # =========================================================================
    # RAG: CONTEXT BUILDING
    # =========================================================================

    def _build_journal_context(
        self,
        search_results: List[Dict[str, Any]],
        journals: List[Dict[str, Any]],
        author_name: Optional[str] = None,
    ) -> Tuple[str, List[JournalCitation]]:
        """
        Build context string and citations from search results.

        Uses section-level excerpts for precise context.
        Groups results by recency for better temporal awareness.
        Enhances context with AI-generated synopses when available.

        Args:
            search_results: Grouped search results with section info
            journals: Full journal content from DynamoDB (optional)
            author_name: Name of journal author (for supporter mode attribution)

        Returns:
            Tuple of (context_string, citations_list)
        """
        if not search_results:
            return "", []

        # Create journal lookup for full content and AI metadata
        journal_lookup = {
            (j.get("journal_id") or j.get("journalId")): j
            for j in journals
        }

        context_parts = []
        citations = []

        # Group results by recency tier
        tiers: Dict[str, List[Dict[str, Any]]] = {
            "this_week": [],
            "this_month": [],
            "recent": [],
            "older": [],
        }

        for result in search_results:
            tier = get_recency_tier(result.get("createdAt"))
            if tier in tiers:
                tiers[tier].append(result)
            else:
                tiers["older"].append(result)

        # Build header with author attribution (critical for supporter mode)
        author_attribution = ""
        if author_name:
            author_attribution = f" by {author_name}"
            context_parts.append(
                f"*Note: These are {author_name}'s journal entries. "
                "They have shared these with you.*\n"
            )

        dates = [
            r.get("createdAt", "")[:10]
            for r in search_results
            if r.get("createdAt")
        ]
        if dates:
            date_range = f"from {min(dates)} to {max(dates)}"
            context_parts.append(f"## Journal Entries{author_attribution} ({date_range})\n")
        else:
            context_parts.append(f"## Relevant Journal Entries{author_attribution}\n")

        def format_result(result: Dict[str, Any], index: int) -> None:
            """Format a single result and add to context/citations."""
            journal_id = result["journalId"]
            journal_title = result.get("journalTitle", "Untitled")
            created_at = result.get("createdAt", "")
            sections = result.get("sections", [])

            context_parts.append(f"### [{index}] {journal_title}")
            if created_at:
                context_parts.append(f"*Date: {created_at[:10]}*\n")

            # Add AI synopsis if available
            full_journal = journal_lookup.get(journal_id, {})
            ai_metadata = full_journal.get("ai_metadata")
            if ai_metadata:
                synopsis = ai_metadata.get("synopsis", "")
                if synopsis:
                    context_parts.append(f"*Summary: {synopsis}*\n")

                themes = ai_metadata.get("themes", [])
                if themes:
                    context_parts.append(f"*Themes: {', '.join(themes[:5])}*\n")

            # Add each relevant section
            for section in sections[:2]:
                section_title = section.get("sectionTitle", "")
                excerpt = section.get("excerpt", "")

                if section_title:
                    context_parts.append(f"**{section_title}:**")
                if excerpt:
                    # Truncate long excerpts
                    display_excerpt = (
                        excerpt[:300] + "..." if len(excerpt) > 300 else excerpt
                    )
                    context_parts.append(display_excerpt)
                context_parts.append("")

                # Build citation
                citations.append(
                    JournalCitation(
                        journalId=journal_id,
                        title=journal_title,
                        sectionTitle=section_title,
                        sectionIndex=section.get("sectionIndex", 0),
                        relevanceScore=section.get("score", 0.0),
                        excerpt=(
                            excerpt[:200] + "..."
                            if len(excerpt) > 200
                            else excerpt
                        ),
                        createdAt=created_at[:10] if created_at else None,
                    )
                )

        # Format each tier with label
        tier_labels = {
            "this_week": "This Week",
            "this_month": "Earlier This Month",
            "recent": "Past Few Months",
            "older": "Older Entries",
        }

        index = 1
        for tier_key in ["this_week", "this_month", "recent", "older"]:
            tier_results = tiers[tier_key]
            if not tier_results:
                continue

            context_parts.append(f"#### {tier_labels[tier_key]}\n")

            for result in tier_results:
                format_result(result, index)
                index += 1

        return "\n".join(context_parts), citations

    def _build_messages_for_claude(
        self,
        conversation: ChatConversation,
        new_message: str,
        journal_context: str,
    ) -> List[dict]:
        """Build message history for Claude API."""
        messages = []

        # Add conversation history (limited)
        history_messages = conversation.messages[
            -self.settings.chat_max_history_messages :
        ]

        for msg in history_messages:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

        # Add new user message with journal context
        if journal_context:
            user_content = f"""<journal_context>
{journal_context}
</journal_context>

User message: {new_message}"""
        else:
            user_content = new_message

        messages.append({"role": "user", "content": user_content})

        return messages

    # =========================================================================
    # RAG: GENERATION
    # =========================================================================

    async def send_message(
        self,
        space_id: str,
        conversation_id: str,
        user_id: str,
        request: SendMessageRequest,
    ) -> Tuple[ChatMessage, List[JournalCitation]]:
        """
        Send a message and get AI response (non-streaming).

        Full RAG flow with mode detection:
        1. Search relevant journals (all users in space)
        2. Detect author/supporter mode
        3. Retrieve content
        4. Build context
        5. Call Claude with mode-appropriate prompt
        6. Return response with citations
        """
        # Get conversation
        conversation = await self.get_conversation(space_id, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")

        if conversation.user_id != user_id:
            raise ValueError("Not authorized to access this conversation")

        user_message = request.content

        # 1. Search relevant journals (ALL users in space for mode detection)
        search_results = await self._search_relevant_journals(
            query=user_message,
            space_id=space_id,
            user_id=None,  # Don't filter - get all journals for mode detection
            top_k=self.settings.chat_max_journal_results,
        )

        # 2. Detect mode and get appropriate prompt
        chat_context, system_prompt = await self._detect_mode_and_get_prompt(
            search_results=search_results,
            current_user_id=user_id,
        )

        logger.info(
            f"[CHAT] Mode: {chat_context.mode.value}, "
            f"Author: {chat_context.primary_author_name or 'self'}"
        )

        # 3. Retrieve full journal content
        journal_ids = [r["journalId"] for r in search_results if r.get("journalId")]
        journals = await self._retrieve_journal_content(journal_ids, space_id)

        # 4. Build context from section-level search results
        # Pass author_name for supporter mode attribution in context
        journal_context, citations = self._build_journal_context(
            search_results,
            journals,
            author_name=chat_context.primary_author_name if chat_context.mode == ChatMode.SUPPORTER else None,
        )

        # 5. Build messages
        messages = self._build_messages_for_claude(
            conversation=conversation,
            new_message=user_message,
            journal_context=journal_context,
        )

        # 6. Call Claude with mode-appropriate system prompt
        try:
            response = self.client.messages.create(
                model=self.settings.anthropic_model,
                max_tokens=self.settings.chat_max_response_tokens,
                system=system_prompt,
                messages=messages,
            )

            assistant_content = response.content[0].text

        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise ValueError(f"AI service error: {e}")

        # 7. Create message objects
        now = datetime.now(timezone.utc)

        user_msg = ChatMessage(
            id=str(uuid4()),
            role="user",
            content=user_message,
            citations=[],
            createdAt=now,
        )

        assistant_msg = ChatMessage(
            id=str(uuid4()),
            role="assistant",
            content=assistant_content,
            citations=citations,
            createdAt=now,
        )

        # 8. Update conversation
        conversation.messages.append(user_msg)
        conversation.messages.append(assistant_msg)

        # Auto-generate title from first message if not set
        if not conversation.title and len(conversation.messages) <= 2:
            conversation.title = (
                user_message[:50] + ("..." if len(user_message) > 50 else "")
            )

        await self.update_conversation(conversation)

        return assistant_msg, citations

    async def send_message_streaming(
        self,
        space_id: str,
        conversation_id: str,
        user_id: str,
        request: SendMessageRequest,
    ) -> AsyncGenerator[str, None]:
        """
        Send a message and stream AI response.

        Yields:
            JSON strings with streaming data:
            - {"type": "mode", "data": {"mode": "author"|"supporter", ...}}
            - {"type": "citations", "data": [...]}
            - {"type": "content", "data": "text chunk"}
            - {"type": "done", "messageId": "..."}
            - {"type": "error", "message": "..."}
        """
        # Get conversation
        conversation = await self.get_conversation(space_id, conversation_id)
        if not conversation:
            yield json.dumps({"type": "error", "message": "Conversation not found"})
            return

        if conversation.user_id != user_id:
            logger.warning(
                f"[CHAT] Authorization mismatch: conversation {conversation_id} "
                f"owned by {conversation.user_id[:8]}..., "
                f"but accessed by {user_id[:8]}..."
            )
            yield json.dumps({
                "type": "error",
                "message": "This conversation belongs to another user",
                "code": "CONVERSATION_OWNERSHIP_MISMATCH",
            })
            return

        user_message = request.content

        # 1. Search relevant journals (ALL users in space)
        search_results = await self._search_relevant_journals(
            query=user_message,
            space_id=space_id,
            user_id=None,  # Don't filter - get all journals for mode detection
            top_k=self.settings.chat_max_journal_results,
        )

        # 2. Detect mode and get appropriate prompt
        chat_context, system_prompt = await self._detect_mode_and_get_prompt(
            search_results=search_results,
            current_user_id=user_id,
        )

        logger.info(
            f"[CHAT] Mode detected: {chat_context.mode.value}, "
            f"author_name: {chat_context.primary_author_name}, "
            f"prompt_type: {'SUPPORTER' if 'speaking to someone who CARES' in system_prompt else 'AUTHOR'}"
        )

        # Yield mode information first
        yield json.dumps({
            "type": "mode",
            "data": {
                "mode": chat_context.mode.value,
                "authorName": chat_context.primary_author_name,
                "authorPercentage": chat_context.author_percentage,
            }
        })

        # 3. Retrieve full journal content
        journal_ids = [r["journalId"] for r in search_results if r.get("journalId")]
        journals = await self._retrieve_journal_content(journal_ids, space_id)

        # 4. Build context from section-level search results
        # Pass author_name for supporter mode attribution in context
        journal_context, citations = self._build_journal_context(
            search_results,
            journals,
            author_name=chat_context.primary_author_name if chat_context.mode == ChatMode.SUPPORTER else None,
        )

        # Yield citations
        yield json.dumps(
            {
                "type": "citations",
                "data": [c.model_dump(by_alias=True) for c in citations],
            }
        )

        # 5. Build messages
        messages = self._build_messages_for_claude(
            conversation=conversation,
            new_message=user_message,
            journal_context=journal_context,
        )

        # 6. Stream from Claude with mode-appropriate prompt
        full_response = []
        message_id = str(uuid4())

        try:
            with self.client.messages.stream(
                model=self.settings.anthropic_model,
                max_tokens=self.settings.chat_max_response_tokens,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    full_response.append(text)
                    yield json.dumps({"type": "content", "data": text})

            assistant_content = "".join(full_response)

            # 7. Save to conversation
            now = datetime.now(timezone.utc)

            user_msg = ChatMessage(
                id=str(uuid4()),
                role="user",
                content=user_message,
                citations=[],
                createdAt=now,
            )

            assistant_msg = ChatMessage(
                id=message_id,
                role="assistant",
                content=assistant_content,
                citations=citations,
                createdAt=now,
            )

            conversation.messages.append(user_msg)
            conversation.messages.append(assistant_msg)

            if not conversation.title and len(conversation.messages) <= 2:
                conversation.title = (
                    user_message[:50] + ("..." if len(user_message) > 50 else "")
                )

            await self.update_conversation(conversation)

            yield json.dumps({"type": "done", "messageId": message_id})

        except anthropic.APIError as e:
            logger.error(f"Claude streaming error: {e}")
            yield json.dumps({"type": "error", "message": f"AI service error: {str(e)}"})


# Singleton instance
_chat_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    """Get singleton chat service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service


def reset_chat_service() -> None:
    """Reset the singleton instance. Useful for testing."""
    global _chat_service
    _chat_service = None
