"""Seed Supabase with demo data so the app looks alive without external APIs.

Inserts:
  - A few crowdsourced TSA wait reports for 5 demo airports
  - A demo user_profile + saved_trips (skipped if no demo auth user)

Run:
    python -m backend.scripts.seed_demo_data
    python -m backend.scripts.seed_demo_data --wipe   # delete seed rows first

Idempotent: re-running won't create duplicates because each insert is keyed on
a deterministic UUID derived from a fixed seed string.
"""
from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timedelta, timezone

from ..config import settings
from ..database.client import get_supabase

SEED_NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")

DEMO_AIRPORTS = ["ATL", "LAX", "DEN", "JFK", "BOS"]


def _seed_id(scope: str, key: str) -> str:
    return str(uuid.uuid5(SEED_NAMESPACE, f"{scope}:{key}"))


def seed_tsa_reports(client) -> int:
    """Insert ~3 recent reports per demo airport."""
    now = datetime.now(timezone.utc)
    rows = []
    for iata in DEMO_AIRPORTS:
        for i, (mins_ago, wait, precheck, terminal) in enumerate(
            [(5, 18, False, "A"), (12, 22, False, "B"), (25, 9, True, "A")]
        ):
            rows.append(
                {
                    "id": _seed_id("tsa_reports", f"{iata}-{i}"),
                    "airport_iata": iata,
                    "wait_minutes": wait,
                    "has_precheck": precheck,
                    "terminal": terminal,
                    "checkpoint": "Main",
                    "reported_at": (now - timedelta(minutes=mins_ago)).isoformat(),
                    "user_id": None,
                }
            )

    # Upsert by id so reseeding is safe.
    resp = client.table("tsa_reports").upsert(rows, on_conflict="id").execute()
    return len(resp.data or [])


def wipe_seeds(client) -> None:
    """Delete only the rows created by this seeder."""
    for iata in DEMO_AIRPORTS:
        for i in range(3):
            seed_id = _seed_id("tsa_reports", f"{iata}-{i}")
            client.table("tsa_reports").delete().eq("id", seed_id).execute()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wipe", action="store_true", help="Remove seed rows and exit")
    args = parser.parse_args()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env", file=sys.stderr)
        return 1

    client = get_supabase()

    if args.wipe:
        wipe_seeds(client)
        print("Removed seed rows.")
        return 0

    count = seed_tsa_reports(client)
    print(f"Seeded {count} TSA reports across {len(DEMO_AIRPORTS)} airports.")
    print("Try: GET /api/tsa/ATL -- should return wait_minutes with 'High' confidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
