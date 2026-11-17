"use client";

import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Rectangle,
  TileLayer,
  Tooltip,
} from "react-leaflet";

import type { LatLngExpression } from "leaflet";

import {
  area as turfArea,
  booleanIntersects,
  booleanWithin,
  centroid,
  polygon as turfPolygon,
} from "@turf/turf";

import type {
  Feature,
  Polygon as GeoJsonPolygon,
} from "geojson";

interface Coordinate {
  lat: number;
  lng: number;
}

interface ScenarioDesignMapProps {
  coordinates: Coordinate[];
  area?: number | null;
  groundCoveragePercent?: number | null;
  intervention?: string | null;
  roadWidth?: number | null;
  roadWidening?: boolean;
  footpathWidth?: number | null;
  parkingCapacity?: number | null;
  greenArea?: boolean;
  greenAreaPercentage?: number | null;
  pedestrianCirculation?: boolean;
  serviceAccess?: boolean;
  fireAccess?: boolean;
  trafficSignal?: boolean;
  newRoad?: boolean;
  busStop?: boolean;
  streetLighting?: boolean;
  drainage?: boolean;
  rainwaterHarvesting?: boolean;
  solar?: boolean;
  evCharging?: boolean;
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

  if (ring.length > 0) {
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
  }

  return turfPolygon([ring]);
}

function createRectanglePolygon(
  bounds: [
    [number, number],
    [number, number]
  ]
): Feature<GeoJsonPolygon> {
  const [
    [south, west],
    [north, east],
  ] = bounds;

  return turfPolygon([
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ]);
}

function isRectangleInsideSite(
  bounds: [
    [number, number],
    [number, number]
  ],
  sitePolygon: Feature<GeoJsonPolygon>,
  buildingBounds?:
    | [
        [number, number],
        [number, number]
      ]
    | null
): boolean {
  const rectangle =
    createRectanglePolygon(bounds);

  if (
    !booleanWithin(
      rectangle,
      sitePolygon
    )
  ) {
    return false;
  }

  if (buildingBounds) {
    const buildingPolygon =
      createRectanglePolygon(
        buildingBounds
      );

    if (
      booleanIntersects(
        rectangle,
        buildingPolygon
      )
    ) {
      return false;
    }
  }

  return true;
}

