"""Phase 4 — MCP write tools for TierraMadre guest management."""

from __future__ import annotations

from datetime import datetime

from ..events import AddDrawerEvent, AddTripleEvent
from ._deps import get_deps

_HALL_MAP = {
    "visit": "hall_visit",
    "whatsapp": "hall_whatsapp",
    "meeting": "hall_meeting",
    "cotizacion": "hall_cotizacion",
    "closing": "hall_closing",
}

_TRIPLE_KINDS = {
    "cotizacion": "received_quotation",
    "closing": "bought",
}


def tool_record_interaction(
    guest_id: str, kind: str, content: str, asesor_id: str
) -> dict:
    """Record an asesor-guest interaction as a drawer + optional KG triple."""
    if kind not in _HALL_MAP:
        return {
            "success": False,
            "error": f"Invalid kind '{kind}'. Must be one of: {', '.join(_HALL_MAP)}",
        }

    deps = get_deps()
    emitter = deps.emitter
    now = datetime.now().isoformat()

    drawer_event = AddDrawerEvent(
        wing="tierra_madre",
        room="interactions",
        hall=_HALL_MAP[kind],
        content=content,
        metadata={"guest_id": guest_id, "asesor_id": asesor_id, "kind": kind},
        dedup_key=f"mcp_interaction:{guest_id}:{kind}:{now}",
        source_file=f"mcp://{asesor_id}/{guest_id}",
    )
    drawer_id = emitter.emit(drawer_event)

    if kind in _TRIPLE_KINDS:
        triple_event = AddTripleEvent(
            subject=guest_id,
            predicate=_TRIPLE_KINDS[kind],
            object=f"interaction_{now[:10]}",
            valid_from=now,
            valid_to=now,
            source_closet=drawer_id,
        )
        emitter.emit(triple_event)

    return {"success": True, "drawer_id": drawer_id, "hall": _HALL_MAP[kind]}


def _sync_sheets_multiplier(guest_id: str, value: float) -> bool:
    """Stub: write multiplier to Sheets. Returns False (not implemented)."""
    return False


def tool_set_multiplier(
    guest_id: str, value: float, reason_text: str, asesor_id: str
) -> dict:
    """Set guest multiplier: reason drawer + invalidate old triple + new triple."""
    if not (1.0 <= value <= 4.0):
        return {
            "success": False,
            "error": f"Multiplier {value} out of range [1.0, 4.0]",
        }

    deps = get_deps()
    emitter = deps.emitter
    kg = deps.kg
    now = datetime.now().isoformat()

    sheets_ok = _sync_sheets_multiplier(guest_id, value)

    drawer_event = AddDrawerEvent(
        wing="tierra_madre",
        room="sales-context",
        hall="hall_multiplier",
        content=reason_text,
        metadata={
            "guest_id": guest_id,
            "asesor_id": asesor_id,
            "kind": "multiplier_change",
            "new_value": value,
        },
        dedup_key=f"mcp_multiplier:{guest_id}:{now}",
        source_file=f"mcp://{asesor_id}/{guest_id}",
    )
    drawer_id = emitter.emit(drawer_event)

    current_triples = kg.query_entity(guest_id, direction="outgoing")
    for t in current_triples:
        if t["predicate"] == "has_multiplier" and t.get("current", False):
            kg.invalidate(guest_id, "has_multiplier", t["object"], ended=now[:10])

    emitter.emit(
        AddTripleEvent(
            subject=guest_id,
            predicate="has_multiplier",
            object=str(value),
            valid_from=now,
            source_closet=drawer_id,
        )
    )

    return {
        "success": True,
        "drawer_id": drawer_id,
        "new_multiplier": value,
        "sheets_synced": sheets_ok,
    }


def tool_confirm_preference(
    guest_id: str, preference: str, evidence_text: str
) -> dict:
    """Promote an inferred preference to confirmed (confidence 1.0)."""
    deps = get_deps()
    kg = deps.kg
    emitter = deps.emitter
    now = datetime.now().isoformat()

    triples = kg.query_entity(guest_id, direction="outgoing")
    target = None
    for t in triples:
        if (
            t["predicate"] == "prefers"
            and t["object"] == preference
            and t.get("current", False)
        ):
            target = t
            break

    if target is None:
        return {
            "success": False,
            "error": f"Active preference '{preference}' not found for {guest_id}",
        }

    kg.invalidate(guest_id, "prefers", preference, ended=now[:10])
    emitter.emit(
        AddTripleEvent(
            subject=guest_id,
            predicate="prefers",
            object=preference,
            valid_from=now,
            confidence=1.0,
        )
    )

    drawer_event = AddDrawerEvent(
        wing="tierra_madre",
        room="preferences",
        hall="hall_confirmed",
        content=evidence_text,
        metadata={
            "guest_id": guest_id,
            "value": preference,
            "kind": "confirmed_preference",
        },
        dedup_key=f"mcp_confirm:{guest_id}:{preference}:{now}",
    )
    drawer_id = emitter.emit(drawer_event)

    return {"success": True, "drawer_id": drawer_id, "preference": preference}


