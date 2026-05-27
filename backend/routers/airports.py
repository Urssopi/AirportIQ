from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..models.airports import AirportStatus, FaaDelay
from ..services.errors import UpstreamError
from ..services.faa import get_airport_delay

router = APIRouter()


@router.get("")
def list_airports() -> list[dict]:
    return []


@router.get("/{iata}/status", response_model=AirportStatus)
def airport_status(iata: str) -> AirportStatus:
    try:
        delay: FaaDelay | None = get_airport_delay(iata)
    except UpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AirportStatus(
        iata=iata.upper(),
        fetched_at=datetime.now(timezone.utc),
        faa_delay=delay,
        crowd_level="Unknown",
    )
