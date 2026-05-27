"""FastAPI auth dependency for Supabase-issued JWTs.

Two validation paths:
  1. Local (preferred): decode HS256 JWT using SUPABASE_JWT_SECRET.
  2. Fallback: call Supabase Auth `get_user(token)` — works without the secret
     but adds one HTTP round-trip per protected request.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status

from .config import settings
from .database.client import get_supabase


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None


def _local_verify(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"invalid token: {exc}") from exc
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token missing sub")
    return CurrentUser(id=sub, email=payload.get("email"))


def _remote_verify(token: str) -> CurrentUser:
    try:
        client = get_supabase()
        resp = client.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token verification failed") from exc
    user = getattr(resp, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token not associated with a user")
    return CurrentUser(id=user.id, email=getattr(user, "email", None))


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    if settings.supabase_jwt_secret:
        return _local_verify(token)
    return _remote_verify(token)
