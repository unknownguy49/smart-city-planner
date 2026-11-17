from typing import Any, Dict
from math import cos, radians, sqrt

from shapely.affinity import scale
from shapely.geometry import Polygon, box
from shapely.ops import transform

from app.services.space_program_service import (
    space_program_service,
)


class DesignService:
    """
    Converts the Architecture Agent output into a normalized
    design specification for the visualization and layout layers.

    This service does not invent regulatory values.
    It only uses values already produced by the Architecture Agent.

    The space program is a conceptual architectural layout layer.
    It is derived from the normalized building information.
    """

    @staticmethod
    def _number(
        value: Any,
    ) -> float | None:
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _integer(
        value: Any,
    ) -> int | None:
        if value is None:
            return None

        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    
    @staticmethod
    def _place_building_footprint(
        ring: list,
        target_area_m2: float | None,
    ) -> dict:
        """Create a conceptual rectangular footprint inside the site."""
        result = {
            "geometry": None,
            "target_area_m2": target_area_m2,
            "status": "not_placed",
        }

        if (
            not isinstance(target_area_m2, (int, float))
            or isinstance(target_area_m2, bool)
            or target_area_m2 <= 0
            or len(ring) < 4
        ):
            return result

        try:
            boundary = Polygon(ring)

            if (
                boundary.is_empty
                or not boundary.is_valid
                or boundary.area <= 0
            ):
                return result

            center = boundary.centroid
            center_lng = center.x
            center_lat = center.y

            # Convert longitude/latitude differences to local metres.
            meters_per_degree_lat = 111_320.0
            meters_per_degree_lng = (
                meters_per_degree_lat
                * cos(radians(center_lat))
            )

            if meters_per_degree_lng <= 0:
                return result

            def to_local(x, y, z=None):
                return (
                    (x - center_lng) * meters_per_degree_lng,
                    (y - center_lat) * meters_per_degree_lat,
                )

            def to_wgs84(x, y, z=None):
                return (
                    x / meters_per_degree_lng + center_lng,
                    y / meters_per_degree_lat + center_lat,
                )

            local_boundary = transform(to_local, boundary)

            if (
                local_boundary.is_empty
                or not local_boundary.is_valid
                or local_boundary.area < target_area_m2
            ):
                return result

            min_x, min_y, max_x, max_y = local_boundary.bounds

            # Try several aspect ratios and progressively smaller areas.
            best_candidate = None
            best_area = 0.0

            for area_factor in (1.0, 0.98, 0.95, 0.90, 0.85, 0.80):
                candidate_area = target_area_m2 * area_factor

                for ratio in (1.0, 1.2, 1.5, 2.0, 0.8, 0.67):
                    width = sqrt(candidate_area * ratio)
                    height = candidate_area / width

                    if (
                        width > max_x - min_x
                        or height > max_y - min_y
                    ):
                        continue

                    # Search candidate centers throughout the site bounds.
                    for ix in range(25):
                        cx = min_x + (
                            (ix + 0.5) / 25
                        ) * (max_x - min_x)

                        for iy in range(25):
                            cy = min_y + (
                                (iy + 0.5) / 25
                            ) * (max_y - min_y)

                            candidate = box(
                                cx - width / 2,
                                cy - height / 2,
                                cx + width / 2,
                                cy + height / 2,
                            )

                            if local_boundary.covers(candidate):
                                if candidate.area > best_area:
                                    best_candidate = candidate
                                    best_area = candidate.area

                if best_candidate is not None:
                    break

            if best_candidate is None:
                return result

            geographic_candidate = transform(
                to_wgs84,
                best_candidate,
            )

            result["geometry"] = {
                "type": "Polygon",
                "coordinates": [
                    [
                        [float(x), float(y)]
                        for x, y in geographic_candidate.exterior.coords
                    ]
                ],
            }
            result["status"] = "placed"
            result["placed_area_m2"] = round(best_area, 2)

            return result

        except (ValueError, TypeError, OverflowError):
            return result


    def build_design_specification(
        self,
        project: Dict[str, Any],
        architecture_result: Dict[str, Any],
        site_context: Dict[str, Any] | None = None,
        site_suitability: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        existing_spec = architecture_result.get(
            "design_specification"
        )

        if isinstance(existing_spec, dict):
            specification = dict(existing_spec)
        else:
            specification = {}

        # --------------------------------------------------
        # SITE
        # --------------------------------------------------

        existing_site = specification.get(
            "site"
        )

        if not isinstance(existing_site, dict):
            existing_site = {}

        site = {
            "area_m2": self._number(
                existing_site.get(
                    "area_m2",
                    project.get("area"),
                )
            ),
            "jurisdiction": existing_site.get(
                "jurisdiction",
                project.get("jurisdiction"),
            ),
            "state": existing_site.get(
                "state",
                project.get("state"),
            ),
            "city": existing_site.get(
                "city",
                project.get("city"),
            ),
        }

        # --------------------------------------------------
        # BUILDING
        # --------------------------------------------------

        existing_building = specification.get(
            "building"
        )

        if not isinstance(existing_building, dict):
            existing_building = {}

        building_type = existing_building.get(
            "type",
            project.get("building_type"),
        )

        building_subtype = existing_building.get(
            "subtype",
            project.get("commercial_subtype"),
        )

        floors = self._integer(
            existing_building.get(
                "floors",
                architecture_result.get("floors"),
            )
        )

        height_m = self._number(
            existing_building.get(
                "height_m",
                architecture_result.get(
                    "building_height_m"
                ),
            )
        )

        far = self._number(
            existing_building.get(
                "far",
                architecture_result.get(
                    "proposed_far"
                ),
            )
        )

        ground_coverage = self._number(
            existing_building.get(
                "ground_coverage_percent",
                architecture_result.get(
                    "proposed_ground_coverage_percent"
                ),
            )
        )

        builtup_area = self._number(
            existing_building.get(
                "estimated_builtup_area_m2",
                architecture_result.get(
                    "estimated_builtup_area"
                ),
            )
        )

        # --------------------------------------------------
        # FOOTPRINT AREA
        # --------------------------------------------------

        footprint_area = None

        site_area = site.get(
            "area_m2"
        )

        if (
            isinstance(site_area, (int, float))
            and isinstance(
                ground_coverage,
                (int, float),
            )
        ):
            if (
                site_area > 0
                and ground_coverage >= 0
            ):
                footprint_area = (
                    site_area
                    * ground_coverage
                    / 100
                )

        building = {
            "type": building_type,
            "subtype": building_subtype,
            "floors": floors,
            "height_m": height_m,
            "far": far,
            "ground_coverage_percent": (
                ground_coverage
            ),
            "estimated_builtup_area_m2": (
                builtup_area
            ),
            "footprint_area_m2": (
                footprint_area
            ),
        }

        # --------------------------------------------------
        # SITE ELEMENTS
        # --------------------------------------------------

        existing_elements = specification.get(
            "site_elements"
        )

        if not isinstance(existing_elements, dict):
            existing_elements = {}

        parking_capacity = self._integer(
            existing_elements.get(
                "parking_capacity",
                architecture_result.get(
                    "parking_capacity"
                ),
            )
        )

        site_elements = {
            "parking": existing_elements.get(
                "parking",
                bool(
                    parking_capacity
                    and parking_capacity > 0
                ),
            ),
            "parking_capacity": parking_capacity,
            "green_area": existing_elements.get(
                "green_area",
                True,
            ),
            "pedestrian_circulation": (
                existing_elements.get(
                    "pedestrian_circulation",
                    True,
                )
            ),
            "service_access": (
                existing_elements.get(
                    "service_access",
                    True,
                )
            ),
            "fire_access": (
                existing_elements.get(
                    "fire_access",
                    True,
                )
            ),
        }

        # --------------------------------------------------
        # REGULATORY BASIS
        # --------------------------------------------------

        existing_regulatory_basis = (
            specification.get(
                "regulatory_basis"
            )
        )

        if not isinstance(
            existing_regulatory_basis,
            dict,
        ):
            existing_regulatory_basis = {}

        selected_control = (
            existing_regulatory_basis.get(
                "selected_commercial_control"
            )
        )

        if selected_control is None:
            selected_control = architecture_result.get(
                "selected_commercial_control"
            )

        regulatory_basis = {
            "selected_commercial_control": (
                selected_control
            ),
        }

        # --------------------------------------------------
        # COORDINATES
        # --------------------------------------------------

        coordinates = project.get(
            "coordinates",
            [],
        )

        if not isinstance(
            coordinates,
            list,
        ):
            coordinates = []



        # --------------------------------------------------
        # SHARED SITE LAYOUT
        # --------------------------------------------------

        coordinate_pairs = []
        coordinates_valid = (
            isinstance(coordinates, list)
            and len(coordinates) >= 3
        )

        if coordinates_valid:
            for point in coordinates:
                if not isinstance(point, dict):
                    coordinates_valid = False
                    break

                lat = self._number(point.get("lat"))
                lng = self._number(point.get("lng"))

                if (
                    lat is None
                    or lng is None
                    or not (-90 <= lat <= 90)
                    or not (-180 <= lng <= 180)
                ):
                    coordinates_valid = False
                    break

                coordinate_pairs.append([lng, lat])

        # GeoJSON polygon rings must be closed.
        ring = list(coordinate_pairs)

        if coordinates_valid and ring[-1] != ring[0]:
            ring.append(ring[0])

        topology_checked = False
        valid_boundary = False

        if coordinates_valid and len(ring) >= 4:
            try:
                polygon = Polygon(ring)
                topology_checked = True
                valid_boundary = (
                    polygon.is_valid
                    and not polygon.is_empty
                    and polygon.area > 0
                )
            except (TypeError, ValueError):
                valid_boundary = False

        site_layout = {
            "schema_version": "1.0",
            "coordinate_system": "WGS84",
            "boundary": {
                "type": "Polygon" if valid_boundary else None,
                "coordinates": (
                    [ring] if valid_boundary else None
                ),
                "status": (
                    "provided" if valid_boundary
                    else "missing_or_invalid"
                ),
            },
            "building_footprint": self._place_building_footprint(
                ring if valid_boundary else [],
                footprint_area,
            ),
            "site_context": (
                site_context
                if isinstance(site_context, dict)
                else None
            ),
            "site_suitability": (
                site_suitability
                if isinstance(site_suitability, dict)
                else None
            ),
            "validation": {
                "boundary_coordinates_valid": coordinates_valid,
                "topology_checked": topology_checked,
                "regulatory_compliance_checked": False,
            },
        }

        # --------------------------------------------------
        # SPACE PROGRAM
        # --------------------------------------------------

        space_program = (
            space_program_service.generate_space_program(
                building=building,
            )
        )

        # --------------------------------------------------
        # FINAL SPECIFICATION
        # --------------------------------------------------

        return {
            "site": site,
            "building": building,
            "site_elements": site_elements,
            "regulatory_basis": regulatory_basis,
            "coordinates": coordinates,
            "space_program": space_program,
            "site_layout": site_layout,
        }

        
    def generate_design(
        self,
        project: Dict[str, Any],
        architecture_result: Dict[str, Any],
        site_context: Dict[str, Any] | None = None,
        site_suitability: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        specification = self.build_design_specification(
            project=project,
            architecture_result=architecture_result,
            site_context=site_context,
            site_suitability=site_suitability,
        )

        return {
            "status": "success",
            "design_specification": specification,
        }


design_service = DesignService()
