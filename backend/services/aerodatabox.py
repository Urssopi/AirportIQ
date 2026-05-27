"""AeroDataBox API wrapper (via RapidAPI).

Endpoints used:
  GET /flights/airports/iata/{iata}            (departure board)
  GET /flights/{flightNumber}/{date}           (single-flight detail)

Responses are cached in Upstash Redis:
  - airport board: 60s
  - flight detail: 30s
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from ..config import settings
from ..models.flights import DepartureBoard, FlightDetail, FlightSummary, InboundAircraft
from .cache import get_cache
from .errors import UpstreamError

BASE_URL = "https://aerodatabox.p.rapidapi.com"
HOST = "aerodatabox.p.rapidapi.com"
BOARD_TTL = 60
DETAIL_TTL = 30
TIMEOUT = 8.0


def _headers() -> dict[str, str]:
    if not settings.aerodatabox_api_key:
        raise UpstreamError("aerodatabox", "AERODATABOX_API_KEY is not configured")
    return {
        "X-RapidAPI-Key": settings.aerodatabox_api_key,
        "X-RapidAPI-Host": HOST,
        "Accept": "application/json",
    }


def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    try:
        with httpx.Client(base_url=BASE_URL, headers=_headers(), timeout=TIMEOUT) as client:
            resp = client.get(path, params=params)
    except httpx.HTTPError as exc:
        raise UpstreamError("aerodatabox", f"network error: {exc}") from exc

    if resp.status_code >= 500:
        raise UpstreamError("aerodatabox", f"upstream {resp.status_code}")
    if resp.status_code == 429:
        raise UpstreamError("aerodatabox", "rate limited")
    if resp.status_code >= 400:
        raise UpstreamError("aerodatabox", f"client error {resp.status_code}: {resp.text[:200]}")
    try:
        return resp.json()
    except ValueError as exc:
        raise UpstreamError("aerodatabox", "invalid json response") from exc


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _movement_time(movement: dict[str, Any] | None, key: str) -> datetime | None:
    """Prefer the airport-local timestamp (preserves offset) so the frontend
    can show times in the airport's timezone, not the user's device timezone."""
    if not movement:
        return None
    time_block = movement.get(key) or {}
    return _parse_dt(time_block.get("local") or time_block.get("utc"))


def _normalize_status(label: str | None) -> str:
    if not label:
        return "scheduled"
    s = label.lower()
    if "cancel" in s:
        return "canceled"
    if "delay" in s:
        return "delayed"
    if "board" in s:
        return "boarding"
    if "expected" in s or "on time" in s or "scheduled" in s:
        return "on_time" if "expected" in s or "on time" in s else "scheduled"
    return "scheduled"


def get_airport_board(iata: str, hours_window: int = 12) -> DepartureBoard:
    iata = iata.upper()
    cache_key = f"aerodatabox:board:{iata}:{hours_window}"
    cache = get_cache()

    cached = cache.get_json(cache_key)
    if cached:
        return DepartureBoard.model_validate(cached)

    # Window starts 15 min in the past so flights currently boarding still
    # show up, but anything that departed > 15 min ago is dropped.
    offset_minutes = -15
    duration_minutes = max(60, hours_window * 60)
    payload = _get(
        f"/flights/airports/iata/{iata}",
        params={
            "offsetMinutes": offset_minutes,
            "durationMinutes": duration_minutes,
            "withLeg": "false",
            "withCancelled": "true",
            "withCodeshared": "false",
            "direction": "Departure",
        },
    )

    departures = payload.get("departures") or payload.get("flights") or []
    flights: list[FlightSummary] = []
    for raw in departures:
        movement = raw.get("movement") or raw.get("arrival") or {}
        airport_block = movement.get("airport") or {}
        flights.append(
            FlightSummary(
                flight_iata=(raw.get("number") or "").replace(" ", ""),
                airline=(raw.get("airline") or {}).get("name"),
                destination_iata=airport_block.get("iata") or "",
                destination_city=airport_block.get("name"),
                scheduled_departure=_movement_time(movement, "scheduledTime")
                or datetime.now(timezone.utc),
                estimated_departure=_movement_time(movement, "revisedTime")
                or _movement_time(movement, "predictedTime"),
                terminal=movement.get("terminal"),
                gate=movement.get("gate"),
                status=_normalize_status(raw.get("status")),
            )
        )

    board = DepartureBoard(
        airport_iata=iata,
        fetched_at=datetime.now(timezone.utc),
        flights=flights,
    )
    cache.set_json(cache_key, board.model_dump(mode="json"), ttl_seconds=BOARD_TTL)
    return board


def get_flight_detail(flight_iata: str, date: str) -> FlightDetail:
    flight_iata = flight_iata.upper().replace(" ", "")
    cache_key = f"aerodatabox:flight:{flight_iata}:{date}"
    cache = get_cache()

    cached = cache.get_json(cache_key)
    if cached:
        return FlightDetail.model_validate(cached)

    # AeroDataBox single-flight endpoint requires a searchBy segment.
    # 'Number' = IATA flight designator (e.g. UA245, DL1637).
    payload = _get(f"/flights/Number/{flight_iata}/{date}")
    flights = payload if isinstance(payload, list) else [payload]
    if not flights:
        raise UpstreamError("aerodatabox", f"no data for {flight_iata} {date}")

    raw = flights[0]
    departure = raw.get("departure") or {}
    arrival = raw.get("arrival") or {}
    inbound_raw = raw.get("aircraft", {}).get("previousFlight") if isinstance(raw.get("aircraft"), dict) else None

    inbound = None
    if inbound_raw:
        inbound_dep = inbound_raw.get("departure") or {}
        inbound = InboundAircraft(
            origin_iata=(inbound_dep.get("airport") or {}).get("iata"),
            scheduled_arrival=_movement_time(inbound_raw.get("arrival") or {}, "scheduledTime"),
            estimated_arrival=_movement_time(inbound_raw.get("arrival") or {}, "revisedTime"),
            status=_normalize_status(inbound_raw.get("status")),
        )

    detail = FlightDetail(
        flight_iata=flight_iata,
        flight_date=date,
        airline=(raw.get("airline") or {}).get("name"),
        departure_iata=(departure.get("airport") or {}).get("iata") or "",
        arrival_iata=(arrival.get("airport") or {}).get("iata") or "",
        scheduled_departure=_movement_time(departure, "scheduledTime"),
        estimated_departure=_movement_time(departure, "revisedTime"),
        scheduled_arrival=_movement_time(arrival, "scheduledTime"),
        estimated_arrival=_movement_time(arrival, "revisedTime"),
        terminal=departure.get("terminal"),
        gate=departure.get("gate"),
        status=_normalize_status(raw.get("status")),
        inbound=inbound,
        raw_status_label=raw.get("status"),
    )
    cache.set_json(cache_key, detail.model_dump(mode="json"), ttl_seconds=DETAIL_TTL)
    return detail
