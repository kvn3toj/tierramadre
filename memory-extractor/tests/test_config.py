import os
from pathlib import Path

import pytest

from tm_extractor.config import ExtractorConfig


def test_config_reads_env_vars(monkeypatch, tmp_path):
    monkeypatch.setenv("TM_APP_SHEET_ID", "sheet123")
    monkeypatch.setenv("TM_GOOGLE_CREDS_PATH", "/tmp/creds.json")
    monkeypatch.setenv("TM_EXTRACTOR_STATE_DIR", str(tmp_path))
    monkeypatch.setenv("MEMPALACE_PALACE_PATH", str(tmp_path / "palace"))

    cfg = ExtractorConfig.from_env()
    assert cfg.app_sheet_id == "sheet123"
    assert cfg.google_creds_path == Path("/tmp/creds.json")
    assert cfg.state_dir == tmp_path
    assert cfg.palace_path == tmp_path / "palace"


def test_config_requires_app_sheet_id(monkeypatch):
    monkeypatch.delenv("TM_APP_SHEET_ID", raising=False)
    with pytest.raises(ValueError, match="TM_APP_SHEET_ID"):
        ExtractorConfig.from_env()


def test_config_defaults_state_dir(monkeypatch):
    monkeypatch.setenv("TM_APP_SHEET_ID", "x")
    monkeypatch.setenv("TM_GOOGLE_CREDS_PATH", "/tmp/c")
    monkeypatch.delenv("TM_EXTRACTOR_STATE_DIR", raising=False)
    cfg = ExtractorConfig.from_env()
    assert cfg.state_dir == Path(os.path.expanduser("~/.tm_extractor"))


def test_config_preference_threshold_default():
    cfg = ExtractorConfig(
        app_sheet_id="x",
        google_creds_path=Path("/tmp/c"),
        state_dir=Path("/tmp/s"),
        palace_path=Path("/tmp/p"),
    )
    assert cfg.preference_view_threshold == 5
    assert cfg.long_session_seconds == 600
    assert cfg.watch_interval_seconds == 900
