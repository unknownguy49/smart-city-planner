from typing import List, Optional
from pydantic import BaseModel


class Coordinate(BaseModel):
    lat: float
    lng: float


class PlannerRequest(BaseModel):
    project_id: int
    project_name: str
    building_type: str
    commercial_subtype: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    budget: float
    area: float
    coordinates: List[Coordinate]