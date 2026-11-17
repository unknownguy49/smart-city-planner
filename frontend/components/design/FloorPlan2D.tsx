"use client";

import { useMemo, useState } from "react";
import { createArchitectureLayout } from "./architectureLayout";

interface SpaceProgramSpace {
  name?: string | null;
  type?: string | null;
  area_m2?: number | null;
}

interface SpaceProgramFloor {
  floor?: number | null;
  name?: string | null;
  area_m2?: number | null;
  total_allocated_area_m2?: number | null;
  spaces?: SpaceProgramSpace[] | null;
}

interface SpaceProgram {
  building_type?: string | null;
  building_subtype?: string | null;
  number_of_floors?: number | null;
  total_builtup_area_m2?: number | null;
  floor_area_m2?: number | null;
  total_allocated_area_m2?: number | null;
  floors?: SpaceProgramFloor[] | null;
  status?: string | null;
}

interface FloorPlanCoordinate {
  lat: number;
  lng: number;
}

export type ArchitectureStyle =
  | "modern"
  | "vastu"
  | "luxury"
  | "efficient"
  | "courtyard"
  | "rental";

interface FloorPlan2DProps {
  buildingType?: string | null;
  commercialSubtype?: string | null;
  floors?: number | null;
  footprintArea?: number | null;
  builtUpArea?: number | null;
  spaceProgram?: SpaceProgram | null;
  coordinates?: FloorPlanCoordinate[];
  parkingEnabled?: boolean;
  parkingCapacity?: number;
  greenArea?: boolean;
  pedestrianCirculation?: boolean;
  serviceAccess?: boolean;
  fireAccess?: boolean;
  architectureStyle?: ArchitectureStyle;
}

interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  type:
    | "circulation"
    | "service"
    | "retail"
    | "residential"
    | "utility"
    | "open";
}


type DoorLayoutStyle =
  | "standard"
  | "open-plan"
  | "private"
  | "accessible"
  | "entrance-focused";

type DoorSide = "top" | "right" | "bottom" | "left";

interface DoorPlacement {
  side: DoorSide;
  position: number;
  width: number;
}

const DOOR_WIDTH = 30;
const ACCESSIBLE_DOOR_WIDTH = 42;
const WALL_TOLERANCE = 8;

