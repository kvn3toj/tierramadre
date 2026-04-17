"""Phase 5 — MCP heuristic tools for TierraMadre."""

from __future__ import annotations

from datetime import datetime, timedelta

from ._deps import get_deps

_DEFAULT_MULTIPLIER = 1.5
_MIN_MULTIPLIER = 1.0
_MAX_MULTIPLIER = 4.0


def tool_suggest_multiplier(guest_id: str) -> dict:
    """Heuristic multiplier suggestion based on engagement, purchases, and peers."""
    deps = get_deps()
    kg = deps.kg

    triples = kg.query_entity(guest_id, direction="both")
    if not triples:
        return {
            "guest_id": guest_id,
            "suggested": _DEFAULT_MULTIPLIER,
            "range": [_MIN_MULTIPLIER, 2.0],
            "reasoning": ["No data available — returning default"],
        }

    reasoning: list[str] = []

    # 1. Current multiplier
    current_mult = _DEFAULT_MULTIPLIER
    has_confirmed_multiplier = False
    for t in triples:
        if t["predicate"] == "has_multiplier" and t.get("current", False):
            try:
                current_mult = float(t["object"])
                has_confirmed_multiplier = True
            except (ValueError, TypeError):
                pass
            break
    if has_confirmed_multiplier:
        reasoning.append(f"Current multiplier: {current_mult}")
    else:
        reasoning.append(
            f"Current multiplier: {current_mult} "
            "(default, no confirmed multiplier)"
        )

    # 2. Engagement signal: views per day
    view_triples = [t for t in triples if t["predicate"] == "viewed"]
    view_count = len(view_triples)
    engagement_score = _DEFAULT_MULTIPLIER

    if view_count > 0:
        view_dates = [t["valid_from"] for t in view_triples if t.get("valid_from")]
        if len(view_dates) >= 2:
            sorted_dates = sorted(view_dates)
            try:
                d_first = datetime.fromisoformat(sorted_dates[0][:10])
                d_last = datetime.fromisoformat(sorted_dates[-1][:10])
                days_span = max((d_last - d_first).days, 1)
                views_per_day = view_count / days_span
                engagement_score = min(
                    _MAX_MULTIPLIER, _MIN_MULTIPLIER + views_per_day
                )
            except (ValueError, TypeError):
                pass
        reasoning.append(
            f"Views: {view_count}, engagement score: {engagement_score:.1f}"
        )

    # 3. Purchase bonus
    purchases = [t for t in triples if t["predicate"] == "bought"]
    purchase_bonus = 0.0
    if purchases:
        purchase_bonus = min(0.5, len(purchases) * 0.25)
        reasoning.append(f"Purchases: {len(purchases)}, bonus: +{purchase_bonus}")

    # 4. Peer multiplier (guests who viewed same products)
    peer_mult = None
    viewed_products = [t["object"] for t in view_triples]
    if viewed_products:
        peer_multipliers: list[float] = []
        for prod in viewed_products[:5]:
            prod_viewers = kg.query_entity(prod, direction="incoming")
            for pv in prod_viewers:
                if pv["predicate"] == "viewed" and pv["subject"] != guest_id:
                    peer_triples = kg.query_entity(
                        pv["subject"], direction="outgoing"
                    )
                    for pt in peer_triples:
                        if (
                            pt["predicate"] == "has_multiplier"
                            and pt.get("current")
                        ):
                            try:
                                peer_multipliers.append(float(pt["object"]))
                            except (ValueError, TypeError):
                                pass
        if peer_multipliers:
            peer_multipliers.sort()
            mid = len(peer_multipliers) // 2
            peer_mult = peer_multipliers[mid]
            reasoning.append(
                f"Peer median: {peer_mult} ({len(peer_multipliers)} peers)"
            )

    # Weighted formula
    if peer_mult is not None:
        weights = {"peer": 0.4, "engagement": 0.3, "current": 0.3}
    elif has_confirmed_multiplier:
        weights = {"peer": 0.0, "engagement": 0.5, "current": 0.5}
        peer_mult = 0.0
    else:
        # No peers AND no confirmed multiplier: engagement is the only signal
        weights = {"peer": 0.0, "engagement": 1.0, "current": 0.0}
        peer_mult = 0.0

    suggested = (
        weights["peer"] * peer_mult
        + weights["engagement"] * engagement_score
        + weights["current"] * current_mult
        + purchase_bonus
    )
    suggested = round(max(_MIN_MULTIPLIER, min(_MAX_MULTIPLIER, suggested)), 1)
    low = round(max(_MIN_MULTIPLIER, suggested - 0.3), 1)
    high = round(min(_MAX_MULTIPLIER, suggested + 0.3), 1)

    return {
        "guest_id": guest_id,
        "suggested": suggested,
        "range": [low, high],
        "reasoning": reasoning,
    }


