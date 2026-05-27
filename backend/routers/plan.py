from fastapi import APIRouter

from ..models.arrival import ArrivalRequest, ArrivalResponse
from ..services.arrival_calculator import compute_arrival_plan

router = APIRouter()


@router.post("/arrival", response_model=ArrivalResponse)
def arrival(req: ArrivalRequest) -> ArrivalResponse:
    return compute_arrival_plan(req)
