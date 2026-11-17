
from __future__ import annotations

from copy import deepcopy
from typing import Any


# Area values are initial conceptual targets, not building-code requirements.
# Room areas are in square metres.
BUILDING_PROFILES: dict[str, dict[str, Any]] = {
    "residential": {
        "label": "Residential",
        "subtypes": {
            "independent_house": {
                "label": "Independent House",
                "spaces": [
                    {"name": "Living Room", "area_m2": 24, "priority": 5, "zone": "public"},
                    {"name": "Kitchen", "area_m2": 12, "priority": 5, "zone": "service"},
                    {"name": "Dining", "area_m2": 12, "priority": 4, "zone": "public"},
                    {"name": "Master Bedroom", "area_m2": 18, "priority": 5, "zone": "private"},
                    {"name": "Bedroom", "area_m2": 14, "priority": 4, "zone": "private"},
                    {"name": "Bathroom", "area_m2": 5, "priority": 5, "zone": "service"},
                    {"name": "Utility", "area_m2": 5, "priority": 3, "zone": "service"},
                ],
                "priorities": ["privacy", "daylight", "natural_ventilation", "outdoor_space"],
                "access": ["pedestrian_entry", "residential_vehicle_access"],
            },
            "apartment": {
                "label": "Apartment Building",
                "spaces": [
                    {"name": "Living Room", "area_m2": 22, "priority": 5, "zone": "public"},
                    {"name": "Kitchen", "area_m2": 10, "priority": 5, "zone": "service"},
                    {"name": "Master Bedroom", "area_m2": 16, "priority": 5, "zone": "private"},
                    {"name": "Bedroom", "area_m2": 12, "priority": 4, "zone": "private"},
                    {"name": "Bathroom", "area_m2": 5, "priority": 5, "zone": "service"},
                    {"name": "Balcony", "area_m2": 5, "priority": 3, "zone": "outdoor"},
                ],
                "priorities": ["privacy", "daylight", "natural_ventilation", "vertical_circulation"],
                "access": ["pedestrian_entry", "vehicle_access", "accessible_route"],
            },
            "villa": {
                "label": "Villa",
                "spaces": [
                    {"name": "Living Room", "area_m2": 30, "priority": 5, "zone": "public"},
                    {"name": "Kitchen", "area_m2": 14, "priority": 5, "zone": "service"},
                    {"name": "Dining", "area_m2": 16, "priority": 4, "zone": "public"},
                    {"name": "Master Bedroom", "area_m2": 22, "priority": 5, "zone": "private"},
                    {"name": "Bedroom", "area_m2": 16, "priority": 4, "zone": "private"},
                    {"name": "Study", "area_m2": 10, "priority": 3, "zone": "private"},
                    {"name": "Outdoor Living", "area_m2": 20, "priority": 4, "zone": "outdoor"},
                ],
                "priorities": ["privacy", "daylight", "landscape", "natural_ventilation"],
                "access": ["pedestrian_entry", "vehicle_access", "private_outdoor_access"],
            },
        },
    },
    "commercial": {
        "label": "Commercial",
        "subtypes": {
            "office": {
                "label": "Office Building",
                "spaces": [
                    {"name": "Reception", "area_m2": 18, "priority": 5, "zone": "public"},
                    {"name": "Open Workspace", "area_m2": 60, "priority": 5, "zone": "work"},
                    {"name": "Meeting Room", "area_m2": 20, "priority": 4, "zone": "work"},
                    {"name": "Private Office", "area_m2": 14, "priority": 3, "zone": "work"},
                    {"name": "Pantry", "area_m2": 8, "priority": 3, "zone": "service"},
                    {"name": "Toilets", "area_m2": 12, "priority": 5, "zone": "service"},
                ],
                "priorities": ["daylight", "efficient_circulation", "flexibility", "acoustic_comfort"],
                "access": ["public_entry", "accessible_route", "service_access", "emergency_egress"],
            },
            "retail_store": {
                "label": "Retail Store",
                "spaces": [
                    {"name": "Sales Floor", "area_m2": 60, "priority": 5, "zone": "public"},
                    {"name": "Checkout", "area_m2": 10, "priority": 5, "zone": "public"},
                    {"name": "Stockroom", "area_m2": 18, "priority": 4, "zone": "service"},
                    {"name": "Staff Room", "area_m2": 8, "priority": 3, "zone": "staff"},
                    {"name": "Toilets", "area_m2": 8, "priority": 4, "zone": "service"},
                ],
                "priorities": ["street_visibility", "customer_flow", "delivery_access", "accessible_route"],
                "access": ["customer_entry", "service_access", "accessible_route", "emergency_egress"],
            },
            "restaurant": {
                "label": "Restaurant / Cafe",
                "spaces": [
                    {"name": "Dining Area", "area_m2": 50, "priority": 5, "zone": "public"},
                    {"name": "Kitchen", "area_m2": 25, "priority": 5, "zone": "service"},
                    {"name": "Food Preparation", "area_m2": 12, "priority": 5, "zone": "service"},
                    {"name": "Dry Storage", "area_m2": 8, "priority": 4, "zone": "service"},
                    {"name": "Wash Area", "area_m2": 6, "priority": 4, "zone": "service"},
                    {"name": "Toilets", "area_m2": 10, "priority": 5, "zone": "service"},
                ],
                "priorities": ["kitchen_workflow", "customer_flow", "ventilation", "service_access"],
                "access": ["customer_entry", "deliveries", "accessible_route", "emergency_egress"],
            },
            "hotel": {
                "label": "Hotel",
                "spaces": [
                    {"name": "Lobby", "area_m2": 40, "priority": 5, "zone": "public"},
                    {"name": "Reception", "area_m2": 16, "priority": 5, "zone": "public"},
                    {"name": "Guest Room", "area_m2": 22, "priority": 5, "zone": "guest"},
                    {"name": "Housekeeping", "area_m2": 10, "priority": 4, "zone": "service"},
                    {"name": "Restaurant", "area_m2": 30, "priority": 3, "zone": "public"},
                    {"name": "Staff Area", "area_m2": 12, "priority": 3, "zone": "staff"},
                ],
                "priorities": ["guest_privacy", "vertical_circulation", "service_separation", "fire_egress"],
                "access": ["guest_entry", "service_access", "accessible_route", "emergency_egress"],
            },
            "warehouse": {
                "label": "Warehouse",
                "spaces": [
                    {"name": "Storage Area", "area_m2": 180, "priority": 5, "zone": "operations"},
                    {"name": "Loading Bay", "area_m2": 35, "priority": 5, "zone": "logistics"},
                    {"name": "Dispatch Area", "area_m2": 20, "priority": 4, "zone": "logistics"},
                    {"name": "Office", "area_m2": 15, "priority": 3, "zone": "staff"},
                    {"name": "Staff Facilities", "area_m2": 10, "priority": 3, "zone": "service"},
                ],
                "priorities": ["truck_movement", "loading_access", "operational_flow", "fire_access"],
                "access": ["truck_entry", "loading_access", "emergency_access"],
            },
            "shopping_mall": {
                "label": "Shopping Mall",
                "spaces": [
                    {"name": "Retail Units", "area_m2": 120, "priority": 5, "zone": "public"},
                    {"name": "Common Circulation", "area_m2": 60, "priority": 5, "zone": "circulation"},
                    {"name": "Food Court", "area_m2": 45, "priority": 4, "zone": "public"},
                    {"name": "Service Area", "area_m2": 20, "priority": 4, "zone": "service"},
                    {"name": "Management Office", "area_m2": 12, "priority": 3, "zone": "staff"},
                ],
                "priorities": ["customer_flow", "vertical_circulation", "egress", "service_separation"],
                "access": ["multiple_public_entries", "service_access", "accessible_route", "emergency_egress"],
            },
            "coworking": {
                "label": "Co-working Space",
                "spaces": [
                    {"name": "Shared Workspace", "area_m2": 55, "priority": 5, "zone": "work"},
                    {"name": "Reception", "area_m2": 12, "priority": 4, "zone": "public"},
                    {"name": "Meeting Rooms", "area_m2": 24, "priority": 4, "zone": "work"},
                    {"name": "Phone Booths", "area_m2": 8, "priority": 3, "zone": "work"},
                    {"name": "Pantry", "area_m2": 8, "priority": 3, "zone": "service"},
                    {"name": "Toilets", "area_m2": 10, "priority": 5, "zone": "service"},
                ],
                "priorities": ["flexibility", "acoustic_comfort", "daylight", "shared_circulation"],
                "access": ["public_entry", "accessible_route", "emergency_egress"],
            },
        },
    },
    "institutional": {
        "label": "Institutional",
        "subtypes": {
            "school": {
                "label": "School",
                "spaces": [
                    {"name": "Classroom", "area_m2": 45, "priority": 5, "zone": "learning"},
                    {"name": "Library", "area_m2": 35, "priority": 4, "zone": "learning"},
                    {"name": "Staff Room", "area_m2": 18, "priority": 3, "zone": "staff"},
                    {"name": "Administration", "area_m2": 15, "priority": 4, "zone": "staff"},
                    {"name": "Toilets", "area_m2": 16, "priority": 5, "zone": "service"},
                    {"name": "Activity Space", "area_m2": 50, "priority": 4, "zone": "outdoor"},
                ],
                "priorities": ["safe_pedestrian_flow", "daylight", "supervision", "outdoor_activity"],
                "access": ["controlled_entry", "school_dropoff", "service_access", "emergency_egress"],
            },
            "college": {
                "label": "College / University",
                "spaces": [
                    {"name": "Classroom", "area_m2": 50, "priority": 5, "zone": "learning"},
                    {"name": "Lecture Hall", "area_m2": 90, "priority": 4, "zone": "learning"},
                    {"name": "Faculty Office", "area_m2": 14, "priority": 3, "zone": "staff"},
                    {"name": "Library / Study", "area_m2": 45, "priority": 4, "zone": "learning"},
                    {"name": "Common Area", "area_m2": 30, "priority": 3, "zone": "shared"},
                    {"name": "Toilets", "area_m2": 16, "priority": 5, "zone": "service"},
                ],
                "priorities": ["campus_circulation", "flexible_learning", "daylight", "accessible_route"],
                "access": ["pedestrian_entry", "dropoff", "service_access", "emergency_egress"],
            },
            "hospital": {
                "label": "Hospital / Clinic",
                "spaces": [
                    {"name": "Reception / Waiting", "area_m2": 30, "priority": 5, "zone": "public"},
                    {"name": "Consultation Room", "area_m2": 14, "priority": 5, "zone": "clinical"},
                    {"name": "Treatment Room", "area_m2": 18, "priority": 5, "zone": "clinical"},
                    {"name": "Nurse Station", "area_m2": 12, "priority": 4, "zone": "clinical"},
                    {"name": "Clean Utility", "area_m2": 8, "priority": 4, "zone": "clinical"},
                    {"name": "Staff Area", "area_m2": 12, "priority": 3, "zone": "staff"},
                ],
                "priorities": ["patient_flow", "emergency_access", "clinical_separation", "infection_control"],
                "access": ["patient_entry", "ambulance_access", "accessible_route", "emergency_egress"],
            },
        },
    },
    "industrial": {
        "label": "Industrial",
        "subtypes": {
            "factory": {
                "label": "Factory",
                "spaces": [
                    {"name": "Production Floor", "area_m2": 160, "priority": 5, "zone": "operations"},
                    {"name": "Raw Material Storage", "area_m2": 35, "priority": 4, "zone": "logistics"},
                    {"name": "Finished Goods Storage", "area_m2": 35, "priority": 4, "zone": "logistics"},
                    {"name": "Quality Control", "area_m2": 16, "priority": 4, "zone": "operations"},
                    {"name": "Staff Facilities", "area_m2": 15, "priority": 3, "zone": "staff"},
                ],
                "priorities": ["process_flow", "vehicle_access", "worker_safety", "fire_access"],
                "access": ["goods_entry", "loading_access", "worker_entry", "emergency_access"],
            },
            "workshop": {
                "label": "Workshop",
                "spaces": [
                    {"name": "Workshop Floor", "area_m2": 90, "priority": 5, "zone": "operations"},
                    {"name": "Tool Storage", "area_m2": 12, "priority": 4, "zone": "service"},
                    {"name": "Workstation", "area_m2": 20, "priority": 4, "zone": "operations"},
                    {"name": "Office", "area_m2": 12, "priority": 3, "zone": "staff"},
                    {"name": "Staff Facilities", "area_m2": 10, "priority": 3, "zone": "service"},
                ],
                "priorities": ["workflow", "worker_safety", "ventilation", "service_access"],
                "access": ["goods_entry", "worker_entry", "emergency_access"],
            },
        },
    },
    "recreational": {
        "label": "Recreational",
        "subtypes": {
            "sports_complex": {
                "label": "Sports Complex",
                "spaces": [
                    {"name": "Main Activity Area", "area_m2": 150, "priority": 5, "zone": "activity"},
                    {"name": "Changing Rooms", "area_m2": 25, "priority": 4, "zone": "service"},
                    {"name": "Equipment Storage", "area_m2": 12, "priority": 3, "zone": "service"},
                    {"name": "Reception", "area_m2": 12, "priority": 3, "zone": "public"},
                    {"name": "First Aid Room", "area_m2": 10, "priority": 4, "zone": "support"},
                ],
                "priorities": ["safe_circulation", "accessible_route", "ventilation", "open_space"],
                "access": ["public_entry", "service_access", "emergency_access"],
            },
            "community_center": {
                "label": "Community Center",
                "spaces": [
                    {"name": "Multipurpose Hall", "area_m2": 90, "priority": 5, "zone": "public"},
                    {"name": "Meeting Room", "area_m2": 20, "priority": 4, "zone": "public"},
                    {"name": "Office", "area_m2": 12, "priority": 3, "zone": "staff"},
                    {"name": "Storage", "area_m2": 10, "priority": 3, "zone": "service"},
                    {"name": "Toilets", "area_m2": 12, "priority": 5, "zone": "service"},
                ],
                "priorities": ["flexible_use", "accessible_route", "community_access", "daylight"],
                "access": ["public_entry", "service_access", "emergency_egress"],
            },
        },
    },
}


