"use client";

import {
  MapContainer,
  Polygon,
  Polyline,
  Rectangle,
  TileLayer,
} from "react-leaflet";

import {
  area as turfArea,
  booleanWithin,
  centroid,
  polygon as turfPolygon,
} from "@turf/turf";

import type {
  Feature,
  Polygon as GeoJsonPolygon,
} from "geojson";

import {
  LuBuilding2,
  LuCar,
  LuCircleAlert,
  LuCircleCheck,
  LuMap,
  LuTrees,
  LuUsers,
  LuWrench,
} from "react-icons/lu";

interface Coordinate {
  lat: number;
  lng: number;
}

interface DesignMapProps {
  coordinates: Coordinate[];
  area: number;
  groundCoveragePercent?: number | null;
  parkingCapacity: number;
  parkingEnabled: boolean;
  greenArea: boolean;
  pedestrianCirculation: boolean;
  serviceAccess: boolean;
  fireAccess: boolean;
  buildingFootprintGeometry?: unknown;
  buildingFootprintStatus?: string;
}

interface BuildingLayout {
  bounds: [
    [number, number],
    [number, number]
  ];
  area: number;
  coveragePercent: number;
}

function createSitePolygon(
  coordinates: Coordinate[]
): Feature<GeoJsonPolygon> {
  const ring = coordinates.map(
    (point) =>
      [
        point.lng,
        point.lat,
      ] as [number, number]
  );

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (
    first &&
    last &&
    (first[0] !== last[0] ||
      first[1] !== last[1])
  ) {
    ring.push(first);
  }

  return turfPolygon([ring]);
}

function createBuildingLayout(
  coordinates: Coordinate[],
  siteArea: number,
  groundCoveragePercent?: number | null
): BuildingLayout | null {
  if (coordinates.length < 3) {
    return null;
  }

  const sitePolygon =
    createSitePolygon(coordinates);

  const calculatedSiteArea =
    turfArea(sitePolygon);

  const usableSiteArea =
    calculatedSiteArea > 0
      ? calculatedSiteArea
      : siteArea;

  const coverage =
    groundCoveragePercent != null &&
    groundCoveragePercent > 0
      ? groundCoveragePercent / 100
      : 0.3;

  const targetArea =
    usableSiteArea * coverage;

  if (targetArea <= 0) {
    return null;
  }

  const siteCentroid =
    centroid(sitePolygon);

  const [
    centerLng,
    centerLat,
  ] = siteCentroid.geometry.coordinates;

  const aspectRatio = 1.3;

  let widthM = Math.sqrt(
    targetArea * aspectRatio
  );

  let heightM =
    targetArea / widthM;

  const metersPerDegreeLat =
    111320;

  const metersPerDegreeLng =
    111320 *
    Math.cos(
      (centerLat * Math.PI) / 180
    );

  let finalBounds:
    | [
        [number, number],
        [number, number]
      ]
    | null = null;

  let finalArea = 0;

  for (let i = 0; i < 40; i++) {
    const halfLat =
      heightM /
      2 /
      metersPerDegreeLat;

    const halfLng =
      widthM /
      2 /
      metersPerDegreeLng;

    const southWest: [
      number,
      number
    ] = [
      centerLat - halfLat,
      centerLng - halfLng,
    ];

    const northEast: [
      number,
      number
    ] = [
      centerLat + halfLat,
      centerLng + halfLng,
    ];

    const rectangleCoordinates = [
      [
        southWest[1],
        southWest[0],
      ],
      [
        northEast[1],
        southWest[0],
      ],
      [
        northEast[1],
        northEast[0],
      ],
      [
        southWest[1],
        northEast[0],
      ],
      [
        southWest[1],
        southWest[0],
      ],
    ] as [number, number][];

    const buildingPolygon =
      turfPolygon([
        rectangleCoordinates,
      ]);

    if (
      booleanWithin(
        buildingPolygon,
        sitePolygon
      )
    ) {
      finalBounds = [
        southWest,
        northEast,
      ];

      finalArea =
        turfArea(buildingPolygon);

      break;
    }

    widthM *= 0.9;
    heightM *= 0.9;
  }

  if (!finalBounds) {
    widthM *= 0.7;
    heightM *= 0.7;

    const halfLat =
      heightM /
      2 /
      metersPerDegreeLat;

    const halfLng =
      widthM /
      2 /
      metersPerDegreeLng;

    finalBounds = [
      [
        centerLat - halfLat,
        centerLng - halfLng,
      ],
      [
        centerLat + halfLat,
        centerLng + halfLng,
      ],
    ];

    const fallbackCoordinates = [
      [
        centerLng - halfLng,
        centerLat - halfLat,
      ],
      [
        centerLng + halfLng,
        centerLat - halfLat,
      ],
      [
        centerLng + halfLng,
        centerLat + halfLat,
      ],
      [
        centerLng - halfLng,
        centerLat + halfLat,
      ],
      [
        centerLng - halfLng,
        centerLat - halfLat,
      ],
    ] as [number, number][];

    finalArea = turfArea(
      turfPolygon([
        fallbackCoordinates,
      ])
    );
  }

  const finalCoveragePercent =
    usableSiteArea > 0
      ? (finalArea /
          usableSiteArea) *
        100
      : 0;

  return {
    bounds: finalBounds,
    area: finalArea,
    coveragePercent:
      finalCoveragePercent,
  };
}

