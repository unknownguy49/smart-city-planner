from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ScenarioRequest(BaseModel):
    project_name: str = Field(
        ...,
        description="Name of the planning project",
    )

    building_type: Optional[str] = Field(
        default=None,
        description="Type of development",
    )

    commercial_subtype: Optional[str] = Field(
        default=None,
        description="Commercial development subtype",
    )

    area: float = Field(
        ...,
        gt=0,
        description="Project/site area",
    )

    jurisdiction: Optional[str] = Field(
        default="Andhra Pradesh",
        description="Applicable jurisdiction",
    )

    intervention: str = Field(
        ...,
        description="Proposed planning intervention",
    )

    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Intervention-specific parameters",
    )


class ScenarioResponse(BaseModel):
    project_name: str

    jurisdiction: str

    building_type: Optional[str] = None

    commercial_subtype: Optional[str] = None

    project_area: float

    intervention: Dict[str, Any]

    scenario: Dict[str, Any]

    visualization: Dict[str, Any]