from backend.models.risk import RiskSignals
from backend.services.risk_scorer import score_flight


def test_no_signals_is_low():
    result = score_flight(RiskSignals())
    assert result.score == 0
    assert result.label == "Low"
    assert "no known issues" in result.reason.lower()


def test_short_inbound_delay_is_medium():
    # 10–30 min → +2 → Medium
    result = score_flight(RiskSignals(inbound_delay_minutes=22))
    assert result.score == 2
    assert result.label == "Medium"
    assert "22" in result.reason


def test_long_inbound_delay_is_medium_alone():
    # > 30 min → +3 → Medium (boundary, since High starts at 5)
    result = score_flight(RiskSignals(inbound_delay_minutes=45))
    assert result.score == 3
    assert result.label == "Medium"


def test_ground_stop_plus_inbound_is_high():
    result = score_flight(
        RiskSignals(inbound_delay_minutes=45, faa_ground_stop=True)
    )
    assert result.score == 6
    assert result.label == "High"
    # Ground stop and long inbound delay both worth 3; either as headline is fine.
    assert "High Risk" in result.reason


def test_delay_program_plus_weather_is_high_boundary():
    result = score_flight(
        RiskSignals(faa_delay_program=True, weather_advisory=True, crowd_level="Very Busy")
    )
    # 2 + 2 + 1 = 5 → High
    assert result.score == 5
    assert result.label == "High"


def test_inbound_under_10_does_not_count():
    result = score_flight(RiskSignals(inbound_delay_minutes=8))
    assert result.score == 0
    assert result.label == "Low"


def test_reason_picks_highest_priority_signal():
    # Both ground stop (+3) and short inbound delay (+2) fire; ground stop wins headline.
    result = score_flight(
        RiskSignals(inbound_delay_minutes=15, faa_ground_stop=True)
    )
    assert "ground stop" in result.reason.lower()


def test_score_is_monotonic_in_signals():
    base = score_flight(RiskSignals(crowd_level="Very Busy"))
    more = score_flight(
        RiskSignals(crowd_level="Very Busy", weather_advisory=True)
    )
    assert more.score > base.score
