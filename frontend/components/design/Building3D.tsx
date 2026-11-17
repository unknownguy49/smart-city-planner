
"use client";

import { useMemo, useRef, useState } from "react";
import {
  createArchitectureLayout,
  type ArchitectureStyle,
} from "./architectureLayout";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  PerspectiveCamera,
  Text,
} from "@react-three/drei";
import type { Group } from "three";

type Space = {
  name?: string | null;
  type?: string | null;
  area_m2?: number | null;
};

type Floor = {
  floor?: number | null;
  name?: string | null;
  spaces?: Space[] | null;
};

type SpaceProgram = {
  number_of_floors?: number | null;
  floors?: Floor[] | null;
};

type Building3DProps = {
  buildingType?: string | null;
  floors?: number | null;
  spaceProgram?: SpaceProgram | null;
  parkingEnabled?: boolean;
  parkingCapacity?: number;
  greenArea?: boolean;
  pedestrianCirculation?: boolean;
  serviceAccess?: boolean;
  fireAccess?: boolean;

  // Shared architectural style selected in DesignPanel
  architectureStyle?: ArchitectureStyle;
  onArchitectureStyleChange?: (style: ArchitectureStyle) => void;
};



const STYLES: Record<
  ArchitectureStyle,
  { wall: string; floor: string; background: string }
> = {
  modern: {
    wall: "#d7e0e9",
    floor: "#e8edf3",
    background: "#dce7f2",
  },
  vastu: {
    wall: "#e6d3b5",
    floor: "#f4e8d2",
    background: "#e7e0d0",
  },
  luxury: {
    wall: "#292d35",
    floor: "#c9b58b",
    background: "#e8e0d2",
  },
  efficient: {
    wall: "#d1d5db",
    floor: "#f3f4f6",
    background: "#e5e7eb",
  },
  courtyard: {
    wall: "#c6d8bd",
    floor: "#e1ead8",
    background: "#dbe8d5",
  },
  rental: {
    wall: "#e8d5cb",
    floor: "#f3e9e2",
    background: "#e8e1dc",
  },
};


function getKind(space: Space): string {
  const value = `${space.name ?? ""} ${space.type ?? ""}`.toLowerCase();

  if (/lift|elevator/.test(value)) return "lift";
  if (/stair/.test(value)) return "stair";
  if (/bath|toilet|washroom|restroom|wc|shower/.test(value))
    return "bathroom";
  if (/kitchen|pantry/.test(value)) return "kitchen";
  if (/corridor|passage|lobby|circulation|hallway/.test(value))
    return "corridor";
  if (/bedroom|bed room/.test(value)) return "bedroom";
  if (/office|cabin|workstation|meeting|conference/.test(value))
    return "office";
  if (/living|lounge|reception|waiting/.test(value)) return "living";
  if (/store|storage|utility|service|electrical|mechanical/.test(value))
    return "utility";

  return "room";
}

function getRoomLabel(space: Space): string {
  return (space.name?.trim() || space.type?.trim() || "Room").toUpperCase();
}

function roomColor(
  kind: string,
  style: ArchitectureStyle
): string {
  const colors: Record<string, string> = {
    bathroom: "#8bd3e6",
    kitchen: "#f7d794",
    corridor: "#c4b5fd",
    stair: "#94a3b8",
    lift: "#64748b",
    bedroom: "#f6b8a8",
    office: "#a5c8f0",
    living: "#b7dfb0",
    utility: "#d6d3d1",
  };

  return colors[kind] ?? STYLES[style].floor;
}

