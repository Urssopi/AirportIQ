"""Background-job endpoints driven by an external scheduler (Railway cron, etc.).

These are unauthenticated for simplicity. Lock down with a shared-secret header
or restrict to an internal network before production deploy.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..services.alert_dispatcher import check_all_active_trips

router = APIRouter()


@router.post("/check-alerts")
def check_alerts() -> dict:
    return check_all_active_trips()
