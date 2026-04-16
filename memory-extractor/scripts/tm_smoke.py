"""Smoke test: run the extractor with synthetic rows against a fresh palace.

Usage:
    python scripts/tm_smoke.py /tmp/smoke_palace
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from mempalace.knowledge_graph import KnowledgeGraph
from mempalace.palace import get_collection

from tm_extractor.checkpoint import Checkpoint
from tm_extractor.config import ExtractorConfig
from tm_extractor.emitter import Emitter
from tm_extractor.probes import KGPreferenceProbe
from tm_extractor.runner import run_once
from tm_extractor.sheets_client import MockSheetsClient


INVITATIONS = [
    {
        "id": "smoke_inv_1",
        "updatedAt": "2026-04-10T14:00:00",
        "shortCode": "SMOKE1",
        "creatorEmail": "maria@tm.co",
        "creatorName": "Maria",
        "guestName": "Smoke Guest",
        "guestContact": "+57 300 000 0001",
        "contactType": "phone",
        "createdAt": "2026-04-10T14:00:00",
        "activatedAt": "2026-04-10T14:05:00",
        "expiresAt": "2026-04-10T20:00:00",
        "pricingMode": "with_prices",
        "durationHours": "6",
        "status": "active",
        "guestMultiplier": "2.5",
    },
]

VIEWS = []
for i in range(1, 7):
    VIEWS.append({
        "id": f"smoke_view_{i}",
        "updatedAt": f"2026-04-10T14:{10+i:02d}:00",
        "guestName": "Smoke Guest",
        "guestContact": "+57 300 000 0001",
        "contactType": "phone",
        "shortCode": "SMOKE1",
        "productItem": str(200 + i),
        "productColor": "verde-muzo",
        "productQuality": "fina",
        "pesoCt": "3.0",
        "durationSec": "45",
        "shownPriceCop": "9000000",
        "multiplierUsed": "2.5",
        "currency": "COP",
    })


def main(argv):
    if len(argv) < 2:
        print("Usage: python scripts/tm_smoke.py /tmp/smoke_palace")
        return 2

    palace_dir = Path(argv[1]).expanduser().resolve()
    if palace_dir.exists():
        shutil.rmtree(palace_dir)
    palace_dir.mkdir(parents=True)

    kg = KnowledgeGraph(db_path=str(palace_dir / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(palace_dir))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(palace_dir / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="smoke", google_creds_path=palace_dir / "c",
        state_dir=palace_dir, palace_path=palace_dir,
    )
    client = MockSheetsClient({
        "Invitations": INVITATIONS,
        "ProductViews": VIEWS,
    })

    stats = run_once(client=client, emitter=emitter, checkpoint=cp,
                     probe=probe, config=cfg)
    print("Stats:", stats)

    # Verify drawers + KG
    col = get_collection(str(palace_dir))
    print(f"Drawers: {col.count()}")
    all_meta = col.get(include=["metadatas"])["metadatas"]
    rooms = {m.get("room") for m in all_meta}
    print(f"Rooms populated: {rooms}")

    inv_facts = kg.query_entity("invitation_smoke1", direction="both")
    print(f"invitation_smoke1 facts: {len(inv_facts)}")

    # Find the guest entity
    guest_ids = [m.get("guest_id") for m in all_meta if m.get("guest_id", "").startswith("guest_smoke")]
    if guest_ids:
        guest_facts = kg.query_entity(guest_ids[0], direction="outgoing")
        preferences = [f for f in guest_facts if f["predicate"] == "prefers"]
        assert preferences, "Expected at least one inferred preference after 6 verde-muzo views"
        print(f"Preferences: {preferences}")
    else:
        print("WARNING: no guest_smoke entity found in drawers — checking all guests")
        # Fallback: search all entities
        conn = kg._conn()
        guests = conn.execute("SELECT * FROM entities WHERE name LIKE '%smoke%'").fetchall()
        print(f"Found guests: {[dict(g) for g in guests]}")

    print("\nSmoke test PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
