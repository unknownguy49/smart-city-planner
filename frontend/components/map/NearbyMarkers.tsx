"use client";

import { useEffect, useState } from "react";

import {
  Marker,
  Popup,
} from "react-leaflet";

import L from "leaflet";

import api from "@/services/api";

import { useProjectStore } from "@/store/projectStore";

/* =========================================================
   PLACE TYPE
   ========================================================= */

interface Place {
  name?: string;

  lat?: number;
  lng?: number;

  latitude?: number;
  longitude?: number;

  lon?: number;

  distance?: number;

  category?: string;

  type?: string;

  amenity?: string;

  geometry?: {
    coordinates?: number[];
  };

  center?: {
    lat?: number;
    lng?: number;
    lon?: number;
  };
}

interface CategorizedPlace
  extends Place {
  category: string;
}

interface NearbyResponse {
  nearby?: Record<
    string,
    unknown
  >;
}

interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };

  config?: {
    url?: string;
    baseURL?: string;
  };
}

/* =========================================================
   CREATE MARKER ICON
   ========================================================= */

function createIcon(
  color: string,
  emoji: string
) {
  return L.divIcon({
    className:
      "nearby-marker",

    html: `
      <div
        style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
        "
      >
        ${emoji}
      </div>
    `,

    iconSize: [34, 34],

    iconAnchor: [17, 17],

    popupAnchor: [0, -17],
  });
}

/* =========================================================
   INFRASTRUCTURE ICONS
   ========================================================= */

const icons = {
  hospital:
    createIcon("#ef4444", "🏥"),

  school:
    createIcon("#3b82f6", "🏫"),

  college:
    createIcon("#1e3a8a", "🎓"),

  park:
    createIcon("#22c55e", "🌳"),

  bus_stop:
    createIcon("#eab308", "🚌"),

  police:
    createIcon("#9333ea", "👮"),

  fire_station:
    createIcon("#f97316", "🚒"),
};

type MarkerType =
  keyof typeof icons;

/* =========================================================
   GET MARKER TYPE
   ========================================================= */

function getMarkerType(
  category: string
): MarkerType {
  switch (category) {
    case "hospitals":
      return "hospital";

    case "schools":
      return "school";

    case "colleges":
      return "college";

    case "parks":
      return "park";

    case "bus_stops":
      return "bus_stop";

    case "police":
      return "police";

    case "fire_stations":
      return "fire_station";

    default:
      return "park";
  }
}

/* =========================================================
   GET PLACE COORDINATES
   ========================================================= */

