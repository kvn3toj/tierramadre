"""Rules for the Invitations sheet.

Emits events for three state transitions:
  - new invitation created
  - invitation activated (guest entered PIN)
  - invitation expired unused
"""

from __future__ import annotations

from typing import List

from ..config import ExtractorConfig
from ..events import (
    AddDrawerEvent,
    AddEntityEvent,
    AddTripleEvent,
    Event,
)
from ..identity import guest_id, slugify

SHEET_NAME = "Invitations"


def _asesor_id(email: str, name: str) -> str:
    """Derive a stable asesor entity ID from email and name."""
    slug = slugify(name or email.split("@")[0])
    return f"asesor_{slug}"


def _invitation_id(short_code: str) -> str:
    """Derive a stable invitation entity ID from the short code."""
    return f"invitation_{short_code.lower()}"


def handle_row(row: dict, cfg: ExtractorConfig) -> List[Event]:
    """Process a single Invitations row into palace events."""
    events: List[Event] = []

    short_code = (row.get("shortCode") or "").strip()
    if not short_code:
        return events

    status = (row.get("status") or "pending").lower()
    activated_at = (row.get("activatedAt") or "").strip()

    asesor = _asesor_id(row.get("creatorEmail", ""), row.get("creatorName", ""))
    inv = _invitation_id(short_code)

    display_name = (row.get("guestName") or "").strip() or None
    contact = (row.get("guestContact") or "").strip() or None
    contact_type = (row.get("contactType") or "").strip() or None

    try:
        guest = guest_id(display_name, contact, contact_type, short_code=short_code)
    except ValueError:
        guest = f"guest_pending_{short_code.lower()}"

    # Always seed the asesor, invitation and guest entities
    events.append(AddEntityEvent(
        name=asesor,
        type="asesor",
        properties={
            "email": row.get("creatorEmail", ""),
            "displayName": row.get("creatorName", ""),
        },
    ))
    events.append(AddEntityEvent(
        name=inv,
        type="invitation",
        properties={
            "shortCode": short_code,
            "createdAt": row.get("createdAt", ""),
            "expiresAt": row.get("expiresAt", ""),
            "pricingMode": row.get("pricingMode", ""),
            "durationHours": row.get("durationHours", ""),
        },
    ))
    events.append(AddEntityEvent(
        name=guest,
        type="guest",
        properties={
            "displayName": display_name or "",
            "contact": contact or "",
            "contactType": contact_type or "",
        },
    ))

    # Creation facts
    events.append(AddTripleEvent(
        subject=asesor,
        predicate="created_invitation",
        object=inv,
        valid_from=row.get("createdAt") or None,
    ))

    multiplier = (row.get("guestMultiplier") or "").strip()
    if multiplier:
        events.append(AddTripleEvent(
            subject=guest,
            predicate="has_multiplier",
            object=multiplier,
            valid_from=row.get("createdAt") or None,
            valid_to=row.get("expiresAt") or None,
        ))

    # Profile drawer
    profile_content = _profile_content(row, display_name, contact, multiplier)
    events.append(AddDrawerEvent(
        wing="tierra_madre",
        room="guests",
        hall="hall_profile",
        content=profile_content,
        metadata={
            "guest_id": guest,
            "asesor_id": asesor,
            "invitation_id": inv,
            "kind": "profile",
        },
        dedup_key=f"invitations:{short_code}:new_invitation",
    ))

    # Activation branch
    if activated_at:
        events.append(AddTripleEvent(
            subject=inv, predicate="invited", object=guest,
            valid_from=activated_at,
        ))
        events.append(AddDrawerEvent(
            wing="tierra_madre",
            room="interactions",
            hall="hall_visit",
            content=(
                f"{display_name or 'Invitado'} activo invitacion "
                f"{short_code} a las {activated_at}."
            ),
            metadata={
                "guest_id": guest,
                "asesor_id": asesor,
                "invitation_id": inv,
                "kind": "activation",
            },
            dedup_key=f"invitations:{short_code}:activated",
        ))

    # Expired-unused branch
    if status == "expired" and not activated_at:
        events.append(AddTripleEvent(
            subject=inv, predicate="expired_unused", object="true",
            valid_from=row.get("expiresAt") or None,
        ))
        events.append(AddDrawerEvent(
            wing="tierra_madre",
            room="sales-context",
            hall="hall_objection",
            content=(
                f"Invitacion {short_code} a {display_name or 'invitado'} "
                f"expiro sin uso. Seguimiento pendiente."
            ),
            metadata={
                "guest_id": guest,
                "asesor_id": asesor,
                "invitation_id": inv,
                "kind": "expired_unused",
            },
            dedup_key=f"invitations:{short_code}:expired_unused",
        ))

    return events


def _profile_content(row: dict, display_name, contact, multiplier) -> str:
    """Build the verbatim profile drawer content."""
    lines = []
    lines.append(
        f"Nueva invitacion {row.get('shortCode')} creada por "
        f"{row.get('creatorName') or row.get('creatorEmail')}."
    )
    lines.append(f"Invitado: {display_name or '(sin nombre)'} ({contact or 'sin contacto'}).")
    if multiplier:
        lines.append(f"Multiplicador inicial: {multiplier}.")
    lines.append(f"Modo pricing: {row.get('pricingMode')}.")
    lines.append(f"Creado: {row.get('createdAt')}.")
    return "\n".join(lines)
