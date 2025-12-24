"""
Tests for Journal Indexer Recency Boost Integration

Verifies that search_space_grouped applies recency boosting to search results,
allowing recent journals to outrank older highly-relevant ones when appropriate.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.journal_indexer import JournalIndexer, get_journal_indexer, reset_journal_indexer
from app.services.vector_store.base import SectionSearchResult


class TestJournalIndexerRecencyIntegration:
    """Tests for recency boost integration in JournalIndexer."""

    @pytest.fixture
    def indexer(self):
        """Create a fresh JournalIndexer instance."""
        reset_journal_indexer()
        return JournalIndexer()

    @pytest.fixture
    def mock_vector_store(self):
        """Create a mock vector store."""
        mock = AsyncMock()
        mock.search = AsyncMock(return_value=[])
        return mock

    @pytest.fixture
    def today(self):
        """Get today's date for consistent testing."""
        return datetime.now(timezone.utc)

    def _create_mock_search_result(
        self,
        id: str,
        journal_id: str,
        score: float,
        created_at: str,
        journal_title: str = "Test Journal",
        section_index: int = 0,
        section_title: str = "Test Section",
        user_id: str = "user-123",
    ):
        """Create a mock SectionSearchResult."""
        return SectionSearchResult(
            id=id,
            score=score,
            journal_id=journal_id,
            section_index=section_index,
            section_title=section_title,
            excerpt="Test excerpt content",
            metadata={
                "journalTitle": journal_title,
                "createdAt": created_at,
                "userId": user_id,
                "templateId": "",
                "frameworkId": "",
            }
        )

    @pytest.mark.asyncio
    async def test_search_space_grouped_applies_recency_boost(
        self, indexer, mock_vector_store, today
    ):
        """search_space_grouped applies recency boost to results."""
        # Create results: older journal has higher semantic score
        yesterday = (today - timedelta(days=1)).isoformat()
        week_ago = (today - timedelta(days=7)).isoformat()

        mock_results = [
            self._create_mock_search_result(
                id="sec-1",
                journal_id="j-old",
                score=0.95,  # High semantic score
                created_at=week_ago,
                journal_title="Old High Score Journal",
            ),
            self._create_mock_search_result(
                id="sec-2",
                journal_id="j-new",
                score=0.85,  # Lower semantic score
                created_at=yesterday,
                journal_title="New Lower Score Journal",
            ),
        ]

        # Mock the search_space method to return our test results
        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            results = await indexer.search_space_grouped(
                query="test query",
                space_id="space-123",
                top_k=5
            )

            # Verify recency boost was applied
            assert len(results) == 2

            # Both journals should have recency scoring fields
            for result in results:
                assert "semanticScore" in result
                assert "recencyScore" in result
                assert "score" in result

    @pytest.mark.asyncio
    async def test_recent_journal_can_outrank_older_relevant_one(
        self, indexer, today
    ):
        """Recent journals can outrank older highly-relevant ones due to recency boost."""
        # Today's journal with moderate semantic score
        today_str = today.isoformat()
        # 6 months ago - gets low recency score
        six_months_ago = (today - timedelta(days=180)).isoformat()

        mock_results = [
            self._create_mock_search_result(
                id="sec-old",
                journal_id="j-old-relevant",
                score=0.90,  # High semantic relevance
                created_at=six_months_ago,
                journal_title="Highly Relevant Old Journal",
            ),
            self._create_mock_search_result(
                id="sec-new",
                journal_id="j-new-moderate",
                score=0.75,  # Moderate semantic relevance
                created_at=today_str,
                journal_title="Moderately Relevant New Journal",
            ),
        ]

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            results = await indexer.search_space_grouped(
                query="test query",
                space_id="space-123",
                top_k=5
            )

            # The new journal should be ranked higher due to recency boost
            # New journal: 0.75 * 0.7 + 1.0 * 0.3 = 0.525 + 0.3 = 0.825
            # Old journal: 0.90 * 0.7 + 0.5 * 0.3 = 0.63 + 0.15 = 0.78
            assert len(results) >= 2
            assert results[0]["journalId"] == "j-new-moderate"
            assert results[1]["journalId"] == "j-old-relevant"

    @pytest.mark.asyncio
    async def test_highly_relevant_old_journal_still_ranks_well(
        self, indexer, today
    ):
        """Highly relevant old journals still rank above weak recent ones."""
        today_str = today.isoformat()
        year_ago = (today - timedelta(days=365)).isoformat()

        mock_results = [
            self._create_mock_search_result(
                id="sec-old",
                journal_id="j-old-perfect",
                score=0.98,  # Near-perfect semantic match
                created_at=year_ago,
                journal_title="Perfect Match Old Journal",
            ),
            self._create_mock_search_result(
                id="sec-new",
                journal_id="j-new-weak",
                score=0.55,  # Weak semantic match
                created_at=today_str,
                journal_title="Weak Match New Journal",
            ),
        ]

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            results = await indexer.search_space_grouped(
                query="test query",
                space_id="space-123",
                top_k=5
            )

            # Old perfect match should still win
            # New weak: 0.55 * 0.7 + 1.0 * 0.3 = 0.385 + 0.3 = 0.685
            # Old perfect: 0.98 * 0.7 + 0.0 * 0.3 = 0.686 + 0 = 0.686
            # These are very close, but with 365 days the recency is ~0.0
            assert len(results) >= 2
            # With exactly 365 days, recency is 0, so:
            # New: 0.385 + 0.3 = 0.685
            # Old: 0.686 + 0.0 = 0.686
            # Old still wins slightly!
            assert results[0]["journalId"] == "j-old-perfect"

    @pytest.mark.asyncio
    async def test_results_include_scoring_breakdown(
        self, indexer, today
    ):
        """Results include semantic and recency score breakdown."""
        yesterday = (today - timedelta(days=1)).isoformat()

        mock_results = [
            self._create_mock_search_result(
                id="sec-1",
                journal_id="j-1",
                score=0.85,
                created_at=yesterday,
                journal_title="Test Journal",
            ),
        ]

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            results = await indexer.search_space_grouped(
                query="test",
                space_id="space-123",
            )

            assert len(results) == 1
            result = results[0]

            # Check scoring breakdown fields
            assert "semanticScore" in result
            assert "recencyScore" in result
            assert "score" in result
            assert "topScore" in result

            # Semantic score should be original
            assert result["semanticScore"] == 0.85

            # Recency score for yesterday should be high
            assert result["recencyScore"] > 0.99

    @pytest.mark.asyncio
    async def test_grouping_with_multiple_sections_same_journal(
        self, indexer, today
    ):
        """Multiple sections from same journal are grouped correctly."""
        yesterday = (today - timedelta(days=1)).isoformat()

        mock_results = [
            self._create_mock_search_result(
                id="sec-1-0",
                journal_id="j-1",
                score=0.90,
                section_index=0,
                section_title="Introduction",
                created_at=yesterday,
                journal_title="Multi-Section Journal",
            ),
            self._create_mock_search_result(
                id="sec-1-1",
                journal_id="j-1",
                score=0.75,
                section_index=1,
                section_title="Details",
                created_at=yesterday,
                journal_title="Multi-Section Journal",
            ),
            self._create_mock_search_result(
                id="sec-1-2",
                journal_id="j-1",
                score=0.60,
                section_index=2,
                section_title="Conclusion",
                created_at=yesterday,
                journal_title="Multi-Section Journal",
            ),
        ]

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            results = await indexer.search_space_grouped(
                query="test",
                space_id="space-123",
            )

            # Should be grouped into single journal result
            assert len(results) == 1
            result = results[0]

            assert result["journalId"] == "j-1"
            assert len(result["sections"]) == 3

            # Top score should be from best section
            assert result["semanticScore"] == 0.90

    @pytest.mark.asyncio
    async def test_empty_results_handled_gracefully(self, indexer):
        """Empty search results are handled without errors."""
        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = []

            results = await indexer.search_space_grouped(
                query="nonexistent query",
                space_id="space-123",
            )

            assert results == []

    @pytest.mark.asyncio
    async def test_missing_date_gets_zero_recency(self, indexer, today):
        """Results without createdAt get zero recency score."""
        # Result without created_at in metadata
        mock_result = SectionSearchResult(
            id="sec-no-date",
            score=0.80,
            journal_id="j-no-date",
            section_index=0,
            section_title="No Date Section",
            excerpt="Test content",
            metadata={
                "journalTitle": "No Date Journal",
                "userId": "user-123",
                # No createdAt field
            }
        )

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = [mock_result]

            results = await indexer.search_space_grouped(
                query="test",
                space_id="space-123",
            )

            assert len(results) == 1
            # Recency should be 0.0 for missing date
            assert results[0]["recencyScore"] == 0.0
            # Score should be semantic only: 0.80 * 0.7 = 0.56
            assert results[0]["score"] == pytest.approx(0.56, abs=0.01)

    @pytest.mark.asyncio
    async def test_top_k_limits_results_after_boosting(self, indexer, today):
        """top_k parameter limits results after recency boost is applied."""
        dates = [
            (today - timedelta(days=i)).isoformat()
            for i in range(10)
        ]

        mock_results = [
            self._create_mock_search_result(
                id=f"sec-{i}",
                journal_id=f"j-{i}",
                score=0.90 - (i * 0.05),  # Decreasing scores
                created_at=dates[i],
                journal_title=f"Journal {i}",
            )
            for i in range(10)
        ]

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_results

            # Request only top 3
            results = await indexer.search_space_grouped(
                query="test",
                space_id="space-123",
                top_k=3,
            )

            assert len(results) == 3


