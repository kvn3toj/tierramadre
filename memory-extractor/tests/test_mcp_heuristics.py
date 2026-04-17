"""Tests for Phase 5 MCP heuristic tools."""

from datetime import datetime, timedelta

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

    def test_suggest_multiplier_flags_default_when_no_multiplier(
        self, seeded_deps
    ):
        deps, ids = seeded_deps
        kg = deps._kg

        kg.add_entity("guest_no_mult_test", "guest", {})
        kg.add_triple(
            "guest_no_mult_test",
            "viewed",
            "product_zzz",
            valid_from="2026-04-10T10:00",
        )

        result = tool_suggest_multiplier(guest_id="guest_no_mult_test")

        reasoning_blob = " ".join(result["reasoning"]).lower()
        assert "default" in reasoning_blob, (
            f"Expected 'default' flag in reasoning when no confirmed "
            f"multiplier, got: {result['reasoning']}"
        )


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

    def test_dashboard_filters_by_window(self, seeded_deps):
        deps, ids = seeded_deps
        kg = deps._kg

        now = datetime.now()
        recent_ts = (now - timedelta(days=5)).isoformat()
        old_ts = (now - timedelta(days=60)).isoformat()

        kg.add_entity("asesor_window_test", "asesor", {})
        kg.add_entity("guest_recent_5d", "guest", {})
        kg.add_entity("guest_old_60d", "guest", {})

        kg.add_triple(
            "asesor_window_test",
            "created_invitation",
            "inv_recent_window",
            valid_from=recent_ts,
        )
        kg.add_triple(
            "inv_recent_window",
            "invited",
            "guest_recent_5d",
            valid_from=recent_ts,
        )

        kg.add_triple(
            "asesor_window_test",
            "created_invitation",
            "inv_old_window",
            valid_from=old_ts,
        )
        kg.add_triple(
            "inv_old_window", "invited", "guest_old_60d", valid_from=old_ts
        )

        result = tool_asesor_dashboard(
            asesor_id="asesor_window_test", window="30d"
        )

        guest_ids_in_result = [g["guest_id"] for g in result["guest_details"]]
        assert "guest_recent_5d" in guest_ids_in_result
        assert "guest_old_60d" not in guest_ids_in_result
        assert result["active_guests"] == 1

        follow_up_ids = [f["guest_id"] for f in result["follow_up"]]
        assert "guest_old_60d" not in follow_up_ids
