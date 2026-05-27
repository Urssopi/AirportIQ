from fastapi import APIRouter, Depends, HTTPException

from ..auth import CurrentUser, get_current_user
from ..models.trips import Trip, TripCreate
from ..services.profiles import get_or_create_profile
from ..services.trips import create_trip, delete_trip, list_trips

router = APIRouter()


@router.get("", response_model=list[Trip])
def get_trips(user: CurrentUser = Depends(get_current_user)) -> list[Trip]:
    return list_trips(user.id)


@router.post("", response_model=Trip, status_code=201)
def post_trip(
    payload: TripCreate,
    user: CurrentUser = Depends(get_current_user),
) -> Trip:
    # FK requires user_profiles row to exist first.
    get_or_create_profile(user.id, user.email)
    return create_trip(user.id, payload)


@router.delete("/{trip_id}", status_code=204)
def remove_trip(
    trip_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> None:
    deleted = delete_trip(user.id, trip_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="trip not found")
