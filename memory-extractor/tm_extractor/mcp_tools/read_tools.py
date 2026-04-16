"""Phase 3 — MCP read tools for TierraMadre guest data."""

from __future__ import annotations

from ._deps import get_deps


def tool_guest_profile(guest_id: str) -> dict:
    """Consolidated guest profile: drawer + active triples + interactions + stats."""
    deps = get_deps()
    kg = deps.kg
    col = deps.collection

    # 1. KG triples (both directions)
    all_triples = kg.query_entity(guest_id, direction="both")
    active = [t for t in all_triples if t.get("current", False)]

    multiplier = None
    preferences = []
    for t in active:
        if t["predicate"] == "has_multiplier" and t.get("direction") == "outgoing":
            multiplier = t["object"]
        if t["predicate"] == "prefers" and t.get("direction") == "outgoing":
            preferences.append({
                "value": t["object"],
                "confidence": t.get("confidence", 1.0),
                "valid_from": t.get("valid_from"),
            })

    # 2. Profile drawer
    profile_text = None
    try:
        profile_hits = col.get(
            where={"$and": [{"guest_id": guest_id}, {"hall": "hall_profile"}]},
            include=["documents"],
        )
        if profile_hits and profile_hits.get("documents"):
            profile_text = profile_hits["documents"][0]
    except Exception:
        pass

    # 3. Recent interactions (last 5)
    recent = []
    try:
        interaction_hits = col.get(
            where={"$and": [{"guest_id": guest_id}, {"room": "interactions"}]},
            include=["documents", "metadatas"],
        )
        if interaction_hits and interaction_hits.get("documents"):
            pairs = list(
                zip(interaction_hits["documents"], interaction_hits["metadatas"])
            )
            pairs.sort(key=lambda p: p[1].get("filed_at", ""), reverse=True)
            for doc, meta in pairs[:5]:
                recent.append({
                    "hall": meta.get("hall", ""),
                    "kind": meta.get("kind", ""),
                    "filed_at": meta.get("filed_at", ""),
                    "preview": doc[:200],
                })
    except Exception:
        pass

    # 4. Stats from triples
    total_views = sum(1 for t in all_triples if t["predicate"] == "viewed")
    quotations = sum(1 for t in all_triples if t["predicate"] == "received_quotation")
    purchases = sum(1 for t in all_triples if t["predicate"] == "bought")

    return {
        "guest_id": guest_id,
        "profile": profile_text,
        "multiplier": multiplier,
        "preferences": sorted(
            preferences, key=lambda p: p.get("confidence", 0), reverse=True
        ),
        "recent_interactions": recent,
        "stats": {
            "total_views": total_views,
            "quotations": quotations,
            "purchases": purchases,
        },
    }


def tool_guest_timeline(guest_id: str, since: str = None) -> dict:
    """Chronological timeline of all events involving a guest."""
    deps = get_deps()
    kg = deps.kg

    raw = kg.timeline(guest_id)

    events = []
    for t in raw:
        if since and t.get("valid_from") and t["valid_from"] < since:
            continue
        events.append({
            "subject": t["subject"],
            "predicate": t["predicate"],
            "object": t["object"],
            "valid_from": t.get("valid_from"),
            "valid_to": t.get("valid_to"),
            "current": t.get("current", False),
        })

    return {"guest_id": guest_id, "since": since, "events": events}


def tool_guest_interests(guest_id: str, min_confidence: float = 0.7) -> dict:
    """Inferred and confirmed preferences for a guest, with evidence."""
    deps = get_deps()
    kg = deps.kg
    col = deps.collection

    triples = kg.query_entity(guest_id, direction="outgoing")
    active_prefs = [
        t
        for t in triples
        if t["predicate"] == "prefers" and t.get("current", False)
    ]

    interests = []
    for t in active_prefs:
        conf = t.get("confidence", 1.0)
        if conf < min_confidence:
            continue

        evidence = None
        try:
            pref_value = t["object"]
            hits = col.get(
                where={"$and": [{"guest_id": guest_id}, {"room": "preferences"}]},
                include=["documents", "metadatas"],
            )
            if hits and hits.get("documents"):
                for doc, meta in zip(hits["documents"], hits["metadatas"]):
                    if (
                        meta.get("value") == pref_value
                        or pref_value.lower() in doc.lower()
                    ):
                        evidence = doc[:300]
                        break
        except Exception:
            pass

        interests.append({
            "value": t["object"],
            "confidence": conf,
            "valid_from": t.get("valid_from"),
            "hall": "hall_confirmed" if conf >= 1.0 else "hall_inferred",
            "evidence": evidence,
        })

    interests.sort(key=lambda p: (-p["confidence"], p.get("valid_from") or ""))

    return {
        "guest_id": guest_id,
        "min_confidence": min_confidence,
        "interests": interests,
    }


TOOLS: dict = {
    "tm_guest_profile": {
        "description": (
            "Consolidated guest profile: narrative, active multiplier, "
            "preferences, recent interactions, and engagement stats."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {
                    "type": "string",
                    "description": "Guest entity ID (e.g. guest_juan_perez_a4b2)",
                },
            },
            "required": ["guest_id"],
        },
        "handler": tool_guest_profile,
    },
    "tm_guest_timeline": {
        "description": (
            "Chronological timeline of guest events: invitations, views, "
            "preferences, quotations, purchases."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {
                    "type": "string",
                    "description": "Guest entity ID",
                },
                "since": {
                    "type": "string",
                    "description": "ISO date — only events after this date (optional)",
                },
            },
            "required": ["guest_id"],
        },
        "handler": tool_guest_timeline,
    },
    "tm_guest_interests": {
        "description": (
            "Guest preferences (inferred + confirmed) with confidence "
            "scores and evidence."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {
                    "type": "string",
                    "description": "Guest entity ID",
                },
                "min_confidence": {
                    "type": "number",
                    "description": "Minimum confidence threshold (default 0.7)",
                },
            },
            "required": ["guest_id"],
        },
        "handler": tool_guest_interests,
    },
}
