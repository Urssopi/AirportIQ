"""Resend-based email service for AirportIQ alerts.

All templates are minimal inline-styled HTML so they render in any client.
The "changed field" highlight uses amber (#f5a623), matching the design system.

Notes on Resend's free tier:
  - Without a verified domain, you can only send to the email registered to
    your Resend account. The send call still goes through; Resend returns
    a clear error otherwise.
  - Default sender is `AirportIQ <onboarding@resend.dev>` (Resend's sandbox).
    Change EMAIL_SENDER once you've verified a domain.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import resend

from ..config import settings

EMAIL_SENDER = "AirportIQ <onboarding@resend.dev>"
WEB_BASE_URL_DEFAULT = "http://localhost:3000"


def _fmt_time(value: datetime | str | None) -> str:
    if value is None:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    hour = value.hour % 12 or 12
    return f"{hour}:{value.minute:02d} {'PM' if value.hour >= 12 else 'AM'}"


def _flight_url(flight_iata: str, flight_date: str) -> str:
    base = WEB_BASE_URL_DEFAULT
    return f"{base}/flight/{flight_iata}-{flight_date}"


def _wrap(
    *,
    subject_title: str,
    accent_line: str,
    detail_rows: list[tuple[str, str, bool]],   # (label, value, highlight?)
    flight_iata: str,
    flight_date: str,
    route: str,
    recommended_arrival: str | None = None,
) -> str:
    rows_html = "".join(
        f'''<tr>
              <td style="padding:4px 0;color:#8888aa;font-size:13px;width:140px;">{label}</td>
              <td style="padding:4px 0;color:{('#f5a623' if highlight else '#f0f0f5')};font-weight:{('600' if highlight else '400')};">{value}</td>
            </tr>'''
        for label, value, highlight in detail_rows
    )
    arrival_block = (
        f'''<p style="margin:16px 0 0 0;padding:12px;background:#13131a;border-left:3px solid #f5a623;font-size:14px;">
              <span style="color:#8888aa;">Recommended arrival: </span>
              <strong style="color:#f0f0f5;">{recommended_arrival}</strong>
            </p>'''
        if recommended_arrival
        else ""
    )
    link = _flight_url(flight_iata, flight_date)
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Sans',Arial,sans-serif;color:#f0f0f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#13131a;border:1px solid #1e1e2e;border-radius:8px;padding:24px;">
        <tr><td>
          <p style="margin:0;color:#f5a623;font-size:12px;letter-spacing:2px;text-transform:uppercase;">AirportIQ</p>
          <h1 style="margin:8px 0 0 0;font-size:22px;color:#f0f0f5;">{subject_title}</h1>
          <p style="margin:4px 0 16px 0;color:#8888aa;font-size:14px;">{accent_line}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e1e2e;padding-top:12px;">
            <tr><td style="padding:4px 0;color:#8888aa;font-size:13px;width:140px;">Flight</td>
                <td style="padding:4px 0;color:#f0f0f5;font-family:'JetBrains Mono',monospace;">{flight_iata} · {flight_date}</td></tr>
            <tr><td style="padding:4px 0;color:#8888aa;font-size:13px;">Route</td>
                <td style="padding:4px 0;color:#f0f0f5;">{route}</td></tr>
            {rows_html}
          </table>

          {arrival_block}

          <p style="margin:24px 0 0 0;">
            <a href="{link}" style="display:inline-block;background:#f5a623;color:#0a0a0f;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:6px;">View full details</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;color:#444459;font-size:11px;">You're receiving this because you're tracking this flight in AirportIQ.</p>
    </td></tr>
  </table>
</body></html>"""


def _send(to: str, subject: str, html: str) -> str | None:
    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is not set")
    resend.api_key = settings.resend_api_key
    resp = resend.Emails.send(
        {"from": EMAIL_SENDER, "to": [to], "subject": subject, "html": html}
    )
    if isinstance(resp, dict):
        return resp.get("id")
    return getattr(resp, "id", None)


# ──────────────────────────────────────────────────────────────────────────────
# Templated sends
# ──────────────────────────────────────────────────────────────────────────────


def _route(payload: dict[str, Any]) -> str:
    return f"{payload.get('departure_airport','—')} → {payload.get('arrival_airport','—')}"


