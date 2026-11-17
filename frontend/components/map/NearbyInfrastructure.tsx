"use client";

import { useEffect, useState } from "react";
import {
  LuBuilding2,
  LuCircleAlert,
  LuMapPin,
  LuRuler,
} from "react-icons/lu";

import api from "../../services/api";

import { useProjectStore } from "../../store/projectStore";

interface Place {
  name?: string;
  lat?: number;
  lng?: number;
  distance?: number;
}

interface NearbyData {
  hospitals: Place[];
  schools: Place[];
  colleges: Place[];
  parks: Place[];
  bus_stops: Place[];
  police: Place[];
  fire_stations: Place[];
}

interface NearbyResponse {
  nearby?: Partial<NearbyData>;
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

const emptyData: NearbyData = {
  hospitals: [],
  schools: [],
  colleges: [],
  parks: [],
  bus_stops: [],
  police: [],
  fire_stations: [],
};

export default function NearbyInfrastructure() {
  const coordinates = useProjectStore(
    (state) => state.coordinates
  );

  const [places, setPlaces] =
    useState<NearbyData>(emptyData);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (coordinates.length < 3) {
      return;
    }

    const latitude =
      coordinates.reduce(
        (sum,point) =>
          sum + point.lat,
        0
      ) / coordinates.length;

    const longitude =
      coordinates.reduce(
        (sum,point) =>
          sum + point.lng,
        0
      ) / coordinates.length;

    async function loadNearby() {
      try {
        setLoading(true);
        setError("");

        console.log(
          "Loading nearby infrastructure..."
        );

        const response =
          await api.get<NearbyResponse>(
            `/osm/nearby?lat=${latitude}&lng=${longitude}`
          );

        console.log(
          "Nearby Infrastructure Response:",
          response.data
        );

        const nearby =
          response.data?.nearby;

        if (!nearby) {
          console.warn(
            "No nearby data returned."
          );

          setPlaces(emptyData);

          return;
        }

        setPlaces({
          hospitals:
            Array.isArray(
              nearby.hospitals
            )
              ? nearby.hospitals
              : [],

          schools:
            Array.isArray(
              nearby.schools
            )
              ? nearby.schools
              : [],

          colleges:
            Array.isArray(
              nearby.colleges
            )
              ? nearby.colleges
              : [],

          parks:
            Array.isArray(
              nearby.parks
            )
              ? nearby.parks
              : [],

          bus_stops:
            Array.isArray(
              nearby.bus_stops
            )
              ? nearby.bus_stops
              : [],

          police:
            Array.isArray(
              nearby.police
            )
              ? nearby.police
              : [],

          fire_stations:
            Array.isArray(
              nearby.fire_stations
            )
              ? nearby.fire_stations
              : [],
        });
      } catch (error: unknown) {
        console.error(
          "Nearby infrastructure error:",
          error
        );

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
            "URL:",
            apiError.config?.url
          );

          console.error(
            "Base URL:",
            apiError.config?.baseURL
          );

          console.error(
            "Backend response:",
            apiError.response?.data
          );
        }

        setError(
          "Unable to load nearby infrastructure."
        );

        setPlaces(emptyData);
      } finally {
        setLoading(false);
      }
    }

    void loadNearby();
  }, [coordinates]);

  if (coordinates.length < 3) {
    return (
      <section
        className="
          rounded-xl
          border
          p-5
        "
        style={{
          backgroundColor:
            "var(--surface)",
          borderColor:
            "var(--border)",
        }}
      >
        <PanelHeader />

        <div
          className="
            mt-4
            flex
            items-start
            gap-3
            rounded-lg
            border
            p-4
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <LuCircleAlert
            size={17}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
            style={{
              color:
                "var(--text-muted)",
            }}
          />

          <p
            className="
              text-sm
              leading-5
            "
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            Draw a land polygon to analyze
            nearby infrastructure.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
      "
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
      }}
    >
      <div
        className="
          border-b
          px-5
          py-4
        "
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <PanelHeader />
      </div>

      <div className="p-5">

        {loading && (
          <div
            className="
              mb-4
              flex
              items-center
              gap-2
              rounded-lg
              border
              px-3
              py-2.5
            "
            style={{
              backgroundColor:
                "var(--info-soft)",
              borderColor:
                "var(--info-border)",
            }}
          >
            <div
              className="
                h-3
                w-3
                animate-pulse
                rounded-full
              "
              style={{
                backgroundColor:
                  "var(--info)",
              }}
            />

            <p
              className="
                text-xs
                font-medium
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Loading nearby places...
            </p>
          </div>
        )}

        {error && (
          <div
            className="
              mb-4
              flex
              items-start
              gap-2.5
              rounded-lg
              border
              p-3
            "
            style={{
              backgroundColor:
                "var(--danger-soft)",
              borderColor:
                "var(--danger-border)",
            }}
          >
            <LuCircleAlert
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
              style={{
                color:
                  "var(--danger)",
              }}
            />

            <p
              className="
                text-xs
                leading-5
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <div className="space-y-2">

          <InfrastructureRow
            name="Hospitals"
            count={
              places.hospitals.length
            }
          />

          <InfrastructureRow
            name="Schools"
            count={
              places.schools.length
            }
          />

          <InfrastructureRow
            name="Colleges"
            count={
              places.colleges.length
            }
          />

          <InfrastructureRow
            name="Parks"
            count={
              places.parks.length
            }
          />

          <InfrastructureRow
            name="Bus Stops"
            count={
              places.bus_stops.length
            }
          />

          <InfrastructureRow
            name="Police Stations"
            count={
              places.police.length
            }
          />

          <InfrastructureRow
            name="Fire Stations"
            count={
              places.fire_stations.length
            }
          />

        </div>

        <NearestPlace
          title="Nearest Hospital"
          places={
            places.hospitals
          }
        />

        <NearestPlace
          title="Nearest School"
          places={
            places.schools
          }
        />

        <NearestPlace
          title="Nearest Park"
          places={
            places.parks
          }
        />

      </div>
    </section>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-lg
        "
        style={{
          backgroundColor:
            "var(--primary-soft)",
          color:
            "var(--primary)",
        }}
      >
        <LuMapPin
          size={16}
          strokeWidth={1.8}
        />
      </div>

      <div>
        <h2
          className="
            text-sm
            font-semibold
          "
          style={{
            color:
              "var(--text-primary)",
          }}
        >
          Nearby Infrastructure
        </h2>

        <p
          className="
            mt-0.5
            text-xs
          "
          style={{
            color:
              "var(--text-muted)",
          }}
        >
          Facilities around the selected site
        </p>
      </div>
    </div>
  );
}

