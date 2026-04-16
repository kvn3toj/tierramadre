"""Tests for Phase 3 MCP read tools."""

from tm_extractor.mcp_tools.read_tools import tool_guest_profile


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