function Box({
  position,
  size,
  color,
  roughness = 0.8,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

/**
 * Labels lie horizontally above the floor.
 * depthTest={false} keeps the lettering readable against the floor and furniture.
 */
function RoomLabels({
  space,
  width,
  y = 0.22,
}: {
  space: Space;
  width: number;
  y?: number;
}) {
  const label = getRoomLabel(space);

  const hasArea =
    typeof space.area_m2 === "number" &&
    Number.isFinite(space.area_m2) &&
    space.area_m2 > 0;

  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.23}
        maxWidth={Math.max(0.8, width - 0.3)}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#172033"
        outlineWidth={0.009}
        outlineColor="#ffffff"
        renderOrder={10}
      >
        {label}
      </Text>

      {hasArea && (
        <Text
          position={[0, -0.28, 0]}
          fontSize={0.16}
          maxWidth={Math.max(0.8, width - 0.3)}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#334155"
          outlineWidth={0.006}
          outlineColor="#ffffff"
          renderOrder={10}
        >
          {`${space.area_m2} m²`}
        </Text>
      )}
    </group>
  );
}

function Door({
  x,
  z,
  width = 0.7,
  color = "#9a6845",
}: {
  x: number;
  z: number;
  width?: number;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const hinge = useRef<Group>(null);

  useFrame(() => {
    if (!hinge.current) return;

    const target = open ? -Math.PI / 2 : 0;
    hinge.current.rotation.y +=
      (target - hinge.current.rotation.y) * 0.12;
  });

  return (
    <group position={[x, 0, z]}>
      <Box
        position={[-width / 2, 1.05, 0]}
        size={[0.07, 2.1, 0.1]}
        color="#f8fafc"
      />
      <Box
        position={[width / 2, 1.05, 0]}
        size={[0.07, 2.1, 0.1]}
        color="#f8fafc"
      />
      <Box
        position={[0, 2.08, 0]}
        size={[width + 0.12, 0.08, 0.12]}
        color="#f8fafc"
      />

      <group
        ref={hinge}
        position={[-width / 2, 0, 0.035]}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Box
          position={[width / 2, 1, 0]}
          size={[width, 1.95, 0.07]}
          color={color}
        />
        <mesh position={[width - 0.12, 1, 0.055]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#d6b46a" metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Window({
  x,
  z,
  width = 1.2,
}: {
  x: number;
  z: number;
  width?: number;
}) {
  return (
    <group position={[x, 1.45, z]}>
      <Box
        position={[0, 0, 0]}
        size={[width, 0.85, 0.045]}
        color="#475569"
      />
      <Box
        position={[0, 0, 0.03]}
        size={[width - 0.1, 0.75, 0.025]}
        color="#93d5f5"
        roughness={0.15}
      />
      <Box
        position={[0, 0, 0.05]}
        size={[0.035, 0.78, 0.03]}
        color="#f8fafc"
      />
      <Box
        position={[0, 0, 0.05]}
        size={[width - 0.1, 0.035, 0.03]}
        color="#f8fafc"
      />
    </group>
  );
}

function BathroomFixtures() {
  return (
    <group>
      {/* Toilet */}
      <Box
        position={[-0.65, 0.38, -0.6]}
        size={[0.55, 0.65, 0.45]}
        color="#ffffff"
      />
      <mesh
        position={[-0.65, 0.72, -0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.2, 0.24, 0.08, 24]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <Box
        position={[-0.65, 0.75, -0.88]}
        size={[0.42, 0.5, 0.12]}
        color="#ffffff"
      />

      {/* Wash basin */}
      <Box
        position={[0.65, 0.78, -0.6]}
        size={[0.7, 0.12, 0.42]}
        color="#ffffff"
      />
      <Box
        position={[0.65, 0.48, -0.6]}
        size={[0.12, 0.5, 0.12]}
        color="#d1d5db"
      />
      <mesh position={[0.65, 0.86, -0.6]}>
        <cylinderGeometry args={[0.07, 0.07, 0.035, 20]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>

      {/* Shower */}
      <Box
        position={[0.55, 0.12, 0.65]}
        size={[1.15, 0.12, 0.9]}
        color="#dbeafe"
      />
      <Box
        position={[0, 1, 1.08]}
        size={[1.2, 1.8, 0.035]}
        color="#b9e7f5"
        roughness={0.2}
      />
      <Box
        position={[0.95, 1, 0.62]}
        size={[0.035, 1.8, 0.9]}
        color="#b9e7f5"
        roughness={0.2}
      />
      <Box
        position={[0.95, 1.75, 0.62]}
        size={[0.05, 0.05, 0.9]}
        color="#64748b"
      />
    </group>
  );
}

function KitchenFixtures() {
  return (
    <group>
      <Box
        position={[0, 0.52, -1.15]}
        size={[2.8, 0.9, 0.55]}
        color="#b08968"
      />
      <Box
        position={[0, 1, -1.15]}
        size={[2.85, 0.08, 0.58]}
        color="#f1f5f9"
      />
      <Box
        position={[-0.7, 1.06, -1.15]}
        size={[0.65, 0.035, 0.38]}
        color="#64748b"
      />
      <Box
        position={[0.65, 1.08, -1.15]}
        size={[0.5, 0.04, 0.4]}
        color="#334155"
      />
      <Box
        position={[0, 1.6, -1.4]}
        size={[2.6, 0.65, 0.15]}
        color="#d6c3a7"
      />
    </group>
  );
}

function Furniture({ kind }: { kind: string }) {
  if (kind === "bathroom") return <BathroomFixtures />;
  if (kind === "kitchen") return <KitchenFixtures />;

  if (kind === "bedroom") {
    return (
      <group>
        <Box
          position={[0, 0.3, -0.65]}
          size={[1.8, 0.35, 2.2]}
          color="#8b5e52"
        />
        <Box
          position={[0, 0.52, -0.65]}
          size={[1.72, 0.16, 2.05]}
          color="#f8fafc"
        />
        <Box
          position={[-0.48, 0.65, -1.35]}
          size={[0.55, 0.16, 0.45]}
          color="#dbeafe"
        />
        <Box
          position={[0.48, 0.65, -1.35]}
          size={[0.55, 0.16, 0.45]}
          color="#dbeafe"
        />
        <Box
          position={[1.25, 0.45, 0.8]}
          size={[0.55, 0.8, 0.55]}
          color="#a16207"
        />
      </group>
    );
  }

  if (kind === "office") {
    return (
      <group>
        <Box
          position={[0, 0.72, -0.65]}
          size={[1.8, 0.12, 0.9]}
          color="#b08968"
        />
        <Box
          position={[-0.75, 0.35, -0.35]}
          size={[0.08, 0.7, 0.08]}
          color="#64748b"
        />
        <Box
          position={[0.75, 0.35, -0.35]}
          size={[0.08, 0.7, 0.08]}
          color="#64748b"
        />
        <Box
          position={[0, 1.12, -0.8]}
          size={[0.65, 0.38, 0.06]}
          color="#334155"
        />
        <Box
          position={[0, 0.38, 0.45]}
          size={[0.65, 0.7, 0.65]}
          color="#475569"
        />
        <Box
          position={[0, 0.78, 0.45]}
          size={[0.8, 0.12, 0.8]}
          color="#64748b"
        />
      </group>
    );
  }

  if (kind === "living") {
    return (
      <group>
        <Box
          position={[0, 0.4, -0.75]}
          size={[2.2, 0.7, 0.75]}
          color="#94a3b8"
        />
        <Box
          position={[0, 0.77, -0.75]}
          size={[2.05, 0.12, 0.65]}
          color="#cbd5e1"
        />
        <Box
          position={[0, 0.28, 0.5]}
          size={[1.4, 0.16, 0.75]}
          color="#b08968"
        />
        <Box
          position={[-1, 0.35, 0.9]}
          size={[0.45, 0.65, 0.45]}
          color="#65a30d"
        />
        <mesh position={[-1, 0.78, 0.9]}>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial color="#4d7c0f" />
        </mesh>
      </group>
    );
  }

  if (kind === "utility") {
    return (
      <group>
        <Box
          position={[0, 0.65, -0.8]}
          size={[1.5, 1.2, 0.6]}
          color="#9ca3af"
        />
        <Box
          position={[0, 1.28, -0.8]}
          size={[1.52, 0.06, 0.62]}
          color="#e5e7eb"
        />
      </group>
    );
  }

  return null;
}

function Staircase({ x, z }: { x: number; z: number }) {
  const steps = 9;

  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: steps }, (_, i) => {
        const height = 0.18 * (i + 1);

        return (
          <Box
            key={i}
            position={[-0.45, height / 2, -0.95 + i * 0.23]}
            size={[1.35, height, 0.25]}
            color={i % 2 ? "#a8b4c2" : "#cbd5e1"}
          />
        );
      })}

      <Box
        position={[-1.12, 1.05, 0.05]}
        size={[0.06, 2.1, 2.2]}
        color="#64748b"
      />
      <Box
        position={[0.22, 1.05, 0.05]}
        size={[0.06, 2.1, 2.2]}
        color="#64748b"
      />
      <Box
        position={[-1.12, 1.95, 0.05]}
        size={[0.07, 0.07, 2.2]}
        color="#475569"
      />
      <Box
        position={[0.22, 1.95, 0.05]}
        size={[0.07, 0.07, 2.2]}
        color="#475569"
      />
    </group>
  );
}

