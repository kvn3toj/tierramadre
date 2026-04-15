import json
from pathlib import Path

from tm_extractor.checkpoint import Checkpoint


def test_checkpoint_starts_empty(tmp_path):
    cp = Checkpoint(tmp_path / "cp.json")
    assert cp.get("invitations") is None


def test_checkpoint_advance_persists(tmp_path):
    cp_path = tmp_path / "cp.json"
    cp = Checkpoint(cp_path)
    cp.advance("invitations", "2026-04-10T14:00:00")
    assert cp.get("invitations") == "2026-04-10T14:00:00"

    # New instance reads from disk
    cp2 = Checkpoint(cp_path)
    assert cp2.get("invitations") == "2026-04-10T14:00:00"


def test_checkpoint_corrupt_file_recovers_empty(tmp_path):
    cp_path = tmp_path / "cp.json"
    cp_path.write_text("not-json-at-all")
    cp = Checkpoint(cp_path)
    assert cp.get("invitations") is None
    # And can still advance
    cp.advance("invitations", "2026-04-10")
    assert cp.get("invitations") == "2026-04-10"


def test_checkpoint_reset_clears_one_sheet(tmp_path):
    cp = Checkpoint(tmp_path / "cp.json")
    cp.advance("invitations", "2026-04-10")
    cp.advance("views", "2026-04-09")
    cp.reset("invitations")
    assert cp.get("invitations") is None
    assert cp.get("views") == "2026-04-09"


def test_checkpoint_creates_parent_dir(tmp_path):
    cp_path = tmp_path / "nested" / "dirs" / "cp.json"
    cp = Checkpoint(cp_path)
    cp.advance("invitations", "2026-04-10")
    assert cp_path.exists()