function InfrastructureRow({
  name,
  count,
}: {
  name: string;
  count: number;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        rounded-lg
        border
        px-3
        py-2.5
      "
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
          "
          style={{
            backgroundColor:
              "var(--surface)",
            color:
              "var(--primary)",
          }}
        >
          <LuBuilding2
            size={14}
            strokeWidth={1.7}
          />
        </div>

        <span
          className="
            truncate
            text-sm
            font-medium
          "
          style={{
            color:
              "var(--text-secondary)",
          }}
        >
          {name}
        </span>
      </div>

      <span
        className="
          flex
          h-7
          min-w-7
          shrink-0
          items-center
          justify-center
          rounded-full
          px-2
          text-xs
          font-semibold
        "
        style={{
          backgroundColor:
            count > 0
              ? "var(--primary-soft)"
              : "var(--surface-tertiary)",
          color:
            count > 0
              ? "var(--primary)"
              : "var(--text-muted)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

function NearestPlace({
  title,
  places,
}: {
  title: string;
  places: Place[];
}) {
  if (places.length === 0) {
    return null;
  }

  const sortedPlaces =
    [...places].sort(
      (a,b) =>
        (a.distance ?? Infinity) -
        (b.distance ?? Infinity)
    );

  const nearest =
    sortedPlaces[0];

  return (
    <div
      className="
        mt-4
        rounded-lg
        border
        p-4
      "
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
          "
          style={{
            backgroundColor:
              "var(--surface)",
            color:
              "var(--primary)",
          }}
        >
          <LuMapPin
            size={15}
            strokeWidth={1.8}
          />
        </div>

        <div className="min-w-0">
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.08em]
            "
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            {title}
          </p>

          <p
            className="
              mt-1
              truncate
              text-sm
              font-semibold
            "
            style={{
              color:
                "var(--text-primary)",
            }}
            title={
              nearest.name ||
              "Unknown"
            }
          >
            {nearest.name ||
              "Unknown"}
          </p>

          {typeof nearest.distance ===
            "number" && (
            <div
              className="
                mt-1
                flex
                items-center
                gap-1.5
              "
            >
              <LuRuler
                size={12}
                strokeWidth={1.7}
                style={{
                  color:
                    "var(--text-muted)",
                }}
              />

              <p
                className="
                  text-xs
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                {Math.round(
                  nearest.distance
                )}{" "}
                m away
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}