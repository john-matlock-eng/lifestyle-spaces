"""
Tests for Search Scoring Module

Tests the recency calculation and hybrid scoring functionality.
"""

import pytest
from datetime import datetime, timezone, timedelta
from app.services.search_scoring import (
    calculate_recency_score,
    apply_recency_boost,
    get_recency_tier,
)


class TestCalculateRecencyScore:
    """Tests for calculate_recency_score function."""

    @pytest.fixture
    def reference_date(self):
        """Fixed reference date for consistent testing."""
        return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    def test_today_returns_one(self, reference_date):
        """Today's date should return score of 1.0."""
        created_at = reference_date.isoformat()
        score = calculate_recency_score(created_at, reference_date=reference_date)
        assert score == 1.0

    def test_max_age_returns_zero(self, reference_date):
        """Entry at max_age_days should return 0.0."""
        old_date = reference_date - timedelta(days=365)
        score = calculate_recency_score(
            old_date.isoformat(),
            max_age_days=365,
            reference_date=reference_date
        )
        assert score == 0.0

    def test_beyond_max_age_returns_zero(self, reference_date):
        """Entry older than max_age_days should return 0.0."""
        very_old = reference_date - timedelta(days=500)
        score = calculate_recency_score(
            very_old.isoformat(),
            max_age_days=365,
            reference_date=reference_date
        )
        assert score == 0.0

    def test_half_max_age_returns_half(self, reference_date):
        """Entry at half max_age should return ~0.5."""
        half_age = reference_date - timedelta(days=182)  # ~half of 365
        score = calculate_recency_score(
            half_age.isoformat(),
            max_age_days=365,
            reference_date=reference_date
        )
        assert 0.49 <= score <= 0.51

    def test_one_week_old(self, reference_date):
        """Entry 7 days old should have high score."""
        week_ago = reference_date - timedelta(days=7)
        score = calculate_recency_score(
            week_ago.isoformat(),
            max_age_days=365,
            reference_date=reference_date
        )
        # 7/365 = 0.019, so score should be ~0.98
        assert score >= 0.97

    def test_one_month_old(self, reference_date):
        """Entry 30 days old should have decent score."""
        month_ago = reference_date - timedelta(days=30)
        score = calculate_recency_score(
            month_ago.isoformat(),
            max_age_days=365,
            reference_date=reference_date
        )
        # 30/365 = 0.082, so score should be ~0.92
        assert 0.90 <= score <= 0.93

    def test_none_date_returns_zero(self):
        """None date should return 0.0."""
        assert calculate_recency_score(None) == 0.0

    def test_empty_string_returns_zero(self):
        """Empty string should return 0.0."""
        assert calculate_recency_score("") == 0.0

    def test_invalid_date_returns_zero(self):
        """Invalid date format should return 0.0."""
        assert calculate_recency_score("not-a-date") == 0.0
        assert calculate_recency_score("2024-13-45") == 0.0

    def test_handles_z_suffix(self, reference_date):
        """Should handle ISO dates with Z suffix."""
        created_at = "2024-06-15T12:00:00Z"
        score = calculate_recency_score(created_at, reference_date=reference_date)
        assert score == 1.0

    def test_handles_date_only_format(self, reference_date):
        """Should handle YYYY-MM-DD format."""
        created_at = "2024-06-15"
        score = calculate_recency_score(created_at, reference_date=reference_date)
        assert score == 1.0

    def test_handles_timezone_offset(self, reference_date):
        """Should handle dates with timezone offset."""
        created_at = "2024-06-15T12:00:00+00:00"
        score = calculate_recency_score(created_at, reference_date=reference_date)
        assert score == 1.0

    def test_future_date_returns_one(self, reference_date):
        """Future dates should return 1.0 (edge case)."""
        future = reference_date + timedelta(days=10)
        score = calculate_recency_score(future.isoformat(), reference_date=reference_date)
        assert score == 1.0

    def test_custom_max_age(self, reference_date):
        """Should respect custom max_age_days."""
        thirty_days_ago = reference_date - timedelta(days=30)

        # With 30 day max, 30 days old = 0.0
        score_30 = calculate_recency_score(
            thirty_days_ago.isoformat(),
            max_age_days=30,
            reference_date=reference_date
        )
        assert score_30 == 0.0

        # With 60 day max, 30 days old = 0.5
        score_60 = calculate_recency_score(
            thirty_days_ago.isoformat(),
            max_age_days=60,
            reference_date=reference_date
        )
        assert score_60 == 0.5

    def test_linear_decay(self, reference_date):
        """Score decays linearly with age."""
        # 0 days = 1.0
        # 73 days = 0.8 (1/5 of 365)
        # 146 days = 0.6 (2/5)
        # 219 days = 0.4 (3/5)
        # 292 days = 0.2 (4/5)
        # 365 days = 0.0

        for days, expected in [(0, 1.0), (73, 0.8), (146, 0.6), (219, 0.4), (292, 0.2)]:
            date = reference_date - timedelta(days=days)
            score = calculate_recency_score(
                date.isoformat(),
                max_age_days=365,
                reference_date=reference_date
            )
            assert abs(score - expected) < 0.01, f"Days {days}: expected {expected}, got {score}"


