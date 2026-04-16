"""Tests for Phase 4 MCP write tools."""

from tm_extractor.mcp_tools.write_tools import tool_record_interaction
from tm_extractor.mcp_tools.write_tools import tool_set_multiplier
from tm_extractor.mcp_tools.write_tools import tool_confirm_preference


class TestRecordInteraction:
    def test_creates_drawer_with_correct_hall(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_record_interaction(
            guest_id=ids["juan"],
            kind="whatsapp",
            content="Juan pregunto por disponibilidad de esmeraldas Muzo 3ct.",
            asesor_id=ids["asesor"],
        )
        assert result["success"] is True
        assert result["drawer_id"] is not None
        drawer = deps.collection.get(
            ids=[result["drawer_id"]], include=["documents", "metadatas"]
        )
        assert "Muzo 3ct" in drawer["documents"][0]
        assert drawer["metadatas"][0]["hall"] == "hall_whatsapp"
        assert drawer["metadatas"][0]["guest_id"] == ids["juan"]

    def test_cotizacion_emits_triple(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_record_interaction(
            guest_id=ids["juan"],
            kind="cotizacion",
            content="Cotizacion para esmeralda Chivor 2.5ct a COP 12,000,000.",
            asesor_id=ids["asesor"],
        )
        assert result["success"] is True
        triples = deps.kg.query_entity(ids["juan"], direction="outgoing")
        # Point-in-time triples have valid_to set, so current=False — filter by predicate only
        cot_triples = [t for t in triples if t["predicate"] == "received_quotation"]
        # Seeded data has 1, tool should add 1 more
        assert len(cot_triples) >= 2

    def test_invalid_kind_returns_error(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_record_interaction(
            guest_id=ids["juan"],
            kind="invalid_kind",
            content="test",
            asesor_id=ids["asesor"],
        )
        assert result["success"] is False
        assert "kind" in result.get("error", "").lower()


class TestSetMultiplier:
    def test_invalidates_previous_and_creates_new(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_set_multiplier(
            guest_id=ids["juan"],
            value=3.0,
            reason_text="Juan mostro alto interes.",
            asesor_id=ids["asesor"],
        )
        assert result["success"] is True
        assert result["sheets_synced"] is False
        triples = deps.kg.query_entity(ids["juan"], direction="outgoing")
        active_mult = [
            t
            for t in triples
            if t["predicate"] == "has_multiplier" and t.get("current")
        ]
        assert len(active_mult) == 1
        assert active_mult[0]["object"] == "3.0"

    def test_creates_reason_drawer(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_set_multiplier(
            guest_id=ids["juan"],
            value=3.0,
            reason_text="Alto potencial.",
            asesor_id=ids["asesor"],
        )
        drawer = deps.collection.get(
            ids=[result["drawer_id"]], include=["documents", "metadatas"]
        )
        assert "Alto potencial" in drawer["documents"][0]
        assert drawer["metadatas"][0]["hall"] == "hall_multiplier"

    def test_rejects_out_of_range(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_set_multiplier(
            guest_id=ids["juan"], value=5.0, reason_text="t", asesor_id=ids["asesor"]
        )
        assert result["success"] is False

    def test_rejects_below_minimum(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_set_multiplier(
            guest_id=ids["juan"], value=0.5, reason_text="t", asesor_id=ids["asesor"]
        )
        assert result["success"] is False


class TestConfirmPreference:
    def test_promotes_confidence_to_1(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_confirm_preference(
            guest_id=ids["juan"], preference="verde-muzo", evidence_text="Confirmado."
        )
        assert result["success"] is True
        triples = deps.kg.query_entity(ids["juan"], direction="outgoing")
        muzo = [
            t
            for t in triples
            if t["predicate"] == "prefers"
            and t["object"] == "verde-muzo"
            and t.get("current")
        ]
        assert len(muzo) == 1
        assert muzo[0]["confidence"] == 1.0

    def test_creates_confirmed_drawer(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_confirm_preference(
            guest_id=ids["juan"], preference="verde-muzo", evidence_text="Confirmado."
        )
        drawer = deps.collection.get(
            ids=[result["drawer_id"]], include=["metadatas"]
        )
        assert drawer["metadatas"][0]["hall"] == "hall_confirmed"

    def test_nonexistent_preference_returns_error(self, seeded_deps):
        deps, ids = seeded_deps
        result = tool_confirm_preference(
            guest_id=ids["juan"],
            preference="rojo-inexistente",
            evidence_text="t",
        )
        assert result["success"] is False