function Elevator({
  x,
  z,
  floorCount,
}: {
  x: number;
  z: number;
  floorCount: number;
}) {
  const cabin = useRef<Group>(null);
  const shaftHeight = Math.max(2.8, Math.min(floorCount, 8) * 2.5);

  useFrame(({ clock }) => {
    if (!cabin.current) return;

    const progress = (Math.sin(clock.elapsedTime * 0.65) + 1) / 2;
    cabin.current.position.y =
      0.2 + progress * Math.max(0.5, shaftHeight - 1.4);
  });

  return (
    <group position={[x, 0, z]}>
      {/* Elevator shaft */}
      <Box
        position={[-0.65, shaftHeight / 2, -0.65]}
        size={[0.1, shaftHeight, 0.1]}
        color="#64748b"
      />
      <Box
        position={[0.65, shaftHeight / 2, -0.65]}
        size={[0.1, shaftHeight, 0.1]}
        color="#64748b"
      />
      <Box
        position={[-0.65, shaftHeight / 2, 0.65]}
        size={[0.1, shaftHeight, 0.1]}
        color="#64748b"
      />
      <Box
        position={[0.65, shaftHeight / 2, 0.65]}
        size={[0.1, shaftHeight, 0.1]}
        color="#64748b"
      />
      <Box
        position={[-0.65, shaftHeight, 0]}
        size={[0.1, 0.1, 1.4]}
        color="#64748b"
      />
      <Box
        position={[0.65, shaftHeight, 0]}
        size={[0.1, 0.1, 1.4]}
        color="#64748b"
      />
      <Box
        position={[0, shaftHeight, -0.65]}
        size={[1.4, 0.1, 0.1]}
        color="#64748b"
      />
      <Box
        position={[0, shaftHeight, 0.65]}
        size={[1.4, 0.1, 0.1]}
        color="#64748b"
      />

      {/* Animated elevator cabin */}
      <group ref={cabin} position={[0, 0.2, 0]}>
        <Box
          position={[0, 0.8, 0]}
          size={[1.05, 1.6, 1.05]}
          color="#b8d8e8"
        />
        <Box
          position={[0, 1.64, 0]}
          size={[1.1, 0.08, 1.1]}
          color="#475569"
        />
        <Box
          position={[0, 0.82, 0.55]}
          size={[0.92, 1.45, 0.035]}
          color="#64748b"
        />
        <Box
          position={[-0.24, 0.82, 0.58]}
          size={[0.025, 1.35, 0.025]}
          color="#dbeafe"
        />
        <Box
          position={[0.24, 0.82, 0.58]}
          size={[0.025, 1.35, 0.025]}
          color="#dbeafe"
        />
      </group>
    </group>
  );
}

