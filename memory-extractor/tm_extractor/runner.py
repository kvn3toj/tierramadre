"""Runner — orchestrates the pull-rules-emit loop across all configured sheets."""

from __future__ import annotations

import logging
import time
from typing import Callable, Optional

from .checkpoint import Checkpoint
from .config import ExtractorConfig
from .emitter import Emitter
from .probes import KGPreferenceProbe
from .rules import cotizaciones as cotizaciones_rules
from .rules import invitations as invitations_rules
from .rules import product_views as product_views_rules
from .sheets_client import SheetsClientProtocol

log = logging.getLogger(__name__)


def _invitations_handler(row, cfg, probe):
    return invitations_rules.handle_row(row, cfg)


def _product_views_handler(row, cfg, probe):
    return product_views_rules.handle_row(row, cfg, probe)


def _cotizaciones_handler(row, cfg, probe):
    return cotizaciones_rules.handle_row(row, cfg)


SHEET_HANDLERS = {
    invitations_rules.SHEET_NAME: _invitations_handler,
    product_views_rules.SHEET_NAME: _product_views_handler,
    cotizaciones_rules.SHEET_NAME: _cotizaciones_handler,
}


def run_once(
    *,
    client: SheetsClientProtocol,
    emitter: Emitter,
    checkpoint: Checkpoint,
    probe: KGPreferenceProbe,
    config: ExtractorConfig,
) -> dict[str, dict[str, int]]:
    """Process one pass over every configured sheet. Returns per-sheet stats."""
    stats: dict[str, dict[str, int]] = {}

    for sheet_name, handler in SHEET_HANDLERS.items():
        stats[sheet_name] = {
            "rows_processed": 0,
            "rows_skipped": 0,
            "events_emitted": 0,
        }
        since = checkpoint.get(sheet_name)
        latest_marker = since

        for row in client.read_since(sheet_name, since):
            try:
                events = handler(row, config, probe)
            except Exception as exc:
                log.exception(
                    "rule failed for %s row %s: %s", sheet_name, row.get("id"), exc
                )
                stats[sheet_name]["rows_skipped"] += 1
                continue

            stats[sheet_name]["rows_processed"] += 1

            for event in events:
                try:
                    emitter.emit(event)
                    stats[sheet_name]["events_emitted"] += 1
                except Exception as exc:
                    log.exception("emit failed: %s", exc)

            marker = row.get("updatedAt") or row.get("createdAt") or row.get("id")
            if marker and (latest_marker is None or marker > latest_marker):
                latest_marker = marker

        if latest_marker and latest_marker != since:
            checkpoint.advance(sheet_name, latest_marker)

    return stats


def run_watch(
    *,
    client: SheetsClientProtocol,
    emitter: Emitter,
    checkpoint: Checkpoint,
    probe: KGPreferenceProbe,
    config: ExtractorConfig,
    should_stop: Optional[Callable[[], bool]] = None,
) -> None:
    """Run ``run_once`` in a loop every ``watch_interval_seconds``. Never crashes."""
    while True:
        if should_stop and should_stop():
            return
        try:
            stats = run_once(
                client=client, emitter=emitter, checkpoint=checkpoint,
                probe=probe, config=config,
            )
            log.info("run_once stats: %s", stats)
        except Exception as exc:
            log.exception("run_once crashed: %s", exc)
        time.sleep(config.watch_interval_seconds)


def run_backfill(
    *,
    client: SheetsClientProtocol,
    emitter: Emitter,
    checkpoint: Checkpoint,
    probe: KGPreferenceProbe,
    config: ExtractorConfig,
    since: str,
) -> dict[str, dict[str, int]]:
    """Reset checkpoints to ``since``, then run one pass."""
    for sheet_name in SHEET_HANDLERS:
        checkpoint.advance(sheet_name, since)
    return run_once(
        client=client, emitter=emitter, checkpoint=checkpoint,
        probe=probe, config=config,
    )
