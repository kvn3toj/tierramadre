"""Seed a test palace with TM guest/asesor/interaction data for MCP tool tests."""

from __future__ import annotations


def seed_tm_palace(kg, collection) -> dict:
    """Populate KG + ChromaDB with 2 guests, 1 asesor, interactions, preferences.

    Returns a dict of entity IDs for use in assertions.
    """
    # Asesor
    kg.add_entity(
        "asesor_maria", "asesor", {"email": "maria@tm.co", "displayName": "Maria Lopez"}
    )

    # Guest 1: Juan -- active, has views, preferences, multiplier
    kg.add_entity(
        "guest_juan_perez_a4b2",
        "guest",
        {"displayName": "Juan Perez", "contactType": "phone", "contact": "+573001234567"},
    )
    kg.add_triple(
        "asesor_maria", "created_invitation", "invitation_abc123", valid_from="2026-04-01"
    )
    kg.add_triple(
        "invitation_abc123", "invited", "guest_juan_perez_a4b2", valid_from="2026-04-01"
    )
    kg.add_triple(
        "guest_juan_perez_a4b2",
        "has_multiplier",
        "2.5",
        valid_from="2026-04-01",
        source_closet="drawer_tierra_madre_sales-context_stub01",
    )
    kg.add_triple(
        "guest_juan_perez_a4b2",
        "prefers",
        "verde-muzo",
        valid_from="2026-04-05",
        confidence=0.85,
    )
    kg.add_triple(
        "guest_juan_perez_a4b2",
        "prefers",
        "alta-calidad",
        valid_from="2026-04-06",
        confidence=0.5,
    )
    # 3 view triples
    for i, ts in enumerate(["2026-04-02T10:00", "2026-04-03T11:00", "2026-04-04T14:00"]):
        kg.add_triple(
            "guest_juan_perez_a4b2",
            "viewed",
            f"product_item_{200 + i}",
            valid_from=ts,
            valid_to=ts,
            source_file=f"view:{{'dur_sec':{30 + i * 20},'price_cop':{8000000 + i * 500000}}}",
        )

    # Guest 2: Ana -- minimal, no preferences, shared with another asesor
    kg.add_entity("guest_ana_gomez_c3d1", "guest", {"displayName": "Ana Gomez"})
    kg.add_triple(
        "asesor_maria", "created_invitation", "invitation_def456", valid_from="2026-04-08"
    )
    kg.add_triple(
        "invitation_def456", "invited", "guest_ana_gomez_c3d1", valid_from="2026-04-08"
    )
    kg.add_triple(
        "guest_ana_gomez_c3d1", "has_multiplier", "2.0", valid_from="2026-04-08"
    )

    # An expired preference for Juan (should be excluded by read tools)
    kg.add_triple(
        "guest_juan_perez_a4b2",
        "prefers",
        "azul-vivido",
        valid_from="2026-03-01",
        confidence=0.9,
    )
    kg.invalidate("guest_juan_perez_a4b2", "prefers", "azul-vivido", ended="2026-03-20")

    # Drawers
    collection.upsert(
        ids=["drawer_tierra_madre_guests_profile_juan"],
        documents=[
            "Juan Perez, referido por Roberto Mendez. Telefono: +573001234567. "
            "Multiplier inicial: 2.5. Interesado en esmeraldas colombianas de alta calidad."
        ],
        metadatas=[
            {
                "wing": "tierra_madre",
                "room": "guests",
                "hall": "hall_profile",
                "guest_id": "guest_juan_perez_a4b2",
                "asesor_id": "asesor_maria",
                "invitation_id": "invitation_abc123",
                "kind": "profile",
                "added_by": "tm_extractor",
                "filed_at": "2026-04-01T14:00:00",
            }
        ],
    )
    collection.upsert(
        ids=["drawer_tierra_madre_interactions_visit_juan_01"],
        documents=[
            "Juan visito la sala virtual el 2026-04-02. Sesion de 15 minutos. "
            "Reviso 3 productos: esmeralda Muzo 2.1ct, esmeralda Muzo 1.8ct, "
            "esmeralda Chivor 3.0ct."
        ],
        metadatas=[
            {
                "wing": "tierra_madre",
                "room": "interactions",
                "hall": "hall_visit",
                "guest_id": "guest_juan_perez_a4b2",
                "asesor_id": "asesor_maria",
                "kind": "long_session",
                "added_by": "tm_extractor",
                "filed_at": "2026-04-02T10:15:00",
            }
        ],
    )
    collection.upsert(
        ids=["drawer_tierra_madre_interactions_cotizacion_juan_01"],
        documents=[
            "Cotizacion COT-789 para Juan Perez. Producto: esmeralda Muzo 2.1ct. "
            "Precio base: COP 8,500,000. Multiplier: 2.5. Total: COP 21,250,000."
        ],
        metadatas=[
            {
                "wing": "tierra_madre",
                "room": "interactions",
                "hall": "hall_cotizacion",
                "guest_id": "guest_juan_perez_a4b2",
                "cotizacion_id": "COT-789",
                "kind": "cotizacion_exported",
                "added_by": "tm_extractor",
                "filed_at": "2026-04-06T09:00:00",
            }
        ],
    )
    collection.upsert(
        ids=["drawer_tierra_madre_preferences_inferred_juan_01"],
        documents=[
            "Juan Perez muestra preferencia por esmeraldas verde-muzo. "
            "Evidencia: 6 vistas de productos Muzo en 5 dias (2026-04-01 a 2026-04-06). "
            "Confidence: 0.85."
        ],
        metadatas=[
            {
                "wing": "tierra_madre",
                "room": "preferences",
                "hall": "hall_inferred",
                "guest_id": "guest_juan_perez_a4b2",
                "dimension": "color",
                "value": "verde-muzo",
                "kind": "inferred_preference",
                "added_by": "tm_extractor",
                "filed_at": "2026-04-06T10:00:00",
            }
        ],
    )
    # A received_quotation triple for Juan
    kg.add_triple(
        "guest_juan_perez_a4b2",
        "received_quotation",
        "product_item_200",
        valid_from="2026-04-06T09:00",
        valid_to="2026-04-06T09:00",
    )

    return {
        "asesor": "asesor_maria",
        "juan": "guest_juan_perez_a4b2",
        "ana": "guest_ana_gomez_c3d1",
        "inv_juan": "invitation_abc123",
        "inv_ana": "invitation_def456",
    }
