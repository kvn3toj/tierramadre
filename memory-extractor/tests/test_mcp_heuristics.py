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


from tm_extractor.mcp_tools.heuristics import tool_asesor_dashboard


class TestAsesorDashboard:
    def test_counts_active_guests(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_asesor_dashboard(asesor_id=ids["asesor"])
        assert result["asesor_id"] == ids["asesor"]
        assert result["active_guests"] >= 2
        assert isinstance(result["guest_details"], list)

    def test_calculates_conversions(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_asesor_dashboard(asesor_id=ids["asesor"])
        assert "conversions" in result
        assert isinstance(result["conversions"], int)

    def test_flags_follow_up_needed(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_asesor_dashboard(asesor_id=ids["asesor"])
        assert "follow_up" in result
        assert isinstance(result["follow_up"], list)

    def test_respects_window(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_asesor_dashboard(asesor_id=ids["asesor"], window="1d")
        assert "active_guests" in result

    def test_unknown_asesor_returns_empty(self, seeded_deps):
        result = tool_asesor_dashboard(asesor_id="asesor_nonexistent")
        assert result["active_guests"] == 0
        assert result["guest_details"] == []