function LegendItem({
  icon: Icon,
  label,
  iconColor,
  backgroundColor,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  label: string;
  iconColor: string;
  backgroundColor: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{
          backgroundColor,
          color: iconColor,
        }}
      >
        <Icon
          size={13}
          strokeWidth={1.9}
        />
      </div>

      <span
        className="text-xs font-medium"
        style={{
          color:
            "var(--text-secondary)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function DesignMap({
  coordinates,
  area,
  groundCoveragePercent,
  parkingCapacity,
  parkingEnabled,
  greenArea,
  pedestrianCirculation,
  serviceAccess,
  fireAccess,
  buildingFootprintGeometry,
  buildingFootprintStatus,
}: DesignMapProps) {
  if (
    !coordinates ||
    coordinates.length < 3
  ) {
    return (
      <div
        className="flex min-h-[220px] items-center justify-center rounded-xl border p-6 text-center"
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <div>
          <LuCircleAlert
            size={22}
            strokeWidth={1.8}
            style={{
              color:
                "var(--warning)",
            }}
          />

          <p
            className="mt-3 text-sm font-medium"
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            Not enough site coordinates to generate the
            design visualization.
          </p>
        </div>
      </div>
    );
  }

  const latitudes = coordinates.map(
    (point) => point.lat
  );

  const longitudes = coordinates.map(
    (point) => point.lng
  );

  const minLat = Math.min(
    ...latitudes
  );

  const maxLat = Math.max(
    ...latitudes
  );

  const minLng = Math.min(
    ...longitudes
  );

  const maxLng = Math.max(
    ...longitudes
  );

  const center = coordinates.reduce(
    (acc, coordinate) => ({
      lat:
        acc.lat + coordinate.lat,
      lng:
        acc.lng + coordinate.lng,
    }),
    {
      lat: 0,
      lng: 0,
    }
  );

  center.lat /=
    coordinates.length;

  center.lng /=
    coordinates.length;

  const sitePolygon =
    createSitePolygon(coordinates);

  const calculatedSiteArea =
    turfArea(sitePolygon);

  const displaySiteArea =
    calculatedSiteArea > 0
      ? calculatedSiteArea
      : area;

  const buildingLayout =
    createBuildingLayout(
      coordinates,
      displaySiteArea,
      groundCoveragePercent
    );

  const footprintGeometry = buildingFootprintGeometry as {
    type?: unknown;
    coordinates?: unknown;
  } | null;

  const backendFootprintPositions =
    buildingFootprintStatus === "placed" &&
    footprintGeometry?.type === "Polygon" &&
    Array.isArray(footprintGeometry.coordinates) &&
    Array.isArray(footprintGeometry.coordinates[0])
      ? footprintGeometry.coordinates[0]
          .filter(
            (point): point is [number, number] =>
              Array.isArray(point) &&
              point.length >= 2 &&
              typeof point[0] === "number" &&
              typeof point[1] === "number" &&
              Number.isFinite(point[0]) &&
              Number.isFinite(point[1])
          )
          .map(
            ([lng, lat]) => [lat, lng] as [number, number]
          )
      : null;  

  
  const actualFootprintArea =
    backendFootprintPositions &&
    backendFootprintPositions.length >= 4
      ? turfArea(
          turfPolygon([
            [
              ...backendFootprintPositions.map(
                ([lat, lng]) => [lng, lat] as [number, number]
              ),
              [
                backendFootprintPositions[0][1],
                backendFootprintPositions[0][0],
              ],
            ],
          ])
        )
      : buildingLayout?.area ?? null;

  const actualCoveragePercent =
    actualFootprintArea !== null && displaySiteArea > 0
      ? (actualFootprintArea / displaySiteArea) * 100
      : null;


  const siteWidth =
    maxLng - minLng;

  const siteHeight =
    maxLat - minLat;

  const greenBounds: [
    [number, number],
    [number, number]
  ] = [
    [
      minLat +
        siteHeight * 0.08,
      minLng +
        siteWidth * 0.08,
    ],
    [
      minLat +
        siteHeight * 0.25,
      minLng +
        siteWidth * 0.25,
    ],
  ];

  const parkingBounds: [
    [number, number],
    [number, number]
  ] = [
    [
      minLat +
        siteHeight * 0.08,
      maxLng -
        siteWidth * 0.30,
    ],
    [
      minLat +
        siteHeight * 0.30,
      maxLng -
        siteWidth * 0.08,
    ],
  ];

  const parkingSpaces: Array<
    [
      [number, number],
      [number, number]
    ]
  > = [];

  const parkingCount = parkingEnabled
    ? Math.min(Math.max(parkingCapacity, 0), 30)
    : 0;

  const parkingLatMin =
    parkingBounds[0][0];

  const parkingLngMin =
    parkingBounds[0][1];

  const parkingLatMax =
    parkingBounds[1][0];

  const parkingLngMax =
    parkingBounds[1][1];

  const parkingColumns = 5;

  const parkingRows =
    parkingCount > 0
      ? Math.ceil(
          parkingCount /
            parkingColumns
        )
      : 0;

  const parkingLatStep =
    parkingRows > 0
      ? (parkingLatMax -
          parkingLatMin) /
        parkingRows
      : 0;

  const parkingLngStep =
    parkingColumns > 0
      ? (parkingLngMax -
          parkingLngMin) /
        parkingColumns
      : 0;

  for (
    let index = 0;
    index < parkingCount;
    index++
  ) {
    const row =
      Math.floor(
        index / parkingColumns
      );

    const column =
      index % parkingColumns;

    const cellLatMin =
      parkingLatMin +
      row * parkingLatStep;

    const cellLngMin =
      parkingLngMin +
      column * parkingLngStep;

    const cellPaddingLat =
      parkingLatStep * 0.12;

    const cellPaddingLng =
      parkingLngStep * 0.12;

    parkingSpaces.push([
      [
        cellLatMin +
          cellPaddingLat,
        cellLngMin +
          cellPaddingLng,
      ],
      [
        cellLatMin +
          parkingLatStep -
          cellPaddingLat,
        cellLngMin +
          parkingLngStep -
          cellPaddingLng,
      ],
    ]);
  }

  const pedestrianPath: [
    number,
    number
  ][] = [
    [
      minLat +
        siteHeight * 0.05,
      minLng +
        siteWidth * 0.05,
    ],
    [
      minLat +
        siteHeight * 0.05,
      maxLng -
        siteWidth * 0.05,
    ],
  ];

  const servicePath: [
    number,
    number
  ][] = [
    [
      minLat +
        siteHeight * 0.05,
      maxLng -
        siteWidth * 0.05,
    ],
    [
      maxLat -
        siteHeight * 0.05,
      maxLng -
        siteWidth * 0.05,
    ],
  ];

  let firePath:
    | [number, number][]
    | null = null;

  if (buildingLayout) {
    const [
      southWest,
      northEast,
    ] = buildingLayout.bounds;

    const fireOffsetLat =
      siteHeight * 0.025;

    const fireOffsetLng =
      siteWidth * 0.025;

    firePath = [
      [
        southWest[0] -
          fireOffsetLat,
        southWest[1] -
          fireOffsetLng,
      ],
      [
        southWest[0] -
          fireOffsetLat,
        northEast[1] +
          fireOffsetLng,
      ],
      [
        northEast[0] +
          fireOffsetLat,
        northEast[1] +
          fireOffsetLng,
      ],
      [
        northEast[0] +
          fireOffsetLat,
        southWest[1] -
          fireOffsetLng,
      ],
      [
        southWest[0] -
          fireOffsetLat,
        southWest[1] -
          fireOffsetLng,
      ],
    ];
  }

  /*
   * Important:
   *
   * react-leaflet / Leaflet can attempt to reuse the
   * same DOM container during React development
   * remounts. A geometry-derived key forces React to
   * replace the actual MapContainer DOM node when the
   * site changes instead of reusing a Leaflet-owned node.
   */
  const mapKey = [
    center.lat.toFixed(7),
    center.lng.toFixed(7),
    coordinates.length,
    displaySiteArea.toFixed(2),
    groundCoveragePercent ??
      "default",
  ].join("-");

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
        boxShadow:
          "var(--shadow-sm)",
      }}
    >
      <div
        className="border-b p-5"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            <LuMap
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <h3
              className="text-base font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Generated Site Design
            </h3>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Conceptual site layout derived from the
              selected site and generated planning
              constraints.
            </p>
          </div>
        </div>
      </div>

      <div className="h-[500px] w-full">
        <MapContainer
          key={mapKey}
          center={[
            center.lat,
            center.lng,
          ]}
          zoom={16}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
          />

          <Polygon
            positions={coordinates.map(
              (point) => [
                point.lat,
                point.lng,
              ]
            )}
            pathOptions={{
              color: "#2563eb",
              fillOpacity: 0.08,
              weight: 3,
            }}
          />

          {backendFootprintPositions &&
          backendFootprintPositions.length >= 4 ? (
            <Polygon
              positions={backendFootprintPositions}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#dc2626",
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          ) : buildingLayout ? (
            <Rectangle
              bounds={buildingLayout.bounds}
              pathOptions={{
                color: "#dc2626",
                fillOpacity: 0.35,
                weight: 2,
              }}
            />
          ) : null}

          {greenArea && (
            <Rectangle
              bounds={greenBounds}
              pathOptions={{
                color: "#16a34a",
                fillOpacity: 0.4,
                weight: 2,
              }}
            />
          )}

          {parkingEnabled && parkingCount > 0 && (
            <>
              <Rectangle
                bounds={parkingBounds}
                pathOptions={{
                  color: "#ca8a04",
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              />

              {parkingSpaces.map(
                (
                  parkingBoundsItem,
                  index
                ) => (
                  <Rectangle
                    key={`parking-${index}`}
                    bounds={
                      parkingBoundsItem
                    }
                    pathOptions={{
                      color: "#ca8a04",
                      fillOpacity: 0.45,
                      weight: 1,
                    }}
                  />
                )
              )}
            </>
          )}

          {pedestrianCirculation && (
            <Polyline
              positions={
                pedestrianPath
              }
              pathOptions={{
                color: "#7c3aed",
                weight: 5,
                opacity: 0.8,
                dashArray: "8 8",
              }}
            />
          )}

          {serviceAccess && (
            <Polyline
              positions={servicePath}
              pathOptions={{
                color: "#ea580c",
                weight: 5,
                opacity: 0.8,
                dashArray: "12 6",
              }}
            />
          )}

          {fireAccess &&
            firePath && (
              <Polyline
                positions={firePath}
                pathOptions={{
                  color: "#dc2626",
                  weight: 4,
                  opacity: 0.75,
                  dashArray: "5 5",
                }}
              />
            )}
        </MapContainer>
      </div>

      
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {/* Site Area */}
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: "var(--primary-soft)",
            borderColor: "var(--primary-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <LuMap
              size={14}
              strokeWidth={1.8}
              style={{ color: "var(--primary)" }}
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Site Area
            </p>
          </div>

          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {displaySiteArea.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            m²
          </p>
        </div>

        {/* Building Footprint */}
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: "var(--danger-soft)",
            borderColor: "var(--danger-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <LuBuilding2
              size={14}
              strokeWidth={1.8}
              style={{ color: "var(--danger)" }}
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Building Footprint
            </p>
          </div>

          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {actualFootprintArea !== null
              ? `${actualFootprintArea.toFixed(1)} m²`
              : "—"}
          </p>

          <p
            className="mt-1 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {actualCoveragePercent !== null
              ? `${actualCoveragePercent.toFixed(1)}% actual coverage`
              : "Not generated"}
          </p>
        </div>

        {/* Green Area */}
        {greenArea && (
          <div
            className="rounded-lg border p-3"
            style={{
              backgroundColor: "var(--success-soft)",
              borderColor: "var(--success-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <LuTrees
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--success)" }}
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Green Area
              </p>
            </div>

            <p
              className="mt-2 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Included
            </p>

            <p
              className="mt-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Conceptual green space
            </p>
          </div>
        )}

        {/* Parking */}
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: "var(--warning-soft)",
            borderColor: "var(--warning-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <LuCar
              size={14}
              strokeWidth={1.8}
              style={{ color: "var(--warning)" }}
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Parking
            </p>
          </div>

          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {parkingEnabled
              ? `${parkingCount} spaces`
              : "Disabled"}
          </p>
        </div>
      </div>


      <div
        className="flex flex-wrap gap-2 border-t p-4"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <LegendItem
          icon={LuMap}
          label="Project Site"
          iconColor="#2563eb"
          backgroundColor="#dbeafe"
        />

        <LegendItem
          icon={LuBuilding2}
          label="Building Footprint"
          iconColor="#dc2626"
          backgroundColor="#fee2e2"
        />

        {greenArea && (
          <LegendItem
            icon={LuTrees}
            label="Green Area"
            iconColor="#16a34a"
            backgroundColor="#dcfce7"
          />
        )}

        {parkingCapacity > 0 && (
          <LegendItem
            icon={LuCar}
            label="Parking Spaces"
            iconColor="#ca8a04"
            backgroundColor="#fef3c7"
          />
        )}

        {pedestrianCirculation && (
          <LegendItem
            icon={LuUsers}
            label="Pedestrian Path"
            iconColor="#7c3aed"
            backgroundColor="#ede9fe"
          />
        )}

        {serviceAccess && (
          <LegendItem
            icon={LuWrench}
            label="Service Access"
            iconColor="#ea580c"
            backgroundColor="#ffedd5"
          />
        )}

        {fireAccess && (
          <LegendItem
            icon={LuCircleAlert}
            label="Fire Access"
            iconColor="#dc2626"
            backgroundColor="#fee2e2"
          />
        )}
      </div>

      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{
          borderColor:
            "var(--border)",
          backgroundColor:
            "var(--surface-secondary)",
        }}
      >
        <LuCircleCheck
          size={14}
          strokeWidth={1.9}
          style={{
            color:
              "var(--success)",
          }}
        />

        <p
          className="text-[11px]"
          style={{
            color:
              "var(--text-muted)",
          }}
        >
          Site geometry is derived from the selected
          project polygon. The displayed building layout is
          conceptual and intended for planning visualization.
        </p>
      </div>
    </div>
  );
}