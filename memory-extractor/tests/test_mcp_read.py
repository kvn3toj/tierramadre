"""Tests for Phase 3 MCP read tools."""

from tm_extractor.mcp_tools.read_tools import tool_guest_profile, tool_guest_timeline


class TestGuestProfile:
    def test_returns_profile_drawer_and_triples(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_guest_profile(guest_id=ids["juan"])

        assert result["guest_id"] == ids["juan"]
        assert "Juan Perez" in result["profile"]
        assert result["multiplier"] == "2.5"
        assert any(p["value"] == "verde-muzo" for p in result["preferences"])
        assert len(result["recent_interactions"]) >= 2
        assert result["stats"]["total_views"] == 3
        assert result["stats"]["quotations"] >= 1

    def test_unknown_guest_returns_empty(self, seeded_deps):
        result = tool_guest_profile(guest_id="guest_nonexistent_0000")

        assert result["guest_id"] == "guest_nonexistent_0000"
        assert result["profile"] is None
        assert result["multiplier"] is None
        assert result["preferences"] == []
        assert result["recent_interactions"] == []

    def test_expired_preference_excluded(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_guest_profile(guest_id=ids["juan"])

        pref_values = [p["value"] for p in result["preferences"]]
        assert "verde-muzo" in pref_values
        assert "azul-vivido" not in pref_values


class TestGuestTimeline:
    def test_returns_chronological_entries(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_guest_timeline(guest_id=ids["juan"])

        assert len(result["events"]) > 0
        dates = [e["valid_from"] for e in result["events"] if e["valid_from"]]
        assert dates == sorted(dates)

    def test_filters_by_since(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_guest_timeline(guest_id=ids["juan"], since="2026-04-05")

        for event in result["events"]:
            if event["valid_from"]:
                assert event["valid_from"] >= "2026-04-05"

    def test_empty_guest_returns_no_events(self, seeded_deps):
        result = tool_guest_timeline(guest_id="guest_nonexistent_0000")
        assert result["events"] == []
