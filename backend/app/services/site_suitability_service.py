
from __future__ import annotations

import math
from typing import Any

from shapely.geometry import Polygon


class SiteSuitabilityService:
    """
    Preliminary geographic screening for a development site.

    This is a transparent screening heuristic, not a legal,
    environmental, or engineering approval.
    """

    FACILITY_CATEGORIES = (
        "parks",
        "hospitals",
        "schools",
        "colleges",
        "bus_stops",
        "police",
        "fire_stations",
    )

    @staticmethod
    def _distance_m(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """Calculate approximate great-circle distance in metres."""
        radius_m = 6_371_000.0

        lat1, lon1, lat2, lon2 = map(
            math.radians, (lat1, lon1, lat2, lon2)
        )

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1)
            * math.cos(lat2)
            * math.sin(dlon / 2) ** 2
        )

        return radius_m * 2 * math.asin(
            min(1.0, math.sqrt(a))
        )

    @staticmethod
    def _valid_number(value: Any) -> float | None:
        try:
            number = float(value)
            return number if math.isfinite(number) else None
        except (TypeError, ValueError):
            return None

    def evaluate(
        self,
        project: dict[str, Any],
        site_context: dict[str, Any],
    ) -> dict[str, Any]:
        findings: list[dict[str, Any]] = []
        recommendations: list[str] = []
        data_warnings: list[str] = []

        coordinates = project.get("coordinates") or []
        geometry_valid = False
        geometry_area_m2 = None

        # Validate the polygon using longitude/latitude coordinates.
        try:
            vertices = []

            for point in coordinates:
                lat = self._valid_number(point.get("lat"))
                lon = self._valid_number(
                    point.get("lng", point.get("lon"))
                )

                if (
                    lat is None
                    or lon is None
                    or not -90 <= lat <= 90
                    or not -180 <= lon <= 180
                ):
                    raise ValueError("Invalid plot coordinate.")

                vertices.append((lon, lat))

            if len(vertices) < 3:
                raise ValueError("At least three vertices are required.")

            if vertices[0] != vertices[-1]:
                vertices.append(vertices[0])

            polygon = Polygon(vertices)

            if polygon.is_empty or not polygon.is_valid:
                raise ValueError("Plot polygon is invalid.")

            if polygon.area <= 0:
                raise ValueError("Plot polygon has zero area.")

            geometry_valid = True

        except (TypeError, ValueError, AttributeError) as error:
            data_warnings.append(f"Plot geometry: {error}")
            recommendations.append(
                "Review the plot boundary and correct invalid coordinates."
            )

        site = site_context.get("site") or {}
        centroid = site.get("centroid") or {}
        lat0 = self._valid_number(centroid.get("latitude"))
        lon0 = self._valid_number(centroid.get("longitude"))

        infrastructure = site_context.get(
            "nearby_infrastructure"
        ) or {}

        nearest_places: dict[str, dict[str, Any] | None] = {}

        for category in self.FACILITY_CATEGORIES:
            places = infrastructure.get(category, [])
            candidates = []

            if not isinstance(places, list):
                data_warnings.append(
                    f"Invalid infrastructure data for {category}."
                )
                nearest_places[category] = None
                continue

            for place in places:
                if not isinstance(place, dict):
                    continue

                distance = self._valid_number(place.get("distance"))

                if distance is None and lat0 is not None and lon0 is not None:
                    lat = self._valid_number(place.get("lat"))
                    lon = self._valid_number(
                        place.get("lng", place.get("lon"))
                    )

                    if lat is not None and lon is not None:
                        distance = self._distance_m(
                            lat0, lon0, lat, lon
                        )

                if distance is not None and distance >= 0:
                    candidates.append({
                        "name": place.get("name", "Unnamed place"),
                        "distance_m": round(distance, 1),
                    })

            nearest_places[category] = (
                min(candidates, key=lambda item: item["distance_m"])
                if candidates
                else None
            )

        osm = site_context.get("osm") or {}

        if osm.get("status") != "success":
            data_warnings.append(
                "Nearby infrastructure data is unavailable or incomplete."
            )

        if geometry_valid:
            findings.append({
                "category": "geometry",
                "level": "info",
                "title": "Plot geometry is structurally valid",
                "details": (
                    "The polygon passed basic coordinate and geometry checks."
                ),
            })

        # Score only the checks this screening can explain.
        # Unknown data is not silently treated as a successful check.
        score = 100.0
        score_reasons = []

        if not geometry_valid:
            score -= 40
            score_reasons.append("Invalid or unavailable plot geometry")

        if osm.get("status") != "success":
            score_reasons.append(
                "Infrastructure data unavailable; score is less reliable"
            )

        return {
            "assessment_type": "preliminary_site_screening",
            "score": round(max(0.0, score), 2),
            "score_interpretation": (
                "Heuristic screening score, not a probability of suitability "
                "or a regulatory compliance score."
            ),
            "geometry": {
                "valid": geometry_valid,
                "provided_area_m2": site.get("area", project.get("area")),
            },
            "nearest_infrastructure": nearest_places,
            "findings": findings,
            "recommendations": list(dict.fromkeys(recommendations)),
            "data_warnings": list(dict.fromkeys(data_warnings)),
            "score_reasons": score_reasons,
        }


site_suitability_service = SiteSuitabilityService()
