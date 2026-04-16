"""Command-line entry point: ``tm-extract --once | --watch | --backfill --since DATE``."""

from __future__ import annotations

import argparse
import logging
import sys
from typing import List, Optional, Tuple

from mempalace.knowledge_graph import KnowledgeGraph

from .checkpoint import Checkpoint
from .config import ExtractorConfig
from .emitter import Emitter
from .probes import KGPreferenceProbe
from .runner import run_backfill, run_once, run_watch
from .sheets_client import SheetsClient, SheetsClientProtocol


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser for the ``tm-extract`` CLI."""
    p = argparse.ArgumentParser(
        prog="tm-extract",
        description="Extract TierraMadre operational events into mempalace memory.",
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true", help="Run one pass and exit")
    mode.add_argument("--watch", action="store_true", help="Run continuously on an interval")
    mode.add_argument("--backfill", action="store_true", help="Reset checkpoints and replay history")
    p.add_argument(
        "--since",
        help="Required with --backfill. ISO timestamp (e.g. 2026-01-01).",
    )
    p.add_argument("--verbose", "-v", action="store_true", help="Debug logging")
    return p


def _build_runtime(
    config: ExtractorConfig,
) -> Tuple[SheetsClientProtocol, Emitter, Checkpoint, KGPreferenceProbe]:
    """Construct the runtime dependencies from config."""
    client = SheetsClient.from_config(config)
    kg = KnowledgeGraph()
    emitter = Emitter(kg=kg, palace_path=str(config.palace_path))
    checkpoint = Checkpoint(config.checkpoint_path)
    probe = KGPreferenceProbe(kg)
    return client, emitter, checkpoint, probe


def main(argv: Optional[List[str]] = None) -> int:
    """Entry point for ``tm-extract``. Returns exit code."""
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.backfill and not args.since:
        parser.error("--backfill requires --since YYYY-MM-DD")

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    try:
        config = ExtractorConfig.from_env()
    except ValueError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    client, emitter, checkpoint, probe = _build_runtime(config)

    if args.once:
        stats = run_once(
            client=client, emitter=emitter, checkpoint=checkpoint,
            probe=probe, config=config,
        )
        print("Run once complete. Stats:", stats)
        return 0

    if args.watch:
        run_watch(
            client=client, emitter=emitter, checkpoint=checkpoint,
            probe=probe, config=config,
        )
        return 0

    if args.backfill:
        stats = run_backfill(
            client=client, emitter=emitter, checkpoint=checkpoint,
            probe=probe, config=config, since=args.since,
        )
        print("Backfill complete. Stats:", stats)
        return 0

    return 2