function Room({
  space,
  x,
  z,
  width,
  depth,
  style,
  floorCount,
}: {
  space: Space;
  x: number;
  z: number;
  width: number;
  depth: number;
  style: ArchitectureStyle;
  floorCount: number;
}) {
  const [hovered, setHovered] = useState(false);
  const kind = getKind(space);
  const color = roomColor(kind, style);

  if (kind === "stair" || kind === "lift") {
    return (
      <group position={[x, 0, z]}>
        <Box
          position={[0, 0.08, 0]}
          size={[width, 0.16, depth]}
          color={color}
        />

        {kind === "stair" ? (
          <Staircase x={0} z={0} />
        ) : (
          <Elevator x={0} z={0} floorCount={floorCount} />
        )}

        {/* Label for staircase or elevator */}
        <RoomLabels space={space} width={width} y={2.35} />
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      {/* Room floor */}
      <mesh
        position={[0, 0.08, 0]}
        receiveShadow
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial
          color={hovered ? "#60a5fa" : color}
          roughness={0.85}
        />
      </mesh>

      {/* Three walls */}
      <Box
        position={[0, 0.85, -depth / 2]}
        size={[width, 1.55, 0.1]}
        color={STYLES[style].wall}
      />
      <Box
        position={[-width / 2, 0.85, 0]}
        size={[0.1, 1.55, depth]}
        color={STYLES[style].wall}
      />
      <Box
        position={[width / 2, 0.85, 0]}
        size={[0.1, 1.55, depth]}
        color={STYLES[style].wall}
      />

      {/* Interactive front door */}
      <Door x={0} z={depth / 2} width={Math.min(0.75, width * 0.28)} />

      {/* Window */}
      <Window
        x={width * 0.2}
        z={-depth / 2 - 0.06}
        width={Math.min(1.2, width * 0.55)}
      />

      {/* Scale furniture to the available room dimensions */}
      <group
        scale={[
          Math.min(1, Math.max(0.35, width / 3.2)),
          Math.min(1, Math.max(0.35, width / 3.2), Math.max(0.35, depth / 3.4)),
          Math.min(1, Math.max(0.35, depth / 3.4)),
        ]}
      >
        <Furniture kind={kind} />
      </group>

      {/* Room name and area displayed inside the 3D room */}
      <RoomLabels space={space} width={width} />

      {hovered && (
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
      )}
    </group>
  );
}


function SiteElements({
  totalWidth,
  totalDepth,
  parkingEnabled,
  parkingCapacity,
  greenArea,
  pedestrianCirculation,
  serviceAccess,
  fireAccess,
}: {
  totalWidth: number;
  totalDepth: number;
  parkingEnabled: boolean;
  parkingCapacity: number;
  greenArea: boolean;
  pedestrianCirculation: boolean;
  serviceAccess: boolean;
  fireAccess: boolean;
}) {
  const siteWidth = totalWidth + 8;
  const siteDepth = totalDepth + 8;
  const edgeX = totalWidth / 2;
  const edgeZ = totalDepth / 2;

  const bayCount = Math.max(
    0,
    Math.min(30, Math.floor(parkingCapacity || 0))
  );

  const bayWidth = 1.35;
  const bayDepth = 2.5;

  return (
    <group>
      {/* Surrounding site ground */}
      <Box
        position={[0, -0.24, 0]}
        size={[siteWidth, 0.12, siteDepth]}
        color="#d6d3d1"
      />

      {/* Green area */}
      {greenArea && (
        <group>
          <Box
            position={[-siteWidth * 0.36, -0.16, 0]}
            size={[siteWidth * 0.16, 0.06, siteDepth * 0.65]}
            color="#86b96b"
          />

          {[-1, 0, 1].map((offset) => (
            <group
              key={offset}
              position={[
                -siteWidth * 0.36,
                -0.1,
                offset * siteDepth * 0.2,
              ]}
            >
              <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 0.7, 8]} />
                <meshStandardMaterial color="#795548" />
              </mesh>

              <mesh position={[0, 0.9, 0]}>
                <sphereGeometry args={[0.42, 12, 10]} />
                <meshStandardMaterial color="#3f7d3a" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Parking bays */}
      {parkingEnabled && bayCount > 0 && (
        <group>
          {Array.from(
            { length: Math.ceil(bayCount / 10) },
            (_, row) => {
              const countInRow = Math.min(
                10,
                bayCount - row * 10
              );

              const rowZ =
                -siteDepth * 0.36 +
                row * (bayDepth + 0.35);

              return (
                <group key={row}>
                  <Box
                    position={[0, -0.15, rowZ]}
                    size={[
                      countInRow * bayWidth + 0.4,
                      0.06,
                      bayDepth + 0.35,
                    ]}
                    color="#737b84"
                  />

                  {Array.from(
                    { length: countInRow },
                    (_, column) => {
                      const x =
                        -((countInRow - 1) * bayWidth) / 2 +
                        column * bayWidth;

                      return (
                        <group
                          key={column}
                          position={[x, -0.105, rowZ]}
                        >
                          <Box
                            position={[-bayWidth / 2, 0.01, 0]}
                            size={[0.035, 0.025, bayDepth]}
                            color="#ffffff"
                          />
                          <Box
                            position={[0, 0.01, -bayDepth / 2]}
                            size={[bayWidth, 0.025, 0.035]}
                            color="#ffffff"
                          />
                          <Box
                            position={[0, 0.01, bayDepth / 2]}
                            size={[bayWidth, 0.025, 0.035]}
                            color="#ffffff"
                          />
                        </group>
                      );
                    }
                  )}
                </group>
              );
            }
          )}
        </group>
      )}

      {/* Pedestrian circulation */}
      {pedestrianCirculation && (
        <Box
          position={[0, -0.145, edgeZ + 1.1]}
          size={[totalWidth + 1.5, 0.05, 0.8]}
          color="#e7d7b7"
        />
      )}

      {/* Service access */}
      {serviceAccess && (
        <Box
          position={[edgeX + 1.4, -0.145, 0]}
          size={[1, 0.05, siteDepth * 0.8]}
          color="#8b929a"
        />
      )}

      {/* External fire access */}
      {fireAccess && (
        <group>
          <Box
            position={[0, -0.135, -edgeZ - 1]}
            size={[totalWidth + 2.4, 0.07, 0.65]}
            color="#dc6b62"
          />
          <Box
            position={[0, -0.135, edgeZ + 1]}
            size={[totalWidth + 2.4, 0.07, 0.65]}
            color="#dc6b62"
          />
          <Box
            position={[-edgeX - 1, -0.135, 0]}
            size={[0.65, 0.07, totalDepth + 2]}
            color="#dc6b62"
          />
          <Box
            position={[edgeX + 1, -0.135, 0]}
            size={[0.65, 0.07, totalDepth + 2]}
            color="#dc6b62"
          />
        </group>
      )}
    </group>
  );
}



function BuildingScene({
  spaces,
  style,
  floorCount,
  parkingEnabled,
  parkingCapacity,
  greenArea,
  pedestrianCirculation,
  serviceAccess,
  fireAccess,
}: {
  spaces: Space[];
  style: ArchitectureStyle;
  floorCount: number;
  parkingEnabled: boolean;
  parkingCapacity: number;
  greenArea: boolean;
  pedestrianCirculation: boolean;
  serviceAccess: boolean;
  fireAccess: boolean;
}) {
  const colors = STYLES[style];

  
  const sourceSpaces = useMemo<Space[]>(() => {
    const valid = spaces.filter((space) => {
      const hasName = Boolean(space.name?.trim() || space.type?.trim());
      const hasArea =
        typeof space.area_m2 === "number" &&
        Number.isFinite(space.area_m2) &&
        space.area_m2 > 0;

      return hasName || hasArea;
    });

    const source: Space[] =
      valid.length > 0
        ? valid
        : [
            { name: "Living Room", type: "living", area_m2: 24 },
            { name: "Bedroom", type: "bedroom", area_m2: 16 },
            { name: "Kitchen", type: "kitchen", area_m2: 10 },
            { name: "Bathroom", type: "bathroom", area_m2: 5 },
            { name: "Staircase", type: "stair", area_m2: 7 },
            { name: "Lift", type: "lift", area_m2: 4 },
          ];

    return source.map((space, index) => ({
      ...space,
      name: space.name?.trim() || space.type?.trim() || `Room ${index + 1}`,
      area_m2:
        typeof space.area_m2 === "number" &&
        Number.isFinite(space.area_m2) &&
        space.area_m2 > 0
          ? space.area_m2
          : 8,
    }));
  }, [spaces]);

  const layout = useMemo(
    () =>
      createArchitectureLayout(
        sourceSpaces.map((space, index) => ({
          id: `space-${index}`,
          name: space.name ?? `Room ${index + 1}`,
          type: space.type,
          area_m2: space.area_m2 ?? 8,
        })),
        style,
        100,
        70
      ),
    [sourceSpaces, style]
  );

  // Convert the shared layout's normalized coordinates into 3D metres.
  const layoutScale = 0.14;
  const totalWidth = layout.width * layoutScale;
  const totalDepth = layout.height * layoutScale;

  const rooms = useMemo(
    () =>
      layout.rooms.map((rect, index) => {
        const sourceIndex = Number(rect.id.replace("space-", ""));
        const space = sourceSpaces[sourceIndex] ?? sourceSpaces[index];

        return {
          id: rect.id,
          space: {
            ...space,
            name: rect.name || space.name,
            area_m2: space.area_m2 ?? rect.area,
          },
          x:
            (rect.x + rect.width / 2) * layoutScale -
            totalWidth / 2,
          z:
            (rect.y + rect.height / 2) * layoutScale -
            totalDepth / 2,
          width: Math.max(0.45, rect.width * layoutScale - 0.08),
          depth: Math.max(0.45, rect.height * layoutScale - 0.08),
        };
      }),
    [layout, sourceSpaces, totalWidth, totalDepth]
  );

  return (
    <>
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={1.4} />
      <hemisphereLight args={["#ffffff", "#9ca3af", 1.2]} />
      <directionalLight
        position={[8, 12, 8]}
        intensity={2.2}
        castShadow
      />
      <directionalLight position={[-6, 8, -4]} intensity={0.8} />

      <group>
        <Box
          position={[0, -0.1, 0]}
          size={[totalWidth + 0.8, 0.18, totalDepth + 0.8]}
          color={colors.floor}
        />
        
        <SiteElements
          totalWidth={totalWidth}
          totalDepth={totalDepth}
          parkingEnabled={parkingEnabled}
          parkingCapacity={parkingCapacity}
          greenArea={greenArea}
          pedestrianCirculation={pedestrianCirculation}
          serviceAccess={serviceAccess}
          fireAccess={fireAccess}
        />

        
        {rooms.map((room) => (
          <Room
            key={room.id}
            space={room.space}
            x={room.x}
            z={room.z}
            width={room.width}
            depth={room.depth}
            style={style}
            floorCount={floorCount}
          />
        ))}

      </group>

      <ContactShadows
        position={[0, -0.2, 0]}
        opacity={0.3}
        scale={20}
        blur={2}
      />

      <PerspectiveCamera
        makeDefault
        position={[
          totalWidth * 1.05,
          Math.max(10, totalDepth * 1.15),
          totalDepth * 1.35,
        ]}
        fov={45}
      />

      <OrbitControls
        makeDefault
        enableDamping
        minDistance={5}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.5, 0]}
      />
    </>
  );
}


export default function Building3D({
  buildingType,
  floors,
  spaceProgram,
  parkingEnabled = false,
  parkingCapacity = 0,
  greenArea = false,
  pedestrianCirculation = false,
  serviceAccess = false,
  fireAccess = false,
  architectureStyle = "modern",
  onArchitectureStyleChange,
}: Building3DProps) {
  const orderedFloors = useMemo(() => {
    return [...(spaceProgram?.floors ?? [])].sort((a, b) => {
      if (typeof a.floor === "number" && typeof b.floor === "number") {
        return a.floor - b.floor;
      }

      if (typeof a.floor === "number") return -1;
      if (typeof b.floor === "number") return 1;

      return 0;
    });
  }, [spaceProgram?.floors]);

  const floorCount = Math.max(
    1,
    Math.floor(
      floors ??
        spaceProgram?.number_of_floors ??
        orderedFloors.length ??
        1
    )
  );

  const [selectedFloor, setSelectedFloor] = useState(0);
  const style = architectureStyle;

  const safeSelectedFloor = Math.min(
    selectedFloor,
    Math.max(floorCount - 1, 0)
  );

  const selectedFloorData = orderedFloors[safeSelectedFloor];
  const floorSpaces = selectedFloorData?.spaces ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-stretch gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Interactive 3D Architecture
          </h2>
          <p className="text-sm text-slate-500">
            {buildingType || "Building"} · Detailed conceptual model
          </p>
        </div>

        <label className="flex min-w-0 flex-col items-stretch gap-1.5 text-sm text-slate-700 sm:flex-row sm:items-center sm:gap-2">
          Architecture style
          <select
            value={style}
            onChange={(event) =>
              onArchitectureStyleChange?.(
                event.target.value as ArchitectureStyle
              )
            }
            className="w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto sm:max-w-[260px]"
          >
            <option value="modern">Modern Minimalist</option>
            <option value="vastu">Indian Contemporary / Vastu</option>
            <option value="luxury">Luxury Architecture</option>
            <option value="efficient">Space-Efficient</option>
            <option value="courtyard">Courtyard / Climate-Responsive</option>
            <option value="rental">Rental / Investment</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
        {Array.from({ length: floorCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedFloor(index)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              safeSelectedFloor === index
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            {orderedFloors[index]?.name ||
              (index === 0 ? "Ground Floor" : `Floor ${index + 1}`)}
          </button>
        ))}
      </div>

      <div className="h-[340px] w-full sm:h-[440px] lg:h-[560px]">
        <Canvas shadows dpr={[1, 1.75]} gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }} onCreated={({ gl }) => { gl.setClearColor(STYLES[style].background, 1); }}>
          <BuildingScene
            key={`${safeSelectedFloor}-${style}`}
            spaces={floorSpaces}
            style={style}
            floorCount={floorCount}
            parkingEnabled={parkingEnabled}
            parkingCapacity={parkingCapacity}
            greenArea={greenArea}
            pedestrianCirculation={pedestrianCirculation}
            serviceAccess={serviceAccess}
            fireAccess={fireAccess}
          />
        </Canvas>

      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
        <span>Drag to rotate</span>
        <span>Scroll to zoom</span>
        <span>Click doors to open or close</span>
        <span>Room colors indicate room type</span>
        <span>Room names and areas appear in the 3D model</span>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Rooms on this floor
        </h3>

        {floorSpaces.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {floorSpaces.map((space, index) => (
              <span
                key={`${space.name ?? space.type ?? "room"}-${index}`}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                {space.name?.trim() || space.type?.trim() || "Room"}
                {typeof space.area_m2 === "number" &&
                Number.isFinite(space.area_m2) &&
                space.area_m2 > 0
                  ? ` · ${space.area_m2} m²`
                  : ""}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No room data was supplied for this floor. Sample rooms are shown
            in the 3D preview.
          </p>
        )}
      </div>

      <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        Conceptual 3D visualization. Room arrangements and fixtures are
        inferred from the space program; this is not a construction-ready
        BIM model.
      </p>
    </section>
  );
}
