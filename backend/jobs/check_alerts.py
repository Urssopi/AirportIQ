"""Periodic background job that drives alert dispatch in single-process dev.

In production the PRD calls for an external cron hitting POST
/api/jobs/check-alerts; this in-process loop is a convenience for local dev.

Interval defaults to 300s to avoid burning AeroDataBox quota on every tick;
override with ALERT_CHECK_INTERVAL_SECONDS.
"""
from __future__ import annotations

import asyncio
import logging
import os

from ..services.alert_dispatcher import check_all_active_trips

logger = logging.getLogger(__name__)
DEFAULT_INTERVAL = int(os.environ.get("ALERT_CHECK_INTERVAL_SECONDS", "300"))


async def run_periodic(interval: int = DEFAULT_INTERVAL) -> None:
    logger.info("alert check loop started (interval=%ss)", interval)
    while True:
        try:
            result = await asyncio.to_thread(check_all_active_trips)
            if result["checked"]:
                logger.info("alert tick: checked %d trips", result["checked"])
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("alert tick failed")
        await asyncio.sleep(interval)
