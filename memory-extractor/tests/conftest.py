"""Shared fixtures: isolated palace + KG, fresh per test."""

import os
from pathlib import Path

import pytest

from tm_extractor.config import ExtractorConfig


@pytest.fixture
def tmp_palace_path(tmp_path, monkeypatch) -> Path:
    """Redirect MEMPALACE_PALACE_PATH to a temp directory."""
    palace = tmp_path / "palace"
    palace.mkdir()
    monkeypatch.setenv("MEMPALACE_PALACE_PATH", str(palace))
    monkeypatch.setenv("HOME", str(tmp_path))
    return palace


@pytest.fixture
def tmp_kg_path(tmp_path) -> Path:
    return tmp_path / "kg.sqlite3"


@pytest.fixture
def extractor_config(tmp_palace_path, tmp_path) -> ExtractorConfig:
    return ExtractorConfig(
        app_sheet_id="test_sheet_id",
        google_creds_path=tmp_path / "creds.json",
        state_dir=tmp_path / "state",
        palace_path=tmp_palace_path,
    )


@pytest.fixture
def tmp_kg(tmp_kg_path):
    """Return an isolated KnowledgeGraph instance."""
    from mempalace.knowledge_graph import KnowledgeGraph

    kg = KnowledgeGraph(db_path=str(tmp_kg_path))
    yield kg
    kg.close()


@pytest.fixture
def tmp_collection(tmp_palace_path):
    """Return an isolated ChromaDB collection."""
    from mempalace.palace import get_collection

    return get_collection(str(tmp_palace_path))


@pytest.fixture
def seeded_deps(tmp_kg, tmp_collection, tmp_palace_path):
    """Return a Deps instance with seeded TM palace data + entity ID map."""
    from tm_extractor.mcp_tools._deps import Deps, set_deps
    from tests.fixtures.seeded_palace import seed_tm_palace

    deps = Deps()
    deps._kg = tmp_kg
    deps._collection = tmp_collection
    deps._palace_path = str(tmp_palace_path)
    ids = seed_tm_palace(tmp_kg, tmp_collection)
    set_deps(deps)
    yield deps, ids
    set_deps(Deps())  # reset global
