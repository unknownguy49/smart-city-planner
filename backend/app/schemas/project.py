from pydantic import BaseModel, Field, ConfigDict

class Coordinate(BaseModel):

    lat: float

    lng: float


class ProjectCreate(BaseModel):

    name: str

    building_type: str

    commercial_subtype: str | None = None

    city: str

    state: str

    area: float

    budget: float

    description: str

    coordinates: list[Coordinate] = Field(
        default_factory=list
    )


class ProjectUpdate(BaseModel):

    name: str | None = None

    building_type: str | None = None

    commercial_subtype: str | None = None

    city: str | None = None

    state: str | None = None

    area: float | None = None

    budget: float | None = None

    description: str | None = None

    coordinates: list[Coordinate] | None = None

class ProjectResponse(BaseModel):
    id: int
    owner_uid: str
    name: str
    building_type: str
    commercial_subtype: str | None
    city: str | None
    state: str | None
    area: float | None
    budget: float | None
    description: str | None
    coordinates: list[dict] | None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)