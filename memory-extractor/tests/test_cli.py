"""Tests for the CLI entry point."""

from unittest.mock import MagicMock, patch

import pytest

from tm_extractor.cli import build_parser, main


def test_parser_accepts_once_flag():
    p = build_parser()
    args = p.parse_args(["--once"])
    assert args.once is True
    assert args.watch is False
    assert args.backfill is False


def test_parser_accepts_backfill_with_since():
    p = build_parser()
    args = p.parse_args(["--backfill", "--since", "2026-01-01"])
    assert args.backfill is True
    assert args.since == "2026-01-01"


@patch("tm_extractor.cli.run_once")
@patch("tm_extractor.cli._build_runtime")
def test_main_once_invokes_run_once(build_runtime, mock_run_once, monkeypatch):
    monkeypatch.setenv("TM_APP_SHEET_ID", "x")
    monkeypatch.setenv("TM_GOOGLE_CREDS_PATH", "/tmp/c")
    build_runtime.return_value = (MagicMock(), MagicMock(), MagicMock(), MagicMock())
    mock_run_once.return_value = {"Invitations": {"rows_processed": 1}}

    rc = main(["--once"])
    assert rc == 0
    mock_run_once.assert_called_once()


def test_main_returns_2_on_missing_env(monkeypatch):
    monkeypatch.delenv("TM_APP_SHEET_ID", raising=False)
    rc = main(["--once"])
    assert rc == 2
