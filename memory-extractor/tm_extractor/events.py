"""Event dataclasses produced by rules and consumed by the emitter."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union


@dataclass
class AddEntityEvent:
    name: str
    type: str
    properties: dict = field(default_factory=dict)


@dataclass
class AddTripleEvent:
    subject: str
    predicate: str
    object: str
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    confidence: float = 1.0
    source_closet: Optional[str] = None
    source_file: Optional[str] = None


@dataclass
class InvalidateTripleEvent:
    subject: str
    predicate: str
    object: str
    ended: Optional[str] = None


@dataclass
class AddDrawerEvent:
    wing: str
    room: str
    content: str
    metadata: dict  # must contain only str|int|float|bool values (ChromaDB constraint)
    dedup_key: str  # hashed into the drawer ID for idempotency
    hall: Optional[str] = None
    source_file: Optional[str] = None


Event = Union[
    AddEntityEvent, AddTripleEvent, InvalidateTripleEvent, AddDrawerEvent
]
