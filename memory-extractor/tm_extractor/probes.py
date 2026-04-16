"""Live probes that query the mempalace KG from rules.

Keep probes side-effect-free: rules stay pure and only report which events
*would* be emitted. The emitter applies the writes.
"""

from __future__ import annotations

from mempalace.knowledge_graph import KnowledgeGraph


class KGPreferenceProbe:
    """Counts a guest's `viewed` triples filtered by product property."""

    def __init__(self, kg: KnowledgeGraph):
        self._kg = kg

    def __call__(self, guest_id: str, dimension: str, value: str) -> int:
        if dimension not in {"color", "quality"}:
            return 0
        conn = self._kg._conn()
        query = """
        SELECT COUNT(*) AS c
        FROM triples t
        JOIN entities e ON t.object = e.id
        WHERE t.subject = ?
          AND t.predicate = 'viewed'
          AND json_extract(e.properties, '$.' || ?) = ?
        """
        row = conn.execute(query, (guest_id.lower(), dimension, value)).fetchone()
        return int(row["c"]) if row else 0