class TestApplyRecencyBoost:
    """Tests for apply_recency_boost function."""

    @pytest.fixture
    def reference_date(self):
        """Fixed reference date for consistent testing."""
        return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    @pytest.fixture
    def sample_results(self, reference_date):
        """Sample search results with varying dates and scores."""
        return [
            {
                "journalId": "j1",
                "topScore": 0.9,
                "createdAt": (reference_date - timedelta(days=30)).isoformat(),
            },
            {
                "journalId": "j2",
                "topScore": 0.8,
                "createdAt": (reference_date - timedelta(days=1)).isoformat(),
            },
            {
                "journalId": "j3",
                "topScore": 0.7,
                "createdAt": (reference_date - timedelta(days=180)).isoformat(),
            },
        ]

    def test_empty_results_returns_empty(self):
        """Empty input returns empty output."""
        result = apply_recency_boost([])
        assert result == []

    def test_adds_score_fields(self, sample_results, reference_date):
        """Adds semanticScore and recencyScore fields."""
        boosted = apply_recency_boost(
            sample_results,
            reference_date=reference_date
        )

        for result in boosted:
            assert "semanticScore" in result
            assert "recencyScore" in result
            assert "score" in result

    def test_preserves_semantic_score(self, sample_results, reference_date):
        """Original semantic score is preserved."""
        boosted = apply_recency_boost(
            sample_results,
            reference_date=reference_date
        )

        # Find j1 result
        j1 = next(r for r in boosted if r["journalId"] == "j1")
        assert j1["semanticScore"] == 0.9

    def test_recent_entry_gets_boosted(self, sample_results, reference_date):
        """Recent entry with lower semantic score can rank higher."""
        boosted = apply_recency_boost(
            sample_results,
            semantic_weight=0.7,
            recency_weight=0.3,
            reference_date=reference_date
        )

        j2 = next(r for r in boosted if r["journalId"] == "j2")
        assert j2["recencyScore"] > 0.99  # 1 day old, very high

    def test_old_entry_penalized(self, sample_results, reference_date):
        """Old entry gets lower hybrid score."""
        boosted = apply_recency_boost(
            sample_results,
            reference_date=reference_date
        )

        j3 = next(r for r in boosted if r["journalId"] == "j3")
        # 180 days old = ~0.507 recency
        assert j3["recencyScore"] < 0.6

        # Hybrid score should be lower than semantic score
        assert j3["score"] < j3["semanticScore"]

    def test_results_sorted_by_hybrid_score(self, reference_date):
        """Results are re-sorted by hybrid score descending."""
        results = [
            {"journalId": "old_relevant", "topScore": 0.95,
             "createdAt": (reference_date - timedelta(days=300)).isoformat()},
            {"journalId": "new_less_relevant", "topScore": 0.6,
             "createdAt": (reference_date - timedelta(days=1)).isoformat()},
        ]

        boosted = apply_recency_boost(
            results,
            semantic_weight=0.5,
            recency_weight=0.5,  # Equal weights
            reference_date=reference_date
        )

        # With equal weights:
        # old_relevant: 0.95*0.5 + ~0.18*0.5 = 0.475 + 0.09 = 0.565
        # new_less_relevant: 0.6*0.5 + ~1.0*0.5 = 0.3 + 0.5 = 0.80
        # New should rank higher
        assert boosted[0]["journalId"] == "new_less_relevant"

    def test_custom_weights(self, sample_results, reference_date):
        """Respects custom weight configuration."""
        # Pure semantic (no recency)
        boosted_semantic = apply_recency_boost(
            [r.copy() for r in sample_results],
            semantic_weight=1.0,
            recency_weight=0.0,
            reference_date=reference_date
        )

        # First result should be j1 (highest semantic)
        assert boosted_semantic[0]["journalId"] == "j1"

        # Pure recency (no semantic)
        boosted_recency = apply_recency_boost(
            [r.copy() for r in sample_results],
            semantic_weight=0.0,
            recency_weight=1.0,
            reference_date=reference_date
        )

        # First result should be j2 (most recent)
        assert boosted_recency[0]["journalId"] == "j2"

    def test_handles_missing_date(self, reference_date):
        """Handles results with missing date gracefully."""
        results = [
            {"journalId": "j1", "topScore": 0.9, "createdAt": None},
            {"journalId": "j2", "topScore": 0.8,
             "createdAt": reference_date.isoformat()},
        ]

        boosted = apply_recency_boost(results, reference_date=reference_date)

        j1 = next(r for r in boosted if r["journalId"] == "j1")
        assert j1["recencyScore"] == 0.0

    def test_handles_missing_score(self, reference_date):
        """Handles results with missing score gracefully."""
        results = [
            {"journalId": "j1", "createdAt": reference_date.isoformat()},
        ]

        boosted = apply_recency_boost(results, reference_date=reference_date)

        assert boosted[0]["semanticScore"] == 0.0

    def test_custom_field_names(self, reference_date):
        """Respects custom field name configuration."""
        results = [
            {"id": "j1", "relevance": 0.9, "date": reference_date.isoformat()},
        ]

        boosted = apply_recency_boost(
            results,
            score_field="relevance",
            date_field="date",
            reference_date=reference_date
        )

        assert boosted[0]["semanticScore"] == 0.9

    def test_hybrid_score_calculation(self, reference_date):
        """Verify hybrid score formula is correct."""
        results = [
            {"journalId": "j1", "topScore": 0.8,
             "createdAt": reference_date.isoformat()},  # recency = 1.0
        ]

        boosted = apply_recency_boost(
            results,
            semantic_weight=0.7,
            recency_weight=0.3,
            reference_date=reference_date
        )

        # Expected: 0.8 * 0.7 + 1.0 * 0.3 = 0.56 + 0.30 = 0.86
        assert boosted[0]["score"] == 0.86