class BuildingProfileService:
    """Provides subtype-specific conceptual space and design requirements."""

    def list_categories(self) -> list[dict[str, Any]]:
        return [
            {
                "id": category_id,
                "label": category["label"],
                "subtypes": [
                    {"id": subtype_id, "label": profile["label"]}
                    for subtype_id, profile in category["subtypes"].items()
                ],
            }
            for category_id, category in BUILDING_PROFILES.items()
        ]

    def get_profile(
        self,
        building_type: str,
        subtype: str,
    ) -> dict[str, Any]:
        category_key = self._normalize(building_type)
        subtype_key = self._normalize(subtype)

        # Support common aliases from existing project records/UI.
        category_aliases = {
            "residential_building": "residential",
            "commercial_building": "commercial",
            "educational": "institutional",
            "education": "institutional",
            "industrial_building": "industrial",
            "recreation": "recreational",
        }
        subtype_aliases = {
            "independent_house": "independent_house",
            "house": "independent_house",
            "apartment_building": "apartment",
            "office_building": "office",
            "restaurant_cafe": "restaurant",
            "clinic": "hospital",
            "university": "college",
            "sports": "sports_complex",
            "community": "community_center",
        }

        category_key = category_aliases.get(category_key, category_key)
        subtype_key = subtype_aliases.get(subtype_key, subtype_key)

        category = BUILDING_PROFILES.get(category_key)
        if not category:
            raise ValueError(f"Unsupported building category: {building_type}")

        profile = category["subtypes"].get(subtype_key)
        if not profile:
            raise ValueError(
                f"Unsupported subtype '{subtype}' for category '{building_type}'. "
                f"Supported subtypes: {', '.join(category['subtypes'])}"
            )

        result = deepcopy(profile)
        result["building_type"] = category_key
        result["building_subtype"] = subtype_key
        result["total_programmed_area_m2"] = round(
            sum(space["area_m2"] for space in result["spaces"]), 2
        )
        return result

    def build_space_requirements(
        self,
        building_type: str,
        subtype: str,
        requested_area_m2: float | None = None,
    ) -> dict[str, Any]:
        """Return a profile with areas scaled to an optional area budget."""
        profile = self.get_profile(building_type, subtype)
        base_area = profile["total_programmed_area_m2"]

        if requested_area_m2 is not None:
            if requested_area_m2 <= 0:
                raise ValueError("requested_area_m2 must be greater than zero")

            scale = requested_area_m2 / base_area
            for space in profile["spaces"]:
                space["area_m2"] = round(space["area_m2"] * scale, 2)

            profile["total_programmed_area_m2"] = round(
                sum(space["area_m2"] for space in profile["spaces"]), 2
            )

        return profile

    @staticmethod
    def _normalize(value: str) -> str:
        return (
            str(value)
            .strip()
            .lower()
            .replace("&", "and")
            .replace("/", "_")
            .replace("-", "_")
            .replace(" ", "_")
    )


building_profile_service = BuildingProfileService()