def tool_merge_guest(from_id: str, to_id: str) -> dict:
    """Merge two guest entities: move all triples/drawers from from_id to to_id."""
    if from_id == to_id:
        return {"success": False, "error": "Cannot merge a guest into itself"}

    deps = get_deps()
    kg = deps.kg
    col = deps.collection

    from_eid = kg._entity_id(from_id)
    to_eid = kg._entity_id(to_id)

    conn = kg._conn()
    entity_row = conn.execute(
        "SELECT id FROM entities WHERE id = ?", (from_eid,)
    ).fetchone()
    if not entity_row:
        return {"success": False, "error": f"Entity '{from_id}' not found"}

    try:
        from mempalace.mcp_server import _wal_log

        _wal_log("tm_merge_guest", {"from_id": from_id, "to_id": to_id})
    except ImportError:
        pass

    with kg._lock:
        c = kg._conn()
        with c:
            sub_count = c.execute(
                "UPDATE triples SET subject = ? WHERE subject = ?",
                (to_eid, from_eid),
            ).rowcount
            obj_count = c.execute(
                "UPDATE triples SET object = ? WHERE object = ?",
                (to_eid, from_eid),
            ).rowcount
            c.execute("DELETE FROM entities WHERE id = ?", (from_eid,))

    drawers_moved = 0
    try:
        hits = col.get(
            where={"guest_id": from_id}, include=["documents", "metadatas"]
        )
        if hits and hits.get("ids"):
            for did, doc, meta in zip(
                hits["ids"], hits["documents"], hits["metadatas"]
            ):
                meta["guest_id"] = to_id
                col.upsert(ids=[did], documents=[doc], metadatas=[meta])
                drawers_moved += 1
    except Exception:
        pass

    return {
        "success": True,
        "triples_moved": sub_count + obj_count,
        "drawers_moved": drawers_moved,
    }


TOOLS: dict = {
    "tm_record_interaction": {
        "description": (
            "Record an asesor-guest interaction "
            "(visit, whatsapp, meeting, cotizacion, closing)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {
                    "type": "string",
                    "description": "Guest entity ID",
                },
                "kind": {
                    "type": "string",
                    "description": (
                        "Interaction type: visit, whatsapp, "
                        "meeting, cotizacion, closing"
                    ),
                },
                "content": {
                    "type": "string",
                    "description": "Verbatim interaction content",
                },
                "asesor_id": {
                    "type": "string",
                    "description": "Asesor entity ID",
                },
            },
            "required": ["guest_id", "kind", "content", "asesor_id"],
        },
        "handler": tool_record_interaction,
    },
    "tm_set_multiplier": {
        "description": "Set or update a guest's multiplier with reason and audit trail.",
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {"type": "string", "description": "Guest entity ID"},
                "value": {
                    "type": "number",
                    "description": "Multiplier value (1.0 to 4.0)",
                },
                "reason_text": {
                    "type": "string",
                    "description": "Reason for the multiplier change",
                },
                "asesor_id": {
                    "type": "string",
                    "description": "Asesor entity ID",
                },
            },
            "required": ["guest_id", "value", "reason_text", "asesor_id"],
        },
        "handler": tool_set_multiplier,
    },
    "tm_confirm_preference": {
        "description": "Promote an inferred preference to confirmed (confidence 1.0).",
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {"type": "string", "description": "Guest entity ID"},
                "preference": {
                    "type": "string",
                    "description": "Preference value to confirm",
                },
                "evidence_text": {
                    "type": "string",
                    "description": "Evidence supporting the confirmation",
                },
            },
            "required": ["guest_id", "preference", "evidence_text"],
        },
        "handler": tool_confirm_preference,
    },
    "tm_merge_guest": {
        "description": (
            "Merge two guest entities: move all triples and drawers "
            "from one guest to another, then delete the source entity."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "from_id": {
                    "type": "string",
                    "description": "Source guest entity ID (will be deleted)",
                },
                "to_id": {
                    "type": "string",
                    "description": "Target guest entity ID (receives data)",
                },
            },
            "required": ["from_id", "to_id"],
        },
        "handler": tool_merge_guest,
    },
}
