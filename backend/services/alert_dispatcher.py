"""Alert dispatcher.

`decide_alerts(prev, curr, now)` is pure — given a previous FlightDetail
snapshot (or None for first observation) and the current one, return the set
of alerts that should fire. The orchestrator (`check_one_trip`) does the IO.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..models.alerts import AlertDecision
from ..models.flights import FlightDetail
from ..services.aerodatabox import get_flight_detail
from ..services.alert_log import log_sent, was_sent_recently
from ..services.cache import get_cache
from ..services.email_service import SENDERS
from ..services.errors import UpstreamError
from ..services.profiles import get_or_create_profile

DELAY_EXTENDED_THRESHOLD_MIN = 15
BOARDING_SOON_WINDOW_MIN = 45
PREV_STATE_TTL_SECONDS = 24 * 60 * 60   # one day


def _delay_minutes(detail: FlightDetail) -> int:
    if not detail.scheduled_departure or not detail.estimated_departure:
        return 0
    delta = detail.estimated_departure - detail.scheduled_departure
    return max(0, int(delta.total_seconds() // 60))


def _route_payload(curr: FlightDetail) -> dict:
    return {
        "departure_airport": curr.departure_iata,
        "arrival_airport": curr.arrival_iata,
        "scheduled_departure": curr.scheduled_departure,
        "estimated_departure": curr.estimated_departure,
        "gate": curr.gate,
    }


def decide_alerts(
    prev: FlightDetail | None,
    curr: FlightDetail,
    *,
    now: datetime | None = None,
) -> list[AlertDecision]:
    now = now or datetime.now(timezone.utc)
    out: list[AlertDecision] = []

    # cancel
    if curr.status == "canceled" and (prev is None or prev.status != "canceled"):
        out.append(AlertDecision(
            alert_type="cancel",
            summary=f"{curr.flight_iata} canceled",
            payload=_route_payload(curr),
        ))
        return out  # nothing else matters once canceled

    # delay / delay_extended
    curr_delay = _delay_minutes(curr)
    prev_delay = _delay_minutes(prev) if prev else 0
    if curr.status == "delayed" or curr_delay > 0:
        if prev is None or prev.status != "delayed":
            out.append(AlertDecision(
                alert_type="delay",
                summary=f"{curr.flight_iata} delayed",
                payload={**_route_payload(curr), "delay_minutes": curr_delay},
            ))
        elif curr_delay - prev_delay >= DELAY_EXTENDED_THRESHOLD_MIN:
            out.append(AlertDecision(
                alert_type="delay_extended",
                summary=f"{curr.flight_iata} delay extended",
                payload={
                    **_route_payload(curr),
                    "previous_estimate": prev.estimated_departure,
                    "additional_minutes": curr_delay - prev_delay,
                },
            ))

    # gate_change
    if prev is not None and prev.gate and curr.gate and prev.gate != curr.gate:
        out.append(AlertDecision(
            alert_type="gate_change",
            summary=f"{curr.flight_iata} gate {prev.gate} → {curr.gate}",
            payload={
                **_route_payload(curr),
                "old_gate": prev.gate,
                "new_gate": curr.gate,
                "terminal": curr.terminal,
            },
        ))

    # boarding_soon — fire once when ETD is within 45 min and hasn't been fired yet
    etd = curr.estimated_departure or curr.scheduled_departure
    if etd is not None and curr.status != "canceled":
        # Domestic boarding ≈ ETD − 35 min; alert 10 min before boarding (= ETD − 45).
        time_to_etd = (etd - now).total_seconds() / 60
        if 0 < time_to_etd <= BOARDING_SOON_WINDOW_MIN:
            already = prev is not None and _within_boarding_window(prev, now)
            if not already:
                out.append(AlertDecision(
                    alert_type="boarding_soon",
                    summary=f"{curr.flight_iata} boards in ~{int(time_to_etd)} min",
                    payload={
                        **_route_payload(curr),
                        "boarding_time": etd - timedelta(minutes=35),
                        "tsa_wait": None,
                    },
                ))

    return out


def _within_boarding_window(detail: FlightDetail, now: datetime) -> bool:
    etd = detail.estimated_departure or detail.scheduled_departure
    if etd is None:
        return False
    return 0 < (etd - now).total_seconds() / 60 <= BOARDING_SOON_WINDOW_MIN


# ──────────────────────────────────────────────────────────────────────────────
# Orchestrator — used by the periodic job and the cron-style endpoint.
# ──────────────────────────────────────────────────────────────────────────────


def _state_key(flight_iata: str, flight_date: str) -> str:
    return f"alert:state:{flight_iata}:{flight_date}"


def _load_prev(flight_iata: str, flight_date: str) -> FlightDetail | None:
    cached = get_cache().get_json(_state_key(flight_iata, flight_date))
    if not cached:
        return None
    try:
        return FlightDetail.model_validate(cached)
    except Exception:
        return None


def _save_prev(detail: FlightDetail) -> None:
    get_cache().set_json(
        _state_key(detail.flight_iata, detail.flight_date),
        detail.model_dump(mode="json"),
        ttl_seconds=PREV_STATE_TTL_SECONDS,
    )


def check_one_trip(trip: dict) -> dict:
    """Run the alert pipeline for a single saved trip row.

    `trip` is the raw dict from saved_trips (has user_id, flight_iata, flight_date, id).
    Returns a summary dict with the alerts attempted + their outcomes.
    """
    flight_iata = trip["flight_iata"]
    flight_date = str(trip["flight_date"])
    trip_id = trip["id"]
    user_id = trip["user_id"]

    outcomes: list[dict] = []
    try:
        curr = get_flight_detail(flight_iata, flight_date)
    except UpstreamError as exc:
        return {"trip_id": trip_id, "error": str(exc), "outcomes": outcomes}

    prev = _load_prev(flight_iata, flight_date)
    decisions = decide_alerts(prev, curr)
    _save_prev(curr)

    if not decisions:
        return {"trip_id": trip_id, "outcomes": outcomes}

    profile = get_or_create_profile(user_id, None)

    for decision in decisions:
        if was_sent_recently(trip_id, decision.alert_type):
            outcomes.append({"alert_type": decision.alert_type, "skipped": "deduped"})
            continue

        sender = SENDERS.get(decision.alert_type)
        if sender is None or not profile.email:
            outcomes.append({"alert_type": decision.alert_type, "skipped": "no sender or email"})
            continue

        try:
            msg_id = sender(
                profile.email,
                flight_iata=flight_iata,
                flight_date=flight_date,
                payload=decision.payload,
            )
        except Exception as exc:  # noqa: BLE001 — surface upstream failure per-decision
            outcomes.append({"alert_type": decision.alert_type, "error": str(exc)})
            continue

        log_sent(
            user_id=user_id,
            trip_id=trip_id,
            alert_type=decision.alert_type,
            payload=decision.payload,
        )
        outcomes.append({
            "alert_type": decision.alert_type,
            "sent": True,
            "resend_message_id": msg_id,
        })

    return {"trip_id": trip_id, "outcomes": outcomes}


def check_all_active_trips(hours_ahead: int = 48) -> dict:
    """Iterate every saved trip within the next N hours and process it.

    Used by both the periodic in-process loop and the POST /api/jobs/check-alerts
    endpoint (so a real cron can drive it in production).
    """
    from ..database.client import get_supabase

    client = get_supabase()
    today = datetime.now(timezone.utc).date()
    end = today + timedelta(hours=hours_ahead)
    resp = (
        client.table("saved_trips")
        .select("*")
        .gte("flight_date", today.isoformat())
        .lte("flight_date", end.isoformat())
        .execute()
    )
    rows = resp.data or []
    results = [check_one_trip(row) for row in rows]
    return {"checked": len(rows), "results": results}
