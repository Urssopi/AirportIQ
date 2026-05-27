"""Upstash Redis wrapper. Stores JSON-serializable values with TTL.

Falls back to an in-memory dict if Upstash credentials are missing — useful
for local dev when you don't want to point at the real cache.
"""
from __future__ import annotations

import json
import time
from functools import lru_cache
from typing import Any

from ..config import settings


class _InMemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, str]] = {}

    def get(self, key: str) -> str | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: str, ex: int) -> None:
        self._store[key] = (time.time() + ex, value)


class Cache:
    def __init__(self) -> None:
        if settings.upstash_redis_rest_url and settings.upstash_redis_rest_token:
            from upstash_redis import Redis

            self._client: Any = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
        else:
            self._client = _InMemoryCache()

    def get_json(self, key: str) -> Any | None:
        raw = self._client.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return None

    def set_json(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._client.set(key, json.dumps(value, default=str), ex=ttl_seconds)


@lru_cache
def get_cache() -> Cache:
    return Cache()
