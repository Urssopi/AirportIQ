"""Apply backend/database/schema.sql to the Supabase project in .env.

Uses Postgres via the SUPABASE_DB_URL env var if provided, otherwise prints
the SQL for manual execution in the Supabase SQL editor.

Usage:
    python -m backend.scripts.apply_schema
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

SCHEMA = Path(__file__).resolve().parent.parent / "database" / "schema.sql"


def main() -> int:
    sql = SCHEMA.read_text(encoding="utf-8")
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print(
            "SUPABASE_DB_URL is not set. Either:\n"
            "  1. Paste the SQL below into the Supabase SQL editor, or\n"
            "  2. Set SUPABASE_DB_URL=postgresql://... and re-run.\n",
            file=sys.stderr,
        )
        print(sql)
        return 1

    try:
        import psycopg
    except ImportError:
        print("psycopg is not installed. `pip install psycopg[binary]`", file=sys.stderr)
        return 2

    with psycopg.connect(db_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    print("Schema applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