function findDoorPlacement(
  room: Room,
  rooms: Room[],
  style: DoorLayoutStyle
): DoorPlacement | null {
  const kind = getSpaceKind(room.name);

  if (kind === "stair" || kind === "lift") {
    return null;
  }

  const candidates: Array<{
    side: DoorSide;
    position: number;
    overlap: number;
    neighbor: Room;
  }> = [];

  for (const other of rooms) {
    if (other.id === room.id) continue;

    const overlapX =
      Math.min(room.x + room.width, other.x + other.width) -
      Math.max(room.x, other.x);

    const overlapY =
      Math.min(room.y + room.height, other.y + other.height) -
      Math.max(room.y, other.y);

    // Neighbor on the top edge.
    if (
      Math.abs(room.y - (other.y + other.height)) <= WALL_TOLERANCE &&
      overlapX > 20
    ) {
      candidates.push({
        side: "top",
        position: Math.max(room.x, other.x) + overlapX / 2,
        overlap: overlapX,
        neighbor: other,
      });
    }

    // Neighbor on the right edge.
    if (
      Math.abs(room.x + room.width - other.x) <= WALL_TOLERANCE &&
      overlapY > 20
    ) {
      candidates.push({
        side: "right",
        position: Math.max(room.y, other.y) + overlapY / 2,
        overlap: overlapY,
        neighbor: other,
      });
    }

    // Neighbor on the bottom edge.
    if (
      Math.abs(room.y + room.height - (other.y + other.height)) <= WALL_TOLERANCE &&
      overlapX > 20
    ) {
      candidates.push({
        side: "bottom",
        position: Math.max(room.x, other.x) + overlapX / 2,
        overlap: overlapX,
        neighbor: other,
      });
    }

    // Neighbor on the left edge.
    if (
      Math.abs(room.x - (other.x + other.width)) <= WALL_TOLERANCE &&
      overlapY > 20
    ) {
      candidates.push({
        side: "left",
        position: Math.max(room.y, other.y) + overlapY / 2,
        overlap: overlapY,
        neighbor: other,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const isPrivateRoom = (name: string) => {
    const n = name.toLowerCase();

    return (
      n.includes("toilet") ||
      n.includes("washroom") ||
      n.includes("private office") ||
      n.includes("bedroom") ||
      n.includes("consultation")
    );
  };

  const scored = candidates
    .filter((candidate) => candidate.overlap >= 32)
    .map((candidate) => {
      let score = candidate.overlap;

      const neighborKind = getSpaceKind(candidate.neighbor.name);

      if (neighborKind === "circulation") score += 1000;
      if (neighborKind === "entrance") score += 900;

      if (
        style === "entrance-focused" &&
        neighborKind === "circulation"
      ) {
        score += 500;
      }

      if (
        style === "private" &&
        isPrivateRoom(room.name) &&
        neighborKind === "circulation"
      ) {
        score += 400;
      }

      if (
        style === "open-plan" &&
        !isPrivateRoom(room.name) &&
        neighborKind !== "circulation"
      ) {
        score -= 150;
      }

      return { ...candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const selected = scored[0];

  if (
    style === "open-plan" &&
    !isPrivateRoom(room.name) &&
    getSpaceKind(selected.neighbor.name) !== "circulation"
  ) {
    return null;
  }

  const width =
    style === "accessible"
      ? ACCESSIBLE_DOOR_WIDTH
      : DOOR_WIDTH;

  return {
    side: selected.side,
    position: selected.position,
    width: Math.min(width, selected.overlap - 8),
  };
}


const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

const INNER_X = 20;
const INNER_Y = 20;
const INNER_WIDTH = 860;
const INNER_HEIGHT = 510;

function normalizeBuildingType(
  value?: string | null
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeSpaceType(
  value?: string | null
): Room["type"] {
  const type = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    type.includes("commercial") ||
    type.includes("retail")
  ) {
    return "retail";
  }

  if (
    type.includes("residential") ||
    type.includes("housing") ||
    type.includes("bedroom")
  ) {
    return "residential";
  }

  if (
    type.includes("vertical") ||
    type.includes("circulation")
  ) {
    return "circulation";
  }

  if (type.includes("service")) {
    return "service";
  }

  if (
    type.includes("utility") ||
    type.includes("toilet") ||
    type.includes("kitchen")
  ) {
    return "utility";
  }

  return "open";
}

function getRoomClass(
  type: Room["type"]
): string {
  switch (type) {
    case "retail":
      return "fill-blue-50 stroke-blue-500";

    case "residential":
      return "fill-emerald-50 stroke-emerald-500";

    case "circulation":
      return "fill-yellow-50 stroke-yellow-600";

    case "service":
      return "fill-orange-50 stroke-orange-500";

    case "utility":
      return "fill-purple-50 stroke-purple-500";

    case "open":
    default:
      return "fill-gray-50 stroke-gray-500";
  }
}

function getRoomTextClass(
  type: Room["type"]
): string {
  switch (type) {
    case "retail":
      return "fill-blue-900";

    case "residential":
      return "fill-emerald-900";

    case "circulation":
      return "fill-yellow-900";

    case "service":
      return "fill-orange-900";

    case "utility":
      return "fill-purple-900";

    case "open":
    default:
      return "fill-gray-900";
  }
}

/**
 * Identifies the architectural role of a space
 * using its backend-generated name.
 */
function getSpaceKind(name: string): string {
  const value = name
    .trim()
    .toLowerCase();

  if (
    value.includes("stair") ||
    value.includes("staircase")
  ) {
    return "stair";
  }

  if (
    value.includes("lift") ||
    value.includes("elevator")
  ) {
    return "lift";
  }

  if (
    value.includes("toilet") ||
    value.includes("washroom") ||
    value.includes("wc")
  ) {
    return "toilet";
  }

  if (
    value.includes("reception") ||
    value.includes("lobby") ||
    value.includes("entrance")
  ) {
    return "entrance";
  }

  if (
    value.includes("corridor") ||
    value.includes("circulation") ||
    value.includes("passage")
  ) {
    return "circulation";
  }

  if (
    value.includes("service") ||
    value.includes("utility")
  ) {
    return "service";
  }

  return "room";
}

/**
 * Creates an area-aware conceptual layout.
 *
 * The backend determines:
 * - spaces
 * - names
 * - types
 * - architectural areas
 *
 * The frontend determines:
 * - visual grouping
 * - SVG position
 * - room width
 * - room height
 *
 * This is a conceptual visualization and is not
 * intended to replace architectural drawings.
 */


function createRoomsFromSpaceProgram(
  spaces: SpaceProgramSpace[],
  layout?: BuildingLayout,
  buildingType?: string | null,
  subtype?: string | null,
  architectureStyle: ArchitectureStyle = "modern"
): Room[] {
  const validSpaces = spaces.filter(
    (space) =>
      typeof space.name === "string" &&
      space.name.trim().length > 0 &&
      typeof space.area_m2 === "number" &&
      Number.isFinite(space.area_m2) &&
      space.area_m2 > 0
  );

  if (validSpaces.length === 0) return [];

  const x = layout?.x ?? INNER_X;
  const y = layout?.y ?? INNER_Y;
  const width = layout?.width ?? INNER_WIDTH;
  const height = layout?.height ?? INNER_HEIGHT;

  const generated = createArchitectureLayout(
    validSpaces.map((space, index) => ({
      id: `space-${index}`,
      name: space.name!.trim(),
      type: space.type,
      area_m2: space.area_m2,
    })),
    architectureStyle,
    100,
    70
  );

  return generated.rooms.map((room) => {
    const sourceIndex = Number(room.id.replace("space-", ""));
    const source = validSpaces[sourceIndex];

    return {
      id: room.id,
      name: room.name,
      x: x + (room.x / generated.width) * width,
      y: y + (room.y / generated.height) * height,
      width: (room.width / generated.width) * width,
      height: (room.height / generated.height) * height,
      area: Number(source?.area_m2 ?? room.area),
      type: normalizeSpaceType(source?.type),
    };
  });
}



 


interface BuildingGeometry {
  widthM: number;
  depthM: number;
  areaM2: number;
  orientation: "East–West" | "North–South";
  aspectRatio: number;
}

interface BuildingLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculateBuildingGeometry(
  coordinates: FloorPlanCoordinate[],
  footprintArea?: number | null
): BuildingGeometry | null {
  if (
    coordinates.length < 3 ||
    typeof footprintArea !== "number" ||
    footprintArea <= 0
  ) {
    return null;
  }

  let minLat = coordinates[0].lat;
  let maxLat = coordinates[0].lat;
  let minLng = coordinates[0].lng;
  let maxLng = coordinates[0].lng;

  coordinates.forEach((coordinate) => {
    minLat = Math.min(minLat, coordinate.lat);
    maxLat = Math.max(maxLat, coordinate.lat);
    minLng = Math.min(minLng, coordinate.lng);
    maxLng = Math.max(maxLng, coordinate.lng);
  });

  const centerLat =
    (minLat + maxLat) / 2;

  const metersPerDegreeLat = 111320;

  const metersPerDegreeLng =
    111320 *
    Math.cos(
      (centerLat * Math.PI) / 180
    );

  const siteWidthM =
    (maxLng - minLng) *
    metersPerDegreeLng;

  const siteDepthM =
    (maxLat - minLat) *
    metersPerDegreeLat;

  if (
    siteWidthM <= 0 ||
    siteDepthM <= 0
  ) {
    return null;
  }

  const orientation =
    siteWidthM >= siteDepthM
      ? "East–West"
      : "North–South";

  /*
   * Keep the building reasonably proportioned
   * instead of producing an extremely thin
   * rectangle from the raw site dimensions.
   */
  const siteAspect =
    Math.max(
      siteWidthM,
      siteDepthM
    ) /
    Math.max(
      Math.min(
        siteWidthM,
        siteDepthM
      ),
      1
    );

  const aspectRatio = Math.max(
    1.15,
    Math.min(
      1.8,
      siteAspect
    )
  );

  const widthM =
    Math.sqrt(
      footprintArea *
        aspectRatio
    );

  const depthM =
    footprintArea /
    widthM;

  return {
    widthM,
    depthM,
    areaM2: footprintArea,
    orientation,
    aspectRatio,
  };
}

export default function FloorPlan2D({
  buildingType,
  commercialSubtype,
  floors,
  footprintArea,
  builtUpArea,
  spaceProgram,
  coordinates = [],
  parkingEnabled = false,
  parkingCapacity = 0,
  greenArea = false,
  pedestrianCirculation = false,
  serviceAccess = false,
  fireAccess = false,
  architectureStyle = "modern",
}: FloorPlan2DProps) {  const totalFloors =
    typeof floors === "number" &&
    floors > 0
      ? Math.floor(floors)
      : typeof spaceProgram?.number_of_floors ===
          "number" &&
        spaceProgram.number_of_floors >
          0
        ? Math.floor(
            spaceProgram.number_of_floors
          )
        : 1;

  const [selectedFloor, setSelectedFloor] =
    useState(0);

  const [doorLayout, setDoorLayout] =
    useState<DoorLayoutStyle>("standard");  
  
    const safeFloor = Math.min(
    Math.max(selectedFloor, 0),
    Math.max(totalFloors - 1, 0)
  );

  const floorData =
    spaceProgram?.floors?.[safeFloor] ?? null;

  /*
   * Conceptual site orientation.
   *
   * This compares the latitude and longitude
   * extents of the project polygon.
   */
  const buildingOrientation =
    useMemo(() => {
      if (coordinates.length < 2) {
        return 0;
      }

      let minLat =
        coordinates[0].lat;

      let maxLat =
        coordinates[0].lat;

      let minLng =
        coordinates[0].lng;

      let maxLng =
        coordinates[0].lng;

      coordinates.forEach(
        (coordinate) => {
          minLat = Math.min(
            minLat,
            coordinate.lat
          );

          maxLat = Math.max(
            maxLat,
            coordinate.lat
          );

          minLng = Math.min(
            minLng,
            coordinate.lng
          );

          maxLng = Math.max(
            maxLng,
            coordinate.lng
          );
        }
      );

      const latitudeSpan =
        maxLat - minLat;

      const longitudeSpan =
        maxLng - minLng;

      return longitudeSpan >=
        latitudeSpan
        ? 0
        : 90;
    }, [coordinates]);

  const buildingGeometry = useMemo(
    () =>
        calculateBuildingGeometry(
        coordinates,
        footprintArea
        ),
    [
        coordinates,
        footprintArea,
    ]
    );

    const buildingLayout = useMemo<BuildingLayout>(() => {
    if (!buildingGeometry) {
        return {
        x: INNER_X,
        y: INNER_Y,
        width: INNER_WIDTH,
        height: INNER_HEIGHT,
        };
    }

    const horizontalPadding = 28;
    const verticalPadding = 28;

    const availableWidth =
        INNER_WIDTH - horizontalPadding * 2;

    const availableHeight =
        INNER_HEIGHT - verticalPadding * 2;

    const scale = Math.min(
        availableWidth /
        Math.max(buildingGeometry.widthM, 0.01),
        availableHeight /
        Math.max(buildingGeometry.depthM, 0.01)
    );

    const width =
        buildingGeometry.widthM * scale;

    const height =
        buildingGeometry.depthM * scale;

    return {
        x:
        INNER_X +
        (INNER_WIDTH - width) / 2,
        y:
        INNER_Y +
        (INNER_HEIGHT - height) / 2,
        width,
        height,
    };
    }, [buildingGeometry]);

  const rooms = useMemo(
    () =>
      createRoomsFromSpaceProgram(
        floorData?.spaces ?? [],
        buildingLayout,
        buildingType ?? spaceProgram?.building_type,
        commercialSubtype ?? spaceProgram?.building_subtype,
        architectureStyle
      ),
    [
      floorData,
      buildingLayout,
      buildingType,
      commercialSubtype,
      spaceProgram,
      architectureStyle,
    ]
  );

  const floorLabel =
    safeFloor === 0
      ? "Ground Floor"
      : `Floor ${
          safeFloor + 1
        }`;

  const estimatedFloorArea =
    typeof floorData?.area_m2 ===
      "number" &&
    floorData.area_m2 > 0
      ? floorData.area_m2
      : typeof builtUpArea ===
            "number" &&
          builtUpArea > 0
        ? builtUpArea /
          totalFloors
        : typeof footprintArea ===
              "number" &&
            footprintArea > 0
          ? footprintArea
          : null;

  const allocatedArea =
    typeof floorData?.total_allocated_area_m2 ===
      "number"
      ? floorData.total_allocated_area_m2
      : rooms.reduce(
          (sum, room) =>
            sum + room.area,
          0
        );

  const buildingWidthM =
    buildingGeometry?.widthM ?? null;

  const buildingDepthM =
    buildingGeometry?.depthM ?? null;

  const buildingAreaM2 =
    buildingGeometry?.areaM2 ??
    footprintArea ??
    null;


  const hasSpaceProgram =
    rooms.length > 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="border-b border-gray-200 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              2D Architectural Floor
              Plan
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Conceptual floor layout
              generated from the
              backend space program.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
            <p className="text-xs text-blue-600">
              Building
            </p>

            <p className="font-semibold text-blue-900">
              {buildingType ||
                "Building"}
            </p>
          </div>
        </div>

        {commercialSubtype && (
          <p className="mt-3 text-xs text-gray-500">
            Commercial subtype:{" "}
            <span className="font-medium text-gray-700">
              {commercialSubtype}
            </span>
          </p>
        )}
      </div>

      {/* =====================================================
          FLOOR SELECTOR
          ===================================================== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-4">
        <span className="mr-2 text-sm font-semibold text-gray-700">
          Floors:
        </span>

        {Array.from(
          {
            length: totalFloors,
          },
          (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                setSelectedFloor(
                  index
                )
              }
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                safeFloor === index
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {index === 0
                ? "Ground"
                : `Floor ${
                    index + 1
                  }`}
            </button>
          )
        )}
      </div>

      {/* =====================================================
          DOOR LAYOUT SELECTOR
          ===================================================== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4">
        <label
          htmlFor="door-layout-style"
          className="text-sm font-semibold text-gray-700"
        >
          Door layout:
        </label>

        <select
          id="door-layout-style"
          value={doorLayout}
          onChange={(event) =>
            setDoorLayout(event.target.value as DoorLayoutStyle)
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="standard">Standard</option>
          <option value="open-plan">Open-plan</option>
          <option value="private">Private rooms</option>
          <option value="accessible">Accessible doors</option>
          <option value="entrance-focused">Entrance-focused</option>
        </select>

        <p className="text-xs text-gray-500">
          Choose how room doors should be positioned.
        </p>
      </div>

      {/* =====================================================
          FLOOR METADATA
          ===================================================== */}
      <div className="grid grid-cols-2 gap-3 border-b border-gray-200 p-4 md:grid-cols-6">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Current Floor
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {floorLabel}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Total Floors
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {totalFloors}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Floor Area
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {estimatedFloorArea !=
            null
              ? `${estimatedFloorArea.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 1,
                  }
                )} m²`
              : "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Allocated Space
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {allocatedArea > 0
              ? `${allocatedArea.toLocaleString(
                  undefined,
                  {
                    maximumFractionDigits: 1,
                  }
                )} m²`
              : "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Site Orientation
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {buildingOrientation ===
            0
              ? "East–West"
              : "North–South"}
          </p>
        </div>
      </div>

      {/* =====================================================
          SPACE PROGRAM STATUS
          ===================================================== */}
      <div className="border-b border-gray-200 px-4 py-3">
        {hasSpaceProgram ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-medium text-green-700">
              Data-driven space
              program
            </span>

            <span className="text-gray-500">
              {rooms.length} spaces
              on this floor
            </span>

            {spaceProgram?.status && (
              <span className="text-gray-400">
                Status:{" "}
                {spaceProgram.status}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            No generated space
            program is available
            for this floor.
          </div>
        )}
      </div>
      
      {/* =====================================================
          SELECTED SITE ELEMENTS — 2D SITE PREVIEW
          ===================================================== */}
      <section className="border-b border-gray-200 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-gray-900">
            Site Elements — 2D Preview
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Shows the outdoor elements selected in Site Elements.
          </p>
        </div>

        <svg
          viewBox="0 0 900 330"
          className="h-auto w-full rounded-lg border border-gray-300 bg-slate-50"
          role="img"
          aria-label="Conceptual site elements layout"
        >
          {/* Site boundary */}
          <rect
            x="20"
            y="20"
            width="860"
            height="290"
            rx="5"
            fill="#f8fafc"
            stroke="#334155"
            strokeWidth="3"
          />

          {/* Building footprint */}
          <rect
            x="300"
            y="75"
            width="300"
            height="170"
            rx="3"
            fill="#dbeafe"
            stroke="#2563eb"
            strokeWidth="3"
          />
          <text
            x="450"
            y="155"
            textAnchor="middle"
            fontSize="19"
            fontWeight="700"
            fill="#1e3a8a"
          >
            BUILDING
          </text>
          <text
            x="450"
            y="179"
            textAnchor="middle"
            fontSize="13"
            fill="#1e40af"
          >
            Conceptual footprint
          </text>

          {/* Green space */}
          {greenArea && (
            <g>
              <rect
                x="40"
                y="40"
                width="150"
                height="95"
                rx="5"
                fill="#bbf7d0"
                stroke="#15803d"
                strokeWidth="2"
              />
              {Array.from({ length: 5 }, (_, i) => (
                <g key={`tree-${i}`}>
                  <circle
                    cx={65 + i * 27}
                    cy={75 + (i % 2) * 18}
                    r="9"
                    fill="#16a34a"
                  />
                  <circle
                    cx={65 + i * 27}
                    cy={75 + (i % 2) * 18}
                    r="3"
                    fill="#dcfce7"
                  />
                </g>
              ))}
              <text
                x="115"
                y="122"
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#166534"
              >
                GREEN AREA
              </text>
            </g>
          )}

          {/* Parking bays */}
          {parkingEnabled && (
            <g>
              <rect
                x="650"
                y="40"
                width="205"
                height="110"
                rx="3"
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="2"
              />

              {Array.from(
                { length: Math.min(Math.max(parkingCapacity, 1), 8) },
                (_, i) => {
                  const column = i % 4;
                  const row = Math.floor(i / 4);

                  return (
                    <g key={`parking-bay-${i}`}>
                      <rect
                        x={660 + column * 47}
                        y={48 + row * 47}
                        width="39"
                        height="39"
                        fill="#fef3c7"
                        stroke="#ca8a04"
                        strokeWidth="1.5"
                      />
                      <text
                        x={679.5 + column * 47}
                        y={71 + row * 47}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#854d0e"
                      >
                        P{i + 1}
                      </text>
                    </g>
                  );
                }
              )}

              <text
                x="752"
                y="165"
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#854d0e"
              >
                PARKING
              </text>
            </g>
          )}

          {/* Pedestrian route */}
          {pedestrianCirculation && (
            <g>
              <path
                d="M 210 280 L 210 220 L 300 220"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 210 280 L 210 220 L 300 220"
                fill="none"
                stroke="#ede9fe"
                strokeWidth="3"
                strokeDasharray="7 7"
              />
              <text
                x="205"
                y="300"
                textAnchor="middle"
                fontSize="11"
                fill="#6d28d9"
              >
                WALKWAY
              </text>
            </g>
          )}

          {/* Service access */}
          {serviceAccess && (
            <g>
              <path
                d="M 850 210 L 720 210 L 720 245 L 600 245"
                fill="none"
                stroke="#ea580c"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <text
                x="750"
                y="198"
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#c2410c"
              >
                SERVICE ACCESS
              </text>
            </g>
          )}

          {/* External fire access */}
          {fireAccess && (
            <g>
              <path
                d="M 40 275 L 860 275 L 860 175"
                fill="none"
                stroke="#dc2626"
                strokeWidth="5"
                strokeDasharray="10 6"
              />
              <text
                x="450"
                y="298"
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#b91c1c"
              >
                EXTERNAL FIRE ACCESS
              </text>
            </g>
          )}

          <text
            x="35"
            y="300"
            fontSize="10"
            fill="#64748b"
          >
            N ↑
          </text>
        </svg>

        <p className="mt-2 text-xs text-gray-500">
          Conceptual site diagram, not a surveyed or construction-ready layout.
          Verify clearances, vehicle turning, emergency access, and local regulations.
        </p>
      </section>

      {/* =====================================================
          FLOOR PLAN
          ===================================================== */}
      <div className="min-w-0 p-2 sm:p-4">
        <div className="mx-auto w-full max-w-[1000px] min-w-0 overflow-hidden rounded-xl border-2 border-gray-800 bg-white">
          <svg
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label={`${floorLabel} conceptual floor plan`}
          >
            {/* =================================================
                BUILDING BOUNDARY
                ================================================= */}
            <rect
                x={buildingLayout.x}
                y={buildingLayout.y}
                width={buildingLayout.width}
                height={buildingLayout.height}
                rx="4"
                fill="white"
                stroke="black"
                strokeWidth="8"
            />

            {/* =================================================
                CONCEPTUAL DIMENSION INDICATORS
                ================================================= */}
            <g opacity="0.8">
              {/* Top dimension */}
              <line
                x1={INNER_X}
                y1={5}
                x2={
                  INNER_X +
                  INNER_WIDTH
                }
                y2={5}
                stroke="#4b5563"
                strokeWidth="1"
              />

              <line
                x1={INNER_X}
                y1={2}
                x2={INNER_X}
                y2={8}
                stroke="#4b5563"
                strokeWidth="1"
              />

              <line
                x1={
                  INNER_X +
                  INNER_WIDTH
                }
                y1={2}
                x2={
                  INNER_X +
                  INNER_WIDTH
                }
                y2={8}
                stroke="#4b5563"
                strokeWidth="1"
              />

              <text
                x={
                  INNER_X +
                  INNER_WIDTH /
                    2
                }
                y={15}
                textAnchor="middle"
                className="text-[9px] fill-gray-600"
              >
                CONCEPTUAL
                BUILDING WIDTH
              </text>

              {/* Left dimension */}
              <line
                x1={5}
                y1={INNER_Y}
                x2={5}
                y2={
                  INNER_Y +
                  INNER_HEIGHT
                }
                stroke="#4b5563"
                strokeWidth="1"
              />

              <line
                x1={2}
                y1={INNER_Y}
                x2={8}
                y2={INNER_Y}
                stroke="#4b5563"
                strokeWidth="1"
              />

              <line
                x1={2}
                y1={
                  INNER_Y +
                  INNER_HEIGHT
                }
                x2={8}
                y2={
                  INNER_Y +
                  INNER_HEIGHT
                }
                stroke="#4b5563"
                strokeWidth="1"
              />

              <text
                x="12"
                y={
                  INNER_Y +
                  INNER_HEIGHT /
                    2
                }
                textAnchor="middle"
                transform={`rotate(-90 12 ${
                  INNER_Y +
                  INNER_HEIGHT /
                    2
                })`}
                className="text-[9px] fill-gray-600"
              >
                CONCEPTUAL
                BUILDING DEPTH
              </text>
            </g>

            {/* =================================================
                ROOMS
                ================================================= */}
            {rooms.map(
              (room, roomIndex) => {
                const kind =
                  getSpaceKind(
                    room.name
                  );

                const centerX =
                  room.x +
                  room.width / 2;

                const centerY =
                  room.y +
                  room.height / 2;

                const isSmallRoom =
                  room.width <
                    130 ||
                  room.height <
                    75;

                const doorPlacement = findDoorPlacement(
                  room,
                  rooms,
                  doorLayout
                );    

                return (
                  <g
                    key={
                      room.id
                    }
                  >
                    {/* =========================================
                        ROOM BOUNDARY
                        ========================================= */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={
                        room.width
                      }
                      height={
                        room.height
                      }
                      rx={2}
                      className={getRoomClass(
                        room.type
                      )}
                      strokeWidth="3"
                    />

                    {/* =========================================
                        MAIN ENTRANCE
                        ========================================= */}
                    {kind ===
                      "entrance" && (
                      <>
                        <line
                          x1={
                            centerX -
                            28
                          }
                          y1={
                            room.y +
                            room.height
                          }
                          x2={
                            centerX +
                            28
                          }
                          y2={
                            room.y +
                            room.height
                          }
                          stroke="white"
                          strokeWidth="9"
                        />

                        <path
                          d={`
                            M ${
                              centerX -
                              25
                            } ${
                              room.y +
                              room.height
                            }
                            A 25 25 0 0 1
                            ${centerX}
                            ${
                              room.y +
                              room.height -
                              25
                            }
                          `}
                          fill="none"
                          stroke="black"
                          strokeWidth="2"
                        />

                        <text
                          x={
                            centerX
                          }
                          y={
                            room.y +
                            room.height -
                            8
                          }
                          textAnchor="middle"
                          className="text-[9px] fill-gray-600"
                        >
                          MAIN
                          ENTRANCE
                        </text>
                      </>
                    )}

                    {/* =========================================
                        ADAPTIVE ROOM DOOR
                        ========================================= */}
                    {kind !== "entrance" &&
                      kind !== "stair" &&
                      kind !== "lift" &&
                      doorPlacement && (
                        <>
                          {/* TOP WALL DOOR */}
                          {doorPlacement.side === "top" && (
                            <>
                              <line
                                x1={doorPlacement.position - doorPlacement.width / 2}
                                y1={room.y}
                                x2={doorPlacement.position + doorPlacement.width / 2}
                                y2={room.y}
                                stroke="white"
                                strokeWidth={doorPlacement.width === ACCESSIBLE_DOOR_WIDTH ? 10 : 8}
                              />

                              <path
                                d={`M ${
                                  doorPlacement.position - doorPlacement.width / 2
                                } ${room.y}
                                A ${doorPlacement.width / 2} ${doorPlacement.width / 2}
                                0 0 1 ${doorPlacement.position}
                                ${room.y + doorPlacement.width / 2}`}
                                fill="none"
                                stroke="black"
                                strokeWidth="1.5"
                              />
                            </>
                          )}

                          {/* RIGHT WALL DOOR */}
                          {doorPlacement.side === "right" && (
                            <>
                              <line
                                x1={room.x + room.width}
                                y1={doorPlacement.position - doorPlacement.width / 2}
                                x2={room.x + room.width}
                                y2={doorPlacement.position + doorPlacement.width / 2}
                                stroke="white"
                                strokeWidth={doorPlacement.width === ACCESSIBLE_DOOR_WIDTH ? 10 : 8}
                              />

                              <path
                                d={`M ${room.x + room.width}
                                ${doorPlacement.position - doorPlacement.width / 2}
                                A ${doorPlacement.width / 2} ${doorPlacement.width / 2}
                                0 0 0 ${room.x + room.width - doorPlacement.width / 2}
                                ${doorPlacement.position}`}
                                fill="none"
                                stroke="black"
                                strokeWidth="1.5"
                              />
                            </>
                          )}

                          {/* BOTTOM WALL DOOR */}
                          {doorPlacement.side === "bottom" && (
                            <>
                              <line
                                x1={doorPlacement.position - doorPlacement.width / 2}
                                y1={room.y + room.height}
                                x2={doorPlacement.position + doorPlacement.width / 2}
                                y2={room.y + room.height}
                                stroke="white"
                                strokeWidth={doorPlacement.width === ACCESSIBLE_DOOR_WIDTH ? 10 : 8}
                              />

                              <path
                                d={`M ${
                                  doorPlacement.position - doorPlacement.width / 2
                                } ${room.y + room.height}
                                A ${doorPlacement.width / 2} ${doorPlacement.width / 2}
                                0 0 0 ${doorPlacement.position}
                                ${room.y + room.height - doorPlacement.width / 2}`}
                                fill="none"
                                stroke="black"
                                strokeWidth="1.5"
                              />
                            </>
                          )}

                          {/* LEFT WALL DOOR */}
                          {doorPlacement.side === "left" && (
                            <>
                              <line
                                x1={room.x}
                                y1={doorPlacement.position - doorPlacement.width / 2}
                                x2={room.x}
                                y2={doorPlacement.position + doorPlacement.width / 2}
                                stroke="white"
                                strokeWidth={doorPlacement.width === ACCESSIBLE_DOOR_WIDTH ? 10 : 8}
                              />

                              <path
                                d={`M ${room.x}
                                ${doorPlacement.position - doorPlacement.width / 2}
                                A ${doorPlacement.width / 2} ${doorPlacement.width / 2}
                                0 0 1 ${room.x + doorPlacement.width / 2}
                                ${doorPlacement.position}`}
                                fill="none"
                                stroke="black"
                                strokeWidth="1.5"
                              />
                            </>
                          )}
                        </>
                      )}

                    {/* =========================================
                        STAIRCASE
                        ========================================= */}
                    {kind ===
                      "stair" && (
                      <g>
                        {Array.from(
                          {
                            length:
                              Math.max(
                                5,
                                Math.min(
                                  10,
                                  Math.floor(
                                    room.height /
                                      14
                                  )
                                )
                              ),
                          },
                          (
                            _,
                            stepIndex
                          ) => {
                            const stepCount =
                              Math.max(
                                5,
                                Math.min(
                                  10,
                                  Math.floor(
                                    room.height /
                                      14
                                  )
                                )
                              );

                            const stepHeight =
                              room.height /
                              stepCount;

                            return (
                              <line
                                key={`step-${stepIndex}`}
                                x1={
                                  room.x +
                                  10
                                }
                                y1={
                                  room.y +
                                  stepHeight *
                                    (stepIndex +
                                      1)
                                }
                                x2={
                                  room.x +
                                  room.width -
                                  10
                                }
                                y2={
                                  room.y +
                                  stepHeight *
                                    (stepIndex +
                                      1)
                                }
                                stroke="#92400e"
                                strokeWidth="2"
                              />
                            );
                          }
                        )}

                        <path
                          d={`
                            M ${
                              room.x +
                              room.width /
                                2
                            }
                              ${
                                room.y +
                                room.height -
                                12
                              }
                            L ${
                              room.x +
                              room.width /
                                2
                            }
                              ${
                                room.y +
                                12
                              }
                            L ${
                              room.x +
                              room.width /
                                2 -
                              7
                            }
                              ${
                                room.y +
                                22
                              }
                            M ${
                              room.x +
                              room.width /
                                2
                            }
                              ${
                                room.y +
                                12
                              }
                            L ${
                              room.x +
                              room.width /
                                2 +
                              7
                            }
                              ${
                                room.y +
                                22
                              }
                          `}
                          fill="none"
                          stroke="#92400e"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* =========================================
                        LIFT
                        ========================================= */}
                    {kind ===
                      "lift" && (
                      <g>
                        <rect
                          x={
                            centerX -
                            18
                          }
                          y={
                            centerY -
                            18
                          }
                          width="36"
                          height="36"
                          fill="white"
                          stroke="#6b21a8"
                          strokeWidth="2"
                        />

                        <line
                          x1={
                            centerX
                          }
                          y1={
                            centerY -
                            12
                          }
                          x2={
                            centerX
                          }
                          y2={
                            centerY +
                            12
                          }
                          stroke="#6b21a8"
                          strokeWidth="1.5"
                        />

                        <path
                          d={`
                            M ${
                              centerX -
                              7
                            } ${
                              centerY -
                              6
                            }
                            L ${centerX}
                              ${
                                centerY -
                                12
                              }
                            L ${
                              centerX +
                              7
                            } ${
                              centerY -
                              6
                            }
                          `}
                          fill="none"
                          stroke="#6b21a8"
                          strokeWidth="1.5"
                        />

                        <path
                          d={`
                            M ${
                              centerX -
                              7
                            } ${
                              centerY +
                              6
                            }
                            L ${centerX}
                              ${
                                centerY +
                                12
                              }
                            L ${
                              centerX +
                              7
                            } ${
                              centerY +
                              6
                            }
                          `}
                          fill="none"
                          stroke="#6b21a8"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    {/* =========================================
                        TOILET SYMBOL
                        ========================================= */}
                    {kind ===
                      "toilet" && (
                      <g opacity="0.75">
                        <circle
                          cx={
                            centerX
                          }
                          cy={
                            centerY -
                            8
                          }
                          r="5"
                          fill="none"
                          stroke="#c2410c"
                          strokeWidth="2"
                        />

                        <path
                          d={`
                            M ${
                              centerX -
                              7
                            } ${
                              centerY +
                              1
                            }
                            Q ${
                              centerX
                            } ${
                              centerY +
                              12
                            }
                            ${
                              centerX +
                              7
                            } ${
                              centerY +
                              1
                            }
                          `}
                          fill="none"
                          stroke="#c2410c"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* =========================================
                        WINDOWS
                        ========================================= */}
                    {kind !==
                      "circulation" &&
                      room.width >
                        150 && (
                        <>
                          <line
                            x1={
                              room.x +
                              20
                            }
                            y1={
                              room.y
                            }
                            x2={
                              room.x +
                              65
                            }
                            y2={
                              room.y
                            }
                            stroke="white"
                            strokeWidth="7"
                          />

                          <line
                            x1={
                              room.x +
                              20
                            }
                            y1={
                              room.y
                            }
                            x2={
                              room.x +
                              65
                            }
                            y2={
                              room.y
                            }
                            stroke="#2563eb"
                            strokeWidth="3"
                          />

                          <line
                            x1={
                              room.x +
                              room.width -
                              65
                            }
                            y1={
                              room.y
                            }
                            x2={
                              room.x +
                              room.width -
                              20
                            }
                            y2={
                              room.y
                            }
                            stroke="white"
                            strokeWidth="7"
                          />

                          <line
                            x1={
                              room.x +
                              room.width -
                              65
                            }
                            y1={
                              room.y
                            }
                            x2={
                              room.x +
                              room.width -
                              20
                            }
                            y2={
                              room.y
                            }
                            stroke="#2563eb"
                            strokeWidth="3"
                          />
                        </>
                      )}

                    {/* =========================================
                        ROOM NAME
                        ========================================= */}
                    <text
                      x={
                        centerX
                      }
                      y={
                        kind ===
                          "stair" ||
                        kind ===
                          "lift"
                          ? room.y +
                            18
                          : centerY -
                            8
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[14px] font-semibold ${getRoomTextClass(
                        room.type
                      )}`}
                    >
                      {room.name}
                    </text>

                    {/* =========================================
                        ROOM AREA
                        ========================================= */}
                    <text
                      x={
                        centerX
                      }
                      y={
                        kind ===
                          "stair" ||
                        kind ===
                          "lift"
                          ? room.y +
                            35
                          : centerY +
                            15
                      }
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[11px] ${getRoomTextClass(
                        room.type
                      )}`}
                    >
                      {room.area.toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 1,
                        }
                      )}{" "}
                      m²
                    </text>

                    {/* =========================================
                        SMALL ROOM NUMBER
                        ========================================= */}
                    {isSmallRoom && (
                      <text
                        x={
                          room.x +
                          6
                        }
                        y={
                          room.y +
                          12
                        }
                        className="text-[8px] fill-gray-500"
                      >
                        {roomIndex +
                          1}
                      </text>
                    )}
                  </g>
                );
              }
            )}

            {/* =================================================
                EMPTY STATE
                ================================================= */}
            {!hasSpaceProgram && (
              <g>
                <text
                  x={
                    CANVAS_WIDTH /
                    2
                  }
                  y={
                    CANVAS_HEIGHT /
                    2
                  }
                  textAnchor="middle"
                  className="text-[18px] font-semibold fill-gray-500"
                >
                  Space program
                  not available
                </text>

                <text
                  x={
                    CANVAS_WIDTH /
                    2
                  }
                  y={
                    CANVAS_HEIGHT /
                      2 +
                    30
                  }
                  textAnchor="middle"
                  className="text-[13px] fill-gray-400"
                >
                  Generate the
                  design again
                </text>
              </g>
            )}

            {/* =================================================
                NORTH ARROW
                ================================================= */}
            <g transform="translate(820 505)">
              <line
                x1="0"
                y1="25"
                x2="0"
                y2="0"
                stroke="black"
                strokeWidth="3"
              />

              <polygon
                points="0,-8 -7,5 7,5"
                fill="black"
              />

              <text
                x="0"
                y="45"
                textAnchor="middle"
                className="text-[14px] font-bold"
              >
                N
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* =====================================================
          SPACE SCHEDULE
          ===================================================== */}
      <div className="border-t border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Space Schedule
              </h4>

              <p className="text-xs text-gray-500">
                Backend-generated
                space program for{" "}
                {floorLabel}.
              </p>
            </div>

            <div className="text-xs text-gray-500">
              {rooms.length}{" "}
              spaces
            </div>
          </div>
        </div>

        {rooms.length > 0 ? (
          <div className="w-full min-w-0 overflow-hidden">
            <table className="w-full table-fixed text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="break-words px-2 py-2 font-semibold sm:px-4 sm:py-3">
                    #
                  </th>

                  <th className="break-words px-2 py-2 font-semibold sm:px-4 sm:py-3">
                    Space
                  </th>

                  <th className="break-words px-2 py-2 font-semibold sm:px-4 sm:py-3">
                    Type
                  </th>

                  <th className="break-words px-1.5 py-2 text-right font-semibold sm:px-4 sm:py-3">
                    Area
                  </th>

                  <th className="break-words px-1.5 py-2 text-right font-semibold sm:px-4 sm:py-3">
                    Floor %
                  </th>
                </tr>
              </thead>

              <tbody>
                {rooms.map(
                  (
                    room,
                    index
                  ) => {
                    const percentage =
                      estimatedFloorArea &&
                      estimatedFloorArea >
                        0
                        ? (room.area /
                            estimatedFloorArea) *
                          100
                        : 0;

                    const displayType =
                      room.type ===
                      "retail"
                        ? "Commercial"
                        : room.type ===
                            "residential"
                          ? "Residential"
                          : room.type ===
                              "circulation"
                            ? "Circulation"
                            : room.type ===
                                "service"
                              ? "Service"
                              : room.type ===
                                  "utility"
                                ? "Utility"
                                : "Open";

                    return (
                      <tr
                        key={
                          room.id
                        }
                        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {index +
                            1}
                        </td>

                        <td className="break-words px-2 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">
                          {
                            room.name
                          }
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              room.type ===
                              "retail"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : room.type ===
                                    "residential"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : room.type ===
                                      "circulation"
                                    ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                    : room.type ===
                                        "service"
                                      ? "border-orange-200 bg-orange-50 text-orange-700"
                                      : room.type ===
                                          "utility"
                                        ? "border-purple-200 bg-purple-50 text-purple-700"
                                        : "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {
                              displayType
                            }
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {room.area.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 1,
                            }
                          )}{" "}
                          m²
                        </td>

                        <td className="px-4 py-3 text-right text-gray-600">
                          {percentage.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 1,
                            }
                          )}
                          %
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td
                    colSpan={
                      3
                    }
                    className="px-4 py-3 font-semibold text-gray-900"
                  >
                    Total
                    Allocated
                    Space
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {allocatedArea.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 1,
                      }
                    )}{" "}
                    m²
                  </td>

                  <td className="break-words px-1.5 py-2 text-right font-semibold text-gray-700 sm:px-4 sm:py-3">
                    {estimatedFloorArea &&
                    estimatedFloorArea >
                      0
                      ? (
                          (allocatedArea /
                            estimatedFloorArea) *
                          100
                        ).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 1,
                          }
                        )
                      : "—"}

                    {estimatedFloorArea &&
                    estimatedFloorArea >
                      0
                      ? "%"
                      : ""}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-gray-500">
            No spaces are
            available for this
            floor.
          </div>
        )}
      </div>

      {/* =====================================================
          LEGEND
          ===================================================== */}
      <div className="flex flex-wrap gap-4 border-t border-gray-200 p-4 text-xs text-gray-600">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-blue-500 bg-blue-50" />
          Commercial
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-emerald-500 bg-emerald-50" />
          Residential
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-yellow-600 bg-yellow-50" />
          Circulation
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-purple-500 bg-purple-50" />
          Utilities
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-orange-500 bg-orange-50" />
          Service
        </span>
      </div>

      {/* =====================================================
          DISCLAIMER
          ===================================================== */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          This is a conceptual
          planning visualization.
          Room dimensions,
          structural systems,
          fire compliance,
          accessibility and
          construction drawings
          require detailed
          architectural and
          engineering
          verification.
        </p>
      </div>
    </section>
  );
}