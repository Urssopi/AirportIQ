from fastapi import APIRouter, HTTPException

from ..models.flights import DepartureBoard, FlightDetail
from ..models.risk import RiskScore, RiskSignals
from ..services.aerodatabox import get_airport_board, get_flight_detail
from ..services.errors import UpstreamError
from ..services.faa import get_airport_delay
from ..services.risk_scorer import score_flight

router = APIRouter()


@router.get("/{iata}/board", response_model=DepartureBoard)
def departure_board(iata: str, hours_window: int = 12) -> DepartureBoard:
    try:
        return get_airport_board(iata, hours_window=hours_window)
    except UpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{flight_num}/{date}", response_model=FlightDetail)
def flight_detail(flight_num: str, date: str) -> FlightDetail:
    try:
        return get_flight_detail(flight_num, date)
    except UpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{flight_num}/{date}/risk", response_model=RiskScore)
def flight_risk(flight_num: str, date: str) -> RiskScore:
    try:
        detail = get_flight_detail(flight_num, date)
    except UpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    inbound_delay: int | None = None
    if detail.inbound and detail.inbound.scheduled_arrival and detail.inbound.estimated_arrival:
        delta = detail.inbound.estimated_arrival - detail.inbound.scheduled_arrival
        inbound_delay = max(0, int(delta.total_seconds() // 60))

    try:
        faa = get_airport_delay(detail.departure_iata)
    except UpstreamError:
        faa = None  # FAA outage shouldn't block the risk score

    delay_type = (faa.type or "").lower() if faa else ""
    signals = RiskSignals(
        inbound_delay_minutes=inbound_delay,
        faa_ground_stop="ground stop" in delay_type,
        faa_delay_program=bool(faa) and "ground stop" not in delay_type,
        crowd_level="Unknown",          # populated in later phase
        weather_advisory=False,         # populated in later phase
        previous_pushback_today=False,  # populated in later phase
    )
    return score_flight(signals)
