from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..data.airports import AIRPORT_COORDS
from ..models.tsa import TsaReportRequest, TsaReportSubmitResponse, TsaWait
from ..services.errors import UpstreamError
from ..services.geo import haversine_miles
from ..services.tsa import (
    calculate_aggregate,
    fetch_historical,
    get_recent_reports,
    insert_report,
    user_reports_in_window,
)

router = APIRouter()

MAX_DISTANCE_MILES = 5.0
USER_REPORT_WINDOW_HOURS = 2
USER_REPORT_CAP = 1


@router.get("/{iata}", response_model=TsaWait)
def tsa_wait(iata: str) -> TsaWait:
    iata = iata.upper()
    now = datetime.now(timezone.utc)
    reports = get_recent_reports(iata, minutes=30)
    historical = fetch_historical(iata, hour=now.hour, day_of_week=now.weekday())
    return calculate_aggregate(iata, reports, historical, now=now)


@router.post("/{iata}/report", response_model=TsaReportSubmitResponse)
def submit_report(
    iata: str,
    report: TsaReportRequest,
    user: CurrentUser = Depends(get_current_user),
) -> TsaReportSubmitResponse:
    iata = iata.upper()

    # Proximity check.
    coords = AIRPORT_COORDS.get(iata)
    if coords is not None and report.latitude is not None and report.longitude is not None:
        distance = haversine_miles(coords[0], coords[1], report.latitude, report.longitude)
        if distance > MAX_DISTANCE_MILES:
            return TsaReportSubmitResponse(
                accepted=False,
                rejection_reason=f"location {distance:.1f} mi from {iata} (max {MAX_DISTANCE_MILES} mi)",
            )

    # Per-user rate limit. user_id now always comes from the JWT.
    recent_count = user_reports_in_window(user.id, hours=USER_REPORT_WINDOW_HOURS)
    if recent_count >= USER_REPORT_CAP:
        return TsaReportSubmitResponse(
            accepted=False,
            rejection_reason=f"already reported within last {USER_REPORT_WINDOW_HOURS}h",
        )

    try:
        report_id = insert_report(
            iata,
            wait_minutes=report.wait_minutes,
            has_precheck=report.has_precheck,
            terminal=report.terminal,
            checkpoint=report.checkpoint,
            user_id=user.id,
        )
    except UpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return TsaReportSubmitResponse(accepted=True, report_id=report_id)
