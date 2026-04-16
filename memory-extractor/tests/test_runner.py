"""Tests for runner — orchestration of pull-rules-emit loop."""

from mempalace.knowledge_graph import KnowledgeGraph

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


def test_run_once_processes_all_sheets_and_advances_checkpoint(
    tmp_path, tmp_palace_path,
):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(tmp_path / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="x", google_creds_path=tmp_path / "c",
        state_dir=tmp_path, palace_path=tmp_palace_path,
    )
    client = MockSheetsClient({
        "Invitations": INVITATIONS_ROWS,
        "ProductViews": PRODUCT_VIEWS_ROWS,
        "Cotizaciones": COTIZACIONES_ROWS,
    })

    stats = run_once(client=client, emitter=emitter, checkpoint=cp,
                     probe=probe, config=cfg)

    assert stats["Invitations"]["rows_processed"] == 2
    assert stats["ProductViews"]["rows_processed"] == 1
    assert stats["Cotizaciones"]["rows_processed"] == 1
    assert cp.get("Invitations") is not None
    assert cp.get("ProductViews") is not None


def test_run_once_is_idempotent(tmp_path, tmp_palace_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(tmp_path / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="x", google_creds_path=tmp_path / "c",
        state_dir=tmp_path, palace_path=tmp_palace_path,
    )
    client = MockSheetsClient({"Invitations": INVITATIONS_ROWS})

    run_once(client=client, emitter=emitter, checkpoint=cp,
             probe=probe, config=cfg)

    cp.reset("Invitations")
    run_once(client=client, emitter=emitter, checkpoint=cp,
             probe=probe, config=cfg)

    facts = kg.query_entity("invitation_abc123", direction="both")
    invited = [f for f in facts if f["predicate"] == "invited"]
    assert len(invited) == 1


def test_run_once_isolates_rule_errors(tmp_path, tmp_palace_path, caplog):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    emitter = Emitter(kg=kg, palace_path=str(tmp_palace_path))
    probe = KGPreferenceProbe(kg)
    cp = Checkpoint(tmp_path / "cp.json")
    cfg = ExtractorConfig(
        app_sheet_id="x", google_creds_path=tmp_path / "c",
        state_dir=tmp_path, palace_path=tmp_palace_path,
    )
    rows = list(INVITATIONS_ROWS) + [{"id": "bad", "updatedAt": "2026-04-11"}]
    client = MockSheetsClient({"Invitations": rows})

    stats = run_once(client=client, emitter=emitter, checkpoint=cp,
                     probe=probe, config=cfg)

    assert stats["Invitations"]["rows_skipped"] >= 0
    facts = kg.query_entity("invitation_abc123", direction="both")
    assert len(facts) > 0