class TestRecencyBoostConfiguration:
    """Tests for recency boost configuration integration."""

    @pytest.fixture
    def indexer(self):
        """Create a fresh JournalIndexer instance."""
        reset_journal_indexer()
        return JournalIndexer()

    @pytest.mark.asyncio
    async def test_uses_configured_weights(self, indexer):
        """Uses weights from settings configuration."""
        today = datetime.now(timezone.utc)
        yesterday = (today - timedelta(days=1)).isoformat()

        mock_result = SectionSearchResult(
            id="sec-1",
            score=0.80,
            journal_id="j-1",
            section_index=0,
            section_title="Test",
            excerpt="Content",
            metadata={
                "journalTitle": "Test",
                "createdAt": yesterday,
                "userId": "user-123",
            }
        )

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = [mock_result]

            # Use default settings (semantic=0.7, recency=0.3)
            results = await indexer.search_space_grouped(
                query="test",
                space_id="space-123",
            )

            assert len(results) == 1
            # Yesterday has ~0.997 recency score with 365 max age
            # Score = 0.80 * 0.7 + 0.997 * 0.3 ≈ 0.56 + 0.299 ≈ 0.859
            assert results[0]["score"] > 0.85

    @pytest.mark.asyncio
    async def test_applies_boost_with_custom_settings(self, indexer):
        """Applies recency boost with custom weight settings."""
        today = datetime.now(timezone.utc)
        month_ago = (today - timedelta(days=30)).isoformat()

        mock_result = SectionSearchResult(
            id="sec-1",
            score=0.90,
            journal_id="j-1",
            section_index=0,
            section_title="Test",
            excerpt="Content",
            metadata={
                "journalTitle": "Test",
                "createdAt": month_ago,
                "userId": "user-123",
            }
        )

        # Mock settings with custom weights
        mock_settings = MagicMock()
        mock_settings.search_semantic_weight = 0.8
        mock_settings.search_recency_weight = 0.2
        mock_settings.search_max_age_days = 365

        with patch.object(indexer, 'search_space', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = [mock_result]

            with patch('app.services.journal_indexer.get_settings', return_value=mock_settings):
                results = await indexer.search_space_grouped(
                    query="test",
                    space_id="space-123",
                )

            assert len(results) == 1
            # 30 days ago: recency = 1 - (30/365) ≈ 0.918
            # Score = 0.90 * 0.8 + 0.918 * 0.2 ≈ 0.72 + 0.184 ≈ 0.904
            assert 0.90 <= results[0]["score"] <= 0.91


class TestJournalIndexerSingleton:
    """Tests for singleton pattern."""

    def test_get_journal_indexer_returns_singleton(self):
        """get_journal_indexer returns the same instance."""
        reset_journal_indexer()

        indexer1 = get_journal_indexer()
        indexer2 = get_journal_indexer()

        assert indexer1 is indexer2

    def test_reset_clears_singleton(self):
        """reset_journal_indexer clears the singleton."""
        reset_journal_indexer()

        indexer1 = get_journal_indexer()
        reset_journal_indexer()
        indexer2 = get_journal_indexer()

        assert indexer1 is not indexer2
