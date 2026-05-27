from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Confidence = Literal["High", "Medium", "Low"]
Trend = Literal["rising", "stable", "falling", "unknown"]


class TsaWait(BaseModel):
    airport_iata: str
    wait_minutes: int | None
    confidence: Confidence
    trend: Trend
    last_updated: datetime | None
    report_count: int = 0
    historical_baseline_minutes: int | None = None


class TsaReportRequest(BaseModel):
    wait_minutes: int = Field(..., ge=0, le=240)
    has_precheck: bool = False
    terminal: str | None = None
    checkpoint: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class TsaReportSubmitResponse(BaseModel):
    accepted: bool
    rejection_reason: str | None = None
    report_id: str | None = None


class RecentReport(BaseModel):
    """Lightweight in-process model for aggregate math — not a DB row."""

    wait_minutes: int
    has_precheck: bool
    reported_at: datetime
