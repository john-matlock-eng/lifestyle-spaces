"""
Chat API Tests

Tests for AI chat service with RAG.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
from uuid import uuid4

from app.models.chat import (
    ChatConversation,
    ChatMessage,
    JournalCitation,
    SendMessageRequest,
    CreateChatConversationRequest,
    CreateChatConversationResponse,
    ChatConversationListItem,
    ChatConversationListResponse,
)
from app.services.chat_service import ChatService, reset_chat_service


class TestChatModels:
    """Tests for chat models."""

    def test_create_conversation(self):
        conv = ChatConversation(
            spaceId="space_123",
            userId="user_456",
        )
        assert conv.conversation_id is not None
        assert conv.space_id == "space_123"
        assert conv.user_id == "user_456"
        assert conv.messages == []

    def test_create_chat_message(self):
        msg = ChatMessage(
            role="user",
            content="Hello Ellie!",
        )
        assert msg.id is not None
        assert msg.role == "user"
        assert msg.content == "Hello Ellie!"
        assert msg.citations == []

    def test_chat_message_with_citations(self):
        citation = JournalCitation(
            journalId="journal_123",
            title="My Reflection",
            relevanceScore=0.85,
            excerpt="Today I learned...",
        )
        msg = ChatMessage(
            role="assistant",
            content="Based on your journal...",
            citations=[citation],
        )
        assert len(msg.citations) == 1
        assert msg.citations[0].journal_id == "journal_123"

    def test_journal_citation(self):
        citation = JournalCitation(
            journalId="journal_123",
            title="My Reflection",
            relevanceScore=0.85,
            excerpt="Today I learned...",
        )
        assert citation.journal_id == "journal_123"
        assert citation.relevance_score == 0.85
        assert citation.title == "My Reflection"

    def test_create_conversation_request(self):
        req = CreateChatConversationRequest(initialMessage="Hello!")
        assert req.initial_message == "Hello!"

    def test_send_message_request(self):
        req = SendMessageRequest(content="What patterns do you see?")
        assert req.content == "What patterns do you see?"

    def test_conversation_list_item(self):
        now = datetime.now(timezone.utc)
        item = ChatConversationListItem(
            conversationId="conv_123",
            title="My Chat",
            messageCount=5,
            createdAt=now,
            updatedAt=now,
        )
        assert item.conversation_id == "conv_123"
        assert item.message_count == 5


class TestChatService:
    """Tests for ChatService."""

    @pytest.fixture
    def mock_dynamodb(self):
        """Mock DynamoDB table."""
        table = MagicMock()
        table.put_item = MagicMock()
        table.get_item = MagicMock(return_value={})
        table.query = MagicMock(return_value={"Items": []})
        table.delete_item = MagicMock()
        return table

    @pytest.fixture
    def mock_journal_indexer(self):
        """Mock journal indexer."""
        indexer = MagicMock()
        indexer.search = AsyncMock(return_value=[])
        return indexer

    @pytest.fixture
    def service(self, mock_dynamodb, mock_journal_indexer):
        """Create chat service with mocks."""
        reset_chat_service()
        service = ChatService()
        service.table = mock_dynamodb
        service.journal_indexer = mock_journal_indexer
        return service

    @pytest.mark.asyncio
    async def test_create_conversation(self, service):
        """Test creating a new conversation."""
        conversation = await service.create_conversation(
            space_id="space_123", user_id="user_456"
        )

        assert conversation.space_id == "space_123"
        assert conversation.user_id == "user_456"
        assert conversation.conversation_id is not None
        assert conversation.messages == []
        service.table.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_conversation(self, service, mock_dynamodb):
        """Test getting a conversation."""
        now = datetime.now(timezone.utc)
        mock_dynamodb.get_item.return_value = {
            "Item": {
                "conversationId": "conv_123",
                "spaceId": "space_123",
                "userId": "user_456",
                "title": "Test Chat",
                "messages": [],
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        }

        result = await service.get_conversation("space_123", "conv_123")

        assert result is not None
        assert result.conversation_id == "conv_123"
        assert result.space_id == "space_123"

    @pytest.mark.asyncio
    async def test_get_conversation_not_found(self, service, mock_dynamodb):
        """Test getting a non-existent conversation."""
        mock_dynamodb.get_item.return_value = {}

        result = await service.get_conversation("space_123", "nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_list_conversations(self, service, mock_dynamodb):
        """Test listing conversations."""
        now = datetime.now(timezone.utc)
        mock_dynamodb.query.return_value = {
            "Items": [
                {
                    "conversationId": "conv_1",
                    "spaceId": "space_123",
                    "userId": "user_456",
                    "title": "Chat 1",
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                },
                {
                    "conversationId": "conv_2",
                    "spaceId": "space_123",
                    "userId": "user_456",
                    "title": "Chat 2",
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                },
            ]
        }

        result = await service.list_conversations("space_123")

        assert len(result) == 2
        assert result[0].conversation_id == "conv_1"

    @pytest.mark.asyncio
    async def test_delete_conversation(self, service, mock_dynamodb):
        """Test deleting a conversation."""
        result = await service.delete_conversation("space_123", "conv_123")

        assert result is True
        mock_dynamodb.delete_item.assert_called_once()

    def test_extract_tiptap_text(self, service):
        """Test extracting text from TipTap document."""
        tiptap_doc = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Hello "},
                        {"type": "text", "text": "world!"},
                    ],
                }
            ],
        }

        text = service._extract_tiptap_text(tiptap_doc)
        assert "Hello" in text
        assert "world" in text

    def test_extract_journal_text_string(self, service):
        """Test extracting text from plain string content."""
        journal = {"content": "This is my journal entry."}
        text = service._extract_journal_text(journal)
        assert text == "This is my journal entry."

    def test_extract_journal_text_empty(self, service):
        """Test extracting text from empty content."""
        journal = {"content": ""}
        text = service._extract_journal_text(journal)
        assert text == ""

    def test_build_journal_context_empty(self, service):
        """Test building context with no journals."""
        context, citations = service._build_journal_context([], [])
        assert context == ""
        assert citations == []

    def test_build_journal_context_with_journals(self, service):
        """Test building context with grouped search results."""
        # Grouped search results in new format
        search_results = [
            {
                "journalId": "j1",
                "journalTitle": "Test Journal",
                "createdAt": "2024-01-15T10:00:00Z",
                "sections": [
                    {
                        "sectionIndex": 0,
                        "sectionTitle": "Express",
                        "excerpt": "This is my reflection on growth.",
                        "score": 0.85,
                    }
                ],
            }
        ]
        # Optional full journal content (for additional context if needed)
        journals = [
            {
                "journalId": "j1",
                "title": "Test Journal",
                "createdAt": "2024-01-15T10:00:00Z",
                "content": "This is my reflection on growth.",
            }
        ]

        context, citations = service._build_journal_context(search_results, journals)

        assert "Test Journal" in context
        assert "growth" in context
        assert len(citations) == 1
        assert citations[0].journal_id == "j1"
        assert citations[0].relevance_score == 0.85

    def test_build_messages_for_claude(self, service):
        """Test building messages for Claude API."""
        conversation = ChatConversation(
            spaceId="space_123",
            userId="user_456",
            messages=[
                ChatMessage(role="user", content="Hi"),
                ChatMessage(role="assistant", content="Hello!"),
            ],
        )

        messages = service._build_messages_for_claude(
            conversation=conversation,
            new_message="Tell me about my journals",
            journal_context="## Journal: Test\nContent here",
        )

        # Should include history + new message with context
        assert len(messages) == 3
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        assert messages[2]["role"] == "user"
        assert "journal_context" in messages[2]["content"]

    def test_build_messages_for_claude_no_context(self, service):
        """Test building messages without journal context."""
        conversation = ChatConversation(
            spaceId="space_123",
            userId="user_456",
            messages=[],
        )

        messages = service._build_messages_for_claude(
            conversation=conversation,
            new_message="Hello!",
            journal_context="",
        )

        assert len(messages) == 1
        assert messages[0]["content"] == "Hello!"


class TestChatServiceRAG:
    """Tests for RAG pipeline."""

    @pytest.fixture
    def service_with_mocks(self):
        """Create service with all dependencies mocked."""
        reset_chat_service()
        service = ChatService()
        service.table = MagicMock()
        service.journal_indexer = MagicMock()
        service._client = MagicMock()
        return service

    @pytest.mark.asyncio
    async def test_send_message_conversation_not_found(self, service_with_mocks):
        """Test sending message to non-existent conversation."""
        service = service_with_mocks
        service.table.get_item = MagicMock(return_value={})

        with pytest.raises(ValueError, match="not found"):
            await service.send_message(
                space_id="space_1",
                conversation_id="nonexistent",
                user_id="user_1",
                request=SendMessageRequest(content="Hello"),
            )

    @pytest.mark.asyncio
    async def test_send_message_unauthorized(self, service_with_mocks):
        """Test sending message to another user's conversation."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)
        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "other_user",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )

        with pytest.raises(ValueError, match="Not authorized"):
            await service.send_message(
                space_id="space_1",
                conversation_id="conv_1",
                user_id="user_1",
                request=SendMessageRequest(content="Hello"),
            )

    @pytest.mark.asyncio
    async def test_send_message_success(self, service_with_mocks):
        """Test successful message sending."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)

        # Mock conversation retrieval
        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )
        service.table.put_item = MagicMock()

        # Mock journal search (empty results)
        service.journal_indexer.search = AsyncMock(return_value=[])

        # Mock Claude response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Hello! How can I help?")]
        service._client.messages.create = MagicMock(return_value=mock_response)

        request = SendMessageRequest(content="Hello Ellie!")

        message, citations = await service.send_message(
            space_id="space_1",
            conversation_id="conv_1",
            user_id="user_1",
            request=request,
        )

        # Verify response
        assert message.role == "assistant"
        assert "Hello" in message.content
        assert citations == []

        # Verify Claude was called
        service._client.messages.create.assert_called_once()

        # Verify conversation was updated
        assert service.table.put_item.call_count >= 1

    @pytest.mark.asyncio
    async def test_send_message_with_journal_context(self, service_with_mocks):
        """Test message sending with journal context."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)

        # Mock conversation
        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )
        service.table.put_item = MagicMock()

        # Mock grouped search results (new format)
        mock_grouped_results = [
            {
                "journalId": "journal_1",
                "journalTitle": "My Growth Journal",
                "createdAt": now.isoformat(),
                "sections": [
                    {
                        "sectionIndex": 0,
                        "sectionTitle": "Express",
                        "excerpt": "Today I reflected on my progress...",
                        "score": 0.9,
                    }
                ],
            }
        ]
        service.journal_indexer.search_space_grouped = AsyncMock(return_value=mock_grouped_results)

        # Mock journal retrieval - use side_effect for multiple calls
        def get_item_side_effect(**kwargs):
            key = kwargs.get("Key", {})
            if key.get("SK", "").startswith("JOURNAL#"):
                return {
                    "Item": {
                        "journalId": "journal_1",
                        "title": "My Growth Journal",
                        "content": "Today I reflected on my progress...",
                        "createdAt": now.isoformat(),
                    }
                }
            return {
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }

        service.table.get_item = MagicMock(side_effect=get_item_side_effect)

        # Mock Claude response
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text="I see you've been reflecting on growth!")
        ]
        service._client.messages.create = MagicMock(return_value=mock_response)

        request = SendMessageRequest(content="What have I been working on?")

        message, citations = await service.send_message(
            space_id="space_1",
            conversation_id="conv_1",
            user_id="user_1",
            request=request,
        )

        # Verify response includes citations
        assert message.role == "assistant"
        assert len(citations) == 1
        assert citations[0].journal_id == "journal_1"

    @pytest.mark.asyncio
    async def test_search_relevant_journals(self, service_with_mocks):
        """Test journal search using grouped results."""
        service = service_with_mocks

        # Mock grouped search results (new format from search_space_grouped)
        mock_grouped_results = [
            {
                "journalId": "j1",
                "journalTitle": "Test Journal",
                "createdAt": "2024-01-15T10:00:00Z",
                "sections": [
                    {
                        "sectionIndex": 0,
                        "sectionTitle": "Express",
                        "excerpt": "Test content",
                        "score": 0.8,
                    }
                ],
            }
        ]
        service.journal_indexer.search_space_grouped = AsyncMock(
            return_value=mock_grouped_results
        )

        results = await service._search_relevant_journals(
            query="growth",
            space_id="space_1",
            user_id="user_1",
            top_k=5,
        )

        assert len(results) == 1
        assert results[0]["journalId"] == "j1"
        assert results[0]["journalTitle"] == "Test Journal"

    @pytest.mark.asyncio
    async def test_search_relevant_journals_error(self, service_with_mocks):
        """Test journal search handles errors gracefully."""
        service = service_with_mocks
        service.journal_indexer.search_space_grouped = AsyncMock(
            side_effect=Exception("Search failed")
        )

        results = await service._search_relevant_journals(
            query="test",
            space_id="space_1",
            user_id="user_1",
        )

        # Should return empty list on error
        assert results == []

    @pytest.mark.asyncio
    async def test_retrieve_journal_content(self, service_with_mocks):
        """Test retrieving journal content from DynamoDB."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)

        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "journalId": "j1",
                    "title": "Test",
                    "content": "Content",
                    "createdAt": now.isoformat(),
                }
            }
        )

        journals = await service._retrieve_journal_content(["j1"], "space_1")

        assert len(journals) == 1
        assert journals[0]["journalId"] == "j1"

    @pytest.mark.asyncio
    async def test_retrieve_journal_content_not_found(self, service_with_mocks):
        """Test retrieving non-existent journal."""
        service = service_with_mocks
        service.table.get_item = MagicMock(return_value={})

        journals = await service._retrieve_journal_content(["nonexistent"], "space_1")

        assert journals == []

    @pytest.mark.asyncio
    async def test_retrieve_journal_content_error(self, service_with_mocks):
        """Test journal retrieval handles errors."""
        service = service_with_mocks
        service.table.get_item = MagicMock(side_effect=Exception("DynamoDB error"))

        journals = await service._retrieve_journal_content(["j1"], "space_1")

        # Should return empty list on error
        assert journals == []


class TestChatServiceStreaming:
    """Tests for streaming functionality."""

    @pytest.fixture
    def service_with_mocks(self):
        """Create service with all dependencies mocked."""
        from app.services.chat_service import reset_chat_service
        reset_chat_service()
        service = ChatService()
        service.table = MagicMock()
        service.journal_indexer = MagicMock()
        service._client = MagicMock()
        return service

    @pytest.mark.asyncio
    async def test_stream_message_conversation_not_found(self, service_with_mocks):
        """Test streaming with non-existent conversation."""
        service = service_with_mocks
        service.table.get_item = MagicMock(return_value={})

        chunks = []
        async for chunk in service.send_message_streaming(
            space_id="space_1",
            conversation_id="nonexistent",
            user_id="user_1",
            request=SendMessageRequest(content="Hello"),
        ):
            chunks.append(chunk)

        assert len(chunks) == 1
        assert "error" in chunks[0]
        assert "not found" in chunks[0]

    @pytest.mark.asyncio
    async def test_stream_message_unauthorized(self, service_with_mocks):
        """Test streaming with unauthorized user."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)
        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "other_user",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )

        chunks = []
        async for chunk in service.send_message_streaming(
            space_id="space_1",
            conversation_id="conv_1",
            user_id="user_1",
            request=SendMessageRequest(content="Hello"),
        ):
            chunks.append(chunk)

        assert len(chunks) == 1
        assert "error" in chunks[0]
        assert "CONVERSATION_OWNERSHIP_MISMATCH" in chunks[0]
        assert "belongs to another user" in chunks[0]

    @pytest.mark.asyncio
    async def test_stream_message_success(self, service_with_mocks):
        """Test successful streaming."""
        service = service_with_mocks
        now = datetime.now(timezone.utc)

        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )
        service.table.put_item = MagicMock()
        service.journal_indexer.search = AsyncMock(return_value=[])

        # Mock streaming response
        class MockStreamContext:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            @property
            def text_stream(self):
                return iter(["Hello", " there", "!"])

        service._client.messages.stream = MagicMock(return_value=MockStreamContext())

        chunks = []
        async for chunk in service.send_message_streaming(
            space_id="space_1",
            conversation_id="conv_1",
            user_id="user_1",
            request=SendMessageRequest(content="Hi!"),
        ):
            chunks.append(chunk)

        # Should have: mode, citations, content chunks, done
        assert len(chunks) >= 5
        assert "mode" in chunks[0]  # Mode detection is first
        assert "citations" in chunks[1]
        assert "content" in chunks[2]
        assert "done" in chunks[-1]

    @pytest.mark.asyncio
    async def test_stream_message_api_error(self, service_with_mocks):
        """Test streaming handles API errors."""
        import anthropic
        service = service_with_mocks
        now = datetime.now(timezone.utc)

        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )
        service.journal_indexer.search = AsyncMock(return_value=[])

        # Mock API error
        service._client.messages.stream = MagicMock(
            side_effect=anthropic.APIError(
                message="Rate limit exceeded",
                request=MagicMock(),
                body=None,
            )
        )

        chunks = []
        async for chunk in service.send_message_streaming(
            space_id="space_1",
            conversation_id="conv_1",
            user_id="user_1",
            request=SendMessageRequest(content="Hi!"),
        ):
            chunks.append(chunk)

        # Should have citations then error
        assert any("error" in c for c in chunks)


