"""Emitter — translates extractor Events into mempalace writes.

Uses mempalace's Python API (`KnowledgeGraph.add_*`) and ChromaDB collection
directly (via mempalace's `palace.get_collection`). Guarantees idempotency so
that re-emission of the same event is a no-op.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime
from typing import Optional

from mempalace.knowledge_graph import KnowledgeGraph
from mempalace.palace import get_collection

from .events import (
    AddDrawerEvent,
    AddEntityEvent,
    AddTripleEvent,
    Event,
    InvalidateTripleEvent,
)

log = logging.getLogger(__name__)


class Emitter:
    """Dispatches Event objects to mempalace KG and ChromaDB palace."""

    def __init__(self, kg: KnowledgeGraph, palace_path: str):
        self._kg = kg
        self._palace_path = palace_path
        self._collection = None  # lazy

    def _col(self):
        """Lazily initialise the ChromaDB collection."""
        if self._collection is None:
            self._collection = get_collection(self._palace_path)
        return self._collection

    def emit(self, event: Event) -> Optional[str]:
        """Dispatch an event. Returns a resource id when applicable."""
        if isinstance(event, AddEntityEvent):
            return self._emit_entity(event)
        if isinstance(event, AddTripleEvent):
            return self._emit_triple(event)
        if isinstance(event, InvalidateTripleEvent):
            return self._emit_invalidate(event)
        if isinstance(event, AddDrawerEvent):
            return self._emit_drawer(event)
        raise TypeError(f"Unknown event type: {type(event).__name__}")

    def _emit_entity(self, ev: AddEntityEvent) -> str:
        """Create or update an entity in the knowledge graph."""
        return self._kg.add_entity(
            name=ev.name, entity_type=ev.type, properties=ev.properties
        )

    def _emit_triple(self, ev: AddTripleEvent) -> str:
        """Add a triple; existing identical active triples are dedup'd by KG."""
        return self._kg.add_triple(
            subject=ev.subject,
            predicate=ev.predicate,
            obj=ev.object,
            valid_from=ev.valid_from,
            valid_to=ev.valid_to,
            confidence=ev.confidence,
            source_closet=ev.source_closet,
            source_file=ev.source_file,
        )

    def _emit_invalidate(self, ev: InvalidateTripleEvent) -> None:
        """Set valid_to on an active triple, marking it no longer current."""
        self._kg.invalidate(
            subject=ev.subject,
            predicate=ev.predicate,
            obj=ev.object,
            ended=ev.ended,
        )
        return None

    def _emit_drawer(self, ev: AddDrawerEvent) -> str:
        """Upsert a drawer into the ChromaDB palace using a stable dedup id."""
        drawer_id = self._drawer_id(ev.wing, ev.room, ev.dedup_key)
        metadata = {
            "wing": ev.wing,
            "room": ev.room,
            "added_by": "tm_extractor",
            "filed_at": datetime.now().isoformat(),
        }
        if ev.hall:
            metadata["hall"] = ev.hall
        if ev.source_file:
            metadata["source_file"] = ev.source_file
        for k, v in (ev.metadata or {}).items():
            if isinstance(v, (str, int, float, bool)):
                metadata[k] = v
            else:
                metadata[k] = json.dumps(v)

        self._col().upsert(
            ids=[drawer_id],
            documents=[ev.content],
            metadatas=[metadata],
        )
        return drawer_id

    @staticmethod
    def _drawer_id(wing: str, room: str, dedup_key: str) -> str:
        """Derive a stable drawer ID from the dedup_key."""
        h = hashlib.sha256(dedup_key.encode("utf-8")).hexdigest()[:24]
        return f"drawer_{wing}_{room}_{h}"
