"""Google Sheets client + mock implementation.

The real `SheetsClient` reads TierraMadre's app spreadsheet via the Google
Sheets API. Tests use `MockSheetsClient` backed by in-memory dicts so no
network is required.

Both implement `read_since(sheet_name, since_marker) -> Iterator[dict]` where
`since_marker` is typically an ISO timestamp compared against `updatedAt`.
"""

from __future__ import annotations

from typing import Iterator, Optional, Protocol

from .config import ExtractorConfig


class SheetsClientProtocol(Protocol):
    """Protocol shared by real and mock clients."""

    def read_since(
        self, sheet_name: str, since_marker: Optional[str]
    ) -> Iterator[dict]: ...


class MockSheetsClient:
    """In-memory sheets client for tests."""

    def __init__(self, sheets: dict[str, list[dict]]):
        self._sheets = sheets

    def read_since(
        self, sheet_name: str, since_marker: Optional[str]
    ) -> Iterator[dict]:
        rows = self._sheets.get(sheet_name, [])
        for row in rows:
            if since_marker is None:
                yield row
            else:
                updated = row.get("updatedAt") or row.get("createdAt") or ""
                if updated > since_marker:
                    yield row


class SheetsClient:
    """Google Sheets-backed client. Reads full sheet, filters in-memory."""

    def __init__(self, service, spreadsheet_id: str):
        self._service = service
        self._spreadsheet_id = spreadsheet_id

    @classmethod
    def from_config(cls, config: ExtractorConfig) -> "SheetsClient":
        """Build a client from ExtractorConfig using Google service-account creds."""
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds = service_account.Credentials.from_service_account_file(
            str(config.google_creds_path),
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
        )
        service = build("sheets", "v4", credentials=creds, cache_discovery=False)
        return cls(service=service, spreadsheet_id=config.app_sheet_id)

    def _read_all(self, sheet_name: str) -> list[dict]:
        """Read the entire sheet as a list of dicts keyed by the header row."""
        result = (
            self._service.spreadsheets()
            .values()
            .get(spreadsheetId=self._spreadsheet_id, range=sheet_name)
            .execute()
        )
        values = result.get("values", [])
        if not values:
            return []
        headers = values[0]
        rows: list[dict] = []
        for i, raw in enumerate(values[1:], start=1):
            row = {
                headers[j]: (raw[j] if j < len(raw) else "")
                for j in range(len(headers))
            }
            row.setdefault("id", f"{sheet_name.lower()}_row_{i}")
            rows.append(row)
        return rows

    def read_since(
        self, sheet_name: str, since_marker: Optional[str]
    ) -> Iterator[dict]:
        """Yield rows whose updatedAt (or createdAt) is after *since_marker*."""
        for row in self._read_all(sheet_name):
            if since_marker is None:
                yield row
            else:
                updated = row.get("updatedAt") or row.get("createdAt") or ""
                if updated > since_marker:
                    yield row
