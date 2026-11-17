
from __future__ import annotations

import logging
from typing import Any


from app.services.osm_service import OSMService

logger = logging.getLogger(__name__)


class SiteContextBuilder:
    """Build geographic context for a proposed development site."""

    def __init__(self, osm_service: OSMService | None = None):
        self.osm = osm_service or OSMService()
        self.osm_service = self.osm

    def calculate_centroid(
        self,
        coordinates: list[dict[str, Any]],
    ) -> tuple[float, float]:
        """Calculate the average latitude and longitude of plot vertices."""
        if len(coordinates) < 3:
            raise ValueError("At least 3 polygon coordinates are required.")

        latitudes = []
        longitudes = []

        for point in coordinates:
            latitude = point.get("lat")
            longitude = point.get("lng", point.get("lon"))

            if latitude is None or longitude is None:
                raise ValueError("Each coordinate must contain lat and lng.")

            latitude = float(latitude)
            longitude = float(longitude)

            if not -90 <= latitude <= 90:
                raise ValueError("Latitude must be between -90 and 90.")

            if not -180 <= longitude <= 180:
                raise ValueError("Longitude must be between -180 and 180.")

            latitudes.append(latitude)
            longitudes.append(longitude)

        return (
            sum(latitudes) / len(latitudes),
            sum(longitudes) / len(longitudes),
        )

    @staticmethod
    def _empty_nearby() -> dict[str, list[dict[str, Any]]]:
        """Return all expected nearby infrastructure categories."""
        return {
            "hospitals": [],
            "schools": [],
            "colleges": [],
            "parks": [],
            "bus_stops": [],
            "police": [],
            "fire_stations": [],
            "water_bodies": [],
        }

    def build(self, project: dict[str, Any]) -> dict[str, Any]:
        """Build site context and nearby infrastructure."""
        coordinates = project.get("coordinates") or []

        if len(coordinates) < 3:
            raise ValueError(
                "At least 3 polygon coordinates are required "
                "to build site context."
            )

        area = project.get("area", 0)

        if area is None or float(area) <= 0:
            raise ValueError("Project area must be greater than zero.")

        latitude, longitude = self.calculate_centroid(coordinates)

        nearby = self._empty_nearby()
        osm_status = "unavailable"
        osm_error = None

        try:
            fetched_places = self.osm.nearby_places(
                latitude=latitude,
                longitude=longitude,
            )

            if isinstance(fetched_places, dict):
                nearby.update(fetched_places)
                osm_status = "success"
            else:
                osm_error = "OSM service returned an unexpected response."

        except Exception as error:
            logger.exception("Unable to retrieve nearby infrastructure")
            osm_error = str(error)

        # Keep the expected categories available even if the service
        # does not return every category.
        for category in self._empty_nearby():
            nearby.setdefault(category, [])

        facility_counts = {
            category: len(items)
            for category, items in nearby.items()
            if isinstance(items, list)
        }


        return {
            "site": {
                "project_name": project.get(
                    "project_name",
                    project.get("name"),
                ),
                "building_type": project.get("building_type"),
                "commercial_subtype": project.get("commercial_subtype"),
                "area": area,
                "budget": project.get("budget"),
                "coordinates": coordinates,
                "centroid": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
            },
            "nearby_infrastructure": nearby,
            "facility_counts": facility_counts,
            "osm": {
                "status": osm_status,
                "error": osm_error,
            },
        }


site_context_builder = SiteContextBuilder()
