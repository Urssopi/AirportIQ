"""alert_log table access — dedup window + audit trail."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ..database.client import get_supabase

DEDUP_MINUTES = 30


def was_sent_recently(trip_id: str, alert_type: str, *, minutes: int = DEDUP_MINUTES) -> bool:
    client = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    resp = (
        client.table("alert_log")
        .select("id", count="exact")
        .eq("trip_id", trip_id)
        .eq("alert_type", alert_type)
        .gte("sent_at", cutoff)
        .execute()
    )
    return int(getattr(resp, "count", None) or 0) > 0


def log_sent(
    *,
    user_id: str,
    trip_id: str,
    alert_type: str,
    payload: dict[str, Any],
) -> None:
    client = get_supabase()
    client.table("alert_log").insert(
        {
            "user_id": user_id,
            "trip_id": trip_id,
            "alert_type": alert_type,
            "payload": payload,
        }
    ).execute()
