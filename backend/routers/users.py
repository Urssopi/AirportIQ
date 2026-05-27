from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user
from ..models.users import UserProfile, UserProfileUpdate
from ..services.profiles import get_or_create_profile, update_profile

router = APIRouter()


@router.get("/me", response_model=UserProfile)
def me(user: CurrentUser = Depends(get_current_user)) -> UserProfile:
    return get_or_create_profile(user.id, user.email)


@router.put("/me", response_model=UserProfile)
def update_me(
    patch: UserProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> UserProfile:
    return update_profile(user.id, patch, user.email)
