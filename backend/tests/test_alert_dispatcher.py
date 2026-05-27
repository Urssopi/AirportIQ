from datetime import datetime, timedelta, timezone

from backend.models.flights import FlightDetail
from backend.services.alert_dispatcher import (
    BOARDING_SOON_WINDOW_MIN,
    DELAY_EXTENDED_THRESHOLD_MIN,
    decide_alerts,
)

NOW = datetime(2026, 5, 12, 18, 0, tzinfo=timezone.utc)


def _flight(
    *,
    status: str = "scheduled",
    scheduled_etd: datetime | None = None,
    estimated_etd: datetime | None = None,
    gate: str | None = "B12",
) -> FlightDetail:
    scheduled_etd = scheduled_etd or NOW + timedelta(hours=2)
    return FlightDetail(
        flight_iata="UA245",
        flight_date="2026-05-12",
        airline="United",
        departure_iata="DEN",
        arrival_iata="BOS",
        scheduled_departure=scheduled_etd,
        estimated_departure=estimated_etd,
        terminal="B",
        gate=gate,
        status=status,
    )


def test_first_observation_on_time_emits_nothing():
    curr = _flight()
    assert decide_alerts(None, curr, now=NOW) == []


def test_status_change_to_delayed_emits_delay():
    prev = _flight(status="scheduled")
    curr = _flight(status="delayed", estimated_etd=NOW + timedelta(hours=2, minutes=20))
    decisions = decide_alerts(prev, curr, now=NOW)
    assert [d.alert_type for d in decisions] == ["delay"]
    assert decisions[0].payload["delay_minutes"] == 20


def test_delay_extended_fires_only_past_threshold():
    base_scheduled = NOW + timedelta(hours=2)
    prev = _flight(status="delayed", scheduled_etd=base_scheduled, estimated_etd=base_scheduled + timedelta(minutes=20))
    curr = _flight(status="delayed", scheduled_etd=base_scheduled, estimated_etd=base_scheduled + timedelta(minutes=20 + DELAY_EXTENDED_THRESHOLD_MIN))
    decisions = decide_alerts(prev, curr, now=NOW)
    assert [d.alert_type for d in decisions] == ["delay_extended"]


def test_delay_growth_below_threshold_emits_nothing():
    base_scheduled = NOW + timedelta(hours=2)
    prev = _flight(status="delayed", scheduled_etd=base_scheduled, estimated_etd=base_scheduled + timedelta(minutes=20))
    curr = _flight(status="delayed", scheduled_etd=base_scheduled, estimated_etd=base_scheduled + timedelta(minutes=29))
    assert decide_alerts(prev, curr, now=NOW) == []


def test_cancellation_emits_cancel_and_suppresses_others():
    prev = _flight(status="delayed", estimated_etd=NOW + timedelta(hours=2, minutes=20), gate="B12")
    curr = _flight(status="canceled", gate="B99")  # gate change too — should be suppressed
    decisions = decide_alerts(prev, curr, now=NOW)
    assert [d.alert_type for d in decisions] == ["cancel"]


def test_repeat_cancellation_emits_nothing():
    prev = _flight(status="canceled")
    curr = _flight(status="canceled")
    assert decide_alerts(prev, curr, now=NOW) == []


def test_gate_change_emits_alert():
    prev = _flight(gate="B12")
    curr = _flight(gate="B14")
    decisions = decide_alerts(prev, curr, now=NOW)
    types = {d.alert_type for d in decisions}
    assert "gate_change" in types
    gc = next(d for d in decisions if d.alert_type == "gate_change")
    assert gc.payload["old_gate"] == "B12"
    assert gc.payload["new_gate"] == "B14"


def test_gate_change_skipped_when_old_was_unknown():
    prev = _flight(gate=None)
    curr = _flight(gate="B14")
    assert all(d.alert_type != "gate_change" for d in decide_alerts(prev, curr, now=NOW))


def test_boarding_soon_fires_inside_window():
    etd = NOW + timedelta(minutes=BOARDING_SOON_WINDOW_MIN - 5)
    curr = _flight(scheduled_etd=etd)
    # prev was outside the window
    prev = _flight(scheduled_etd=etd, estimated_etd=None)
    # Trick: shift prev's "now" perspective by setting an ETD far in the future
    prev_far = _flight(scheduled_etd=NOW + timedelta(hours=3))
    decisions = decide_alerts(prev_far, curr, now=NOW)
    assert any(d.alert_type == "boarding_soon" for d in decisions)


def test_boarding_soon_does_not_re_fire_if_prev_was_already_in_window():
    etd = NOW + timedelta(minutes=20)
    prev = _flight(scheduled_etd=etd)
    curr = _flight(scheduled_etd=etd)
    decisions = decide_alerts(prev, curr, now=NOW)
    assert all(d.alert_type != "boarding_soon" for d in decisions)


def test_boarding_soon_skipped_if_canceled():
    etd = NOW + timedelta(minutes=20)
    curr = _flight(status="canceled", scheduled_etd=etd)
    decisions = decide_alerts(None, curr, now=NOW)
    assert all(d.alert_type != "boarding_soon" for d in decisions)
