
from typing import Any
from pydantic import BaseModel, Field


class LandRequest(BaseModel):
    project_id: int
    project_name: str
    area: float = Field(ge=0)
    geojson: Any
