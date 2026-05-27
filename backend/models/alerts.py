from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

AlertType = Literal[
    "delay",
    "delay_extended",
    "cancel",
    "gate_change",
    "boarding_soon",
    "leave_now",
    "tsa_spike",
    "airport_wide_delay",
]


class AlertDecision(BaseModel):
    """One alert the dispatcher wants to send for a given trip."""

    alert_type: AlertType
    summary: str                                # one-line "what changed"
    payload: dict[str, Any]                     # template inputs


class AlertSendResult(BaseModel):
    alert_type: AlertType
    sent: bool
    skipped_reason: str | None = None
    sent_at: datetime | None = None
    resend_message_id: str | None = None