class TestChatServiceErrors:
    """Tests for error handling paths."""

    @pytest.fixture
    def service(self):
        reset_chat_service()
        service = ChatService()
        service.table = MagicMock()
        service.journal_indexer = MagicMock()
        service._client = MagicMock()
        return service

    @pytest.mark.asyncio
    async def test_create_conversation_already_exists(self, service):
        """Test error when conversation already exists."""
        from botocore.exceptions import ClientError

        service.table.put_item = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "ConditionalCheckFailedException"}},
                "PutItem",
            )
        )

        with pytest.raises(ValueError, match="already exists"):
            await service.create_conversation("space_1", "user_1")

    @pytest.mark.asyncio
    async def test_create_conversation_client_error(self, service):
        """Test other DynamoDB errors during creation."""
        from botocore.exceptions import ClientError

        service.table.put_item = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "InternalServerError"}},
                "PutItem",
            )
        )

        with pytest.raises(ClientError):
            await service.create_conversation("space_1", "user_1")

    @pytest.mark.asyncio
    async def test_get_conversation_client_error(self, service):
        """Test DynamoDB error during get."""
        from botocore.exceptions import ClientError

        service.table.get_item = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "InternalServerError"}},
                "GetItem",
            )
        )

        with pytest.raises(ClientError):
            await service.get_conversation("space_1", "conv_1")

    @pytest.mark.asyncio
    async def test_update_conversation_client_error(self, service):
        """Test DynamoDB error during update."""
        from botocore.exceptions import ClientError

        now = datetime.now(timezone.utc)
        conversation = ChatConversation(
            conversationId="conv_1",
            spaceId="space_1",
            userId="user_1",
            createdAt=now,
            updatedAt=now,
        )

        service.table.put_item = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "InternalServerError"}},
                "PutItem",
            )
        )

        with pytest.raises(ClientError):
            await service.update_conversation(conversation)

    @pytest.mark.asyncio
    async def test_list_conversations_client_error(self, service):
        """Test DynamoDB error during list."""
        from botocore.exceptions import ClientError

        service.table.query = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "InternalServerError"}},
                "Query",
            )
        )

        with pytest.raises(ClientError):
            await service.list_conversations("space_1")

    @pytest.mark.asyncio
    async def test_delete_conversation_client_error(self, service):
        """Test DynamoDB error during delete."""
        from botocore.exceptions import ClientError

        service.table.delete_item = MagicMock(
            side_effect=ClientError(
                {"Error": {"Code": "InternalServerError"}},
                "DeleteItem",
            )
        )

        with pytest.raises(ClientError):
            await service.delete_conversation("space_1", "conv_1")

    @pytest.mark.asyncio
    async def test_send_message_api_error(self, service):
        """Test Claude API error during send_message."""
        import anthropic

        now = datetime.now(timezone.utc)
        service.table.get_item = MagicMock(
            return_value={
                "Item": {
                    "conversationId": "conv_1",
                    "spaceId": "space_1",
                    "userId": "user_1",
                    "title": None,
                    "messages": [],
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                }
            }
        )
        service.journal_indexer.search = AsyncMock(return_value=[])
        service._client.messages.create = MagicMock(
            side_effect=anthropic.APIError(
                message="Rate limit",
                request=MagicMock(),
                body=None,
            )
        )

        with pytest.raises(ValueError, match="AI service error"):
            await service.send_message(
                space_id="space_1",
                conversation_id="conv_1",
                user_id="user_1",
                request=SendMessageRequest(content="Hello"),
            )