def send_delay_alert(
    to: str,
    *,
    flight_iata: str,
    flight_date: str,
    payload: dict[str, Any],
) -> str | None:
    delta = payload.get("delay_minutes")
    accent = f"Now delayed {delta} min" if delta else "Now delayed"
    html = _wrap(
        subject_title="Flight delayed",
        accent_line=accent,
        detail_rows=[
            ("Scheduled", _fmt_time(payload.get("scheduled_departure")), False),
            ("New estimate", _fmt_time(payload.get("estimated_departure")), True),
            ("Gate", payload.get("gate") or "TBD", False),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
        recommended_arrival=payload.get("recommended_arrival"),
    )
    return _send(to, f"{flight_iata} delayed", html)


def send_delay_extended_alert(
    to: str, *, flight_iata: str, flight_date: str, payload: dict[str, Any]
) -> str | None:
    html = _wrap(
        subject_title="Delay extended",
        accent_line=f"Pushed back another {payload.get('additional_minutes','—')} min",
        detail_rows=[
            ("Previous estimate", _fmt_time(payload.get("previous_estimate")), False),
            ("New estimate", _fmt_time(payload.get("estimated_departure")), True),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
        recommended_arrival=payload.get("recommended_arrival"),
    )
    return _send(to, f"{flight_iata} delay extended", html)


def send_cancellation_alert(
    to: str, *, flight_iata: str, flight_date: str, payload: dict[str, Any]
) -> str | None:
    alternatives = payload.get("alternatives") or []
    alt_html = ""
    if alternatives:
        items = "".join(f"<li>{a}</li>" for a in alternatives)
        alt_html = f"<p style='margin:16px 0 0 0;color:#8888aa;'>Alternatives:</p><ul style='color:#f0f0f5;'>{items}</ul>"
    html = _wrap(
        subject_title="Flight canceled",
        accent_line="This flight has been canceled.",
        detail_rows=[
            ("Status", "Canceled", True),
            ("Was scheduled", _fmt_time(payload.get("scheduled_departure")), False),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
    ).replace("</body></html>", f"{alt_html}</body></html>")
    return _send(to, f"{flight_iata} canceled", html)


def send_gate_change_alert(
    to: str, *, flight_iata: str, flight_date: str, payload: dict[str, Any]
) -> str | None:
    html = _wrap(
        subject_title="Gate changed",
        accent_line=f"Now departing from {payload.get('new_gate','—')}",
        detail_rows=[
            ("Previous gate", payload.get("old_gate") or "—", False),
            ("New gate", payload.get("new_gate") or "—", True),
            ("Terminal", payload.get("terminal") or "—", False),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
    )
    return _send(to, f"{flight_iata} gate → {payload.get('new_gate','?')}", html)


def send_boarding_soon_alert(
    to: str, *, flight_iata: str, flight_date: str, payload: dict[str, Any]
) -> str | None:
    html = _wrap(
        subject_title="Boarding soon",
        accent_line=f"Boarding around {_fmt_time(payload.get('boarding_time'))}",
        detail_rows=[
            ("Boarding", _fmt_time(payload.get("boarding_time")), True),
            ("Gate", payload.get("gate") or "—", False),
            ("TSA wait", f"{payload.get('tsa_wait','—')} min", False),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
    )
    return _send(to, f"{flight_iata} boarding soon", html)


def send_leave_now_alert(
    to: str, *, flight_iata: str, flight_date: str, payload: dict[str, Any]
) -> str | None:
    html = _wrap(
        subject_title="Time to leave",
        accent_line=f"Leave by {_fmt_time(payload.get('leave_by'))} to make it on time.",
        detail_rows=[
            ("Leave by", _fmt_time(payload.get("leave_by")), True),
            ("Arrive by", _fmt_time(payload.get("recommended_arrival_dt")), False),
            ("Drive", f"{payload.get('drive_minutes','—')} min", False),
        ],
        flight_iata=flight_iata,
        flight_date=flight_date,
        route=_route(payload),
    )
    return _send(to, f"{flight_iata} — leave now", html)


def send_test_alert(to: str) -> str | None:
    html = _wrap(
        subject_title="Test email",
        accent_line="This is a test alert from AirportIQ.",
        detail_rows=[("Status", "All good", False)],
        flight_iata="TEST123",
        flight_date=datetime.now().date().isoformat(),
        route="DEN → BOS",
    )
    return _send(to, "AirportIQ test alert", html)


# Single dispatcher entry point used by the alert orchestrator.
SENDERS = {
    "delay": send_delay_alert,
    "delay_extended": send_delay_extended_alert,
    "cancel": send_cancellation_alert,
    "gate_change": send_gate_change_alert,
    "boarding_soon": send_boarding_soon_alert,
    "leave_now": send_leave_now_alert,
}
