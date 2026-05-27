"""TSA wait-time service.

- fetch_historical(iata, hour, day_of_week): hit tsawaittimes.com for a baseline.
  Returns None on any failure (caller falls back to crowdsourced only).
- get_recent_reports(iata, minutes): pull from Supabase tsa_reports.
- calculate_aggregate: pure function combining the two into a TsaWait.

Confidence (per PRD Feature 4, interpreted):
  High   — newest report < 15 min old.
  Medium — newest report 15–45 min old, OR strong historical baseline only.
  Low    — no reports, only generic historical (or nothing).

Trend (last vs. older bucket):
  rising / stable / falling — needs ≥ 2 reports across the window.
  unknown — otherwise.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ..config import settings
from ..data.tsa_baseline import estimate_wait_minutes
from ..database.client import get_supabase
from ..models.tsa import Confidence, RecentReport, Trend, TsaWait
from .errors import UpstreamError

# Aggregate constants
FRESH_CUTOFF_MINUTES = 15
STALE_CUTOFF_MINUTES = 45
TREND_DELTA_MINUTES = 5    # ± from older bucket avg to flag rising/falling


# ──────────────────────────────────────────────────────────────────────────────
# I/O — kept thin so tests can hit calculate_aggregate directly.
# ──────────────────────────────────────────────────────────────────────────────


def fetch_historical(iata: str, hour: int, day_of_week: int) -> int | None:
    """Baseline TSA wait estimate.

    No free real-time TSA feed exists, so we use a deterministic model built
    from public TSA passenger-throughput rankings + observed time-of-day and
    day-of-week patterns. See `backend/data/tsa_baseline.py` for the curves.

    `day_of_week` is Python's Monday=0..Sunday=6 to match datetime.weekday().
    """
    return estimate_wait_minutes(iata, hour, day_of_week)


def get_recent_reports(iata: str, minutes: int = 30) -> list[RecentReport]:
    """Pull reports for an airport within the last `minutes` minutes."""
    if not settings.supabase_url:
        return []
    try:
        client = get_supabase()
    except RuntimeError:
        return []

    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    resp = (
        client.table("tsa_reports")
        .select("wait_minutes,has_precheck,reported_at")
        .eq("airport_iata", iata.upper())
        .gte("reported_at", cutoff)
        .order("reported_at", desc=True)
        .execute()
    )
    out: list[RecentReport] = []
    for row in resp.data or []:
        reported = row.get("reported_at")
        if isinstance(reported, str):
            reported_dt = datetime.fromisoformat(reported.replace("Z", "+00:00"))
        else:
            reported_dt = reported
        out.append(
            RecentReport(
                wait_minutes=int(row["wait_minutes"]),
                has_precheck=bool(row.get("has_precheck", False)),
                reported_at=reported_dt,
            )
        )
    return out


def user_reports_in_window(user_id: str, hours: int = 2) -> int:
    """Count reports a user has submitted in the last `hours` hours."""
    try:
        client = get_supabase()
    except RuntimeError:
        return 0
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    resp = (
        client.table("tsa_reports")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("reported_at", cutoff)
        .execute()
    )
    return int(getattr(resp, "count", None) or 0)


def insert_report(
    iata: str,
    *,
    wait_minutes: int,
    has_precheck: bool,
    terminal: str | None,
    checkpoint: str | None,
    user_id: str | None,
) -> str:
    """Insert a row and return its id."""
    try:
        client = get_supabase()
    except RuntimeError as exc:
        raise UpstreamError("supabase", str(exc)) from exc
    payload = {
        "airport_iata": iata.upper(),
        "wait_minutes": wait_minutes,
        "has_precheck": has_precheck,
        "terminal": terminal,
        "checkpoint": checkpoint,
        "user_id": user_id,
    }
    resp = client.table("tsa_reports").insert(payload).execute()
    rows = resp.data or []
    if not rows:
        raise UpstreamError("supabase", "insert returned no rows")
    return str(rows[0]["id"])


# ──────────────────────────────────────────────────────────────────────────────
# Pure aggregation — covered by unit tests.
# ──────────────────────────────────────────────────────────────────────────────


def _confidence(
    reports: list[RecentReport],
    historical_baseline: int | None,
    now: datetime,
) -> Confidence:
    if reports:
        newest = reports[0]
        age_min = (now - newest.reported_at).total_seconds() / 60
        if age_min < FRESH_CUTOFF_MINUTES:
            return "High"
        if age_min < STALE_CUTOFF_MINUTES:
            return "Medium"
    if historical_baseline is not None:
        return "Medium" if not reports else "Low"
    return "Low"


def _trend(reports: list[RecentReport]) -> Trend:
    if len(reports) < 2:
        return "unknown"
    # reports come in newest-first; split into recent half vs older half.
    mid = max(1, len(reports) // 2)
    recent = reports[:mid]
    older = reports[mid:] or recent
    recent_avg = sum(r.wait_minutes for r in recent) / len(recent)
    older_avg = sum(r.wait_minutes for r in older) / len(older)
    diff = recent_avg - older_avg
    if diff > TREND_DELTA_MINUTES:
        return "rising"
    if diff < -TREND_DELTA_MINUTES:
        return "falling"
    return "stable"


def calculate_aggregate(
    iata: str,
    reports: list[RecentReport],
    historical_baseline_minutes: int | None,
    now: datetime | None = None,
) -> TsaWait:
    """Combine recent reports + historical baseline → TsaWait.

    Reports are assumed newest-first.
    """
    now = now or datetime.now(timezone.utc)

    wait: int | None
    last_updated: datetime | None
    if reports:
        # Weight by recency: newer reports count more.
        weights = [max(1.0, FRESH_CUTOFF_MINUTES - (now - r.reported_at).total_seconds() / 60)
                   for r in reports]
        total_w = sum(weights)
        wait = round(sum(r.wait_minutes * w for r, w in zip(reports, weights)) / total_w)
        last_updated = reports[0].reported_at
    elif historical_baseline_minutes is not None:
        wait = historical_baseline_minutes
        last_updated = None
    else:
        wait = None
        last_updated = None

    return TsaWait(
        airport_iata=iata.upper(),
        wait_minutes=wait,
        confidence=_confidence(reports, historical_baseline_minutes, now),
        trend=_trend(reports),
        last_updated=last_updated,
        report_count=len(reports),
        historical_baseline_minutes=historical_baseline_minutes,
    )