function getCoordinates(
  place: Place
): {
  lat: number;
  lng: number;
} | null {
  /* lat + lng */

  if (
    typeof place.lat ===
      "number" &&
    typeof place.lng ===
      "number"
  ) {
    return {
      lat: place.lat,
      lng: place.lng,
    };
  }

  /* lat + lon */

  if (
    typeof place.lat ===
      "number" &&
    typeof place.lon ===
      "number"
  ) {
    return {
      lat: place.lat,
      lng: place.lon,
    };
  }

  /* latitude + longitude */

  if (
    typeof place.latitude ===
      "number" &&
    typeof place.longitude ===
      "number"
  ) {
    return {
      lat: place.latitude,
      lng: place.longitude,
    };
  }

  /* center.lat + center.lng */

  if (
    typeof place.center?.lat ===
      "number" &&
    typeof place.center?.lng ===
      "number"
  ) {
    return {
      lat: place.center.lat,
      lng: place.center.lng,
    };
  }

  /* center.lat + center.lon */

  if (
    typeof place.center?.lat ===
      "number" &&
    typeof place.center?.lon ===
      "number"
  ) {
    return {
      lat: place.center.lat,
      lng: place.center.lon,
    };
  }

  /* GeoJSON coordinates */

  if (
    Array.isArray(
      place.geometry?.coordinates
    ) &&
    place.geometry.coordinates.length >= 2
  ) {
    const [
      lng,
      lat,
    ] =
      place.geometry.coordinates;

    if (
      typeof lat === "number" &&
      typeof lng === "number"
    ) {
      return {
        lat,
        lng,
      };
    }
  }

  return null;
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function NearbyMarkers() {
  const coordinates =
    useProjectStore(
      (state) =>
        state.coordinates
    );

  const [
    places,
    setPlaces,
  ] = useState<CategorizedPlace[]>(
    []
  );

  /* =======================================================
     LOAD NEARBY INFRASTRUCTURE
     ======================================================= */

  useEffect(() => {
    if (coordinates.length < 3) {
      return;
    }

    /*
     * Calculate center of selected polygon
     */

    const latitude =
      coordinates.reduce(
        (sum, point) =>
          sum + point.lat,
        0
      ) / coordinates.length;

    const longitude =
      coordinates.reduce(
        (sum, point) =>
          sum + point.lng,
        0
      ) / coordinates.length;

    async function loadNearbyPlaces() {
      try {
        console.log(
          "======================================"
        );

        console.log(
          "NEARBY INFRASTRUCTURE REQUEST"
        );

        console.log(
          "======================================"
        );

        console.log(
          "Latitude:",
          latitude
        );

        console.log(
          "Longitude:",
          longitude
        );

        const url =
          `/osm/nearby?lat=${latitude}&lng=${longitude}`;

        console.log(
          "Request URL:",
          url
        );

        const response =
          await api.get<NearbyResponse>(
            url
          );

        console.log(
          "======================================"
        );

        console.log(
          "OSM BACKEND RESPONSE"
        );

        console.log(
          "======================================"
        );

        console.log(
          response.data
        );

        const nearby =
          response.data?.nearby;

        if (!nearby) {
          console.warn(
            "No 'nearby' object found in backend response."
          );

          setPlaces([]);

          return;
        }

        /*
         * Combine all infrastructure
         */

        const allPlaces:
          CategorizedPlace[] = [];

        const categories = [
          "hospitals",
          "schools",
          "colleges",
          "parks",
          "bus_stops",
          "police",
          "fire_stations",
        ];

        categories.forEach(
          (category) => {
            const categoryPlaces =
              nearby[category];

            if (
              !Array.isArray(
                categoryPlaces
              )
            ) {
              return;
            }

            categoryPlaces.forEach(
              (place: unknown) => {
                if (
                  typeof place !==
                    "object" ||
                  place === null
                ) {
                  return;
                }

                allPlaces.push({
                  ...(place as Place),
                  category,
                });
              }
            );
          }
        );

        /*
         * Debug counts
         */

        console.log(
          "======================================"
        );

        console.log(
          "NEARBY PLACE COUNTS"
        );

        console.log(
          "======================================"
        );

        console.log(
          "Hospitals:",
          Array.isArray(
            nearby.hospitals
          )
            ? nearby.hospitals.length
            : 0
        );

        console.log(
          "Schools:",
          Array.isArray(
            nearby.schools
          )
            ? nearby.schools.length
            : 0
        );

        console.log(
          "Colleges:",
          Array.isArray(
            nearby.colleges
          )
            ? nearby.colleges.length
            : 0
        );

        console.log(
          "Parks:",
          Array.isArray(
            nearby.parks
          )
            ? nearby.parks.length
            : 0
        );

        console.log(
          "Bus Stops:",
          Array.isArray(
            nearby.bus_stops
          )
            ? nearby.bus_stops.length
            : 0
        );

        console.log(
          "Police:",
          Array.isArray(
            nearby.police
          )
            ? nearby.police.length
            : 0
        );

        console.log(
          "Fire Stations:",
          Array.isArray(
            nearby.fire_stations
          )
            ? nearby.fire_stations.length
            : 0
        );

        console.log(
          "Total Places:",
          allPlaces.length
        );

        setPlaces(
          allPlaces
        );
      } catch (error: unknown) {
        console.error(
          "======================================"
        );

        console.error(
          "NEARBY API ERROR"
        );

        console.error(
          "======================================"
        );

        console.error(error);

        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const apiError =
            error as ApiError;

          console.error(
            "Status:",
            apiError.response?.status
          );

          console.error(
            "Requested URL:",
            apiError.config?.url
          );

          console.error(
            "Base URL:",
            apiError.config?.baseURL
          );

          console.error(
            "Full URL:",
            `${apiError.config?.baseURL ?? ""}${apiError.config?.url ?? ""}`
          );

          console.error(
            "Backend Response:",
            apiError.response?.data
          );
        }

        setPlaces([]);
      }
    }

    void loadNearbyPlaces();
  }, [coordinates]);

  /*
   * No land selected → no markers.
   *
   * This replaces the old setPlaces([])
   * inside the effect.
   */

  if (coordinates.length < 3) {
    return null;
  }

  /* =======================================================
     RENDER MARKERS
     ======================================================= */

  return (
    <>
      {places.map(
        (place, index) => {
          const position =
            getCoordinates(place);

          if (!position) {
            console.warn(
              "Skipping place - coordinates not found:",
              place
            );

            return null;
          }

          const type =
            getMarkerType(
              place.category
            );

          const icon =
            icons[type];

          return (
            <Marker
              key={`${type}-${index}-${position.lat}-${position.lng}`}
              position={[
                position.lat,
                position.lng,
              ]}
              icon={icon}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <h3 className="font-bold text-base mb-1">
                    {place.name ||
                      "Unnamed Place"}
                  </h3>

                  <p className="text-sm text-gray-600 capitalize">
                    {type.replace(
                      "_",
                      " "
                    )}
                  </p>

                  {typeof place.distance ===
                    "number" && (
                    <p className="text-sm mt-1">
                      📏{" "}
                      {Math.round(
                        place.distance
                      )}{" "}
                      meters away
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    📍{" "}
                    {position.lat.toFixed(
                      5
                    )}
                    {", "}
                    {position.lng.toFixed(
                      5
                    )}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        }
      )}
    </>
  );
}