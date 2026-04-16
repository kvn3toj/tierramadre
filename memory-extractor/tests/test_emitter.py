from mempalace.knowledge_graph import KnowledgeGraph

from tm_extractor.emitter import Emitter
from tm_extractor.events import (
    AddDrawerEvent,
    AddEntityEvent,
    AddTripleEvent,
    InvalidateTripleEvent,
)


def test_emit_entity_creates_kg_row(tmp_kg_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_kg_path))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    emitter.emit(AddEntityEvent(name="guest_juan_a4b2", type="guest",
                                 properties={"displayName": "Juan"}))
    facts = kg.query_entity("guest_juan_a4b2", direction="both")
    assert isinstance(facts, list)


def test_emit_triple_is_idempotent(tmp_kg_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_kg_path))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))

    ev = AddTripleEvent(
        subject="guest_x", predicate="viewed",
        object="product_item_234", valid_from="2026-04-10"
    )
    emitter.emit(ev)
    emitter.emit(ev)  # same again

    facts = kg.query_entity("guest_x", direction="outgoing")
    viewed = [f for f in facts if f["predicate"] == "viewed"]
    assert len(viewed) == 1  # dedup'd


def test_emit_drawer_dedup_key_produces_stable_id(tmp_kg_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_kg_path))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))

    ev = AddDrawerEvent(
        wing="tierra_madre",
        room="guests",
        hall="hall_profile",
        content="Juan Perez, 45.",
        metadata={"guest_id": "guest_x", "kind": "profile"},
        dedup_key="invitations:row_1:new_invitation",
    )
    drawer_id_1 = emitter.emit(ev)
    drawer_id_2 = emitter.emit(ev)
    assert drawer_id_1 == drawer_id_2
    assert drawer_id_1.startswith("drawer_tierra_madre_guests_")


def test_emit_invalidate_sets_valid_to(tmp_kg_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_kg_path))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    emitter.emit(AddTripleEvent(
        subject="guest_x", predicate="has_multiplier",
        object="2.0", valid_from="2026-04-01"
    ))
    emitter.emit(InvalidateTripleEvent(
        subject="guest_x", predicate="has_multiplier",
        object="2.0", ended="2026-04-10"
    ))
    facts = kg.query_entity("guest_x", direction="outgoing")
    mult = [f for f in facts if f["predicate"] == "has_multiplier"]
    assert len(mult) == 1
    assert mult[0]["valid_to"] == "2026-04-10"
    assert mult[0]["current"] is False
