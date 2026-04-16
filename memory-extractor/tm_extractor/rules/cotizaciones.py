"""Rules for the Cotizaciones sheet.

Emits:
  - ``received_quotation`` triple + ``hall_cotizacion`` drawer when status == "exported"
  - ``bought`` triple + ``hall_closing`` drawer when status == "purchased"
"""

from __future__ import annotations

from typing import List

from ..config import ExtractorConfig
from ..events import AddDrawerEvent, AddTripleEvent, Event
from ..identity import guest_id

SHEET_NAME = "Cotizaciones"


def handle_row(row: dict, cfg: ExtractorConfig) -> List[Event]:
    """Process a single Cotizaciones row into palace events."""
    events: List[Event] = []

    display_name = (row.get("guestName") or "").strip() or None
    contact = (row.get("guestContact") or "").strip() or None
    contact_type = (row.get("contactType") or "").strip() or None
    short_code = (row.get("shortCode") or "").strip() or None

    try:
        guest = guest_id(display_name, contact, contact_type, short_code=short_code)
    except ValueError:
        return events

    cot_id = f"cotizacion_{(row.get('cotizacionId') or '').strip()}"
    status = (row.get("status") or "").strip().lower()

    if status == "exported":
        events.append(AddTripleEvent(
            subject=guest,
            predicate="received_quotation",
            object=cot_id,
            valid_from=row.get("exportedAt") or row.get("updatedAt") or None,
        ))
        events.append(AddDrawerEvent(
            wing="tierra_madre",
            room="interactions",
            hall="hall_cotizacion",
            content=(
                f"{row.get('exportedAt') or row.get('updatedAt')} — "
                f"Cotizacion {cot_id} para {display_name or 'invitado'}.\n"
                f"Items: {row.get('items', '')}.\n"
                f"Precio base: {row.get('basePriceCop')} {row.get('currency')}. "
                f"Descuento: {row.get('discountCop')}. "
                f"Total: {row.get('totalPriceCop')} {row.get('currency')}.\n"
                f"Multiplicador usado: {row.get('multiplier')}.\n"
                f"Exportada por: {row.get('asesorEmail')}."
            ),
            metadata={
                "guest_id": guest,
                "cotizacion_id": cot_id,
                "short_code": short_code or "",
                "kind": "cotizacion_exported",
            },
            dedup_key=f"cotizaciones:{row.get('cotizacionId')}:exported",
        ))

    if status == "purchased":
        sold_item = (row.get("soldItem") or "").strip()
        product = f"product_item_{sold_item}" if sold_item else "product_unknown"
        sold_at = row.get("soldAt") or row.get("updatedAt") or None
        events.append(AddTripleEvent(
            subject=guest,
            predicate="bought",
            object=product,
            valid_from=sold_at,
            source_file=f"purchase:{row.get('soldPriceCop', '')}",
        ))
        events.append(AddDrawerEvent(
            wing="tierra_madre",
            room="sales-context",
            hall="hall_closing",
            content=(
                f"{sold_at} — {display_name or 'Invitado'} compro "
                f"{product} por {row.get('soldPriceCop')} {row.get('currency')}. "
                f"Multiplicador final: {row.get('multiplier')}. "
                f"Cotizacion origen: {cot_id}."
            ),
            metadata={
                "guest_id": guest,
                "cotizacion_id": cot_id,
                "product": product,
                "kind": "purchase",
            },
            dedup_key=f"cotizaciones:{row.get('cotizacionId')}:purchased",
        ))

    return events
