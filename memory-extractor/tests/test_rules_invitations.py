from tm_extractor.config import ExtractorConfig
from tm_extractor.events import (
    AddDrawerEvent,
    AddEntityEvent,
    AddTripleEvent,
)
from tm_extractor.rules.invitations import handle_row
from tests.fixtures.sample_rows import INVITATIONS_ROWS


def _cfg(tmp_path):
    return ExtractorConfig(
        app_sheet_id="x",
        google_creds_path=tmp_path / "c",
        state_dir=tmp_path / "s",
        palace_path=tmp_path / "p",
    )


def test_new_invitation_emits_entities_triples_and_profile_drawer(tmp_path):
    events = handle_row(INVITATIONS_ROWS[0], _cfg(tmp_path))

    entity_names = [e.name for e in events if isinstance(e, AddEntityEvent)]
    assert any(n.startswith("invitation_abc123") for n in entity_names)
    assert any(n.startswith("guest_juan_perez_") for n in entity_names)

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    preds = [t.predicate for t in triples]
    assert "created_invitation" in preds
    assert "has_multiplier" in preds

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert len(drawers) == 1
    assert drawers[0].room == "guests"
    assert drawers[0].hall == "hall_profile"
    assert "Juan Perez" in drawers[0].content


def test_activated_invitation_emits_invited_triple_and_visit_drawer(tmp_path):
    events = handle_row(INVITATIONS_ROWS[1], _cfg(tmp_path))

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    invited = [t for t in triples if t.predicate == "invited"]
    assert len(invited) == 1
    assert invited[0].subject.startswith("invitation_")

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    visit_drawers = [d for d in drawers if d.hall == "hall_visit"]
    assert len(visit_drawers) == 1


def test_expired_unused_invitation_emits_followup_signal(tmp_path):
    row = {
        "id": "row_inv_3",
        "updatedAt": "2026-04-10T20:00:00",
        "shortCode": "XYZ999",
        "creatorEmail": "pedro@tm.co",
        "creatorName": "Pedro",
        "guestName": "Ana Garcia",
        "guestContact": "ana@x.com",
        "contactType": "email",
        "createdAt": "2026-04-10T14:00:00",
        "activatedAt": "",
        "expiresAt": "2026-04-10T20:00:00",
        "pricingMode": "with_prices",
        "durationHours": "6",
        "status": "expired",
        "guestMultiplier": "1.5",
    }
    events = handle_row(row, _cfg(tmp_path))

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    assert any(t.predicate == "expired_unused" for t in triples)

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert any(d.hall == "hall_objection" for d in drawers)


def test_row_without_guest_contact_creates_pending_guest(tmp_path):
    row = dict(INVITATIONS_ROWS[0])
    row["guestContact"] = ""
    row["guestName"] = ""
    events = handle_row(row, _cfg(tmp_path))
    entity_names = [e.name for e in events if isinstance(e, AddEntityEvent)]
    assert any(n == "guest_pending_abc123" for n in entity_names)
