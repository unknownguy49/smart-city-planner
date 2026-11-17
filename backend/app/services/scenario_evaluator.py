from typing import Any, Dict

from app.services.scenario_generator import scenario_generator
from app.services.constraint_engine import ConstraintEngine
from app.services.scoring_engine import scoring_engine


class ScenarioEvaluator:
    """
    Evaluates a planning scenario after applying an intervention.

    The evaluator:
        1. Creates a modified scenario project.
        2. Creates scenario-specific copies of affected agent results.
        3. Evaluates regulatory/planning constraints.
        4. Calculates the planning score using agent results.
        5. Produces an overall scenario feasibility status.

    The original project and original agent results are never modified.
    """

    def __init__(self):
        self.constraint_engine = ConstraintEngine()

    @staticmethod
    def _validate_agent_result(
        result: Dict[str, Any] | None,
        agent_name: str,
    ) -> Dict[str, Any]:
        if result is None:
            raise ValueError(
                f"{agent_name} result is required."
            )

        if not isinstance(result, dict):
            raise TypeError(
                f"{agent_name} result must be a dictionary."
            )

        return result

    @staticmethod
    def _prepare_scenario_agent_results(
        scenario_project: Dict[str, Any],
        architecture_result: Dict[str, Any],
        civil_result: Dict[str, Any],
        sustainability_result: Dict[str, Any],
        municipal_result: Dict[str, Any],
    ) -> tuple[
        Dict[str, Any],
        Dict[str, Any],
        Dict[str, Any],
        Dict[str, Any],
    ]:
        """
        Create scenario-specific copies of agent results.

        The constraint engine reads several planning values directly
        from agent results. Therefore, scenario_project values must be
        propagated into the appropriate scenario agent result.

        Original agent result dictionaries are never modified.
        """

        scenario_architecture = dict(
            architecture_result
        )

        scenario_civil = dict(
            civil_result
        )

        scenario_sustainability = dict(
            sustainability_result
        )

        scenario_municipal = dict(
            municipal_result
        )

        intervention = scenario_project.get(
            "scenario_intervention"
        )

        # =========================================================
        # PROJECT VALUE NORMALIZATION
        # =========================================================

        # The Constraint Engine expects project["area"].
        # The chatbot/design flow may provide area_m2 instead.
        if scenario_project.get("area") is None:
            if scenario_project.get("area_m2") is not None:
                scenario_project["area"] = (
                    scenario_project["area_m2"]
                )

        # =========================================================
        # ARCHITECTURE VALUES
        # =========================================================

        if scenario_project.get("far") is not None:
            scenario_architecture["proposed_far"] = (
                scenario_project["far"]
            )

        if (
            scenario_project.get(
                "ground_coverage_percent"
            )
            is not None
        ):
            scenario_architecture[
                "proposed_ground_coverage_percent"
            ] = scenario_project[
                "ground_coverage_percent"
            ]

        if scenario_project.get("building_height_m") is not None:
            scenario_architecture[
                "building_height_m"
            ] = scenario_project[
                "building_height_m"
            ]

        if scenario_project.get("floors") is not None:
            scenario_architecture["floors"] = (
                scenario_project["floors"]
            )

        if scenario_project.get("building_type") is not None:
            scenario_architecture["building_type"] = (
                scenario_project["building_type"]
            )

        if scenario_project.get("commercial_subtype") is not None:
            scenario_architecture[
                "commercial_subtype"
            ] = scenario_project[
                "commercial_subtype"
            ]

        # =========================================================
        # PRESERVE REGULATORY CONTROL
        # =========================================================
        #
        # FAR, ground coverage and height checks can obtain their
        # regulatory limits from selected_commercial_control.
        #
        # The baseline Architecture Agent already contains this
        # structured control, so preserve it in the scenario copy.
        #

        selected_commercial_control = (
            architecture_result.get(
                "selected_commercial_control"
            )
        )

        if isinstance(
            selected_commercial_control,
            dict,
        ):
            scenario_architecture[
                "selected_commercial_control"
            ] = dict(
                selected_commercial_control
            )

        # Also preserve any explicit regulatory fields that may
        # already exist in the baseline Architecture Agent result.
        for key in (
            "maximum_far",
            "max_far",
            "maximum_ground_coverage",
            "max_ground_coverage",
            "maximum_ground_coverage_percent",
            "maximum_height",
            "max_height",
            "maximum_height_m",
        ):
            if key in architecture_result:
                scenario_architecture[key] = (
                    architecture_result[key]
                )

        # =========================================================
        # CIVIL VALUES
        # =========================================================

        if scenario_project.get("road_width_m") is not None:
            scenario_civil["road_width_m"] = (
                scenario_project["road_width_m"]
            )

        if scenario_project.get("parking_capacity") is not None:
            scenario_civil["parking_capacity"] = (
                scenario_project["parking_capacity"]
            )

        if scenario_project.get("footpath_width_m") is not None:
            scenario_civil["footpath_width_m"] = (
                scenario_project["footpath_width_m"]
            )

        # =========================================================
        # SUSTAINABILITY VALUES
        # =========================================================

        if (
            scenario_project.get(
                "green_area_percentage"
            )
            is not None
        ):
            scenario_sustainability[
                "green_area_percentage"
            ] = scenario_project[
                "green_area_percentage"
            ]

        # =========================================================
        # INTERVENTION-SPECIFIC SYNCHRONIZATION
        # =========================================================

        # ---------------------------------------------------------
        # Road widening
        # ---------------------------------------------------------

        if intervention == "road_widening":
            if scenario_project.get("road_width_m") is not None:
                scenario_civil["road_width_m"] = (
                    scenario_project["road_width_m"]
                )

        # ---------------------------------------------------------
        # Footpath
        # ---------------------------------------------------------

        elif intervention == "footpath":
            if (
                scenario_project.get(
                    "footpath_width_m"
                )
                is not None
            ):
                scenario_civil["footpath_width_m"] = (
                    scenario_project["footpath_width_m"]
                )

        # ---------------------------------------------------------
        # Parking
        # ---------------------------------------------------------

        elif intervention == "parking":
            if (
                scenario_project.get(
                    "parking_capacity"
                )
                is not None
            ):
                scenario_civil["parking_capacity"] = (
                    scenario_project["parking_capacity"]
                )

        # ---------------------------------------------------------
        # Green space
        # ---------------------------------------------------------

        elif intervention == "green_space":
            if (
                scenario_project.get(
                    "green_area_percentage"
                )
                is not None
            ):
                scenario_sustainability[
                    "green_area_percentage"
                ] = scenario_project[
                    "green_area_percentage"
                ]

        # ---------------------------------------------------------
        # Commercial building
        # ---------------------------------------------------------

        elif intervention == "commercial_building":
            if scenario_project.get("building_type") is not None:
                scenario_architecture["building_type"] = (
                    scenario_project["building_type"]
                )

            if (
                scenario_project.get(
                    "commercial_subtype"
                )
                is not None
            ):
                scenario_architecture[
                    "commercial_subtype"
                ] = scenario_project[
                    "commercial_subtype"
                ]

        return (
            scenario_architecture,
            scenario_civil,
            scenario_sustainability,
            scenario_municipal,
        )

    @staticmethod
    def _determine_scenario_status(
        constraint_result: Dict[str, Any],
        scoring_result: Dict[str, Any],
    ) -> str:
        constraint_status = constraint_result.get(
            "status",
            "WARNING",
        )

        planning_status = scoring_result.get(
            "status",
            "Requires review",
        )

        if constraint_status == "FAIL":
            return "Not feasible"

        if constraint_status == "WARNING":
            return "Feasible with conditions"

        if planning_status == "Recommended":
            return "Recommended"

        if planning_status == "Recommended with conditions":
            return "Feasible with conditions"

        return "Requires review"

    def evaluate(
        self,
        project: Dict[str, Any],
        intervention: str,
        parameters: Dict[str, Any] | None,
        architecture_result: Dict[str, Any],
        civil_result: Dict[str, Any],
        sustainability_result: Dict[str, Any],
        municipal_result: Dict[str, Any],
        citizen_result: Dict[str, Any],
    ) -> Dict[str, Any]:

        # =========================================================
        # VALIDATE INPUTS
        # =========================================================

        if not isinstance(project, dict):
            raise TypeError(
                "Project must be a dictionary."
            )

        if not intervention:
            raise ValueError(
                "Intervention is required."
            )

        if parameters is None:
            parameters = {}

        if not isinstance(parameters, dict):
            raise TypeError(
                "Scenario parameters must be a dictionary."
            )

        architecture_result = self._validate_agent_result(
            architecture_result,
            "Architecture",
        )

        civil_result = self._validate_agent_result(
            civil_result,
            "Civil",
        )

        sustainability_result = self._validate_agent_result(
            sustainability_result,
            "Sustainability",
        )

        municipal_result = self._validate_agent_result(
            municipal_result,
            "Municipal",
        )

        citizen_result = self._validate_agent_result(
            citizen_result,
            "Citizen",
        )

        # =========================================================
        # CREATE MODIFIED SCENARIO PROJECT
        # =========================================================

        scenario_project = (
            scenario_generator.apply_intervention(
                project=project,
                intervention=intervention,
                parameters=parameters,
            )
        )

        # =========================================================
        # PREPARE SCENARIO-SPECIFIC AGENT RESULTS
        # =========================================================

        (
            scenario_architecture,
            scenario_civil,
            scenario_sustainability,
            scenario_municipal,
        ) = self._prepare_scenario_agent_results(
            scenario_project=scenario_project,
            architecture_result=architecture_result,
            civil_result=civil_result,
            sustainability_result=sustainability_result,
            municipal_result=municipal_result,
        )

        # =========================================================
        # EVALUATE CONSTRAINTS
        # =========================================================

        constraint_result = (
            self.constraint_engine.evaluate(
                project=scenario_project,
                architecture=scenario_architecture,
                civil=scenario_civil,
                sustainability=scenario_sustainability,
                municipal=scenario_municipal,
            )
        )

        # =========================================================
        # CALCULATE PLANNING SCORE
        # =========================================================

        scoring_result = scoring_engine.calculate(
            architecture=scenario_architecture,
            civil=scenario_civil,
            sustainability=scenario_sustainability,
            municipal=scenario_municipal,
            citizen=citizen_result,
        )

        # =========================================================
        # DETERMINE SCENARIO STATUS
        # =========================================================

        scenario_status = (
            self._determine_scenario_status(
                constraint_result=constraint_result,
                scoring_result=scoring_result,
            )
        )

        # =========================================================
        # RETURN STRUCTURED RESULT
        # =========================================================

        return {
            "scenario": {
                "intervention": scenario_project.get(
                    "scenario_intervention"
                ),
                "parameters": scenario_project.get(
                    "scenario_parameters",
                    {},
                ),
                "project": scenario_project,
            },
            "constraints": constraint_result,
            "scoring": scoring_result,
            "scenario_status": scenario_status,
        }


scenario_evaluator = ScenarioEvaluator()