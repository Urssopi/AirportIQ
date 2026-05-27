from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..services.email_service import send_test_alert
from ..services.profiles import get_or_create_profile

router = APIRouter()


@router.get("/user/me")
def my_alerts(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {"user_id": user.id, "preferences": {}}


@router.put("/trip/{trip_id}")
def update_trip_alerts(
    trip_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    return {"trip_id": trip_id, "user_id": user.id, "updated": True}


@router.post("/test")
def post_test(user: CurrentUser = Depends(get_current_user)) -> dict:
    profile = get_or_create_profile(user.id, user.email)
    if not profile.email:
        raise HTTPException(status_code=400, detail="no email on profile")
    try:
        msg_id = send_test_alert(profile.email)
    except Exception as exc:  # noqa: BLE001 — surface Resend errors verbatim
        raise HTTPException(status_code=502, detail=f"resend: {exc}") from exc
    return {"sent": True, "to": profile.email, "resend_message_id": msg_id}
