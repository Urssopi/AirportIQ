from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class Trip(BaseModel):
    id: str
    user_id: str
    flight_iata: str
    flight_date: date
    departure_airport: str
    arrival_airport: str
    alert_preferences: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class TripCreate(BaseModel):
    flight_iata: str = Field(..., min_length=2, max_length=10)
    flight_date: date
    departure_airport: str = Field(..., min_length=3, max_length=4)
    arrival_airport: str = Field(..., min_length=3, max_length=4)
    alert_preferences: dict[str, Any] = Field(default_factory=dict)
