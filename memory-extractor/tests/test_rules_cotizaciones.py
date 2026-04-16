from tm_extractor.config import ExtractorConfig
from tm_extractor.events import AddDrawerEvent, AddTripleEvent
from tm_extractor.rules.cotizaciones import handle_row
from tests.fixtures.sample_rows import COTIZACIONES_ROWS


def _cfg(tmp_path):
    return ExtractorConfig(
        app_sheet_id="x", google_creds_path=tmp_path / "c",
        state_dir=tmp_path / "s", palace_path=tmp_path / "p",
    )


def test_exported_cotizacion_emits_triple_and_drawer(tmp_path):
    events = handle_row(COTIZACIONES_ROWS[0], _cfg(tmp_path))

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    assert any(t.predicate == "received_quotation" for t in triples)

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert any(d.hall == "hall_cotizacion" for d in drawers)
    assert "cot_42" in drawers[0].content


def test_purchase_emits_bought_triple_and_closing_drawer(tmp_path):
    row = dict(COTIZACIONES_ROWS[0])
    row["status"] = "purchased"
    row["soldItem"] = "234"
    row["soldPriceCop"] = "9200000"
    row["soldAt"] = "2026-04-15T18:00:00"

    events = handle_row(row, _cfg(tmp_path))

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    bought = [t for t in triples if t.predicate == "bought"]
    assert len(bought) == 1
    assert bought[0].object == "product_item_234"

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert any(d.hall == "hall_closing" for d in drawers)


def test_row_without_guest_is_skipped(tmp_path):
    row = dict(COTIZACIONES_ROWS[0])
    row["guestName"] = ""
    row["guestContact"] = ""
    row["shortCode"] = ""
    events = handle_row(row, _cfg(tmp_path))
    assert events == []
