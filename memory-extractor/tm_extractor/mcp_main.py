"""Start TierraMadre MCP server with ONLY tm_* tools (no mempalace_* tools).

The palace generic tools live in `kingdom-mcp` (kingdompalace repo).
This server exposes only the 10 TierraMadre tools for guest profile / interactions.

Usage:
    python -m tm_extractor.mcp_main [--palace /path/to/palace]

MCP host config:
    {"command": "python", "args": ["-m", "tm_extractor.mcp_main"]}
"""

from mempalace import mcp_server
from tm_extractor.mcp_tools import get_tools


def main():
    """Replace mempalace TOOLS with only TM tools, then start the MCP server."""
    mcp_server.TOOLS.clear()
    mcp_server.TOOLS.update(get_tools())
    mcp_server.main()


if __name__ == "__main__":
    main()