class TestChatDynamoDBHelpers:
    """Tests for DynamoDB helper methods."""

    @pytest.fixture
    def service(self):
        reset_chat_service()
        service = ChatService()
        service.table = MagicMock()
        return service

    def test_make_pk(self, service):
        assert service._make_pk("space_123") == "SPACE#space_123"

    def test_make_sk(self, service):
        assert service._make_sk("conv_123") == "CHAT#conv_123"

    def test_make_gsi1pk(self, service):
        assert service._make_gsi1pk("user_123") == "USER#user_123"

    def test_to_dynamodb_item(self, service):
        """Test converting conversation to DynamoDB item."""
        now = datetime.now(timezone.utc)
        conversation = ChatConversation(
            conversationId="conv_123",
            spaceId="space_123",
            userId="user_456",
            title="Test Chat",
            messages=[
                ChatMessage(
                    id="msg_1",
                    role="user",
                    content="Hello",
                    createdAt=now,
                )
            ],
            createdAt=now,
            updatedAt=now,
        )

        item = service._to_dynamodb_item(conversation)

        assert item["PK"] == "SPACE#space_123"
        assert item["SK"] == "CHAT#conv_123"
        assert item["entityType"] == "ChatConversation"
        assert item["conversationId"] == "conv_123"
        assert len(item["messages"]) == 1

    def test_from_dynamodb_item(self, service):
        """Test converting DynamoDB item to conversation."""
        now = datetime.now(timezone.utc)
        item = {
            "conversationId": "conv_123",
            "spaceId": "space_123",
            "userId": "user_456",
            "title": "Test Chat",
            "messages": [
                {
                    "id": "msg_1",
                    "role": "user",
                    "content": "Hello",
                    "citations": [],
                    "createdAt": now.isoformat(),
                }
            ],
            "createdAt": now.isoformat(),
            "updatedAt": now.isoformat(),
        }

        conversation = service._from_dynamodb_item(item)

        assert conversation.conversation_id == "conv_123"
        assert conversation.space_id == "space_123"
        assert len(conversation.messages) == 1
        assert conversation.messages[0].content == "Hello"

    def test_from_dynamodb_item_with_citations(self, service):
        """Test converting item with citations."""
        now = datetime.now(timezone.utc)
        item = {
            "conversationId": "conv_123",
            "spaceId": "space_123",
            "userId": "user_456",
            "title": None,
            "messages": [
                {
                    "id": "msg_1",
                    "role": "assistant",
                    "content": "Based on your journal...",
                    "citations": [
                        {
                            "journalId": "j1",
                            "title": "My Journal",
                            "relevanceScore": 0.85,
                            "excerpt": "Growth...",
                            "createdAt": "2024-01-15",
                        }
                    ],
                    "createdAt": now.isoformat(),
                }
            ],
            "createdAt": now.isoformat(),
            "updatedAt": now.isoformat(),
        }

        conversation = service._from_dynamodb_item(item)

        assert len(conversation.messages) == 1
        assert len(conversation.messages[0].citations) == 1
        assert conversation.messages[0].citations[0].journal_id == "j1"


