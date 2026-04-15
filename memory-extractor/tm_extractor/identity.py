"""Guest identity canonicalization.

Normalizes contacts (phone/email) and derives stable guest IDs used as
entities in the mempalace Knowledge Graph.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from typing import Optional

_COLOMBIA_PHONE_PREFIX = "+57"


def normalize_contact(raw: Optional[str], kind: Optional[str]) -> Optional[str]:
    """Normalize a phone or email so identical contacts produce identical strings."""
    if not raw or not raw.strip():
        return None
    value = raw.strip()

    if kind == "phone":
        digits = re.sub(r"[^\d+]", "", value)
        if not digits:
            return None
        if digits.startswith("+"):
            return digits
        if digits.startswith("57") and len(digits) >= 12:
            return "+" + digits
        # Local Colombian number — assume +57
        return _COLOMBIA_PHONE_PREFIX + digits

    if kind == "email":
        return value.lower()

    return value.lower()


def slugify(name: str) -> str:
    """Convert a display name to a lowercase underscore-separated slug."""
    if not name:
        return ""
    # Strip accents
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    # Replace non-alphanumeric with underscore
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", stripped.lower())
    return slug.strip("_")


def _hash4(value: str) -> str:
    """4-char hex digest — enough to disambiguate same-name guests."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:4]


def guest_id(
    display_name: Optional[str],
    contact: Optional[str],
    contact_kind: Optional[str],
    short_code: Optional[str] = None,
) -> str:
    """Compute the canonical guest entity ID.

    Priority:
      1. `{name}_{hash(contact)}` when both are present.
      2. `anon_{hash(contact)}` when only contact is present.
      3. `pending_{short_code}` when contact is absent but short_code is known.

    Raises ValueError if none of the above are available.
    """
    normalized = normalize_contact(contact, contact_kind)

    if normalized:
        hash4 = _hash4(normalized)
        if display_name:
            return f"guest_{slugify(display_name)}_{hash4}"
        return f"guest_anon_{hash4}"

    if short_code:
        return f"guest_pending_{short_code.lower()}"

    raise ValueError(
        "guest_id requires at least a contact or a short_code to produce an ID"
    )
