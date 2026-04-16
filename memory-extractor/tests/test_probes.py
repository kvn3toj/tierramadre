"""Tests for KGPreferenceProbe — KG-backed view counter."""

from mempalace.knowledge_graph import KnowledgeGraph

from tm_extractor.probes import KGPreferenceProbe


def test_probe_counts_views_by_color(tmp_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    kg.add_entity("product_item_234", entity_type="product",
                  properties={"color": "verde-muzo", "quality": "fina"})
    kg.add_entity("product_item_267", entity_type="product",
                  properties={"color": "verde-muzo", "quality": "fina"})
    kg.add_entity("product_item_300", entity_type="product",
                  properties={"color": "verde-limon", "quality": "fina"})
    kg.add_triple("guest_x", "viewed", "product_item_234", valid_from="2026-04-01")
    kg.add_triple("guest_x", "viewed", "product_item_267", valid_from="2026-04-02")
    kg.add_triple("guest_x", "viewed", "product_item_300", valid_from="2026-04-03")

    probe = KGPreferenceProbe(kg)
    assert probe("guest_x", "color", "verde-muzo") == 2
    assert probe("guest_x", "color", "verde-limon") == 1
    assert probe("guest_x", "color", "verde-rey") == 0


def test_probe_counts_quality(tmp_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    kg.add_entity("product_item_1", entity_type="product",
                  properties={"color": "x", "quality": "fina"})
    kg.add_entity("product_item_2", entity_type="product",
                  properties={"color": "y", "quality": "fina"})
    kg.add_triple("guest_x", "viewed", "product_item_1", valid_from="2026-04-01")
    kg.add_triple("guest_x", "viewed", "product_item_2", valid_from="2026-04-02")

    probe = KGPreferenceProbe(kg)
    assert probe("guest_x", "quality", "fina") == 2


def test_probe_unknown_dimension_returns_zero(tmp_path):
    kg = KnowledgeGraph(db_path=str(tmp_path / "kg.sqlite3"))
    probe = KGPreferenceProbe(kg)
    assert probe("guest_x", "unknown", "value") == 0
