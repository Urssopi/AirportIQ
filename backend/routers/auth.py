"""Auth proxy for mobile clients.

The supabase-js library has known issues talking to supabase.co directly from
React Native / Expo Go on some networks (TLS quirks, error-path bugs). We
proxy the two operations the mobile app actually needs — signup + password
sign-in — through our backend, which can reach Supabase reliably.

The endpoints return the same JWT shape the mobile app would have gotten from
supabase-js, so /api/users/me etc. work unchanged.
"""
from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..config import settings

router = APIRouter()
TIMEOUT = 8.0


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class Session(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
    user_id: str
    email: str | None = None


def _supabase_admin_create(email: str, password: str) -> dict:
    """Use the service-role admin API so we can mark the user email_confirmed
    and skip the verification email step in dev. The user can sign in right away."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=500, detail="supabase backend not configured")

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    payload = {"email": email, "password": password, "email_confirm": True}
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{settings.supabase_url}/auth/v1/admin/users",
                headers=headers,
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"supabase unreachable: {exc}") from exc

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("msg") or resp.text
        except Exception:
            detail = resp.text
        raise HTTPException(status_code=resp.status_code, detail=detail)
    return resp.json()


def _supabase_token(email: str, password: str) -> dict:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="supabase backend not configured")
    headers = {
        "apikey": settings.supabase_anon_key,
        "Content-Type": "application/json",
    }
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{settings.supabase_url}/auth/v1/token?grant_type=password",
                headers=headers,
                json={"email": email, "password": password},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"supabase unreachable: {exc}") from exc

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("error_description") or resp.json().get("msg") or resp.text
        except Exception:
            detail = resp.text
        raise HTTPException(status_code=401, detail=detail)
    return resp.json()


def _session_from_token_response(body: dict) -> Session:
    user = body.get("user") or {}
    return Session(
        access_token=body["access_token"],
        refresh_token=body.get("refresh_token"),
        expires_in=body.get("expires_in"),
        user_id=user.get("id") or body.get("user_id") or "",
        email=user.get("email") or body.get("email"),
    )


@router.post("/signup", response_model=Session)
def signup(creds: Credentials) -> Session:
    _supabase_admin_create(creds.email, creds.password)
    return _session_from_token_response(_supabase_token(creds.email, creds.password))


@router.post("/signin", response_model=Session)
def signin(creds: Credentials) -> Session:
    return _session_from_token_response(_supabase_token(creds.email, creds.password))
