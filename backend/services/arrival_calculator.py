"""Arrival calculator — PRD Feature 5.

recommended_arrival = departure_time
  - boarding_buffer  (35 min domestic / 50 min intl)
  - tsa_wait_minutes (capped at 10 min if user has PreCheck)
  - gate_walk_minutes
  - transport_buffer (user-selected: 0/5/10/15/20)
  - safety_buffer    (15 min domestic / 20 min intl)

leave_home_by = recommended_arrival - drive_minutes  (if provided)

The PreCheck cap is a defensible default — PreCheck lanes rarely exceed
~10 min even when the standard line is bad. Caller can opt out by passing
`has_tsa_precheck=False` and the appropriate wait directly.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from ..models.arrival import ArrivalBreakdown, ArrivalRequest, ArrivalResponse

PRECHECK_WAIT_CAP_MINUTES = 10
BOARDING_BUFFER_DOMESTIC = 35
BOARDING_BUFFER_INTERNATIONAL = 50
SAFETY_BUFFER_DOMESTIC = 15
SAFETY_BUFFER_INTERNATIONAL = 20


def _format_hhmm(dt: datetime) -> str:
    return dt.strftime("%-I:%M %p") if hasattr(dt, "strftime") else dt.isoformat()


def _format_hhmm_safe(dt: datetime) -> str:
    # Windows %-I → %#I; build a portable formatter.
    hour = dt.hour % 12 or 12
    return f"{hour}:{dt.minute:02d} {'PM' if dt.hour >= 12 else 'AM'}"


def compute_arrival_plan(req: ArrivalRequest) -> ArrivalResponse:
    boarding_buffer = (
        BOARDING_BUFFER_INTERNATIONAL if req.is_international else BOARDING_BUFFER_DOMESTIC
    )
    safety_buffer = (
        SAFETY_BUFFER_INTERNATIONAL if req.is_international else SAFETY_BUFFER_DOMESTIC
    )

    effective_tsa = (
        min(req.tsa_wait_minutes, PRECHECK_WAIT_CAP_MINUTES)
        if req.has_tsa_precheck
        else req.tsa_wait_minutes
    )

    total_lead = (
        boarding_buffer
        + effective_tsa
        + req.gate_walk_minutes
        + req.transport_buffer_minutes
        + safety_buffer
    )
    recommended = req.departure_time - timedelta(minutes=total_lead)

    leave_home_by = (
        recommended - timedelta(minutes=req.drive_minutes)
        if req.drive_minutes is not None
        else None
    )

    breakdown = ArrivalBreakdown(
        departure_time=req.departure_time,
        boarding_buffer_minutes=boarding_buffer,
        tsa_wait_minutes=effective_tsa,
        gate_walk_minutes=req.gate_walk_minutes,
        transport_buffer_minutes=req.transport_buffer_minutes,
        safety_buffer_minutes=safety_buffer,
        total_lead_minutes=total_lead,
    )

    summary = f"Arrive by {_format_hhmm_safe(recommended)}."
    if leave_home_by is not None:
        summary += f" Leave home by {_format_hhmm_safe(leave_home_by)} if you're {req.drive_minutes} min away."

    return ArrivalResponse(
        recommended_arrival=recommended,
        leave_home_by=leave_home_by,
        breakdown=breakdown,
        summary=summary,
    )
