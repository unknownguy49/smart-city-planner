from copy import deepcopy
from typing import Any, Dict


class ScenarioDesignService:
    """
    Updates an existing design specification according to
    a planning intervention.

    This service does not generate a completely new design.
    It starts from the baseline design and modifies only
    the parts affected by the scenario.
    """

    def generate_scenario_design(
        self,
        project: Dict[str, Any],
        design: Dict[str, Any],
        intervention: str,
        parameters: Dict[str, Any],
        scenario_project: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        if not isinstance(design, dict):
            raise ValueError(
                "Baseline design is required."
            )

        updated_design = deepcopy(design)

        normalized_intervention = (
            str(intervention)
            .strip()
            .lower()
        )

        parameters = (
            parameters
            if isinstance(parameters, dict)
            else {}
        )

        updated_design.setdefault(
            "site",
            {}
        )

        updated_design.setdefault(
            "building",
            {}
        )

        updated_design.setdefault(
            "site_elements",
            {}
        )

        updated_design.setdefault(
            "regulatory_basis",
            {}
        )

        # --------------------------------------------------
        # Preserve the original project coordinates.
        # --------------------------------------------------

        project_coordinates = project.get(
            "coordinates"
        )

        if (
            isinstance(project_coordinates, list)
            and project_coordinates
        ):
            updated_design["coordinates"] = (
                deepcopy(project_coordinates)
            )

        # --------------------------------------------------
        # ROAD WIDENING
        # --------------------------------------------------

        if (
            normalized_intervention
            == "road_widening"
        ):
            proposed_width = self._number(
                parameters.get(
                    "proposed_width_m"
                )
            )

            if proposed_width is None:
                raise ValueError(
                    "proposed_width_m is required for road widening."
                )

            if proposed_width <= 0:
                raise ValueError(
                    "proposed_width_m must be greater than zero."
                )

            updated_design.setdefault(
                "site_elements",
                {}
            )

            updated_design[
                "site_elements"
            ][
                "road_width_m"
            ] = proposed_width

            updated_design[
                "site_elements"
            ][
                "road_widening"
            ] = True

            updated_design[
                "site_elements"
            ][
                "road_widening_target_m"
            ] = proposed_width

        # --------------------------------------------------
        # PARKING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "parking"
        ):
            parking_spaces = self._number(
                parameters.get(
                    "parking_spaces"
                )
            )

            if parking_spaces is None:
                raise ValueError(
                    "parking_spaces is required for parking intervention."
                )

            if parking_spaces < 0:
                raise ValueError(
                    "parking_spaces cannot be negative."
                )

            updated_design[
                "site_elements"
            ][
                "parking"
            ] = parking_spaces > 0

            updated_design[
                "site_elements"
            ][
                "parking_capacity"
            ] = int(parking_spaces)

        # --------------------------------------------------
        # GREEN SPACE
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "green_space"
        ):
            green_percentage = self._number(
                parameters.get(
                    "green_area_percentage"
                )
            )

            if green_percentage is None:
                raise ValueError(
                    "green_area_percentage is required for green-space intervention."
                )

            if (
                green_percentage < 0
                or green_percentage > 100
            ):
                raise ValueError(
                    "green_area_percentage must be between 0 and 100."
                )

            updated_design.setdefault(
                "site_elements",
                {}
            )

            updated_design[
                "site_elements"
            ][
                "green_area"
            ] = green_percentage > 0

            updated_design[
                "site_elements"
            ][
                "green_area_percentage"
            ] = green_percentage

        # --------------------------------------------------
        # FOOTPATH
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "footpath"
        ):
            footpath_width = self._number(
                parameters.get(
                    "footpath_width_m"
                )
            )

            if footpath_width is None:
                raise ValueError(
                    "footpath_width_m is required for footpath intervention."
                )

            if footpath_width <= 0:
                raise ValueError(
                    "footpath_width_m must be greater than zero."
                )

            updated_design[
                "site_elements"
            ][
                "pedestrian_circulation"
            ] = True

            updated_design[
                "site_elements"
            ][
                "footpath_width_m"
            ] = footpath_width

        # --------------------------------------------------
        # TRAFFIC SIGNAL
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "traffic_signal"
        ):
            updated_design[
                "site_elements"
            ][
                "traffic_signal"
            ] = True

        # --------------------------------------------------
        # NEW ROAD
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "new_road"
        ):
            updated_design[
                "site_elements"
            ][
                "new_road"
            ] = True

        # --------------------------------------------------
        # COMMERCIAL BUILDING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "commercial_building"
        ):
            updated_design[
                "building"
            ][
                "type"
            ] = "commercial"

        # --------------------------------------------------
        # RESIDENTIAL BUILDING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "residential_building"
        ):
            updated_design[
                "building"
            ][
                "type"
            ] = "residential"

        # --------------------------------------------------
        # BUS STOP
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "bus_stop"
        ):
            updated_design[
                "site_elements"
            ][
                "bus_stop"
            ] = True

        # --------------------------------------------------
        # STREET LIGHTING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "street_lighting"
        ):
            updated_design[
                "site_elements"
            ][
                "street_lighting"
            ] = True

        # --------------------------------------------------
        # DRAINAGE
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "drainage"
        ):
            updated_design[
                "site_elements"
            ][
                "drainage"
            ] = True

        # --------------------------------------------------
        # RAINWATER HARVESTING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "rainwater_harvesting"
        ):
            updated_design[
                "site_elements"
            ][
                "rainwater_harvesting"
            ] = True

        # --------------------------------------------------
        # SOLAR
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "solar"
        ):
            updated_design[
                "site_elements"
            ][
                "solar"
            ] = True

        # --------------------------------------------------
        # EV CHARGING
        # --------------------------------------------------

        elif (
            normalized_intervention
            == "ev_charging"
        ):
            updated_design[
                "site_elements"
            ][
                "ev_charging"
            ] = True

        else:
            raise ValueError(
                f"Unsupported intervention: {intervention}"
            )

        # --------------------------------------------------
        # Metadata
        # --------------------------------------------------

        updated_design[
            "scenario"
        ] = {
            "intervention":
                normalized_intervention,
            "parameters":
                deepcopy(parameters),
        }

        if isinstance(
            scenario_project,
            dict
        ):
            updated_design[
                "scenario_project"
            ] = deepcopy(
                scenario_project
            )

        return {
            "status": "success",
            "baseline_design": design,
            "scenario_design": updated_design,
        }

    @staticmethod
    def _number(
        value: Any,
    ) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (
            TypeError,
            ValueError,
        ):
            return None


scenario_design_service = (
    ScenarioDesignService()
)