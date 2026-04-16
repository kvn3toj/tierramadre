"""Shared dependency container for TM MCP tool handlers."""

from __future__ import annotations

import os
from typing import Optional

from mempalace.knowledge_graph import KnowledgeGraph
from mempalace.palace import get_collection

from ..emitter import Emitter


class Deps:
    """Lazy-initializing dependency bundle for MCP tool handlers.

    In production, properties auto-discover paths from env/defaults.
    In tests, set internal attributes directly then call set_deps().
    """

    def __init__(self):
        self._kg: Optional[KnowledgeGraph] = None
        self._collection = None
        self._emitter: Optional[Emitter] = None
        self._palace_path: Optional[str] = None
        self._kg_path: Optional[str] = None

    @property
    def palace_path(self) -> str:
        """Return the palace directory, defaulting to ~/.mempalace/palace."""
        if self._palace_path is None:
            self._palace_path = os.environ.get(
                "MEMPALACE_PALACE_PATH",
                os.path.expanduser("~/.mempalace/palace"),
            )
        return self._palace_path

    @property
    def kg(self) -> KnowledgeGraph:
        """Return the KnowledgeGraph, creating it lazily if needed."""
        if self._kg is None:
            self._kg = KnowledgeGraph(db_path=self._kg_path)
        return self._kg

    @property
    def collection(self):
        """Return the ChromaDB collection, creating it lazily if needed."""
        if self._collection is None:
            self._collection = get_collection(self.palace_path)
        return self._collection

    @property
    def emitter(self) -> Emitter:
        """Return the Emitter, creating it lazily if needed."""
        if self._emitter is None:
            self._emitter = Emitter(kg=self.kg, palace_path=self.palace_path)
        return self._emitter


_deps = Deps()


def get_deps() -> Deps:
    """Return the current global Deps instance."""
    return _deps


def set_deps(deps: Deps) -> None:
    """Replace the global Deps instance (used by tests to inject mocks)."""
    global _deps
    _deps = deps
