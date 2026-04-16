"""End-to-end test: mock Sheets -> runner -> mempalace. No network."""

from mempalace.knowledge_graph import KnowledgeGraph
from mempalace.palace import get_collection

from tm_extractor.checkpoint import Checkpoint
from tm_extractor.config import ExtractorConfig
from tm_extractor.emitter import Emitter
from tm_extractor.probes import KGPreferenceProbe
from tm_extractor.runner import run_once
from tm_extractor.sheets_client import MockSheetsClient
from tests.fixtures.sample_rows import (
    COTIZACIONES_ROWS,
    INVITATIONS_ROWS,
    PRODUCT_VIEWS_ROWS,
)


def test_full_extraction_populates_kg_and_drawers(tmp_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(tmp_path / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="x",
        google_creds_path=tmp_path / "c",
        state_dir=tmp_path,
        palace_path=tmp_palace_path,
    )
    client = MockSheetsClient(
        {
            "Invitations": INVITATIONS_ROWS,
            "ProductViews": PRODUCT_VIEWS_ROWS,
            "Cotizaciones": COTIZACIONES_ROWS,
        }
    )

    run_once(client=client, emitter=emitter, checkpoint=cp, probe=probe, config=cfg)

    # KG: invitation entity should have relationships
    invitation_facts = kg.query_entity("invitation_abc123", direction="both")
    preds = {f["predicate"] for f in invitation_facts}
    assert "created_invitation" in preds or "invited" in preds

    # Drawers in ChromaDB
    col = get_collection(str(tmp_palace_path))
    all_drawers = col.get(include=["metadatas"])
    rooms = {m.get("room") for m in all_drawers["metadatas"]}
    assert "guests" in rooms
    assert "interactions" in rooms

    # Cotizacion drawer
    cot_drawers = [
        m for m in all_drawers["metadatas"] if m.get("hall") == "hall_cotizacion"
    ]
    assert len(cot_drawers) >= 1


def test_second_pass_is_noop_for_same_data(tmp_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(tmp_path / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="x",
        google_creds_path=tmp_path / "c",
        state_dir=tmp_path,
        palace_path=tmp_palace_path,
    )
    client = MockSheetsClient({"Invitations": INVITATIONS_ROWS})

    run_once(client=client, emitter=emitter, checkpoint=cp, probe=probe, config=cfg)
    col = get_collection(str(tmp_palace_path))
    count_1 = col.count()

    # Second pass -- checkpoint advanced, no new rows
    run_once(client=client, emitter=emitter, checkpoint=cp, probe=probe, config=cfg)
    count_2 = col.count()

    assert count_1 == count_2
