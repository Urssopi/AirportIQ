from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

CrowdLevel = Literal["Light", "Moderate", "Busy", "Very Busy", "Unknown"]


class FaaDelay(BaseModel):
    type: str | None = None        # e.g. "Ground Stop", "Ground Delay", "Closure"
    reason: str | None = None
    avg_delay_minutes: int | None = None
    end_time: datetime | None = None


class AirportStatus(BaseModel):
    iata: str
    name: str | None = None
    fetched_at: datetime
    faa_delay: FaaDelay | None = None
    crowd_level: CrowdLevel = "Unknown"
