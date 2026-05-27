"""Flight risk scorer — PRD Feature 6.

Pure function: takes RiskSignals → returns RiskScore. No IO.
"""
from __future__ import annotations

from ..models.risk import RiskLabel, RiskScore, RiskSignals

# Signal → (points, reason template). Order = display priority when multiple fire.
SIGNALS_IN_PRIORITY: list[tuple[str, int]] = [
    ("inbound_delayed_long", 3),       # > 30 min
    ("faa_ground_stop", 3),
    ("inbound_delayed_short", 2),      # 10–30 min
    ("faa_delay_program", 2),
    ("weather_advisory", 2),
    ("crowd_very_busy", 1),
    ("previous_pushback", 1),
]


def _label(score: int) -> RiskLabel:
    if score >= 5:
        return "High"
    if score >= 2:
        return "Medium"
    return "Low"


def _reason_for(signal: str, signals: RiskSignals) -> str:
    if signal == "inbound_delayed_long":
        return f"Inbound aircraft is delayed {signals.inbound_delay_minutes} minutes."
    if signal == "inbound_delayed_short":
        return f"Inbound aircraft is delayed {signals.inbound_delay_minutes} minutes."
    if signal == "faa_ground_stop":
        return "FAA ground stop is active at this airport."
    if signal == "faa_delay_program":
        return "FAA delay program is active at this airport."
    if signal == "weather_advisory":
        return "Weather advisory at departure airport."
    if signal == "crowd_very_busy":
        return "Airport is very busy right now."
    if signal == "previous_pushback":
        return "This flight has already been pushed back today."
    return ""


def score_flight(signals: RiskSignals) -> RiskScore:
    active: list[str] = []

    delay = signals.inbound_delay_minutes or 0
    if delay > 30:
        active.append("inbound_delayed_long")
    elif delay >= 10:
        active.append("inbound_delayed_short")

    if signals.faa_ground_stop:
        active.append("faa_ground_stop")
    if signals.faa_delay_program:
        active.append("faa_delay_program")
    if signals.weather_advisory:
        active.append("weather_advisory")
    if signals.crowd_level == "Very Busy":
        active.append("crowd_very_busy")
    if signals.previous_pushback_today:
        active.append("previous_pushback")

    points_by_signal = dict(SIGNALS_IN_PRIORITY)
    score = sum(points_by_signal[s] for s in active)
    label = _label(score)

    if not active:
        return RiskScore(score=0, label="Low", reason=f"{label} Risk — no known issues.")

    # Highest-weight active signal, ties broken by SIGNALS_IN_PRIORITY order.
    top = sorted(active, key=lambda s: (-points_by_signal[s], [n for n, _ in SIGNALS_IN_PRIORITY].index(s)))[0]
    reason = f"{label} Risk — {_reason_for(top, signals)}"
    return RiskScore(score=score, label=label, reason=reason)
