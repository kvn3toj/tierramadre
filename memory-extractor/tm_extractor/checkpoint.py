"""Per-sheet cursor persistence for the extractor.

Stores the last-processed marker (typically an ISO timestamp) per sheet in
a JSON file so the runner can resume incrementally across restarts.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


class Checkpoint:
    def __init__(self, path: Path):
        self._path = Path(path)
        self._state: dict[str, str] = self._load()

    def _load(self) -> dict[str, str]:
        if not self._path.exists():
            return {}
        try:
            with open(self._path) as f:
                data = json.load(f)
            if isinstance(data, dict):
                return {k: str(v) for k, v in data.items()}
        except (json.JSONDecodeError, OSError):
            pass
        return {}

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".json.tmp")
        with open(tmp, "w") as f:
            json.dump(self._state, f, indent=2)
        tmp.replace(self._path)

    def get(self, sheet: str) -> Optional[str]:
        return self._state.get(sheet)

    def advance(self, sheet: str, marker: str) -> None:
        self._state[sheet] = str(marker)
        self._save()

    def reset(self, sheet: str) -> None:
        self._state.pop(sheet, None)
        self._save()
