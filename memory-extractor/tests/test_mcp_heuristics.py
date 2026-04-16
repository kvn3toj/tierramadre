"""Tests for Phase 5 MCP heuristic tools."""

from tm_extractor.mcp_tools.heuristics import tool_suggest_multiplier


class TestSuggestMultiplier:
    def test_returns_suggestion_with_range(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_suggest_multiplier(guest_id=ids["juan"])
        assert "suggested" in result
        assert 1.0 <= result["suggested"] <= 4.0
        assert "range" in result
        assert len(result["range"]) == 2
        assert result["range"][0] <= result["suggested"] <= result["range"][1]

    def test_guest_with_minimal_data(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_suggest_multiplier(guest_id=ids["ana"])
        assert 1.0 <= result["suggested"] <= 4.0

    def test_nonexistent_guest_returns_default(self, seeded_deps):
        result = tool_suggest_multiplier(guest_id="guest_nonexistent_0000")
        assert 1.0 <= result["suggested"] <= 4.0

    def test_includes_reasoning(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_suggest_multiplier(guest_id=ids["juan"])
        assert "reasoning" in result
        assert isinstance(result["reasoning"], list)
        assert len(result["reasoning"]) > 0
