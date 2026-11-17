from typing import Any, Dict, List
from app.services.building_profile_service import building_profile_service



class SpaceProgramService:
    """
    Generates a conceptual architectural space program from the
    normalized building information.

    This is a planning/layout layer only.
    It does not replace architectural approval or regulatory checks.
    """

    # ---------------------------------------------------------
    # HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _number(value: Any) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _integer(value: Any) -> int | None:
        if value is None:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _space(
        name: str,
        space_type: str,
        area_m2: float,
    ) -> Dict[str, Any]:
        return {
            "name": name,
            "type": space_type,
            "area_m2": round(max(area_m2, 0), 2),
        }

    # ---------------------------------------------------------
    # COMMERCIAL PROGRAM
    # ---------------------------------------------------------

    def _commercial_spaces(
        self,
        floor: int,
        floor_area: float,
        subtype: str | None,
    ) -> List[Dict[str, Any]]:

        spaces: List[Dict[str, Any]] = []

        if floor_area <= 0:
            return spaces

        # -----------------------------------------------------
        # Shared circulation/core allocation
        # -----------------------------------------------------

        reception_area = (
            min(max(floor_area * 0.06, 25), 60)
            if floor == 0
            else 0
        )

        toilet_area = min(
            max(floor_area * 0.05, 20),
            45,
        )

        staircase_area = min(
            max(floor_area * 0.04, 20),
            35,
        )

        lift_area = min(
            max(floor_area * 0.015, 8),
            15,
        )

        service_area = min(
            max(floor_area * 0.04, 15),
            40,
        )

        fixed_area = (
            reception_area
            + toilet_area
            + staircase_area
            + lift_area
            + service_area
        )

        circulation_area = max(
            floor_area * 0.12,
            25,
        )

        fixed_area += circulation_area

        remaining_area = max(
            floor_area - fixed_area,
            0,
        )

        # -----------------------------------------------------
        # Ground floor
        # -----------------------------------------------------

        if floor == 0:

            spaces.append(
                self._space(
                    "Reception / Lobby",
                    "circulation",
                    reception_area,
                )
            )

            # Subtype is preserved as descriptive metadata.
            commercial_name = (
                subtype.strip()
                if isinstance(subtype, str)
                and subtype.strip()
                else "Commercial Unit"
            )

            # Split the remaining commercial area into units.
            unit_count = 2

            if remaining_area >= 600:
                unit_count = 3

            if remaining_area >= 1000:
                unit_count = 4

            # Allocate ALL remaining area to commercial units.
            retail_area = (
                remaining_area
                if remaining_area > 0
                else 0
            )

            individual_unit_area = (
                retail_area / unit_count
                if unit_count > 0
                else 0
            )

            for index in range(unit_count):
                spaces.append(
                    self._space(
                        f"{commercial_name} Unit {index + 1}",
                        "commercial",
                        individual_unit_area,
                    )
                )

            spaces.append(
                self._space(
                    "Toilets",
                    "service",
                    toilet_area,
                )
            )

            spaces.append(
                self._space(
                    "Staircase",
                    "vertical_circulation",
                    staircase_area,
                )
            )

            spaces.append(
                self._space(
                    "Lift",
                    "vertical_circulation",
                    lift_area,
                )
            )

            spaces.append(
                self._space(
                    "Service / Utility",
                    "service",
                    service_area,
                )
            )

            spaces.append(
                self._space(
                    "Circulation",
                    "circulation",
                    circulation_area,
                )
            )

        # -----------------------------------------------------
        # Upper floors
        # -----------------------------------------------------

        else:

            commercial_name = (
                subtype.strip()
                if isinstance(subtype, str)
                and subtype.strip()
                else "Commercial"
            )

            # Allocate ALL remaining area to commercial units.
            commercial_area = (
                remaining_area
                if remaining_area > 0
                else 0
            )

            unit_count = 2

            if commercial_area >= 500:
                unit_count = 3

            if commercial_area >= 900:
                unit_count = 4

            individual_unit_area = (
                commercial_area / unit_count
                if unit_count > 0
                else 0
            )

            for index in range(unit_count):
                spaces.append(
                    self._space(
                        f"{commercial_name} Unit {index + 1}",
                        "commercial",
                        individual_unit_area,
                    )
                )

            spaces.append(
                self._space(
                    "Toilets",
                    "service",
                    toilet_area,
                )
            )

            spaces.append(
                self._space(
                    "Staircase",
                    "vertical_circulation",
                    staircase_area,
                )
            )

            spaces.append(
                self._space(
                    "Lift",
                    "vertical_circulation",
                    lift_area,
                )
            )

            spaces.append(
                self._space(
                    "Service / Utility",
                    "service",
                    service_area,
                )
            )

            spaces.append(
                self._space(
                    "Circulation",
                    "circulation",
                    circulation_area,
                )
            )

        return spaces

    # ---------------------------------------------------------
    # RESIDENTIAL PROGRAM
    # ---------------------------------------------------------

    def _residential_spaces(
        self,
        floor: int,
        floor_area: float,
    ) -> List[Dict[str, Any]]:

        if floor_area <= 0:
            return []

        spaces: List[Dict[str, Any]] = []

        living_area = floor_area * 0.18
        dining_area = floor_area * 0.10
        kitchen_area = floor_area * 0.10

        bedroom_area = floor_area * 0.25
        toilet_area = floor_area * 0.08
        circulation_area = floor_area * 0.12
        staircase_area = floor_area * 0.05
        utility_area = floor_area * 0.04

        remaining = (
            floor_area
            - (
                living_area
                + dining_area
                + kitchen_area
                + bedroom_area
                + toilet_area
                + circulation_area
                + staircase_area
                + utility_area
            )
        )

        spaces.extend(
            [
                self._space(
                    "Living Room",
                    "residential",
                    living_area,
                ),
                self._space(
                    "Dining",
                    "residential",
                    dining_area,
                ),
                self._space(
                    "Kitchen",
                    "service",
                    kitchen_area,
                ),
                self._space(
                    "Bedrooms",
                    "residential",
                    bedroom_area + max(remaining, 0),
                ),
                self._space(
                    "Toilets",
                    "service",
                    toilet_area,
                ),
                self._space(
                    "Staircase",
                    "vertical_circulation",
                    staircase_area,
                ),
                self._space(
                    "Utility",
                    "service",
                    utility_area,
                ),
                self._space(
                    "Circulation",
                    "circulation",
                    circulation_area,
                ),
            ]
        )

        return spaces

    # ---------------------------------------------------------
    # GENERIC PROGRAM
    # ---------------------------------------------------------

    def _generic_spaces(
        self,
        floor: int,
        floor_area: float,
    ) -> List[Dict[str, Any]]:

        if floor_area <= 0:
            return []

        return [
            self._space(
                "Main Space",
                "primary",
                floor_area * 0.60,
            ),
            self._space(
                "Circulation",
                "circulation",
                floor_area * 0.15,
            ),
            self._space(
                "Toilets",
                "service",
                floor_area * 0.08,
            ),
            self._space(
                "Staircase",
                "vertical_circulation",
                floor_area * 0.05,
            ),
            self._space(
                "Utility / Service",
                "service",
                floor_area * 0.07,
            ),
            self._space(
                "Other",
                "support",
                floor_area * 0.05,
            ),
        ]


    def _profile_spaces(
        self,
        floor_area: float,
        building_type: str,
        subtype: str | None,
    ) -> List[Dict[str, Any]] | None:
        """Build spaces from a subtype profile, scaled to the floor area."""

        if floor_area <= 0 or not subtype:
            return None

        try:
            profile = building_profile_service.get_profile(
                building_type,
                subtype,
            )
        except ValueError:
            # Preserve the existing generator for unsupported legacy types.
            return None

        profile_spaces = profile.get("spaces", [])
        base_total = sum(
            float(space.get("area_m2", 0))
            for space in profile_spaces
        )

        if base_total <= 0:
            return None

        type_by_zone = {
            "public": "commercial",
            "work": "commercial",
            "guest": "residential",
            "private": "residential",
            "service": "service",
            "staff": "support",
            "learning": "primary",
            "clinical": "primary",
            "operations": "primary",
            "logistics": "commercial",
            "circulation": "circulation",
            "outdoor": "support",
            "activity": "primary",
            "support": "support",
            "shared": "commercial",
        }

        spaces: List[Dict[str, Any]] = []
        allocated = 0.0

        for index, item in enumerate(profile_spaces):
            if index == len(profile_spaces) - 1:
                # Avoid accumulated rounding errors.
                area = max(floor_area - allocated, 0.0)
            else:
                area = round(
                    floor_area
                    * float(item.get("area_m2", 0))
                    / base_total,
                    2,
                )
                allocated += area

            zone = str(item.get("zone", "primary")).lower()

            spaces.append(
                self._space(
                    str(item.get("name", "Space")),
                    type_by_zone.get(zone, "primary"),
                    area,
                )
            )

        return spaces


    # ---------------------------------------------------------
    # PUBLIC API
    # ---------------------------------------------------------

    def generate_space_program(
        self,
        building: Dict[str, Any],
    ) -> Dict[str, Any]:

        building_type = str(
            building.get("type") or "generic"
        ).lower()

        subtype = building.get("subtype")

        floors = self._integer(
            building.get("floors")
        )

        builtup_area = self._number(
            building.get(
                "estimated_builtup_area_m2"
            )
        )

        footprint_area = self._number(
            building.get(
                "footprint_area_m2"
            )
        )

        # -----------------------------------------------------
        # Determine usable building area
        # -----------------------------------------------------

        if (
            builtup_area is None
            or builtup_area <= 0
        ):

            if (
                footprint_area is not None
                and footprint_area > 0
                and floors is not None
                and floors > 0
            ):
                builtup_area = (
                    footprint_area * floors
                )

            else:
                builtup_area = 0

        if floors is None or floors <= 0:
            floors = 1

        floor_area = (
            builtup_area / floors
            if floors > 0
            else 0
        )

        floor_programs: List[
            Dict[str, Any]
        ] = []

        total_program_area = 0.0

        # -----------------------------------------------------
        # Generate every floor
        # -----------------------------------------------------

        for floor in range(floors):

            if building_type == "commercial":

                
                spaces = self._profile_spaces(
                    floor_area=floor_area,
                    building_type=building_type,
                    subtype=subtype,
                )

                if spaces is None:
                    if building_type == "commercial":
                        spaces = self._commercial_spaces(
                            floor=floor,
                            floor_area=floor_area,
                            subtype=subtype,
                        )
                    elif building_type == "residential":
                        spaces = self._residential_spaces(
                            floor=floor,
                            floor_area=floor_area,
                        )
                    else:
                        spaces = self._generic_spaces(
                            floor=floor,
                            floor_area=floor_area,
                        )


            elif building_type == "residential":

                spaces = self._residential_spaces(
                    floor=floor,
                    floor_area=floor_area,
                )

            else:

                spaces = self._generic_spaces(
                    floor=floor,
                    floor_area=floor_area,
                )

            floor_total = sum(
                float(
                    space.get(
                        "area_m2",
                        0,
                    )
                )
                for space in spaces
            )

            total_program_area += floor_total

            floor_programs.append(
                {
                    "floor": floor,
                    "name": (
                        "Ground Floor"
                        if floor == 0
                        else f"Floor {floor}"
                    ),
                    "area_m2": round(
                        floor_area,
                        2,
                    ),
                    "spaces": spaces,
                    "total_allocated_area_m2": round(
                        floor_total,
                        2,
                    ),
                }
            )

        return {
            "building_type": building_type,
            "building_subtype": subtype,
            "number_of_floors": floors,
            "total_builtup_area_m2": round(
                builtup_area,
                2,
            ),
            "floor_area_m2": round(
                floor_area,
                2,
            ),
            "total_allocated_area_m2": round(
                total_program_area,
                2,
            ),
            "floors": floor_programs,
            "status": "conceptual",
        }


space_program_service = SpaceProgramService()