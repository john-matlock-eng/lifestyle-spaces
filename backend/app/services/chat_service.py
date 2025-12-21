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
)
from app.services.journal_indexer import get_journal_indexer

logger = logging.getLogger(__name__)


# =============================================================================
# SYSTEM PROMPT
# =============================================================================

ELLIE_SYSTEM_PROMPT = """You are Ellie, a warm and insightful AI companion in the Lifestyle Spaces journaling app. You're represented as a friendly Shih Tzu who helps users reflect on their journal entries and personal growth.

## Your Personality
- Warm, supportive, and genuinely curious about the user's experiences
- Thoughtful and reflective, helping users see patterns and insights
- Encouraging without being saccharine or dismissive of real struggles
- You speak naturally, not in bullet points unless specifically helpful

## Your Capabilities
- You have access to the user's journal entries in this space (provided in context)
- You can reference specific journals to ground your responses
- You help users notice patterns, growth, and areas for reflection
- You ask thoughtful follow-up questions when appropriate

## Guidelines
- When referencing a journal, mention it naturally (e.g., "In your entry about...")
- Don't make up or assume journal content not provided in context
- If asked about something not in the provided journals, say so honestly
- Keep responses conversational and appropriately concise
- Respect emotional vulnerability - match the tone of the user's message

## Citation Format
When you reference a specific journal entry, include it naturally in your response. The system will automatically link citations based on the journals provided in context.

Remember: You're a supportive companion, not a therapist. Encourage professional help for serious mental health concerns."""


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
                            "relevanceScore": float(c.relevance_score),
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
                    relevanceScore=c.get("relevanceScore", 0.0),
                    excerpt=c.get("excerpt"),
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
        self, query: str, space_id: str, user_id: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for journals relevant to the query."""
        try:
            results = await self.journal_indexer.search(
                query=query,
                space_id=space_id,
                user_id=user_id,
                top_k=top_k,
            )
            # Convert SearchResult to dict
            return [
                {
                    "journalId": r.id,
                    "score": r.score,
                    "metadata": r.metadata,
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Journal search failed: {e}")
            return []

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
        self, journals: List[Dict[str, Any]], search_results: List[Dict[str, Any]]
    ) -> Tuple[str, List[JournalCitation]]:
        """
        Build context string and citations from journals.

        Returns:
            Tuple of (context_string, citations_list)
        """
        if not journals:
            return "", []

        # Create score lookup from search results
        score_lookup = {r["journalId"]: r["score"] for r in search_results}

        context_parts = []
        citations = []

        context_parts.append("## Relevant Journal Entries\n")

        for i, journal in enumerate(journals, 1):
            journal_id = journal.get("journalId") or journal.get("journal_id")
            title = journal.get("title", "Untitled")
            created_at = journal.get("createdAt") or journal.get("created_at", "")
            content = self._extract_journal_text(journal)

            # Truncate content if too long
            max_content_length = 1500
            if len(content) > max_content_length:
                content = content[:max_content_length] + "..."

            context_parts.append(f"### [{i}] {title}")
            if created_at:
                date_str = created_at[:10] if isinstance(created_at, str) else str(created_at)[:10]
                context_parts.append(f"*Date: {date_str}*")
            context_parts.append(f"\n{content}\n")

            # Build citation
            score = score_lookup.get(journal_id, 0.0)
            citations.append(
                JournalCitation(
                    journalId=journal_id,
                    title=title,
                    relevanceScore=score,
                    excerpt=content[:200] + "..." if len(content) > 200 else content,
                    createdAt=created_at[:10] if created_at else None,
                )
            )

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

        Full RAG flow:
        1. Search relevant journals
        2. Retrieve content
        3. Build context
        4. Call Claude
        5. Return response with citations
        """
        # Get conversation
        conversation = await self.get_conversation(space_id, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")

        if conversation.user_id != user_id:
            raise ValueError("Not authorized to access this conversation")

        user_message = request.content

        # 1. Search relevant journals
        search_results = await self._search_relevant_journals(
            query=user_message,
            space_id=space_id,
            user_id=user_id,
            top_k=self.settings.chat_max_journal_results,
        )

        # 2. Retrieve full journal content
        journal_ids = [r["journalId"] for r in search_results if r.get("journalId")]
        journals = await self._retrieve_journal_content(journal_ids, space_id)

        # 3. Build context
        journal_context, citations = self._build_journal_context(journals, search_results)

        # 4. Build messages
        messages = self._build_messages_for_claude(
            conversation=conversation,
            new_message=user_message,
            journal_context=journal_context,
        )

        # 5. Call Claude
        try:
            response = self.client.messages.create(
                model=self.settings.anthropic_model,
                max_tokens=self.settings.chat_max_response_tokens,
                system=ELLIE_SYSTEM_PROMPT,
                messages=messages,
            )

            assistant_content = response.content[0].text

        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise ValueError(f"AI service error: {e}")

        # 6. Create message objects
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

        # 7. Update conversation
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
            yield json.dumps({"type": "error", "message": "Not authorized"})
            return

        user_message = request.content

        # 1. Search relevant journals
        search_results = await self._search_relevant_journals(
            query=user_message,
            space_id=space_id,
            user_id=user_id,
            top_k=self.settings.chat_max_journal_results,
        )

        # 2. Retrieve full journal content
        journal_ids = [r["journalId"] for r in search_results if r.get("journalId")]
        journals = await self._retrieve_journal_content(journal_ids, space_id)

        # 3. Build context
        journal_context, citations = self._build_journal_context(journals, search_results)

        # Yield citations first
        yield json.dumps(
            {
                "type": "citations",
                "data": [c.model_dump(by_alias=True) for c in citations],
            }
        )

        # 4. Build messages
        messages = self._build_messages_for_claude(
            conversation=conversation,
            new_message=user_message,
            journal_context=journal_context,
        )

        # 5. Stream from Claude
        full_response = []
        message_id = str(uuid4())

        try:
            with self.client.messages.stream(
                model=self.settings.anthropic_model,
                max_tokens=self.settings.chat_max_response_tokens,
                system=ELLIE_SYSTEM_PROMPT,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    full_response.append(text)
                    yield json.dumps({"type": "content", "data": text})

            assistant_content = "".join(full_response)

            # 6. Save to conversation
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