def _parse_window(window: str) -> int:
    """Parse '30d' -> 30. Default 30 if unparseable."""
    try:
        if window.endswith("d"):
            return int(window[:-1])
    except (ValueError, AttributeError):
        pass
    return 30


def tool_asesor_dashboard(asesor_id: str, window: str = "30d") -> dict:
    """Dashboard: active guests, conversions, follow-up signals."""
    deps = get_deps()
    kg = deps.kg

    days = _parse_window(window)
    since = (datetime.now() - timedelta(days=days)).isoformat()[:10]

    asesor_triples = kg.query_entity(asesor_id, direction="outgoing")
    invitation_ids = [
        t["object"]
        for t in asesor_triples
        if t["predicate"] == "created_invitation"
    ]

    if not invitation_ids:
        return {
            "asesor_id": asesor_id,
            "window": window,
            "active_guests": 0,
            "conversions": 0,
            "avg_multiplier": 0.0,
            "guest_details": [],
            "follow_up": [],
            "top_products": [],
        }

    guest_ids: list[str] = []
    for inv_id in invitation_ids:
        inv_triples = kg.query_entity(inv_id, direction="outgoing")
        for t in inv_triples:
            if t["predicate"] == "invited":
                guest_ids.append(t["object"])

    guest_details: list[dict] = []
    total_conversions = 0
    multipliers: list[float] = []
    product_counts: dict[str, int] = {}
    follow_up: list[dict] = []

    for gid in guest_ids:
        g_triples = kg.query_entity(gid, direction="both")
        if not g_triples:
            continue

        last_interaction = None
        for t in g_triples:
            vf = t.get("valid_from")
            if vf and (last_interaction is None or vf > last_interaction):
                last_interaction = vf

        if last_interaction is None or last_interaction[:10] < since:
            continue

        mult = None
        for t in g_triples:
            if t["predicate"] == "has_multiplier" and t.get("current"):
                try:
                    mult = float(t["object"])
                    multipliers.append(mult)
                except (ValueError, TypeError):
                    pass
                break

        views = sum(1 for t in g_triples if t["predicate"] == "viewed")
        purchases = sum(1 for t in g_triples if t["predicate"] == "bought")
        quotations = sum(
            1 for t in g_triples if t["predicate"] == "received_quotation"
        )
        total_conversions += purchases

        for t in g_triples:
            if t["predicate"] == "viewed":
                prod = t["object"]
                product_counts[prod] = product_counts.get(prod, 0) + 1

        needs_follow_up = False
        try:
            last_dt = datetime.fromisoformat(last_interaction[:10])
            days_since = (datetime.now() - last_dt).days
            if days_since > 7 and quotations == 0 and purchases == 0:
                needs_follow_up = True
        except (ValueError, TypeError):
            pass

        guest_details.append(
            {
                "guest_id": gid,
                "multiplier": mult,
                "views": views,
                "quotations": quotations,
                "purchases": purchases,
            }
        )

        if needs_follow_up:
            follow_up.append(
                {
                    "guest_id": gid,
                    "last_interaction": last_interaction,
                    "reason": "No quotation or purchase, last seen >7 days ago",
                }
            )

    top_products = sorted(
        product_counts.items(), key=lambda x: x[1], reverse=True
    )[:5]
    avg_mult = (
        round(sum(multipliers) / len(multipliers), 2) if multipliers else 0.0
    )

    return {
        "asesor_id": asesor_id,
        "window": window,
        "active_guests": len(guest_details),
        "conversions": total_conversions,
        "avg_multiplier": avg_mult,
        "guest_details": guest_details,
        "follow_up": follow_up,
        "top_products": [{"product": p, "views": c} for p, c in top_products],
    }


TOOLS: dict = {
    "tm_suggest_multiplier": {
        "description": (
            "Heuristic multiplier suggestion based on engagement, "
            "purchase history, and similar guests."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "guest_id": {
                    "type": "string",
                    "description": "Guest entity ID",
                },
            },
            "required": ["guest_id"],
        },
        "handler": tool_suggest_multiplier,
    },
    "tm_asesor_dashboard": {
        "description": (
            "Asesor dashboard: active guests, conversions, avg multiplier, "
            "top products, follow-up signals."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "asesor_id": {
                    "type": "string",
                    "description": "Asesor entity ID",
                },
                "window": {
                    "type": "string",
                    "description": "Time window (e.g. '30d'). Default: '30d'",
                },
            },
            "required": ["asesor_id"],
        },
        "handler": tool_asesor_dashboard,
    },
}
