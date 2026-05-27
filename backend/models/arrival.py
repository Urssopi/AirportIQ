from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ArrivalBreakdown(BaseModel):
    departure_time: datetime
    boarding_buffer_minutes: int
    tsa_wait_minutes: int
    gate_walk_minutes: int
    transport_buffer_minutes: int
    safety_buffer_minutes: int
    total_lead_minutes: int


class ArrivalRequest(BaseModel):
    departure_time: datetime
    tsa_wait_minutes: int = Field(..., ge=0)
    has_tsa_precheck: bool = False
    is_international: bool = False
    gate_walk_minutes: int = Field(10, ge=0)
    transport_buffer_minutes: int = Field(0, ge=0, le=60)
    drive_minutes: int | None = Field(None, ge=0)


class ArrivalResponse(BaseModel):
    recommended_arrival: datetime
    leave_home_by: datetime | None = None
    breakdown: ArrivalBreakdown
    summary: str
