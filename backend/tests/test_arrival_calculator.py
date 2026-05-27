from datetime import datetime, timedelta, timezone

import pytest

from backend.models.arrival import ArrivalRequest
from backend.services.arrival_calculator import (
    BOARDING_BUFFER_DOMESTIC,
    BOARDING_BUFFER_INTERNATIONAL,
    PRECHECK_WAIT_CAP_MINUTES,
    SAFETY_BUFFER_DOMESTIC,
    SAFETY_BUFFER_INTERNATIONAL,
    compute_arrival_plan,
)

DEPARTURE = datetime(2026, 5, 12, 18, 0, tzinfo=timezone.utc)  # 18:00 UTC


def _req(**overrides) -> ArrivalRequest:
    defaults = dict(
        departure_time=DEPARTURE,
        tsa_wait_minutes=20,
        has_tsa_precheck=False,
        is_international=False,
        gate_walk_minutes=10,
        transport_buffer_minutes=0,
        drive_minutes=None,
    )
    defaults.update(overrides)
    return ArrivalRequest(**defaults)


def test_domestic_no_precheck():
    # 35 + 20 + 10 + 0 + 15 = 80 min lead
    result = compute_arrival_plan(_req())
    assert result.breakdown.total_lead_minutes == 80
    assert result.recommended_arrival == DEPARTURE - timedelta(minutes=80)
    assert result.breakdown.boarding_buffer_minutes == BOARDING_BUFFER_DOMESTIC
    assert result.breakdown.safety_buffer_minutes == SAFETY_BUFFER_DOMESTIC


def test_international_buffers():
    # 50 + 20 + 10 + 0 + 20 = 100 min lead
    result = compute_arrival_plan(_req(is_international=True))
    assert result.breakdown.boarding_buffer_minutes == BOARDING_BUFFER_INTERNATIONAL
    assert result.breakdown.safety_buffer_minutes == SAFETY_BUFFER_INTERNATIONAL
    assert result.breakdown.total_lead_minutes == 100


def test_precheck_caps_tsa_wait():
    # tsa_wait=25, precheck=True → effective 10
    result = compute_arrival_plan(_req(tsa_wait_minutes=25, has_tsa_precheck=True))
    assert result.breakdown.tsa_wait_minutes == PRECHECK_WAIT_CAP_MINUTES
    # 35 + 10 + 10 + 0 + 15 = 70
    assert result.breakdown.total_lead_minutes == 70


def test_precheck_does_not_inflate_short_wait():
    # If standard wait is already 5 min, precheck shouldn't raise it.
    result = compute_arrival_plan(_req(tsa_wait_minutes=5, has_tsa_precheck=True))
    assert result.breakdown.tsa_wait_minutes == 5


def test_precheck_vs_no_precheck_diverges():
    standard = compute_arrival_plan(_req(tsa_wait_minutes=30, has_tsa_precheck=False))
    precheck = compute_arrival_plan(_req(tsa_wait_minutes=30, has_tsa_precheck=True))
    diff = (precheck.recommended_arrival - standard.recommended_arrival).total_seconds() / 60
    assert diff == 20  # precheck buys back 30 - 10 = 20 min


def test_leave_home_by_when_drive_provided():
    result = compute_arrival_plan(_req(drive_minutes=36))
    assert result.leave_home_by == result.recommended_arrival - timedelta(minutes=36)
    assert "Leave home by" in result.summary
    assert "36 min" in result.summary


def test_leave_home_by_omitted_when_no_drive():
    result = compute_arrival_plan(_req())
    assert result.leave_home_by is None
    assert "Leave home by" not in result.summary


def test_delayed_flight_shifts_recommended_arrival():
    """If the caller passes the *estimated* (delayed) departure, the
    recommendation slides accordingly — the formula is just relative subtraction."""
    on_time = compute_arrival_plan(_req(departure_time=DEPARTURE))
    delayed_departure = DEPARTURE + timedelta(minutes=45)
    delayed = compute_arrival_plan(_req(departure_time=delayed_departure))
    diff = (delayed.recommended_arrival - on_time.recommended_arrival).total_seconds() / 60
    assert diff == 45


def test_transport_buffer_applied():
    base = compute_arrival_plan(_req(transport_buffer_minutes=0))
    padded = compute_arrival_plan(_req(transport_buffer_minutes=15))
    assert padded.breakdown.total_lead_minutes - base.breakdown.total_lead_minutes == 15


def test_negative_tsa_wait_rejected():
    with pytest.raises(Exception):
        ArrivalRequest(
            departure_time=DEPARTURE,
            tsa_wait_minutes=-5,
        )