function createBuildingLayout(
  coordinates: Coordinate[],
  siteArea: number,
  groundCoveragePercent?:
    | number
    | null
): BuildingLayout | null {
  if (coordinates.length < 3) {
    return null;
  }

  const sitePolygon =
    createSitePolygon(
      coordinates
    );

  const calculatedSiteArea =
    turfArea(sitePolygon);

  const usableSiteArea =
    calculatedSiteArea > 0
      ? calculatedSiteArea
      : siteArea;

  const coverage =
    groundCoveragePercent !=
      null &&
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
  ] =
    siteCentroid.geometry
      .coordinates;

  const aspectRatio = 1.3;

  let widthM =
    Math.sqrt(
      targetArea *
        aspectRatio
    );

  let heightM =
    targetArea / widthM;

  const metersPerDegreeLat =
    111320;

  const metersPerDegreeLng =
    111320 *
    Math.cos(
      (centerLat * Math.PI) /
        180
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

    const rectangleCoordinates =
      [
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
        turfArea(
          buildingPolygon
        );

      break;
    }

    widthM *= 0.9;
    heightM *= 0.9;
  }

  if (!finalBounds) {
    return null;
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

function getCenter(
  coordinates: Coordinate[]
): LatLngExpression {
  if (coordinates.length === 0) {
    return [
      16.5062,
      80.648,
    ];
  }

  const totalLat =
    coordinates.reduce(
      (sum, coordinate) =>
        sum + coordinate.lat,
      0
    );

  const totalLng =
    coordinates.reduce(
      (sum, coordinate) =>
        sum + coordinate.lng,
      0
    );

  return [
    totalLat / coordinates.length,
    totalLng / coordinates.length,
  ];
}

function getBounds(
  coordinates: Coordinate[]
) {
  if (coordinates.length === 0) {
    return [
      [16.505, 80.647],
      [16.507, 80.649],
    ] as [
      [number, number],
      [number, number]
    ];
  }

  const lats =
    coordinates.map(
      (coordinate) =>
        coordinate.lat
    );

  const lngs =
    coordinates.map(
      (coordinate) =>
        coordinate.lng
    );

  const minLat =
    Math.min(...lats);

  const maxLat =
    Math.max(...lats);

  const minLng =
    Math.min(...lngs);

  const maxLng =
    Math.max(...lngs);

  const latPadding =
    Math.max(
      (maxLat - minLat) * 0.2,
      0.001
    );

  const lngPadding =
    Math.max(
      (maxLng - minLng) * 0.2,
      0.001
    );

  return [
    [
      minLat - latPadding,
      minLng - lngPadding,
    ],
    [
      maxLat + latPadding,
      maxLng + lngPadding,
    ],
  ] as [
    [number, number],
    [number, number]
  ];
}

function getLongestEdge(
  coordinates: Coordinate[]
): LatLngExpression[] {
  if (coordinates.length < 2) {
    return [];
  }

  let longestDistance = 0;

  let bestStart =
    coordinates[0];

  let bestEnd =
    coordinates[1];

  for (
    let i = 0;
    i < coordinates.length;
    i++
  ) {
    const start =
      coordinates[i];

    for (
      let j = i + 1;
      j < coordinates.length;
      j++
    ) {
      const end =
        coordinates[j];

      const dLat =
        end.lat - start.lat;

      const dLng =
        end.lng - start.lng;

      const distance =
        dLat * dLat +
        dLng * dLng;

      if (
        distance >
        longestDistance
      ) {
        longestDistance =
          distance;

        bestStart = start;
        bestEnd = end;
      }
    }
  }

  return [
    [
      bestStart.lat,
      bestStart.lng,
    ],
    [
      bestEnd.lat,
      bestEnd.lng,
    ],
  ];
}

function LegendItem({
  type,
  label,
}: {
  type:
    | "site"
    | "building"
    | "road"
    | "dashed"
    | "point"
    | "green"
    | "parking";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span
        aria-hidden="true"
        className="relative flex h-3.5 w-5 shrink-0 items-center justify-center"
      >
        {type === "site" && (
          <span className="h-3 w-4 rounded-sm border-2 border-[var(--primary)] bg-[var(--primary-soft)]" />
        )}

        {type === "building" && (
          <span className="h-3 w-4 rounded-sm border-2 border-[var(--danger)] bg-[var(--danger-soft)]" />
        )}

        {type === "road" && (
          <span className="h-1 w-5 rounded-full bg-[var(--text-primary)]" />
        )}

        {type === "dashed" && (
          <span className="w-5 border-t-2 border-dashed border-[var(--warning)]" />
        )}

        {type === "point" && (
          <span className="h-3 w-3 rounded-full border-2 border-[var(--info)] bg-[var(--info-soft)]" />
        )}

        {type === "green" && (
          <span className="h-3 w-4 rounded-sm border-2 border-[var(--success)] bg-[var(--success-soft)]" />
        )}

        {type === "parking" && (
          <span className="h-3 w-4 rounded-sm border border-[var(--warning)] bg-[var(--warning-soft)]" />
        )}
      </span>

      <span>{label}</span>
    </div>
  );
}

export default function ScenarioDesignMap({
  coordinates,
  area,
  groundCoveragePercent,
  intervention,
  roadWidth,
  roadWidening,
  footpathWidth,
  parkingCapacity,
  greenArea,
  greenAreaPercentage,
  pedestrianCirculation,
  serviceAccess,
  fireAccess,
  trafficSignal,
  newRoad,
  busStop,
  streetLighting,
  drainage,
  rainwaterHarvesting,
  solar,
  evCharging,
}: ScenarioDesignMapProps) {
  if (
    !coordinates ||
    coordinates.length < 3
  ) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-6 text-center text-sm text-[var(--text-muted)]">
        Not enough site coordinates
        to generate the scenario
        visualization.
      </div>
    );
  }

  const sitePolygon =
    createSitePolygon(
      coordinates
    );

  const calculatedSiteArea =
    turfArea(sitePolygon);

  const displaySiteArea =
    calculatedSiteArea > 0
      ? calculatedSiteArea
      : area ?? 0;

  const center =
    getCenter(coordinates);

  const mapBounds =
    getBounds(coordinates);

  const buildingLayout =
    createBuildingLayout(
      coordinates,
      displaySiteArea,
      groundCoveragePercent
    );

  const latitudes =
    coordinates.map(
      (coordinate) =>
        coordinate.lat
    );

  const longitudes =
    coordinates.map(
      (coordinate) =>
        coordinate.lng
    );

  const minLat =
    Math.min(...latitudes);

  const maxLat =
    Math.max(...latitudes);

  const minLng =
    Math.min(...longitudes);

  const maxLng =
    Math.max(...longitudes);

  const siteWidth =
    maxLng - minLng;

  const siteHeight =
    maxLat - minLat;

  const activeIntervention =
    intervention ?? "";

  const isParking =
    activeIntervention ===
    "parking";

  const isGreenSpace =
    activeIntervention ===
    "green_space";

  const isRoadWidening =
    activeIntervention ===
    "road_widening";

  const isFootpath =
    activeIntervention ===
    "footpath";

  const isNewRoad =
    activeIntervention ===
    "new_road";

  const isTrafficSignal =
    activeIntervention ===
    "traffic_signal";

  const isBusStop =
    activeIntervention ===
    "bus_stop";

  const isStreetLighting =
    activeIntervention ===
    "street_lighting";

  const isDrainage =
    activeIntervention ===
    "drainage";

  const isRainwater =
    activeIntervention ===
    "rainwater_harvesting";

  const isSolar =
    activeIntervention ===
    "solar";

  const isEVCharging =
    activeIntervention ===
    "ev_charging";

  const roadLine =
    getLongestEdge(
      coordinates
    );

  const roadWeight =
    roadWidth &&
    roadWidth > 0
      ? Math.max(
          7,
          Math.min(
            6 +
              roadWidth *
                0.35,
            18
          )
        )
      : 7;

  const footpathWeight =
    footpathWidth &&
    footpathWidth > 0
      ? Math.max(
          4,
          Math.min(
            footpathWidth * 2,
            12
          )
        )
      : 5;

  const requestedGreenPercentage =
    greenAreaPercentage &&
    greenAreaPercentage > 0
      ? Math.min(
          greenAreaPercentage,
          60
        )
      : 20;

  const greenScale =
    Math.sqrt(
      requestedGreenPercentage /
        100
    );

  const greenWidth =
    siteWidth *
    Math.min(
      greenScale * 0.9,
      0.65
    );

  const greenHeight =
    siteHeight *
    Math.min(
      greenScale * 0.9,
      0.65
    );

  const greenCandidates: Array<
    [
      [number, number],
      [number, number]
    ]
  > = [
    [
      [
        minLat +
          siteHeight * 0.05,
        minLng +
          siteWidth * 0.05,
      ],
      [
        minLat +
          siteHeight * 0.05 +
          greenHeight,
        minLng +
          siteWidth * 0.05 +
          greenWidth,
      ],
    ],
    [
      [
        minLat +
          siteHeight * 0.05,
        maxLng -
          siteWidth * 0.05 -
          greenWidth,
      ],
      [
        minLat +
          siteHeight * 0.05 +
          greenHeight,
        maxLng -
          siteWidth * 0.05,
      ],
    ],
    [
      [
        maxLat -
          siteHeight * 0.05 -
          greenHeight,
        minLng +
          siteWidth * 0.05,
      ],
      [
        maxLat -
          siteHeight * 0.05,
        minLng +
          siteWidth * 0.05 +
          greenWidth,
      ],
    ],
  ];

  const greenBounds =
    greenCandidates.find(
      (candidate) =>
        isRectangleInsideSite(
          candidate,
          sitePolygon,
          buildingLayout?.bounds
        )
    ) ?? null;

  const parkingCount =
    Math.min(
      Math.max(
        parkingCapacity ?? 0,
        0
      ),
      30
    );

  const centerLat =
    (minLat + maxLat) / 2;

  const metersPerDegreeLat =
    111320;

  const metersPerDegreeLng =
    111320 *
    Math.cos(
      (centerLat * Math.PI) /
        180
    );

  const parkingBayWidthM =
    2.5;

  const parkingBayLengthM =
    5;

  const parkingBayWidthDeg =
    parkingBayWidthM /
    metersPerDegreeLng;

  const parkingBayLengthDeg =
    parkingBayLengthM /
    metersPerDegreeLat;

  const parkingGapLng =
    parkingBayWidthDeg *
    0.35;

  const parkingGapLat =
    parkingBayLengthDeg *
    0.35;

  const parkingStepLng =
    parkingBayWidthDeg +
    parkingGapLng;

  const parkingStepLat =
    parkingBayLengthDeg +
    parkingGapLat;

  const parkingSpaces: Array<
    [
      [number, number],
      [number, number]
    ]
  > = [];

  if (
    isParking &&
    parkingCount > 0
  ) {
    const startLat =
      minLat +
      siteHeight * 0.02;

    const startLng =
      minLng +
      siteWidth * 0.02;

    const endLat =
      maxLat -
      siteHeight * 0.02;

    const endLng =
      maxLng -
      siteWidth * 0.02;

    for (
      let lat = startLat;
      lat <= endLat;
      lat += parkingStepLat
    ) {
      if (
        parkingSpaces.length >=
        parkingCount
      ) {
        break;
      }

      for (
        let lng = startLng;
        lng <= endLng;
        lng += parkingStepLng
      ) {
        if (
          parkingSpaces.length >=
          parkingCount
        ) {
          break;
        }

        const candidate: [
          [number, number],
          [number, number]
        ] = [
          [lat, lng],
          [
            lat +
              parkingBayLengthDeg,
            lng +
              parkingBayWidthDeg,
          ],
        ];

        if (
          isRectangleInsideSite(
            candidate,
            sitePolygon,
            buildingLayout?.bounds
          )
        ) {
          parkingSpaces.push(
            candidate
          );
        }
      }
    }

    if (
      parkingSpaces.length <
      parkingCount
    ) {
      for (
        let lat = startLat;
        lat <= endLat;
        lat += parkingStepLng
      ) {
        if (
          parkingSpaces.length >=
          parkingCount
        ) {
          break;
        }

        for (
          let lng = startLng;
          lng <= endLng;
          lng += parkingStepLat
        ) {
          if (
            parkingSpaces.length >=
            parkingCount
          ) {
            break;
          }

          const candidate: [
            [number, number],
            [number, number]
          ] = [
            [lat, lng],
            [
              lat +
                parkingBayWidthDeg,
              lng +
                parkingBayLengthDeg,
            ],
          ];

          if (
            isRectangleInsideSite(
              candidate,
              sitePolygon,
              buildingLayout?.bounds
            )
          ) {
            const duplicate =
              parkingSpaces.some(
                (existing) =>
                  Math.abs(
                    existing[0][0] -
                      candidate[0][0]
                  ) <
                    0.000001 &&
                  Math.abs(
                    existing[0][1] -
                      candidate[0][1]
                  ) <
                    0.000001
              );

            if (!duplicate) {
              parkingSpaces.push(
                candidate
              );
            }
          }
        }
      }
    }
  }

  let parkingAreaCenter:
    | LatLngExpression
    | null = null;

  if (
    parkingSpaces.length > 0
  ) {
    const first =
      parkingSpaces[0];

    parkingAreaCenter = [
      (first[0][0] +
        first[1][0]) /
        2,
      (first[0][1] +
        first[1][1]) /
        2,
    ];
  }

  const siteCentroid =
    centroid(sitePolygon);

  const centroidLng =
    siteCentroid.geometry
      .coordinates[0];

  const centroidLat =
    siteCentroid.geometry
      .coordinates[1];

  const roadStart =
    roadLine[0];

  const roadEnd =
    roadLine[
      roadLine.length - 1
    ];

  const roadMidpoint:
    LatLngExpression =
    roadStart &&
    roadEnd
      ? [
          (
            roadStart as [
              number,
              number
            ]
          )[0] +
            (
              (
                roadEnd as [
                  number,
                  number
                ]
              )[0] -
              (
                roadStart as [
                  number,
                  number
                ]
              )[0]
            ) *
              0.5,
          (
            roadStart as [
              number,
              number
            ]
          )[1] +
            (
              (
                roadEnd as [
                  number,
                  number
                ]
              )[1] -
              (
                roadStart as [
                  number,
                  number
                ]
              )[1]
            ) *
              0.5,
        ]
      : [
          centroidLat,
          centroidLng,
        ];

  const trafficSignalPosition:
    LatLngExpression =
    roadStart ?? [
      centroidLat,
      centroidLng,
    ];

  const busStopPosition:
    LatLngExpression =
    roadEnd ?? [
      centroidLat,
      centroidLng,
    ];

  const lightingPosition:
    LatLngExpression =
    roadMidpoint;

  const servicePath:
    LatLngExpression[] =
    roadLine.length >= 2
      ? roadLine
      : [];

  const drainageLine:
    LatLngExpression[] =
    coordinates.length >= 2
      ? [
          [
            coordinates[0].lat,
            coordinates[0].lng,
          ],
          [
            coordinates[
              coordinates.length - 1
            ].lat,
            coordinates[
              coordinates.length - 1
            ].lng,
          ],
        ]
      : [];

  let firePath:
    | [number, number][]
    | null = null;

  if (buildingLayout) {
    const [
      southWest,
      northEast,
    ] =
      buildingLayout.bounds;

    const fireOffsetLat =
      siteHeight * 0.015;

    const fireOffsetLng =
      siteWidth * 0.015;

    const candidate:
      [number, number][] = [
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

    const firePolygon =
      turfPolygon([
        candidate.map(
          (point) => [
            point[1],
            point[0],
          ]
        ),
      ]);

    if (
      booleanWithin(
        firePolygon,
        sitePolygon
      )
    ) {
      firePath = candidate;
    }
  }

  const rainwaterPosition:
    LatLngExpression =
    buildingLayout
      ? [
          (
            buildingLayout
              .bounds[0][0] +
            buildingLayout
              .bounds[1][0]
          ) / 2,
          buildingLayout
            .bounds[0][1],
        ]
      : [
          centroidLat,
          centroidLng,
        ];

  const evPosition:
    LatLngExpression =
    parkingAreaCenter ?? [
      centroidLat,
      centroidLng,
    ];

  const solarBounds: [
    [number, number],
    [number, number]
  ] =
    buildingLayout
      ? [
          [
            Math.min(
              buildingLayout
                .bounds[1][0] +
                siteHeight * 0.03,
              maxLat -
                siteHeight * 0.03
            ),
            buildingLayout
              .bounds[0][1],
          ],
          [
            Math.min(
              buildingLayout
                .bounds[1][0] +
                siteHeight * 0.18,
              maxLat -
                siteHeight * 0.03
            ),
            buildingLayout
              .bounds[1][1],
          ],
        ]
      : [
          [
            minLat +
              siteHeight * 0.6,
            minLng +
              siteWidth * 0.3,
          ],
          [
            minLat +
              siteHeight * 0.85,
            minLng +
              siteWidth * 0.65,
          ],
        ];

  const newRoadLine:
    LatLngExpression[] =
    coordinates.length >= 2
      ? [
          [
            coordinates[0].lat,
            coordinates[0].lng,
          ],
          [
            coordinates[
              coordinates.length - 1
            ].lat,
            coordinates[
              coordinates.length - 1
            ].lng,
          ],
        ]
      : [];

  const mapKey = [
    coordinates
      .map(
        (coordinate) =>
          `${coordinate.lat},${coordinate.lng}`
      )
      .join("|"),
    intervention ?? "",
    roadWidth ?? "",
    footpathWidth ?? "",
    parkingCapacity ?? "",
    greenAreaPercentage ?? "",
    groundCoveragePercent ?? "",
    serviceAccess ? "service" : "",
    fireAccess ? "fire" : "",
    trafficSignal ? "signal" : "",
    newRoad ? "new-road" : "",
    busStop ? "bus" : "",
    streetLighting ? "lighting" : "",
    drainage ? "drainage" : "",
    rainwaterHarvesting
      ? "rainwater"
      : "",
    solar ? "solar" : "",
    evCharging ? "ev" : "",
  ].join("-");

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={16}
        bounds={mapBounds}
        scrollWheelZoom
        className="h-[520px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />

        <Polygon
          positions={coordinates.map(
            (coordinate) => [
              coordinate.lat,
              coordinate.lng,
            ]
          )}
          pathOptions={{
            color: "var(--primary)",
            weight: 3,
            fillColor:
              "var(--primary)",
            fillOpacity: 0.08,
          }}
        >
          <Tooltip>
            Project Site
          </Tooltip>
        </Polygon>

        {buildingLayout && (
          <Rectangle
            bounds={
              buildingLayout.bounds
            }
            pathOptions={{
              color: "var(--danger)",
              weight: 2,
              fillColor:
                "var(--danger)",
              fillOpacity: 0.3,
            }}
          >
            <Tooltip>
              Building Footprint:{" "}
              {buildingLayout.area.toFixed(
                1
              )}{" "}
              m²
            </Tooltip>
          </Rectangle>
        )}

        <Polyline
          positions={roadLine}
          pathOptions={{
            color:
              "var(--text-secondary)",
            weight:
              isRoadWidening
                ? 4
                : 7,
            opacity: 0.7,
          }}
        >
          <Tooltip>
            Existing Road
          </Tooltip>
        </Polyline>

        {isRoadWidening &&
          roadWidth &&
          roadWidth > 0 && (
            <Polyline
              positions={
                roadLine
              }
              pathOptions={{
                color:
                  "var(--warning)",
                weight:
                  roadWeight,
                opacity: 0.95,
              }}
            >
              <Tooltip>
                Road Widening:{" "}
                {roadWidth} m
              </Tooltip>
            </Polyline>
          )}

        {isFootpath &&
          footpathWidth &&
          footpathWidth > 0 && (
            <Polyline
              positions={
                roadLine
              }
              pathOptions={{
                color:
                  "var(--info)",
                weight:
                  footpathWeight,
                dashArray:
                  "8 8",
                opacity: 0.9,
              }}
            >
              <Tooltip>
                Footpath:{" "}
                {footpathWidth} m
              </Tooltip>
            </Polyline>
          )}

        {isGreenSpace &&
          greenArea &&
          greenBounds && (
            <Rectangle
              bounds={
                greenBounds
              }
              pathOptions={{
                color:
                  "var(--success)",
                weight: 2,
                fillColor:
                  "var(--success)",
                fillOpacity: 0.35,
              }}
            >
              <Tooltip sticky>
                Green Space:{" "}
                {greenAreaPercentage ??
                  requestedGreenPercentage}
                %
              </Tooltip>
            </Rectangle>
          )}

        {isParking &&
          parkingSpaces.length >
            0 &&
          parkingSpaces.map(
            (
              parkingSpace,
              index
            ) => (
              <Rectangle
                key={`parking-space-${index}`}
                bounds={
                  parkingSpace
                }
                pathOptions={{
                  color:
                    "var(--warning)",
                  weight: 1.5,
                  fillColor:
                    "var(--warning)",
                  fillOpacity: 0.55,
                }}
              >
                <Tooltip>
                  Parking Space{" "}
                  {index + 1}
                </Tooltip>
              </Rectangle>
            )
          )}

        {isParking &&
          parkingSpaces.length ===
            0 &&
          parkingCount > 0 && (
            <CircleMarker
              center={[
                centroidLat,
                centroidLng,
              ]}
              radius={10}
              pathOptions={{
                color:
                  "var(--danger)",
                weight: 2,
                fillColor:
                  "var(--danger)",
                fillOpacity: 0.8,
              }}
            >
              <Tooltip>
                Parking bays could
                not be placed inside
                the current site
                geometry.
              </Tooltip>
            </CircleMarker>
          )}

        {serviceAccess && (
          <Polyline
            positions={
              servicePath
            }
            pathOptions={{
              color:
                "var(--info)",
              weight: 4,
              opacity: 0.75,
              dashArray:
                "12 6",
            }}
          >
            <Tooltip>
              Service Access
            </Tooltip>
          </Polyline>
        )}

        {fireAccess &&
          firePath && (
            <Polyline
              positions={
                firePath
              }
              pathOptions={{
                color:
                  "var(--danger)",
                weight: 4,
                opacity: 0.75,
                dashArray:
                  "5 5",
              }}
            >
              <Tooltip>
                Fire Access
              </Tooltip>
            </Polyline>
          )}

        {isTrafficSignal && (
          <CircleMarker
            center={
              trafficSignalPosition
            }
            radius={9}
            pathOptions={{
              color:
                "var(--warning)",
              weight: 2,
              fillColor:
                "var(--warning)",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              Traffic Signal
            </Tooltip>
          </CircleMarker>
        )}

        {isNewRoad && (
          <Polyline
            positions={
              newRoadLine
            }
            pathOptions={{
              color:
                "var(--primary)",
              weight: 8,
              dashArray:
                "12 8",
              opacity: 0.9,
            }}
          >
            <Tooltip>
              Proposed New Road
            </Tooltip>
          </Polyline>
        )}

        {isBusStop && (
          <CircleMarker
            center={
              busStopPosition
            }
            radius={9}
            pathOptions={{
              color:
                "var(--primary)",
              weight: 2,
              fillColor:
                "var(--primary)",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              Bus Stop
            </Tooltip>
          </CircleMarker>
        )}

        {isStreetLighting && (
          <CircleMarker
            center={
              lightingPosition
            }
            radius={7}
            pathOptions={{
              color:
                "var(--warning)",
              weight: 2,
              fillColor:
                "var(--warning)",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              Street Lighting
            </Tooltip>
          </CircleMarker>
        )}

        {isDrainage && (
          <Polyline
            positions={
              drainageLine
            }
            pathOptions={{
              color:
                "var(--info)",
              weight: 4,
              dashArray:
                "5 7",
              opacity: 0.85,
            }}
          >
            <Tooltip>
              Drainage
            </Tooltip>
          </Polyline>
        )}

        {isRainwater && (
          <CircleMarker
            center={
              rainwaterPosition
            }
            radius={8}
            pathOptions={{
              color:
                "var(--info)",
              weight: 2,
              fillColor:
                "var(--info)",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              Rainwater Harvesting
            </Tooltip>
          </CircleMarker>
        )}

        {isSolar && (
          <Rectangle
            bounds={
              solarBounds
            }
            pathOptions={{
              color:
                "var(--warning)",
              weight: 2,
              fillColor:
                "var(--warning)",
              fillOpacity: 0.3,
            }}
          >
            <Tooltip>
              Solar Infrastructure
            </Tooltip>
          </Rectangle>
        )}

        {isEVCharging && (
          <CircleMarker
            center={evPosition}
            radius={8}
            pathOptions={{
              color:
                "var(--success)",
              weight: 2,
              fillColor:
                "var(--success)",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip>
              EV Charging
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] p-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--primary-border)] bg-[var(--primary-soft)] p-3">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Site Area
          </p>

          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {displaySiteArea.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 2,
              }
            )}{" "}
            m²
          </p>
        </div>

        <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Building Footprint
          </p>

          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {buildingLayout
              ? `${buildingLayout.area.toFixed(
                  1
                )} m²`
              : "—"}
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {buildingLayout
              ? `${buildingLayout.coveragePercent.toFixed(
                  1
                )}% actual coverage`
              : "Not generated"}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success-soft)] p-3">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Green Area
          </p>

          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {isGreenSpace
              ? `${
                  greenAreaPercentage ??
                  requestedGreenPercentage
                }%`
              : "—"}
          </p>
        </div>

        <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3">
          <p className="text-xs font-medium text-[var(--text-muted)]">
            Parking
          </p>

          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {isParking
              ? `${parkingCount} spaces`
              : "—"}
          </p>

          {isParking && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Rendered:{" "}
              {parkingSpaces.length}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] p-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <LegendItem
            type="site"
            label="Project Site"
          />

          <LegendItem
            type="building"
            label="Building"
          />

          {isRoadWidening && (
            <LegendItem
              type="road"
              label="Widened Road"
            />
          )}

          {isFootpath && (
            <LegendItem
              type="dashed"
              label="Footpath"
            />
          )}

          {isGreenSpace && (
            <LegendItem
              type="green"
              label="Green Space"
            />
          )}

          {isParking && (
            <LegendItem
              type="parking"
              label="Parking"
            />
          )}

          {serviceAccess && (
            <LegendItem
              type="road"
              label="Service Access"
            />
          )}

          {fireAccess && (
            <LegendItem
              type="dashed"
              label="Fire Access"
            />
          )}

          {isTrafficSignal && (
            <LegendItem
              type="point"
              label="Traffic Signal"
            />
          )}

          {isNewRoad && (
            <LegendItem
              type="dashed"
              label="New Road"
            />
          )}

          {isBusStop && (
            <LegendItem
              type="point"
              label="Bus Stop"
            />
          )}

          {isStreetLighting && (
            <LegendItem
              type="point"
              label="Street Lighting"
            />
          )}

          {isDrainage && (
            <LegendItem
              type="dashed"
              label="Drainage"
            />
          )}

          {isRainwater && (
            <LegendItem
              type="point"
              label="Rainwater Harvesting"
            />
          )}

          {isSolar && (
            <LegendItem
              type="parking"
              label="Solar"
            />
          )}

          {isEVCharging && (
            <LegendItem
              type="point"
              label="EV Charging"
            />
          )}
        </div>

        <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
          Map elements are conceptual
          planning visualizations and are
          not construction-ready dimensions.
        </p>
      </div>
    </div>
  );
}