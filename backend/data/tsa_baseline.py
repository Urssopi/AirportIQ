"""TSA wait-time baseline estimator.

Real-time public TSA APIs don't exist as free data. Instead we model expected
waits from three signals that match observed behavior at US airports:

  1. Per-airport base congestion factor — derived from TSA's published
     passenger-throughput rankings (FY2023). Hub airports (ATL, LAX, ORD) sit
     well above the average; smaller fields like OAK or DAL sit below.
  2. Hour-of-day curve — peaks at the 5–8am rush and 4–7pm rush, with deep
     overnight troughs. Calibrated from MyTSA's public historical reports.
  3. Day-of-week modifier — Mondays and Fridays trend ~10% higher than
     midweek; Saturdays are notably lighter at major hubs.

The output is a single integer in minutes. The caller decides confidence —
when a real crowdsourced report exists, it should override this estimate.
"""
from __future__ import annotations

# Average baseline wait at an "average" airport during an average hour.
AVERAGE_WAIT_MIN = 14

# Per-airport multiplier. Derived from TSA passenger-throughput rankings.
# Default 0.85 for airports not in the table (assumes smaller field).
AIRPORT_BASE: dict[str, float] = {
    "ATL": 1.55,
    "LAX": 1.45,
    "ORD": 1.40,
    "DFW": 1.35,
    "DEN": 1.30,
    "JFK": 1.40,
    "SFO": 1.30,
    "SEA": 1.25,
    "LAS": 1.25,
    "MCO": 1.30,
    "EWR": 1.35,
    "PHX": 1.20,
    "IAH": 1.25,
    "MIA": 1.30,
    "BOS": 1.20,
    "MSP": 1.15,
    "DTW": 1.15,
    "PHL": 1.15,
    "LGA": 1.30,
    "FLL": 1.15,
    "BWI": 1.10,
    "DCA": 1.20,
    "IAD": 1.15,
    "MDW": 1.10,
    "SLC": 1.05,
    "PDX": 1.00,
    "SAN": 1.05,
    "DAL": 0.95,
    "HOU": 1.00,
    "OAK": 0.90,
}

# Hour-of-day multiplier (0=midnight..23=11pm), local time.
HOUR_CURVE: dict[int, float] = {
    0: 0.20, 1: 0.10, 2: 0.10, 3: 0.20, 4: 0.45, 5: 0.85,
    6: 1.35, 7: 1.55, 8: 1.40, 9: 1.15, 10: 0.95, 11: 0.95,
    12: 1.00, 13: 1.00, 14: 1.00, 15: 1.10, 16: 1.30, 17: 1.50,
    18: 1.30, 19: 1.00, 20: 0.75, 21: 0.55, 22: 0.40, 23: 0.30,
}

# Day-of-week multiplier (Monday=0..Sunday=6, matching datetime.weekday()).
DOW_FACTOR: list[float] = [1.10, 1.00, 1.00, 1.00, 1.15, 0.92, 1.00]


def estimate_wait_minutes(iata: str, hour: int, day_of_week: int) -> int:
    """Return an integer-minute estimate. Floor at 3 minutes (queue + bag scan)."""
    base = AIRPORT_BASE.get(iata.upper(), 0.85)
    hour_mult = HOUR_CURVE.get(int(hour) % 24, 1.0)
    dow_mult = DOW_FACTOR[int(day_of_week) % 7]
    return max(3, round(AVERAGE_WAIT_MIN * base * hour_mult * dow_mult))
