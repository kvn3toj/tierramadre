"""Shared fixtures: isolated palace + KG, fresh per test."""

import os
from pathlib import Path

import pytest

from tm_extractor.config import ExtractorConfig


@pytest.fixture
def tmp_palace_path(tmp_path, monkeypatch) -> Path:
    """Redirect MEMPALACE_PALACE_PATH to a temp directory."""
    palace = tmp_path / "palace"
    palace.mkdir()
    monkeypatch.setenv("MEMPALACE_PALACE_PATH", str(palace))
    monkeypatch.setenv("HOME", str(tmp_path))
    return palace


@pytest.fixture
def tmp_kg_path(tmp_path) -> Path:
    return tmp_path / "kg.sqlite3"


@pytest.fixture
def extractor_config(tmp_palace_path, tmp_path) -> ExtractorConfig:
    return ExtractorConfig(
        app_sheet_id="test_sheet_id",
        google_creds_path=tmp_path / "creds.json",
        state_dir=tmp_path / "state",
        palace_path=tmp_palace_path,
    )
