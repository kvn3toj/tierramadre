from tm_extractor.identity import normalize_contact, guest_id, slugify


def test_normalize_phone_strips_formatting():
    assert normalize_contact("+57 300 123 4567", "phone") == "+573001234567"
    assert normalize_contact("300-123-4567", "phone") == "+573001234567"
    assert normalize_contact("3001234567", "phone") == "+573001234567"


def test_normalize_email_lowercases_and_strips():
    assert normalize_contact("  Juan@Example.COM  ", "email") == "juan@example.com"


def test_normalize_returns_none_for_empty():
    assert normalize_contact("", "phone") is None
    assert normalize_contact("   ", "email") is None


def test_slugify_replaces_spaces_and_accents():
    assert slugify("Juan Perez") == "juan_perez"
    assert slugify("Maria Lopez-Garcia") == "maria_lopez_garcia"
    assert slugify("  Jose  ") == "jose"


def test_guest_id_uses_contact_hash():
    gid1 = guest_id("Juan Perez", "+573001234567", "phone")
    gid2 = guest_id("Juan Perez", "+573001234567", "phone")
    assert gid1 == gid2  # deterministic
    assert gid1.startswith("guest_juan_perez_")
    assert len(gid1.split("_")[-1]) == 4  # 4-char hash


def test_guest_id_different_contact_different_hash():
    gid1 = guest_id("Juan Perez", "+573001234567", "phone")
    gid2 = guest_id("Juan Perez", "+573009999999", "phone")
    assert gid1 != gid2


def test_guest_id_pending_when_no_contact():
    gid = guest_id("Juan Perez", None, None, short_code="ABC123")
    assert gid == "guest_pending_abc123"


def test_guest_id_anon_when_no_name():
    gid = guest_id(None, "+573001234567", "phone")
    assert gid.startswith("guest_anon_")
    assert len(gid.split("_")[-1]) == 4
