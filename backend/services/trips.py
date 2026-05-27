"""Supabase access for saved_trips."""
from __future__ import annotations

from ..database.client import get_supabase
from ..models.trips import Trip, TripCreate


def _row_to_trip(row: dict) -> Trip:
    return Trip(
        id=row["id"],
        user_id=row["user_id"],
        flight_iata=row["flight_iata"],
        flight_date=row["flight_date"],
        departure_airport=row["departure_airport"],
        arrival_airport=row["arrival_airport"],
        alert_preferences=row.get("alert_preferences") or {},
        created_at=row.get("created_at"),
    )


def list_trips(user_id: str) -> list[Trip]:
    client = get_supabase()
    resp = (
        client.table("saved_trips")
        .select("*")
        .eq("user_id", user_id)
        .order("flight_date", desc=False)
        .execute()
    )
    return [_row_to_trip(row) for row in (resp.data or [])]


def create_trip(user_id: str, payload: TripCreate) -> Trip:
    client = get_supabase()
    insert_payload = {
        "user_id": user_id,
        "flight_iata": payload.flight_iata.upper(),
        "flight_date": payload.flight_date.isoformat(),
        "departure_airport": payload.departure_airport.upper(),
        "arrival_airport": payload.arrival_airport.upper(),
        "alert_preferences": payload.alert_preferences,
    }
    resp = client.table("saved_trips").insert(insert_payload).execute()
    rows = resp.data or []
    if not rows:
        raise RuntimeError("trip insert returned no rows")
    return _row_to_trip(rows[0])


def delete_trip(user_id: str, trip_id: str) -> bool:
    client = get_supabase()
    resp = (
        client.table("saved_trips")
        .delete()
        .eq("id", trip_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(resp.data)
