from datetime import datetime, timedelta, timezone

from backend.models.tsa import RecentReport
from backend.services.tsa import calculate_aggregate

NOW = datetime(2026, 5, 12, 15, 30, tzinfo=timezone.utc)


def _r(minutes_ago: int, wait: int, precheck: bool = False) -> RecentReport:
    return RecentReport(
        wait_minutes=wait,
        has_precheck=precheck,
        reported_at=NOW - timedelta(minutes=minutes_ago),
    )


def test_no_data_is_low_confidence_and_null_wait():
    result = calculate_aggregate("DEN", reports=[], historical_baseline_minutes=None, now=NOW)
    assert result.wait_minutes is None
    assert result.confidence == "Low"
    assert result.trend == "unknown"
    assert result.report_count == 0


def test_only_historical_is_medium():
    result = calculate_aggregate("DEN", reports=[], historical_baseline_minutes=18, now=NOW)
    assert result.wait_minutes == 18
    assert result.confidence == "Medium"
    assert result.last_updated is None


def test_fresh_report_is_high_confidence():
    result = calculate_aggregate(
        "DEN", reports=[_r(2, 22)], historical_baseline_minutes=None, now=NOW
    )
    assert result.confidence == "High"
    assert result.wait_minutes == 22
    assert result.report_count == 1


def test_15_to_45_min_old_report_is_medium():
    result = calculate_aggregate(
        "DEN", reports=[_r(30, 25)], historical_baseline_minutes=None, now=NOW
    )
    assert result.confidence == "Medium"


def test_stale_report_with_historical_drops_to_low():
    # PRD: "Low: no recent report, only historical." A 50-min-old report is not "recent",
    # so we fall back to historical-only → Low.
    result = calculate_aggregate(
        "DEN", reports=[_r(50, 25)], historical_baseline_minutes=18, now=NOW
    )
    # Reports list still has the stale one, but confidence reflects no fresh signal.
    assert result.confidence == "Low"


def test_rising_trend():
    reports = [
        _r(2, 30),
        _r(5, 28),
        _r(20, 18),
        _r(25, 16),
    ]
    result = calculate_aggregate("DEN", reports, None, now=NOW)
    assert result.trend == "rising"


def test_falling_trend():
    reports = [
        _r(2, 12),
        _r(5, 14),
        _r(20, 28),
        _r(25, 30),
    ]
    result = calculate_aggregate("DEN", reports, None, now=NOW)
    assert result.trend == "falling"


def test_stable_trend():
    reports = [_r(2, 20), _r(5, 21), _r(20, 22), _r(25, 19)]
    result = calculate_aggregate("DEN", reports, None, now=NOW)
    assert result.trend == "stable"


def test_weighted_average_favors_recent():
    # Two reports: one very fresh saying 30, one older saying 10. Weighted avg
    # should be closer to 30 than the unweighted mean (20).
    reports = [_r(1, 30), _r(13, 10)]
    result = calculate_aggregate("DEN", reports, None, now=NOW)
    assert result.wait_minutes is not None
    assert result.wait_minutes > 20


def test_report_count_reflects_input_length():
    reports = [_r(2, 18), _r(5, 20), _r(10, 22)]
    result = calculate_aggregate("DEN", reports, None, now=NOW)
    assert result.report_count == 3
