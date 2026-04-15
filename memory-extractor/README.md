# TierraMadre Memory Extractor

Python sub-project living inside the TierraMadre repo. Reads operational events from TierraMadre's Google Sheets and writes structured memory into mempalace.

See design spec in `mempalace/docs/superpowers/specs/2026-04-13-tierramadre-memory-design.md`.

## Install

```bash
pip install -e /Users/kevinp/Movies/coommunity-universe/mempalace
pip install -e .[dev]
```

## Run

```bash
tm-extract --once      # one pass
tm-extract --watch     # loop every 15min
tm-extract --backfill --since 2025-10-01
```
