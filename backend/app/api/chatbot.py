from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.services.chatbot_service import chatbot_service


router = APIRouter(
    prefix="/chatbot",
    tags=["Chatbot"],
)


# ============================================================
# CHATBOT MESSAGE
# ============================================================

@router.post("/message")
def chatbot_message(
    request: Dict[str, Any],
):
    """
    Process a chatbot message.

    This endpoint can:
        - explain planning results
        - provide recommendations
        - detect proposed changes
        - identify scenario requests

    It does not directly modify the project.
    """

    message = request.get("message")

    if not isinstance(message, str) or not message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message is required.",
        )

    project = request.get(
        "project",
        {},
    )

    analysis = request.get(
        "analysis",
        {},
    )

    design = request.get(
        "design",
        {},
    )

    if not isinstance(project, dict):
        raise HTTPException(
            status_code=400,
            detail="Project must be an object.",
        )

    if not isinstance(analysis, dict):
        raise HTTPException(
            status_code=400,
            detail="Analysis must be an object.",
        )

    if not isinstance(design, dict):
        raise HTTPException(
            status_code=400,
            detail="Design must be an object.",
        )

    try:

        return chatbot_service.process_message(
            message=message,
            project=project,
            analysis=analysis,
            design=design,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# APPLY CHATBOT CHANGE
# ============================================================

@router.post("/apply")
def apply_chatbot_change(
    request: Dict[str, Any],
):
    """
    Apply a confirmed chatbot-generated change.

    Supported interventions:
        - parking
        - road_widening
        - footpath
        - green_space

    The current agent scores are supplied separately through
    agent_scores and are copied into the scenario agent results
    before scenario scoring.
    """

    # ========================================================
    # REQUEST DATA
    # ========================================================

    project = request.get(
        "project"
    )

    change = request.get(
        "change"
    )

    architecture = request.get(
        "architecture",
        {},
    )

    civil = request.get(
        "civil",
        {},
    )

    sustainability = request.get(
        "sustainability",
        {},
    )

    municipal = request.get(
        "municipal",
        {},
    )

    citizen = request.get(
        "citizen",
        {},
    )

    design = request.get(
        "design",
        {},
    )

    agent_scores = request.get(
        "agent_scores",
        {},
    )

    # ========================================================
    # PROJECT VALIDATION
    # ========================================================

    if not isinstance(project, dict):

        raise HTTPException(
            status_code=400,
            detail="Project data is required.",
        )

    # ========================================================
    # CHANGE VALIDATION
    # ========================================================

    if not isinstance(change, dict):

        raise HTTPException(
            status_code=400,
            detail="Confirmed change is required.",
        )

    intervention = change.get(
        "type"
    )

    parameters = change.get(
        "parameters",
        {},
    )

    if not intervention:

        raise HTTPException(
            status_code=400,
            detail="Change type is required.",
        )

    if not isinstance(parameters, dict):

        raise HTTPException(
            status_code=400,
            detail="Change parameters must be an object.",
        )

    # ========================================================
    # AGENT RESULT VALIDATION
    # ========================================================

    agent_results = {
        "architecture": architecture,
        "civil": civil,
        "sustainability": sustainability,
        "municipal": municipal,
        "citizen": citizen,
    }

    for agent_name, result in agent_results.items():

        if not isinstance(result, dict):

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{agent_name} data must be "
                    "an object."
                ),
            )

    # ========================================================
    # AGENT SCORE VALIDATION
    # ========================================================

    if not isinstance(agent_scores, dict):

        raise HTTPException(
            status_code=400,
            detail="agent_scores must be an object.",
        )

    required_agent_scores = (
        "architecture",
        "civil",
        "sustainability",
        "municipal",
        "citizen",
    )

    missing_scores = [
        name
        for name in required_agent_scores
        if name not in agent_scores
    ]

    if missing_scores:

        raise HTTPException(
            status_code=400,
            detail=(
                "Missing baseline agent scores: "
                + ", ".join(
                    missing_scores
                )
                + "."
            ),
        )

    normalized_agent_scores = {}

    for agent_name in required_agent_scores:

        raw_score = agent_scores.get(
            agent_name
        )

        try:

            score = float(
                raw_score
            )

        except (TypeError, ValueError) as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{agent_name} score must be "
                    "a valid number."
                ),
            ) from exc

        if score < 0 or score > 100:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{agent_name} score must be "
                    "between 0 and 100."
                ),
            )

        normalized_agent_scores[
            agent_name
        ] = score

    # ========================================================
    # DESIGN VALIDATION
    # ========================================================

    if not isinstance(design, dict):

        raise HTTPException(
            status_code=400,
            detail="Design data must be an object.",
        )

    # ========================================================
    # SUPPORTED INTERVENTIONS
    # ========================================================

    supported_interventions = {
        "parking",
        "road_widening",
        "footpath",
        "green_space",
    }

    if intervention not in supported_interventions:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Chatbot change '{intervention}' "
                "is not currently supported for "
                "automatic application."
            ),
        )

    # ========================================================
    # NORMALIZE PARAMETERS
    # ========================================================

    scenario_parameters = dict(
        parameters
    )

    # ========================================================
    # PARKING
    # ========================================================

    if intervention == "parking":

        parking_spaces = scenario_parameters.get(
            "parking_spaces"
        )

        if parking_spaces is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "parking_spaces is required "
                    "for a parking change."
                ),
            )

        try:

            parking_spaces = int(
                parking_spaces
            )

        except (TypeError, ValueError) as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    "parking_spaces must be "
                    "a valid integer."
                ),
            ) from exc

        if parking_spaces < 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "parking_spaces cannot "
                    "be negative."
                ),
            )

        scenario_parameters[
            "parking_spaces"
        ] = parking_spaces

    # ========================================================
    # ROAD WIDENING
    # ========================================================

    elif intervention == "road_widening":

        proposed_width = scenario_parameters.get(
            "proposed_width_m"
        )

        if proposed_width is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "proposed_width_m is required "
                    "for road widening."
                ),
            )

        try:

            proposed_width = float(
                proposed_width
            )

        except (TypeError, ValueError) as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    "proposed_width_m must be "
                    "a valid number."
                ),
            ) from exc

        if proposed_width <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "proposed_width_m must be "
                    "greater than zero."
                ),
            )

        scenario_parameters[
            "proposed_width_m"
        ] = proposed_width

    # ========================================================
    # FOOTPATH
    # ========================================================

    elif intervention == "footpath":

        footpath_width = scenario_parameters.get(
            "footpath_width_m"
        )

        if footpath_width is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "footpath_width_m is required "
                    "for a footpath change."
                ),
            )

        try:

            footpath_width = float(
                footpath_width
            )

        except (TypeError, ValueError) as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    "footpath_width_m must be "
                    "a valid number."
                ),
            ) from exc

        if footpath_width <= 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "footpath_width_m must be "
                    "greater than zero."
                ),
            )

        scenario_parameters[
            "footpath_width_m"
        ] = footpath_width

    # ========================================================
    # GREEN SPACE
    # ========================================================

    elif intervention == "green_space":

        green_percentage = scenario_parameters.get(
            "green_area_percentage"
        )

        if green_percentage is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "green_area_percentage is required "
                    "for a green-space change."
                ),
            )

        try:

            green_percentage = float(
                green_percentage
            )

        except (TypeError, ValueError) as exc:

            raise HTTPException(
                status_code=400,
                detail=(
                    "green_area_percentage must be "
                    "a valid number."
                ),
            ) from exc

        if (
            green_percentage < 0
            or green_percentage > 100
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "green_area_percentage must be "
                    "between 0 and 100."
                ),
            )

        scenario_parameters[
            "green_area_percentage"
        ] = green_percentage

    # ========================================================
    # CREATE SCENARIO PROJECT
    # ========================================================

    scenario_project = dict(
        project
    )

    building = design.get(
        "building",
        {},
    )

    site_elements = design.get(
        "site_elements",
        {},
    )

    # ========================================================
    # NORMALIZE AREA
    # ========================================================

    if (
        scenario_project.get("area") is None
        and scenario_project.get("area_m2") is not None
    ):

        scenario_project[
            "area"
        ] = scenario_project[
            "area_m2"
        ]

    # ========================================================
    # PRESERVE BUILDING CONTEXT
    # ========================================================

    if isinstance(
        building,
        dict,
    ):

        if (
            scenario_project.get("far") is None
            and building.get("far") is not None
        ):

            scenario_project[
                "far"
            ] = building.get(
                "far"
            )

        if (
            scenario_project.get(
                "ground_coverage_percent"
            ) is None
            and building.get(
                "ground_coverage_percent"
            ) is not None
        ):

            scenario_project[
                "ground_coverage_percent"
            ] = building.get(
                "ground_coverage_percent"
            )

        if (
            scenario_project.get(
                "building_height_m"
            ) is None
            and building.get(
                "height_m"
            ) is not None
        ):

            scenario_project[
                "building_height_m"
            ] = building.get(
                "height_m"
            )

        if (
            scenario_project.get("floors") is None
            and building.get("floors") is not None
        ):

            scenario_project[
                "floors"
            ] = building.get(
                "floors"
            )

    # ========================================================
    # PRESERVE SITE ELEMENT CONTEXT
    # ========================================================

    if isinstance(
        site_elements,
        dict,
    ):

        if (
            scenario_project.get(
                "parking_capacity"
            ) is None
            and site_elements.get(
                "parking_capacity"
            ) is not None
        ):

            scenario_project[
                "parking_capacity"
            ] = site_elements.get(
                "parking_capacity"
            )

        if (
            scenario_project.get(
                "green_area_percentage"
            ) is None
            and site_elements.get(
                "green_area_percentage"
            ) is not None
        ):

            scenario_project[
                "green_area_percentage"
            ] = site_elements.get(
                "green_area_percentage"
            )

        if (
            scenario_project.get(
                "footpath_width_m"
            ) is None
            and site_elements.get(
                "footpath_width_m"
            ) is not None
        ):

            scenario_project[
                "footpath_width_m"
            ] = site_elements.get(
                "footpath_width_m"
            )

        if (
            scenario_project.get(
                "road_width_m"
            ) is None
            and site_elements.get(
                "road_width_m"
            ) is not None
        ):

            scenario_project[
                "road_width_m"
            ] = site_elements.get(
                "road_width_m"
            )

    # ========================================================
    # APPLY CONFIRMED CHANGE
    # ========================================================

    if intervention == "parking":

        scenario_project[
            "parking_capacity"
        ] = scenario_parameters[
            "parking_spaces"
        ]

        scenario_project[
            "proposed_parking_spaces"
        ] = scenario_parameters[
            "parking_spaces"
        ]

    elif intervention == "road_widening":

        scenario_project[
            "road_width_m"
        ] = scenario_parameters[
            "proposed_width_m"
        ]

    elif intervention == "footpath":

        scenario_project[
            "footpath_width_m"
        ] = scenario_parameters[
            "footpath_width_m"
        ]

    elif intervention == "green_space":

        scenario_project[
            "green_area_percentage"
        ] = scenario_parameters[
            "green_area_percentage"
        ]

    # ========================================================
    # COPY AGENT RESULTS
    #
    # Important:
    # Do not mutate the original baseline agent results.
    # ========================================================

    scenario_architecture = dict(
        architecture
    )

    scenario_civil = dict(
        civil
    )

    scenario_sustainability = dict(
        sustainability
    )

    scenario_municipal = dict(
        municipal
    )

    scenario_citizen = dict(
        citizen
    )

    # ========================================================
    # PRESERVE BASELINE AGENT SCORES
    # ========================================================

    scenario_architecture[
        "score"
    ] = normalized_agent_scores[
        "architecture"
    ]

    scenario_civil[
        "score"
    ] = normalized_agent_scores[
        "civil"
    ]

    scenario_sustainability[
        "score"
    ] = normalized_agent_scores[
        "sustainability"
    ]

    scenario_municipal[
        "score"
    ] = normalized_agent_scores[
        "municipal"
    ]

    scenario_citizen[
        "score"
    ] = normalized_agent_scores[
        "citizen"
    ]

    # ========================================================
    # BUILD SCENARIO REQUEST
    # ========================================================

    scenario_request = {
        "project": scenario_project,

        "intervention": intervention,

        "parameters": scenario_parameters,

        "architecture": scenario_architecture,

        "civil": scenario_civil,

        "sustainability": scenario_sustainability,

        "municipal": scenario_municipal,

        "citizen": scenario_citizen,
    }

    # ========================================================
    # RUN SCENARIO EVALUATION
    # ========================================================

    try:

        from app.api.planner import (
            evaluate_scenario,
        )

        scenario_result = evaluate_scenario(
            scenario_request
        )

        return {
            "status": "success",

            "source": "chatbot",

            "applied_change": {
                "type": intervention,

                "parameters":
                    scenario_parameters,
            },

            "baseline_agent_scores":
                normalized_agent_scores,

            "scenario_project":
                scenario_project,

            "scenario_result":
                scenario_result,
        }

    except HTTPException:

        raise

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc