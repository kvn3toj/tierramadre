"""Integration tests: TM MCP wrapper registers all tools correctly."""


def test_get_tools_returns_all_tm_tools():
    from tm_extractor.mcp_tools import get_tools

    tools = get_tools()
    expected = [
        "tm_guest_profile",
        "tm_guest_timeline",
        "tm_guest_interests",
        "tm_record_interaction",
        "tm_set_multiplier",
        "tm_confirm_preference",
        "tm_merge_guest",
        "tm_forget_guest",
        "tm_suggest_multiplier",
        "tm_asesor_dashboard",
    ]
    for name in expected:
        assert name in tools, f"Missing tool: {name}"
        assert "description" in tools[name]
        assert "input_schema" in tools[name]
        assert "handler" in tools[name]
        assert callable(tools[name]["handler"])


def test_all_tools_have_tm_prefix():
    from tm_extractor.mcp_tools import get_tools

    for name in get_tools():
        assert name.startswith("tm_"), f"Tool '{name}' should start with 'tm_'"


def test_mcp_main_importable():
    import tm_extractor.mcp_main  # noqa: F401
