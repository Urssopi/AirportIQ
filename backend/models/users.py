from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

NotificationPreference = Literal["email", "push", "both"]


class UserProfile(BaseModel):
    id: str
    email: str
    has_tsa_precheck: bool = False
    preferred_notification: NotificationPreference = "email"
    home_airport: str | None = None
    push_token: str | None = None
    created_at: datetime | None = None


class UserProfileUpdate(BaseModel):
    has_tsa_precheck: bool | None = None
    preferred_notification: NotificationPreference | None = None
    home_airport: str | None = Field(default=None, max_length=4)
    push_token: str | None = None
