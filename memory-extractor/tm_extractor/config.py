"""Extractor configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExtractorConfig:
    app_sheet_id: str
    google_creds_path: Path
    state_dir: Path
    palace_path: Path
    preference_view_threshold: int = 5
    long_session_seconds: int = 600
    watch_interval_seconds: int = 900
    preference_window_days: int = 90

    @property
    def checkpoint_path(self) -> Path:
        return self.state_dir / "checkpoint.json"

    @property
    def log_path(self) -> Path:
        return self.state_dir / "extractor.log"

    @classmethod
    def from_env(cls) -> "ExtractorConfig":
        app_sheet_id = os.environ.get("TM_APP_SHEET_ID")
        if not app_sheet_id:
            raise ValueError(
                "TM_APP_SHEET_ID env var is required (TierraMadre app spreadsheet ID)"
            )

        creds = os.environ.get("TM_GOOGLE_CREDS_PATH", "")
        state_dir = Path(
            os.environ.get(
                "TM_EXTRACTOR_STATE_DIR", os.path.expanduser("~/.tm_extractor")
            )
        )
        palace_path = Path(
            os.environ.get(
                "MEMPALACE_PALACE_PATH", os.path.expanduser("~/.mempalace/palace")
            )
        )

        return cls(
            app_sheet_id=app_sheet_id,
            google_creds_path=Path(creds),
            state_dir=state_dir,
            palace_path=palace_path,
            preference_view_threshold=int(
                os.environ.get("TM_PREFERENCE_VIEW_THRESHOLD", "5")
            ),
            long_session_seconds=int(
                os.environ.get("TM_LONG_SESSION_SECONDS", "600")
            ),
            watch_interval_seconds=int(
                os.environ.get("TM_WATCH_INTERVAL_SECONDS", "900")
            ),
            preference_window_days=int(
                os.environ.get("TM_PREFERENCE_WINDOW_DAYS", "90")
            ),
        )
