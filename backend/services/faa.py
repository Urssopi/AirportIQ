"""FAA airport status fetcher.

Source: https://nasstatus.faa.gov/api/airport-status-information
Returns delay programs, ground stops, closures for all US airports.

The endpoint historically returns XML; we accept whatever it sends and pull
out the delay block for the requested airport. Cached 120s.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from ..models.airports import FaaDelay
from .cache import get_cache
from .errors import UpstreamError

ENDPOINT = "https://nasstatus.faa.gov/api/airport-status-information"
TTL = 120
TIMEOUT = 6.0
CACHE_KEY = "faa:nasstatus:raw"


def _fetch_raw() -> str:
    cache = get_cache()
    cached = cache.get_json(CACHE_KEY)
    if isinstance(cached, str):
        return cached

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(ENDPOINT, headers={"Accept": "application/xml, text/xml, */*"})
    except httpx.HTTPError as exc:
        raise UpstreamError("faa", f"network error: {exc}") from exc

    if resp.status_code >= 500:
        raise UpstreamError("faa", f"upstream {resp.status_code}")
    if resp.status_code >= 400:
        raise UpstreamError("faa", f"client error {resp.status_code}")

    body = resp.text
    cache.set_json(CACHE_KEY, body, ttl_seconds=TTL)
    return body


def _parse_minutes(text: str | None) -> int | None:
    if not text:
        return None
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def _airport_block(root: ET.Element, iata: str) -> ET.Element | None:
    iata = iata.upper()
    for elem in root.iter():
        tag = elem.tag.split("}", 1)[-1].lower()
        if tag in {"airport", "arpt"}:
            text = (elem.text or "").strip().upper()
            if text == iata:
                return elem
            if elem.attrib.get("IATA", "").upper() == iata:
                return elem
    return None


def _scan_delays(root: ET.Element) -> dict[str, ET.Element]:
    """Map airport IATA → delay element (if any).

    The FAA feed groups delays by type (Ground_Stop, Ground_Delay, Closure, etc.).
    We walk every delay container and collect the airport codes inside it.
    """
    out: dict[str, ET.Element] = {}
    for delay in root.iter():
        tag = delay.tag.split("}", 1)[-1]
        if tag.lower() not in {"ground_stop", "ground_delay", "closure", "delay"}:
            continue
        for elem in delay.iter():
            sub_tag = elem.tag.split("}", 1)[-1].lower()
            if sub_tag in {"airport", "arpt"}:
                code = ((elem.text or "").strip() or elem.attrib.get("IATA", "")).upper()
                if code:
                    out.setdefault(code, delay)
    return out


def get_airport_delay(iata: str) -> FaaDelay | None:
    """Return delay info for one airport, or None if no active delay."""
    body = _fetch_raw()
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        raise UpstreamError("faa", f"unparsable response: {exc}") from exc

    delay_map = _scan_delays(root)
    elem = delay_map.get(iata.upper())
    if elem is None:
        return None

    delay_type = elem.tag.split("}", 1)[-1].replace("_", " ").title()
    reason: str | None = None
    avg: int | None = None
    end_time: datetime | None = None

    for child in elem.iter():
        ct = child.tag.split("}", 1)[-1].lower()
        text = (child.text or "").strip()
        if ct == "reason" and text:
            reason = text
        elif ct in {"avg", "avg_delay", "avgdelay"}:
            avg = _parse_minutes(text)
        elif ct in {"endtime", "end_time"} and text:
            try:
                end_time = datetime.fromisoformat(text.replace("Z", "+00:00"))
            except ValueError:
                end_time = None

    return FaaDelay(type=delay_type, reason=reason, avg_delay_minutes=avg, end_time=end_time)


def get_airport_status_raw(iata: str) -> dict[str, Any]:
    """Convenience helper returning a small dict for the router."""
    delay = get_airport_delay(iata)
    return {
        "iata": iata.upper(),
        "fetched_at": datetime.now(timezone.utc),
        "faa_delay": delay.model_dump(mode="json") if delay else None,
    }
