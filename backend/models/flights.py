from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FlightStatus = Literal["on_time", "delayed", "canceled", "boarding", "scheduled", "unknown"]


class FlightSummary(BaseModel):
    """One row on a departure board."""

    flight_iata: str = Field(..., description="e.g. UA245")
    airline: str | None = None
    destination_iata: str
    destination_city: str | None = None
    scheduled_departure: datetime
    estimated_departure: datetime | None = None
    terminal: str | None = None
    gate: str | None = None
    status: FlightStatus = "scheduled"


class DepartureBoard(BaseModel):
    airport_iata: str
    fetched_at: datetime
    flights: list[FlightSummary]


class InboundAircraft(BaseModel):
    origin_iata: str | None = None
    scheduled_arrival: datetime | None = None
    estimated_arrival: datetime | None = None
    status: FlightStatus = "unknown"


class FlightDetail(BaseModel):
    flight_iata: str
    flight_date: str
    airline: str | None = None
    departure_iata: str
    arrival_iata: str
    scheduled_departure: datetime | None = None
    estimated_departure: datetime | None = None
    scheduled_arrival: datetime | None = None
    estimated_arrival: datetime | None = None
    terminal: str | None = None
    gate: str | None = None
    status: FlightStatus = "scheduled"
    inbound: InboundAircraft | None = None
    raw_status_label: str | None = None
