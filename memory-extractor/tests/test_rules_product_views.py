from tm_extractor.config import ExtractorConfig
from tm_extractor.events import AddDrawerEvent, AddEntityEvent, AddTripleEvent
from tm_extractor.rules.product_views import handle_row
from tests.fixtures.sample_rows import PRODUCT_VIEWS_ROWS


def _cfg(tmp_path, threshold=5, long_session=600):
    return ExtractorConfig(
        app_sheet_id="x",
        google_creds_path=tmp_path / "c",
        state_dir=tmp_path / "s",
        palace_path=tmp_path / "p",
        preference_view_threshold=threshold,
        long_session_seconds=long_session,
    )


def test_individual_view_emits_triple_only(tmp_path):
    def probe(guest, dim, value):
        return 0

    events = handle_row(PRODUCT_VIEWS_ROWS[0], _cfg(tmp_path), probe)

    triples = [e for e in events if isinstance(e, AddTripleEvent)]
    preds = [t.predicate for t in triples]
    assert "viewed" in preds

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert drawers == []


def test_product_entity_created_with_properties(tmp_path):
    def probe(*a):
        return 0

    events = handle_row(PRODUCT_VIEWS_ROWS[0], _cfg(tmp_path), probe)
    products = [e for e in events if isinstance(e, AddEntityEvent) and e.type == "product"]
    assert len(products) == 1
    assert products[0].properties.get("color") == "verde-muzo"
    assert products[0].properties.get("quality") == "fina"


def test_threshold_crossed_emits_preference_triple_and_drawer(tmp_path):
    def probe(guest, dim, value):
        return 4 if dim == "color" else 0

    events = handle_row(PRODUCT_VIEWS_ROWS[0], _cfg(tmp_path), probe)

    prefers = [
        e for e in events
        if isinstance(e, AddTripleEvent) and e.predicate == "prefers"
    ]
    assert len(prefers) == 1
    assert prefers[0].object == "verde-muzo"
    assert prefers[0].confidence == 0.75

    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert any(d.hall == "hall_inferred" for d in drawers)


def test_long_session_emits_narrative_drawer(tmp_path):
    row = dict(PRODUCT_VIEWS_ROWS[0])
    row["durationSec"] = "1800"

    def probe(*a):
        return 0

    events = handle_row(row, _cfg(tmp_path), probe)
    drawers = [e for e in events if isinstance(e, AddDrawerEvent)]
    assert any(d.hall == "hall_visit" for d in drawers)
