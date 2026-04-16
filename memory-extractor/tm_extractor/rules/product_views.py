"""Rules for the ProductViews sheet.

Emits:
  - view triple per row (always)
  - product entity with color/quality/peso (lazy, when first seen)
  - inferred ``prefers`` triple + drawer when view threshold crossed
  - narrative visit drawer for long sessions (>= long_session_seconds)
"""

from __future__ import annotations

import json
from typing import Callable, List

from ..config import ExtractorConfig
from ..events import (
    AddDrawerEvent,
    AddEntityEvent,
    AddTripleEvent,
    Event,
)
from ..identity import guest_id

SHEET_NAME = "ProductViews"

PreferenceProbe = Callable[[str, str, str], int]


def handle_row(row: dict, cfg: ExtractorConfig, probe: PreferenceProbe) -> List[Event]:
    """Process a single ProductViews row into palace events."""
    events: List[Event] = []

    product_item = (row.get("productItem") or "").strip()
    if not product_item:
        return events

    display_name = (row.get("guestName") or "").strip() or None
    contact = (row.get("guestContact") or "").strip() or None
    contact_type = (row.get("contactType") or "").strip() or None
    short_code = (row.get("shortCode") or "").strip() or None

    try:
        guest = guest_id(display_name, contact, contact_type, short_code=short_code)
    except ValueError:
        return events

    product = f"product_item_{product_item}"
    color = (row.get("productColor") or "").strip()
    quality = (row.get("productQuality") or "").strip()
    peso = (row.get("pesoCt") or "").strip()

    # Product entity (idempotent — emitter deduplicates)
    events.append(AddEntityEvent(
        name=product,
        type="product",
        properties={
            "item": product_item,
            "color": color,
            "quality": quality,
            "pesoCt": peso,
        },
    ))

    # View triple (always emitted)
    view_meta = {
        "dur": int(row.get("durationSec") or 0),
        "price_cop": int(row.get("shownPriceCop") or 0),
        "mult": row.get("multiplierUsed") or "",
        "cur": row.get("currency") or "",
    }
    events.append(AddTripleEvent(
        subject=guest,
        predicate="viewed",
        object=product,
        valid_from=row.get("updatedAt") or None,
        valid_to=row.get("updatedAt") or None,
        source_file=f"view:{json.dumps(view_meta, separators=(',', ':'))}",
    ))

    # Preference inference — check color and quality dimensions
    if color:
        prior = probe(guest, "color", color)
        if prior + 1 >= cfg.preference_view_threshold:
            _emit_preference(events, guest, "color", color, prior + 1, row)
    if quality:
        prior = probe(guest, "quality", quality)
        if prior + 1 >= cfg.preference_view_threshold:
            _emit_preference(events, guest, "quality", quality, prior + 1, row)

    # Long-session narrative drawer
    try:
        dur = int(row.get("durationSec") or 0)
    except ValueError:
        dur = 0
    if dur >= cfg.long_session_seconds:
        events.append(AddDrawerEvent(
            wing="tierra_madre",
            room="interactions",
            hall="hall_visit",
            content=(
                f"{row.get('updatedAt')} — {display_name or 'Invitado'} "
                f"sesion larga ({dur}s) viendo {product}. "
                f"Multiplicador activo: {row.get('multiplierUsed')}. "
                f"Precio mostrado: {row.get('shownPriceCop')} {row.get('currency')}."
            ),
            metadata={
                "guest_id": guest,
                "short_code": short_code or "",
                "kind": "long_session",
            },
            dedup_key=f"views:{row.get('id')}:long_session",
        ))

    return events


def _emit_preference(
    events: List[Event],
    guest: str,
    dimension: str,
    value: str,
    count: int,
    row: dict,
) -> None:
    """Append a prefers triple and an inferred-preference drawer."""
    events.append(AddTripleEvent(
        subject=guest,
        predicate="prefers",
        object=value,
        valid_from=row.get("updatedAt") or None,
        confidence=0.75,
    ))
    events.append(AddDrawerEvent(
        wing="tierra_madre",
        room="preferences",
        hall="hall_inferred",
        content=(
            f"Patron detectado {row.get('updatedAt')}:\n"
            f"{guest} ha visto {count} productos con {dimension}={value}.\n"
            f"Confidence: 0.75 (inferido por umbral de vistas)."
        ),
        metadata={
            "guest_id": guest,
            "dimension": dimension,
            "value": value,
            "kind": "inferred_preference",
        },
        dedup_key=f"views:pref:{guest}:{dimension}:{value}",
    ))