class TestGetRecencyTier:
    """Tests for get_recency_tier function."""

    @pytest.fixture
    def reference_date(self):
        return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    def test_today(self, reference_date):
        assert get_recency_tier(reference_date.isoformat(), reference_date) == "today"

    def test_this_week(self, reference_date):
        date = (reference_date - timedelta(days=3)).isoformat()
        assert get_recency_tier(date, reference_date) == "this_week"

    def test_week_boundary(self, reference_date):
        """7 days old should still be this_week."""
        date = (reference_date - timedelta(days=7)).isoformat()
        assert get_recency_tier(date, reference_date) == "this_week"

    def test_this_month(self, reference_date):
        date = (reference_date - timedelta(days=15)).isoformat()
        assert get_recency_tier(date, reference_date) == "this_month"

    def test_month_boundary(self, reference_date):
        """30 days old should still be this_month."""
        date = (reference_date - timedelta(days=30)).isoformat()
        assert get_recency_tier(date, reference_date) == "this_month"

    def test_recent(self, reference_date):
        date = (reference_date - timedelta(days=60)).isoformat()
        assert get_recency_tier(date, reference_date) == "recent"

    def test_recent_boundary(self, reference_date):
        """90 days old should still be recent."""
        date = (reference_date - timedelta(days=90)).isoformat()
        assert get_recency_tier(date, reference_date) == "recent"

    def test_older(self, reference_date):
        date = (reference_date - timedelta(days=120)).isoformat()
        assert get_recency_tier(date, reference_date) == "older"

    def test_very_old(self, reference_date):
        date = (reference_date - timedelta(days=500)).isoformat()
        assert get_recency_tier(date, reference_date) == "older"

    def test_none_returns_unknown(self):
        assert get_recency_tier(None) == "unknown"

    def test_empty_returns_unknown(self):
        assert get_recency_tier("") == "unknown"

    def test_invalid_returns_unknown(self):
        assert get_recency_tier("invalid") == "unknown"

    def test_handles_z_suffix(self, reference_date):
        date = f"2024-06-15T12:00:00Z"
        assert get_recency_tier(date, reference_date) == "today"

    def test_handles_date_only(self, reference_date):
        date = "2024-06-15"
        assert get_recency_tier(date, reference_date) == "today"


