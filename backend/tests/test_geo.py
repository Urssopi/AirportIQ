from backend.data.airports import AIRPORT_COORDS
from backend.services.geo import haversine_miles


def test_zero_distance_to_self():
    lat, lon = AIRPORT_COORDS["DEN"]
    assert haversine_miles(lat, lon, lat, lon) == 0.0


def test_distance_between_jfk_and_lga_under_15_miles():
    jfk = AIRPORT_COORDS["JFK"]
    lga = AIRPORT_COORDS["LGA"]
    d = haversine_miles(jfk[0], jfk[1], lga[0], lga[1])
    # JFK ↔ LGA is ~10 mi.
    assert 8 < d < 15


def test_a_mile_from_DEN_is_within_5_miles():
    lat, lon = AIRPORT_COORDS["DEN"]
    # Nudge by ~0.01° latitude (~0.7 mi).
    d = haversine_miles(lat, lon, lat + 0.01, lon)
    assert d < 5


def test_50_miles_away_rejected():
    lat, lon = AIRPORT_COORDS["DEN"]
    # ~1° latitude ≈ 69 mi.
    d = haversine_miles(lat, lon, lat + 1.0, lon)
    assert d > 50
