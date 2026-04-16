"""TierraMadre MCP tools — registered into mempalace's MCP server at startup."""

from __future__ import annotations


def get_tools() -> dict:
    """Return all TM tools in mempalace TOOLS dict format.

    Format: {name: {"description": str, "input_schema": dict, "handler": callable}}
    """
    from .read_tools import TOOLS as read
    from .write_tools import TOOLS as write
    from .heuristics import TOOLS as heur

    merged = {}
    merged.update(read)
    merged.update(write)
    merged.update(heur)
    return merged
