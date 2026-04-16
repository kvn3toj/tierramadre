"""Start mempalace MCP server with TierraMadre tools merged in.

Usage:
    python -m tm_extractor.mcp_main [--palace /path/to/palace]

MCP host config:
    {"command": "python", "args": ["-m", "tm_extractor.mcp_main"]}
"""

from mempalace import mcp_server
from tm_extractor.mcp_tools import get_tools


def main():
    """Merge TM tools into mempalace and start the MCP server."""
    mcp_server.TOOLS.update(get_tools())
    mcp_server.main()


if __name__ == "__main__":
    main()
