"""Tests for the MCP tools dependency container."""

from tm_extractor.mcp_tools._deps import Deps, get_deps, set_deps


def test_deps_kg_lazy_init(tmp_kg_path, tmp_palace_path, monkeypatch):
    """Accessing deps.kg creates a KnowledgeGraph lazily."""
    monkeypatch.setenv("HOME", str(tmp_palace_path.parent))
    deps = Deps()
    deps._kg_path = str(tmp_kg_path)
    deps._palace_path = str(tmp_palace_path)
    assert deps._kg is None
    kg = deps.kg
    assert kg is not None
    # Second access returns the same instance
    assert deps.kg is kg


def test_deps_collection_lazy_init(tmp_palace_path, monkeypatch):
    """Accessing deps.collection creates a ChromaDB collection lazily."""
    monkeypatch.setenv("HOME", str(tmp_palace_path.parent))
    deps = Deps()
    deps._palace_path = str(tmp_palace_path)
    assert deps._collection is None
    col = deps.collection
    assert col is not None
    assert deps.collection is col


def test_deps_emitter_lazy_init(tmp_kg_path, tmp_palace_path, monkeypatch):
    """Accessing deps.emitter creates an Emitter lazily."""
    monkeypatch.setenv("HOME", str(tmp_palace_path.parent))
    deps = Deps()
    deps._kg_path = str(tmp_kg_path)
    deps._palace_path = str(tmp_palace_path)
    emitter = deps.emitter
    assert emitter is not None
    assert deps.emitter is emitter


def test_set_deps_replaces_global():
    """set_deps() replaces the module-level singleton."""
    original = get_deps()
    replacement = Deps()
    set_deps(replacement)
    assert get_deps() is replacement
    set_deps(original)  # restore
