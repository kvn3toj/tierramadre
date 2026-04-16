from tm_extractor.sheets_client import MockSheetsClient, SheetsClient
from tests.fixtures.sample_rows import INVITATIONS_ROWS


def test_mock_client_returns_all_rows_when_no_since():
    client = MockSheetsClient({"Invitations": INVITATIONS_ROWS})
    rows = list(client.read_since("Invitations", None))
    assert len(rows) == 2


def test_mock_client_filters_by_since_timestamp():
    client = MockSheetsClient({"Invitations": INVITATIONS_ROWS})
    rows = list(client.read_since("Invitations", "2026-04-10T14:02:00"))
    assert len(rows) == 1
    assert rows[0]["id"] == "row_inv_2"


def test_mock_client_returns_empty_for_unknown_sheet():
    client = MockSheetsClient({"Invitations": INVITATIONS_ROWS})
    rows = list(client.read_since("DoesNotExist", None))
    assert rows == []


def test_sheets_client_has_expected_interface():
    assert hasattr(SheetsClient, "read_since")
    assert hasattr(SheetsClient, "from_config")
