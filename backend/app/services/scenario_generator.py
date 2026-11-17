from typing import Dict, Any


class ScenarioGenerator:
    """
    Generates structured planning scenarios from a project
    and a proposed intervention.

    This layer does not perform AI image generation yet.
    It prepares the scenario that will later be consumed
    by the visualization / AI layer.
    """

    ALLOWED_INTERVENTIONS = {
        "road_widening",
        "traffic_signal",
        "new_road",
        "footpath",
        "parking",
        "commercial_building",
        "residential_building",
        "green_space",
        "bus_stop",
        "street_lighting",
        "drainage",
        "rainwater_harvesting",
        "solar",
        "ev_charging",
    }

    def __init__(self):
        pass

    # ---------------------------------------------------------
    # NORMALIZE INTERVENTION
    # ---------------------------------------------------------

    def normalize_intervention(self, intervention: str) -> str:
        """
        Normalize user-provided intervention names.
        """

        if not intervention:
            raise ValueError(
                "Intervention is required."
            )

        normalized = (
            str(intervention)
            .strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )

        if normalized not in self.ALLOWED_INTERVENTIONS:
            raise ValueError(
                f"Unsupported intervention: {intervention}"
            )

        return normalized

    # ---------------------------------------------------------
    # INTERVENTION DESCRIPTION
    # ---------------------------------------------------------

    def get_intervention_description(
        self,
        intervention: str,
    ) -> str:
        """
        Return a human-readable description of the
        proposed intervention.
        """

        descriptions = {

            "road_widening":
                "Widen the existing road to improve traffic capacity and accessibility.",

            "traffic_signal":
                "Install a traffic signal to improve intersection control and safety.",

            "new_road":
                "Construct a new road connection to improve accessibility and connectivity.",

            "footpath":
                "Add or improve pedestrian footpaths for safer pedestrian movement.",

            "parking":
                "Introduce or expand parking infrastructure to improve vehicle management.",

            "commercial_building":
                "Develop a new commercial building at the selected location.",

            "residential_building":
                "Develop a new residential building at the selected location.",

            "green_space":
                "Create or expand green/open space for environmental and community benefits.",

            "bus_stop":
                "Create or improve a bus stop to enhance public transportation accessibility.",

            "street_lighting":
                "Install or improve street lighting to increase road and pedestrian safety.",

            "drainage":
                "Improve stormwater drainage infrastructure to reduce waterlogging and runoff issues.",

            "rainwater_harvesting":
                "Introduce rainwater harvesting infrastructure for water conservation.",

            "solar":
                "Introduce solar energy infrastructure to improve renewable energy use.",

            "ev_charging":
                "Install EV charging infrastructure to support electric mobility.",
        }

        return descriptions[intervention]

    # ---------------------------------------------------------
    # APPLY INTERVENTION TO PROJECT
    # ---------------------------------------------------------

    def apply_intervention(
        self,
        project: Dict[str, Any],
        intervention: str,
        parameters: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Create a scenario-specific copy of the project.

        The original project is never modified.
        """

        parameters = parameters or {}

        normalized_intervention = self.normalize_intervention(
            intervention
        )

        scenario_project = dict(project)

        scenario_project["scenario_intervention"] = (
            normalized_intervention
        )

        scenario_project["scenario_parameters"] = parameters

        # -----------------------------------------------------
        # ROAD WIDENING
        # -----------------------------------------------------

        if normalized_intervention == "road_widening":

            # Accept the canonical backend field first.
            proposed_width = parameters.get(
                "proposed_width_m"
            )

            # Support the frontend naming used for
            # "Proposed Road Width (m)".
            if proposed_width is None:
                proposed_width = parameters.get(
                    "proposed_road_width_m"
                )

            # Additional compatibility with a simpler
            # proposed width field.
            if proposed_width is None:
                proposed_width = parameters.get(
                    "proposed_width"
                )

            if proposed_width is None:
                raise ValueError(
                    "proposed_width_m is required for road widening."
                )

            try:
                proposed_width = float(
                    proposed_width
                )
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    "proposed_width_m must be a valid number."
                ) from exc

            if proposed_width <= 0:
                raise ValueError(
                    "proposed_width_m must be greater than zero."
                )

            scenario_project["road_width_m"] = (
                proposed_width
            )

        # -----------------------------------------------------
        # NEW ROAD
        # -----------------------------------------------------

        elif normalized_intervention == "new_road":

            proposed_width = parameters.get(
                "proposed_width_m"
            )

            if proposed_width is not None:

                try:
                    proposed_width = float(
                        proposed_width
                    )
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        "proposed_width_m must be a valid number."
                    ) from exc

                if proposed_width <= 0:
                    raise ValueError(
                        "proposed_width_m must be greater than zero."
                    )

                scenario_project["road_width_m"] = (
                    proposed_width
                )

        # -----------------------------------------------------
        # PARKING
        # -----------------------------------------------------

        elif normalized_intervention == "parking":

            parking_spaces = parameters.get(
                "parking_spaces"
            )

            if parking_spaces is not None:

                try:
                    parking_spaces = int(
                        parking_spaces
                    )
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        "parking_spaces must be a valid integer."
                    ) from exc

                if parking_spaces < 0:
                    raise ValueError(
                        "parking_spaces cannot be negative."
                    )

                scenario_project[
                    "proposed_parking_spaces"
                ] = parking_spaces

        # -----------------------------------------------------
        # GREEN SPACE
        # -----------------------------------------------------
        elif normalized_intervention == "green_space":

            green_percentage = parameters.get(
                "green_area_percentage",
                parameters.get("target_percentage"),
            )

            if green_percentage is None:
                raise ValueError(
                    "green_area_percentage is required "
                    "for green_space intervention."
                )

            green_percentage = float(
                green_percentage
            )

            if not 0 < green_percentage <= 100:
                raise ValueError(
                    "green_area_percentage must be "
                    "between 1 and 100."
                )

            scenario_project[
                "proposed_green_area_percentage"
            ] = green_percentage

            # Used by ConstraintEngine
            scenario_project[
                "green_area_percentage"
            ] = green_percentage

        # -----------------------------------------------------
        # FOOTPATH
        # -----------------------------------------------------

        elif normalized_intervention == "footpath":

            width = parameters.get(
                "width_m"
            )

            if width is not None:

                width = float(
                    width
                )

                if width <= 0:
                    raise ValueError(
                        "Footpath width must be greater than zero."
                    )

                scenario_project[
                    "proposed_footpath_width_m"
                ] = width

        return scenario_project

    # ---------------------------------------------------------
    # SCENARIO OBJECT
    # ---------------------------------------------------------

    def generate(
        self,
        project: Dict[str, Any],
        intervention: str,
        parameters: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Generate a structured scenario.

        Parameters are optional and allow the frontend to
        provide additional intervention-specific information.
        """

        parameters = parameters or {}

        normalized_intervention = self.normalize_intervention(
            intervention
        )

        description = self.get_intervention_description(
            normalized_intervention
        )

        project_name = project.get(
            "project_name",
            "Unnamed Project",
        )

        building_type = project.get(
            "building_type"
        )

        commercial_subtype = project.get(
            "commercial_subtype"
        )

        area = project.get(
            "area"
        )

        jurisdiction = project.get(
            "jurisdiction",
            project.get(
                "state",
                "Andhra Pradesh",
            ),
        )

        scenario = {

            "project_name": project_name,

            "jurisdiction": jurisdiction,

            "building_type": building_type,

            "commercial_subtype": commercial_subtype,

            "project_area": area,

            "intervention": {

                "type": normalized_intervention,

                "description": description,

                "parameters": parameters,

            },

            "scenario": {

                "title": (
                    f"{normalized_intervention.replace('_', ' ').title()} "
                    f"Scenario"
                ),

                "objective": description,

                "existing_state": {
                    "type": "existing_site",
                    "description": (
                        "Existing site conditions before the proposed intervention."
                    ),
                },

                "proposed_state": {
                    "type": "proposed_intervention",
                    "description": description,
                },

            },

            "visualization": {

                "required": True,

                "mode": "before_after",

                "status": "pending",

            },

        }

        return scenario


# Singleton instance
scenario_generator = ScenarioGenerator()