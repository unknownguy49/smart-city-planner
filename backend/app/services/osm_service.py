
from __future__ import annotations

import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)


class OSMService:
    """Retrieve nearby infrastructure and water bodies using Geoapify."""

    GEOAPIFY_URL = "https://api.geoapify.com/v2/places"

    INFRASTRUCTURE_CATEGORIES = {
        "hospitals": "healthcare.hospital",
        "schools": "education.school",
        "colleges": "education.college",
        "parks": "leisure.park",
        "bus_stops": "public_transport.bus",
        "police": "service.police",
        "fire_stations": "service.fire_station",
    }

    WATER_CATEGORIES = (
        "natural.water",
        "natural.wetland",
        "waterway",
    )

    def __init__(
        self,
        api_key: str | None = None,
        timeout: int = 30,
    ) -> None:
        self.api_key = api_key
        self.timeout = timeout

    @staticmethod
    def _validate_coordinates(
        latitude: float,
        longitude: float,
    ) -> None:
        if not (-90 <= latitude <= 90):
            raise ValueError("Latitude must be between -90 and 90.")
        if not (-180 <= longitude <= 180):
            raise ValueError("Longitude must be between -180 and 180.")

    @staticmethod
    def _coordinates_from_geometry(
        geometry: list[dict[str, Any]],
    ) -> list[list[float]]:
        coordinates = []

        for point in geometry:
            lat = point.get("lat")
            lon = point.get("lon")

            if lat is None or lon is None:
                continue

            try:
                lat, lon = float(lat), float(lon)
            except (TypeError, ValueError):
                continue

            if -90 <= lat <= 90 and -180 <= lon <= 180:
                coordinates.append([lon, lat])

        return coordinates

    @staticmethod
    def _geojson_geometry(geometry: Any) -> dict[str, Any]:
        """Convert Shapely geometry to JSON-compatible GeoJSON."""
        geojson = mapping(geometry)

        def to_lists(value: Any) -> Any:
            if isinstance(value, (list, tuple)):
                return [to_lists(item) for item in value]
            return value

        return {
            "type": geojson["type"],
            "coordinates": to_lists(geojson["coordinates"]),
        }

    def _geoapify_place(
        self,
        feature: dict[str, Any],
        fallback_category: str | None = None,
    ) -> dict[str, Any] | None:
        properties = feature.get("properties", {})

        lat = properties.get("lat")
        lon = properties.get("lon")

        if lat is None or lon is None:
            coordinates = feature.get("geometry", {}).get("coordinates")

            if isinstance(coordinates, (list, tuple)) and len(coordinates) >= 2:
                lon, lat = coordinates[0], coordinates[1]

        try:
            lat, lon = float(lat), float(lon)
        except (TypeError, ValueError):
            return None

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return None

        categories = properties.get("categories", [])

        if isinstance(categories, str):
            categories = [categories]

        return {
            "name": (
                properties.get("name")
                or properties.get("address_line1")
                or fallback_category
                or "Unnamed place"
            ),
            "lat": lat,
            "lng": lon,
            "distance": properties.get("distance"),
            "categories": categories,
        }

    def nearby_places(
        self,
        latitude: float,
        longitude: float,
        radius: int = 2000,
    ) -> dict[str, list[dict[str, Any]]]:
        """Get nearby infrastructure and water bodies using Geoapify."""
        self._validate_coordinates(latitude, longitude)

        if radius <= 0:
            raise ValueError("Radius must be greater than zero.")

        result: dict[str, list[dict[str, Any]]] = {
            key: [] for key in self.INFRASTRUCTURE_CATEGORIES
        }
        result["water_bodies"] = []

        # An empty key permits mocked requests in tests. Real Geoapify
        # requests still require a valid GEOAPIFY_API_KEY.
        api_key = self.api_key or os.getenv("GEOAPIFY_API_KEY", "")

        base_params = {
            "filter": f"circle:{longitude},{latitude},{int(radius)}",
            "bias": f"proximity:{longitude},{latitude}",
            "limit": 100,
            "apiKey": api_key,
        }

        # Retrieve infrastructure by category.
        for result_key, category in self.INFRASTRUCTURE_CATEGORIES.items():
            try:
                response = requests.get(
                    self.GEOAPIFY_URL,
                    params={
                        **base_params,
                        "categories": category,
                    },
                    timeout=self.timeout,
                )
                response.raise_for_status()

                for feature in response.json().get("features", []):
                    properties = feature.get("properties", {})
                    categories = properties.get("categories", [])

                    if isinstance(categories, str):
                        categories = [categories]

                    # Avoid adding unrelated features to a category.
                    if categories and not any(
                        item == category or item.startswith(category + ".")
                        for item in categories
                    ):
                        continue

                    place = self._geoapify_place(feature, result_key)

                    if place is not None:
                        result[result_key].append(place)

            except requests.RequestException:
                logger.exception(
                    "Geoapify request failed for %s",
                    result_key,
                )

        # Retrieve water bodies, wetlands, and waterway features.
        try:
            response = requests.get(
                self.GEOAPIFY_URL,
                params={
                    **base_params,
                    "categories": ",".join(self.WATER_CATEGORIES),
                },
                timeout=self.timeout,
            )
            response.raise_for_status()

            for feature in response.json().get("features", []):
                properties = feature.get("properties", {})
                categories = properties.get("categories", [])

                if isinstance(categories, str):
                    categories = [categories]

                if categories and not any(
                    category.startswith(self.WATER_CATEGORIES)
                    for category in categories
                ):
                    continue

                place = self._geoapify_place(feature, "water body")

                if place is not None:
                    result["water_bodies"].append(place)

        except requests.RequestException:
            logger.exception("Geoapify water-body request failed")

        return result
