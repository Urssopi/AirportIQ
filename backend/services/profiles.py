"""Supabase access for user_profiles."""
from __future__ import annotations

from ..database.client import get_supabase
from ..models.users import UserProfile, UserProfileUpdate


def _to_profile(row: dict, fallback_email: str | None = None) -> UserProfile:
    return UserProfile(
        id=row.get("id", ""),
        email=row.get("email") or fallback_email or "",
        has_tsa_precheck=row.get("has_tsa_precheck", False),
        preferred_notification=row.get("preferred_notification") or "email",
        home_airport=row.get("home_airport"),
        push_token=row.get("push_token"),
        created_at=row.get("created_at"),
    )


def get_or_create_profile(user_id: str, email: str | None) -> UserProfile:
    client = get_supabase()
    resp = client.table("user_profiles").select("*").eq("id", user_id).limit(1).execute()
    rows = resp.data or []
    if rows:
        return _to_profile(rows[0], email)

    insert_payload = {
        "id": user_id,
        "email": email or "",
        "has_tsa_precheck": False,
        "preferred_notification": "email",
    }
    inserted = client.table("user_profiles").insert(insert_payload).execute()
    row = (inserted.data or [insert_payload])[0]
    return _to_profile(row, email)


def update_profile(user_id: str, patch: UserProfileUpdate, email: str | None) -> UserProfile:
    get_or_create_profile(user_id, email)

    update_data = patch.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        return get_or_create_profile(user_id, email)

    client = get_supabase()
    resp = (
        client.table("user_profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    row = (resp.data or [{}])[0]
    return _to_profile(row, email)
