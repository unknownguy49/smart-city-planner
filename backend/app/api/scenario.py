from fastapi import APIRouter, HTTPException

from app.schemas.scenario import (
    ScenarioRequest,
    ScenarioResponse,
)

from app.services.scenario_generator import (
    scenario_generator,
)


router = APIRouter(
    prefix="/scenario",
    tags=["Scenario"],
)


@router.post(
    "/generate",
    response_model=ScenarioResponse,
)
def generate_scenario(
    request: ScenarioRequest,
):
    """
    Generate a structured planning scenario
    for a proposed intervention.
    """

    try:

        project = {
            "project_name": request.project_name,

            "building_type": request.building_type,

            "commercial_subtype": request.commercial_subtype,

            "area": request.area,

            "jurisdiction": request.jurisdiction,
        }

        result = scenario_generator.generate(
            project=project,
            intervention=request.intervention,
            parameters=request.parameters,
        )

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Scenario generation failed: {str(error)}",
        )