class TestScoringIntegration:
    """Integration tests for scoring workflow."""

    @pytest.fixture
    def reference_date(self):
        return datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    def test_full_search_results_workflow(self, reference_date):
        """Test complete workflow with realistic search results."""
        # Simulate search results from Pinecone
        results = [
            {
                "journalId": "old-but-relevant",
                "journalTitle": "Deep Reflection",
                "topScore": 0.92,
                "createdAt": (reference_date - timedelta(days=200)).isoformat(),
                "sections": [{"sectionTitle": "Main", "score": 0.92, "excerpt": "..."}],
            },
            {
                "journalId": "recent-medium-relevance",
                "journalTitle": "Quick Note",
                "topScore": 0.75,
                "createdAt": (reference_date - timedelta(days=3)).isoformat(),
                "sections": [{"sectionTitle": "Note", "score": 0.75, "excerpt": "..."}],
            },
            {
                "journalId": "week-old-good-relevance",
                "journalTitle": "Weekly Review",
                "topScore": 0.85,
                "createdAt": (reference_date - timedelta(days=7)).isoformat(),
                "sections": [{"sectionTitle": "Review", "score": 0.85, "excerpt": "..."}],
            },
        ]

        boosted = apply_recency_boost(
            results,
            semantic_weight=0.7,
            recency_weight=0.3,
            max_age_days=365,
            reference_date=reference_date
        )

        # Verify all have required fields
        for r in boosted:
            assert "semanticScore" in r
            assert "recencyScore" in r
            assert "score" in r
            assert 0 <= r["score"] <= 1

        # Verify sorting is by hybrid score
        scores = [r["score"] for r in boosted]
        assert scores == sorted(scores, reverse=True)

        # Week-old entry with 0.85 semantic should rank well
        week_old = next(r for r in boosted if r["journalId"] == "week-old-good-relevance")
        old_but_relevant = next(r for r in boosted if r["journalId"] == "old-but-relevant")

        # Week old should have much higher recency
        assert week_old["recencyScore"] > old_but_relevant["recencyScore"]

    def test_all_same_date_preserves_semantic_order(self, reference_date):
        """If all dates are the same, ordering follows semantic score."""
        same_date = reference_date.isoformat()
        results = [
            {"journalId": "a", "topScore": 0.8, "createdAt": same_date},
            {"journalId": "b", "topScore": 0.9, "createdAt": same_date},
            {"journalId": "c", "topScore": 0.7, "createdAt": same_date},
        ]

        boosted = apply_recency_boost(results, reference_date=reference_date)

        # Should be ordered by semantic (all have same recency)
        assert [r["journalId"] for r in boosted] == ["b", "a", "c"]

    def test_all_no_dates_falls_back_to_semantic(self, reference_date):
        """If no dates, falls back to semantic ordering."""
        results = [
            {"journalId": "a", "topScore": 0.8},
            {"journalId": "b", "topScore": 0.9},
            {"journalId": "c", "topScore": 0.7},
        ]

        boosted = apply_recency_boost(results, reference_date=reference_date)

        # All recency scores should be 0
        for r in boosted:
            assert r["recencyScore"] == 0.0

        # Order by hybrid (which is just semantic * 0.7)
        assert boosted[0]["journalId"] == "b"