class TestChatServiceClientInit:
    """Tests for ChatService client property initialization."""

    @pytest.fixture
    def service(self):
        """Create chat service without client initialized."""
        reset_chat_service()
        service = ChatService()
        service.table = MagicMock()
        service._client = None  # Ensure client is not initialized
        return service

    @patch("app.services.chat_service.get_secret")
    @patch.dict("os.environ", {"CLAUDE_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"})
    def test_client_init_with_json_secret(self, mock_get_secret, service):
        """Test client initialization with JSON secret."""
        mock_get_secret.return_value = '{"api_key": "sk-ant-test-key-12345"}'

        with patch("app.services.chat_service.anthropic.Anthropic") as mock_anthropic:
            mock_anthropic.return_value = MagicMock()
            client = service.client

            mock_get_secret.assert_called_once()
            mock_anthropic.assert_called_once_with(api_key="sk-ant-test-key-12345")
            assert client is not None

    @patch("app.services.chat_service.get_secret")
    @patch.dict("os.environ", {"CLAUDE_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"})
    def test_client_init_with_raw_string_secret(self, mock_get_secret, service):
        """Test client initialization with non-JSON raw API key."""
        mock_get_secret.return_value = "sk-ant-raw-key-67890"

        with patch("app.services.chat_service.anthropic.Anthropic") as mock_anthropic:
            mock_anthropic.return_value = MagicMock()
            client = service.client

            mock_anthropic.assert_called_once_with(api_key="sk-ant-raw-key-67890")
            assert client is not None

    @patch.dict("os.environ", {}, clear=True)
    def test_client_init_missing_env_var(self, service):
        """Test client initialization fails without env var."""
        # Remove any CLAUDE_API_KEY_SECRET_ARN that might exist
        import os
        if "CLAUDE_API_KEY_SECRET_ARN" in os.environ:
            del os.environ["CLAUDE_API_KEY_SECRET_ARN"]

        with pytest.raises(ValueError, match="CLAUDE_API_KEY_SECRET_ARN environment variable not set"):
            _ = service.client

    @patch("app.services.chat_service.get_secret")
    @patch.dict("os.environ", {"CLAUDE_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"})
    def test_client_init_placeholder_api_key(self, mock_get_secret, service):
        """Test client initialization fails with placeholder key."""
        mock_get_secret.return_value = '{"api_key": "PLACEHOLDER_UPDATE_MANUALLY"}'

        with pytest.raises(ValueError, match="Claude API key not configured"):
            _ = service.client

    @patch("app.services.chat_service.get_secret")
    @patch.dict("os.environ", {"CLAUDE_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"})
    def test_client_init_empty_api_key(self, mock_get_secret, service):
        """Test client initialization fails with empty key."""
        mock_get_secret.return_value = '{"api_key": ""}'

        with pytest.raises(ValueError, match="Claude API key not configured"):
            _ = service.client

    @patch("app.services.chat_service.get_secret")
    @patch.dict("os.environ", {"CLAUDE_API_KEY_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123:secret:test"})
    def test_client_init_secret_retrieval_fails(self, mock_get_secret, service):
        """Test client initialization when secret retrieval fails."""
        mock_get_secret.side_effect = Exception("Secret not found")

        with pytest.raises(Exception, match="Secret not found"):
            _ = service.client
