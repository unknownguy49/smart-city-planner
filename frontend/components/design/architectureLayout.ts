
export type ArchitectureStyle =
  | "modern"
  | "vastu"
  | "luxury"
  | "efficient"
  | "courtyard"
  | "rental";

export interface LayoutSpace {
  id: string;
  name: string;
  type?: string | null;
  area_m2?: number | null;
}

export interface LayoutRect {
  id: string;
  name: string;
  type?: string | null;
  area: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArchitectureLayout {
  rooms: LayoutRect[];
  width: number;
  height: number;
  courtyard: LayoutRect | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const roomKind = (space: LayoutSpace) => {
  const name = `${space.name} ${space.type ?? ""}`.toLowerCase();

  if (/corridor|passage|circulation|hallway/.test(name)) return "circulation";
  if (/stair|lift|elevator|toilet|washroom|bathroom|utility|shaft|storage|service/.test(name)) return "service";
  if (/bedroom|sleeping/.test(name)) return "bedroom";
  if (/kitchen|pantry/.test(name)) return "kitchen";
  if (/living|lounge|reception|foyer|entrance|waiting/.test(name)) return "living";
  if (/dining/.test(name)) return "dining";
  if (/pooja|puja|prayer/.test(name)) return "prayer";
  if (/balcony|veranda|terrace/.test(name)) return "outdoor";
  return "other";
};

function priority(space: LayoutSpace, style: ArchitectureStyle): number {
  const kind = roomKind(space);

  const priorities: Record<ArchitectureStyle, string[]> = {
    modern: ["living", "dining", "kitchen", "bedroom", "other", "outdoor", "prayer", "service", "circulation"],
    vastu: ["prayer", "living", "dining", "bedroom", "kitchen", "service", "outdoor", "other", "circulation"],
    luxury: ["living", "outdoor", "bedroom", "dining", "kitchen", "prayer", "other", "service", "circulation"],
    efficient: ["kitchen", "service", "circulation", "bedroom", "living", "dining", "other", "prayer", "outdoor"],
    courtyard: ["living", "dining", "bedroom", "kitchen", "outdoor", "prayer", "other", "service", "circulation"],
    rental: ["bedroom", "kitchen", "service", "living", "other", "dining", "prayer", "outdoor", "circulation"],
  };

  return priorities[style].indexOf(kind);
}

/**
 * Generates a conceptual room arrangement in a normalized plan.
 * Coordinates use a top-left origin. All rooms remain inside the
 * outer rectangle; the courtyard is an intentional unallocated void.
 */
export function createArchitectureLayout(
  spaces: LayoutSpace[],
  style: ArchitectureStyle = "modern",
  width = 100,
  height = 70,
): ArchitectureLayout {
  const valid = spaces
    .filter((space) => space.name.trim().length > 0)
    .map((space, index) => ({
      ...space,
      id: space.id || `room-${index}`,
      area: Number.isFinite(space.area_m2) && (space.area_m2 ?? 0) > 0
        ? Number(space.area_m2)
        : 1,
    }));

  if (!valid.length) {
    return { rooms: [], width, height, courtyard: null };
  }

  const gap = 0.8;
  const courtyardMode = style === "courtyard" && valid.length >= 4;
  const courtyardWidth = courtyardMode ? width * 0.20 : 0;
  const courtyardHeight = courtyardMode ? height * 0.24 : 0;

  const courtyard: LayoutRect | null = courtyardMode
    ? {
        id: "central-courtyard",
        name: "OPEN COURTYARD",
        area: 0,
        x: (width - courtyardWidth) / 2,
        y: (height - courtyardHeight) / 2,
        width: courtyardWidth,
        height: courtyardHeight,
      }
    : null;

  // Split the plan into a small number of bands. Their proportions are
  // based on requested room areas, not the order of the input array.
  const sorted = [...valid].sort((a, b) => {
    const p = priority(a, style) - priority(b, style);
    return p !== 0 ? p : b.area - a.area;
  });

  const totalArea = sorted.reduce((sum, space) => sum + space.area, 0);
  const usableWidth = width - (courtyardMode ? courtyardWidth * 0.35 : 0);
  const usableHeight = height - (courtyardMode ? courtyardHeight * 0.25 : 0);

  const targetBands = style === "efficient" ? 3 : style === "luxury" ? 2 : 3;
  const bands: typeof sorted[] = Array.from({ length: Math.min(targetBands, sorted.length) }, () => []);
  const bandAreas = bands.map(() => 0);

  // Place priority-ordered spaces into the currently lightest area band.
  for (const space of sorted) {
    let target = 0;
    for (let i = 1; i < bands.length; i++) {
      if (bandAreas[i] < bandAreas[target]) target = i;
    }
    bands[target].push(space);
    bandAreas[target] += space.area;
  }

  // Styles choose a different major axis and band order.
  if (style === "vastu" || style === "rental") bands.reverse();

  const roomRects: LayoutRect[] = [];
  let cursorY = 0;

  bands.forEach((band, bandIndex) => {
    if (!band.length) return;

    const bandHeight = usableHeight * bandAreas[bandIndex] / totalArea;
    const bandTotal = band.reduce((sum, space) => sum + space.area, 0);
    let cursorX = 0;

    band.forEach((space, index) => {
      const roomWidth = usableWidth * space.area / bandTotal;
      const x = cursorX;
      const y = cursorY;

      let rect: LayoutRect = {
        id: space.id,
        name: space.name,
        type: space.type,
        area: space.area,
        x,
        y,
        width: Math.max(0.1, roomWidth - gap),
        height: Math.max(0.1, bandHeight - gap),
      };

      // Luxury gives the main shared room a wider frontage.
      if (style === "luxury" && roomKind(space) === "living") {
        rect = {
          ...rect,
          width: clamp(roomWidth * 1.08 - gap, 0.1, usableWidth - x),
        };
      }

      // Courtyard layout places shared spaces near the central opening.
      if (courtyardMode && courtyard && (roomKind(space) === "living" || roomKind(space) === "dining")) {
        rect = {
          ...rect,
          x: clamp(x + courtyardWidth * 0.12, 0, width - rect.width),
        };
      }

      roomRects.push(rect);
      cursorX += roomWidth;
    });

    cursorY += bandHeight;
  });

  // Normalize the result into a consistent coordinate system.
  // This allows the 2D SVG and 3D scene to scale the same plan independently.
  const rooms = roomRects.map((room) => ({
    ...room,
    x: clamp(room.x, 0, width),
    y: clamp(room.y, 0, height),
    width: clamp(room.width, 0.1, width - clamp(room.x, 0, width)),
    height: clamp(room.height, 0.1, height - clamp(room.y, 0, height)),
  }));

  return { rooms, width, height, courtyard };
}
