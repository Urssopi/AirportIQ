from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskLabel = Literal["Low", "Medium", "High"]


class RiskSignals(BaseModel):
    """Inputs to the risk scorer. Anything we don't yet collect defaults to a
    neutral value so the scorer can run with partial data."""

    inbound_delay_minutes: int | None = None
    faa_ground_stop: bool = False
    faa_delay_program: bool = False
    crowd_level: str = "Unknown"  # "Light" | "Moderate" | "Busy" | "Very Busy"
    weather_advisory: bool = False
    previous_pushback_today: bool = False


class RiskScore(BaseModel):
    score: int = Field(..., ge=0)
    label: RiskLabel
    reason: str
