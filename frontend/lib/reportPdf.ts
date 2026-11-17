import jsPDF from "jspdf";
import { getReportVisuals, type ReportVisuals } from "./reportVisualStore";
import type { ProjectReportRecord } from "./reportStore";

type Dict = Record<string, unknown>;
type PdfKind = "architecture" | "scenario" | "complete";
type RGB = [number, number, number];

const PAGE = { left: 16, right: 16, top: 20, bottom: 17 };

const C = {
  ink: [32, 43, 54] as RGB,
  muted: [99, 110, 120] as RGB,
  accent: [31, 79, 93] as RGB,
  accentLight: [229, 239, 241] as RGB,
  line: [213, 221, 225] as RGB,
  pale: [247, 249, 250] as RGB,
  white: [255, 255, 255] as RGB,
  green: [40, 110, 78] as RGB,
  amber: [150, 99, 24] as RGB,
  red: [157, 55, 55] as RGB,
};

function rec(v: unknown): Dict {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Dict)
    : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function val(v: unknown, fallback = "Not available"): string {
  if (isMissing(v)) return fallback;

  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return String(v);
  }

  return fallback;
}

function first(
  o: Dict,
  keys: string[],
  fallback = "Not available"
): string {
  for (const k of keys) {
    if (!isMissing(o[k])) return val(o[k], fallback);
  }

  return fallback;
}

function firstRaw(o: Dict, keys: string[]): unknown {
  for (const k of keys) {
    if (!isMissing(o[k])) return o[k];
  }

  return undefined;
}

function label(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateText(v?: unknown): string {
  if (isMissing(v)) return "Not recorded";

  const d = new Date(String(v));

  return Number.isNaN(d.getTime())
    ? "Invalid date"
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function project(report: ProjectReportRecord): Dict {
  return rec(report.project);
}

function artifact(
  report: ProjectReportRecord,
  key: string
): Dict {
  return rec(rec(rec(report.artifacts)[key]).data);
}

function artifactRecord(
  report: ProjectReportRecord,
  keys: string[]
): Dict {
  const all = rec(report.artifacts);

  for (const k of keys) {
    if (all[k]) return rec(all[k]);
  }

  return {};
}

function dataFromArtifact(
  report: ProjectReportRecord,
  keys: string[]
): Dict {
  const a = artifactRecord(report, keys);
  return rec(a.data ?? a);
}

function W(pdf: jsPDF): number {
  return pdf.internal.pageSize.getWidth();
}

function H(pdf: jsPDF): number {
  return pdf.internal.pageSize.getHeight();
}

function CW(pdf: jsPDF): number {
  return W(pdf) - PAGE.left - PAGE.right;
}

function font(
  pdf: jsPDF,
  size = 9,
  color: RGB = C.ink,
  bold = false
): void {
  pdf.setFont("helvetica", bold ? "bold" : "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
}

function rule(pdf: jsPDF, y: number): void {
  pdf.setDrawColor(...C.line);
  pdf.setLineWidth(0.25);
  pdf.line(PAGE.left, y, W(pdf) - PAGE.right, y);
}

function ensure(
  pdf: jsPDF,
  y: number,
  needed: number
): number {
  if (y + needed > H(pdf) - PAGE.bottom) {
    pdf.addPage();
    return PAGE.top;
  }

  return y;
}

function section(
  pdf: jsPDF,
  title: string,
  y: number
): number {
  y = ensure(pdf, y, 15);

  font(pdf, 13, C.accent, true);

  const lines = pdf.splitTextToSize(
    title,
    CW(pdf)
  ) as string[];

  pdf.text(lines, PAGE.left, y);

  const after = y + Math.max(4, lines.length * 5);

  rule(pdf, after);

  return after + 7;
}

function paragraph(
  pdf: jsPDF,
  raw: unknown,
  y: number,
  opts: {
    size?: number;
    color?: RGB;
    indent?: number;
  } = {}
): number {
  const s = val(raw, "").trim();

  if (!s) return y;

  const size = opts.size ?? 8.7;
  const indent = opts.indent ?? 0;

  font(pdf, size, opts.color ?? C.ink);

  const lines = pdf.splitTextToSize(
    s,
    CW(pdf) - indent
  ) as string[];

  const step = size * 0.49;

  for (const line of lines) {
    y = ensure(pdf, y, step + 1);

    pdf.text(line, PAGE.left + indent, y);

    y += step;
  }

  return y + 3;
}

function keyValues(
  pdf: jsPDF,
  rows: Array<[string, unknown]>,
  y: number
): number {
  const lw = 48;
  const vw = CW(pdf) - lw - 5;

  for (const [k, raw] of rows) {
    const text = val(raw);

    font(pdf, 8.1, C.ink);

    const lines = pdf.splitTextToSize(
      text,
      vw
    ) as string[];

    const h = Math.max(
      7.3,
      lines.length * 4 + 2.4
    );

    y = ensure(pdf, y, h);

    pdf.setFillColor(...C.pale);
    pdf.rect(
      PAGE.left,
      y - 4.7,
      CW(pdf),
      h,
      "F"
    );

    font(pdf, 7.8, C.muted, true);

    pdf.text(k, PAGE.left + 2, y);

    font(pdf, 8.1, C.ink);

    pdf.text(
      lines,
      PAGE.left + lw,
      y
    );

    y += h + 0.4;
  }

  return y + 3;
}

function cellText(v: unknown): string {
  return val(v, "—").replace(/\s+/g, " ").trim();
}

function table(
  pdf: jsPDF,
  title: string,
  headers: string[],
  rows: string[][],
  y: number,
  widths?: number[]
): number {
  y = section(pdf, title, y);

  if (!rows.length) {
    return paragraph(
      pdf,
      "No saved data is available for this section. This is not evidence that the relevant condition passes.",
      y,
      { size: 8.2, color: C.muted }
    );
  }

  const total = CW(pdf);

  const colWidths =
    widths && widths.length === headers.length
      ? widths.map(
          (n) =>
            (total * n) /
            widths.reduce((a, b) => a + b, 0)
        )
      : headers.map(() => total / headers.length);

  const headerHeight = 9;

  const drawHeader = (at: number) => {
    pdf.setFillColor(...C.accent);

    pdf.rect(
      PAGE.left,
      at - 5.1,
      total,
      headerHeight,
      "F"
    );

    font(pdf, 7.1, C.white, true);

    let x = PAGE.left;

    headers.forEach((h, i) => {
      const lines = pdf.splitTextToSize(
        h,
        colWidths[i] - 3
      ) as string[];

      pdf.text(
        lines.slice(0, 2),
        x + 1.5,
        at - (lines.length > 1 ? 1 : 0)
      );

      x += colWidths[i];
    });
  };

  y = ensure(pdf, y, headerHeight + 3);

  drawHeader(y);

  y += 6;

  rows.forEach((row, ri) => {
    const wrapped = headers.map((_, i) =>
      pdf.splitTextToSize(
        cellText(row[i]),
        Math.max(8, colWidths[i] - 4)
      ) as string[]
    );

    const lineCount = Math.max(
      1,
      ...wrapped.map((a) => a.length)
    );

    const rowH = Math.max(
      7,
      lineCount * 3.45 + 2.5
    );

    if (y + rowH > H(pdf) - PAGE.bottom) {
      pdf.addPage();
      y = PAGE.top;
      drawHeader(y);
      y += 6;
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...C.pale);

      pdf.rect(
        PAGE.left,
        y - 4.3,
        total,
        rowH,
        "F"
      );
    }

    font(pdf, 7, C.ink);

    let x = PAGE.left;

    wrapped.forEach((lines, i) => {
      pdf.text(lines, x + 1.5, y);
      x += colWidths[i];
    });

    y += rowH;

    pdf.setDrawColor(...C.line);

    pdf.line(
      PAGE.left,
      y - 1.8,
      PAGE.left + total,
      y - 1.8
    );
  });

  return y + 5;
}

function bullets(
  pdf: jsPDF,
  title: string,
  values: unknown[],
  y: number
): number {
  y = section(pdf, title, y);

  const items = values
    .map((v) => {
      if (typeof v === "string" || typeof v === "number") {
        return String(v);
      }

      const o = rec(v);

      const main = first(
        o,
        [
          "text",
          "recommendation",
          "message",
          "description",
          "name",
          "title",
          "finding",
        ],
        ""
      );

      const status = first(
        o,
        ["status", "priority", "severity"],
        ""
      );

      return main && status
        ? `${main} — ${status}`
        : main;
    })
    .filter(Boolean);

  if (!items.length) {
    return paragraph(
      pdf,
      "No saved items are available.",
      y,
      { size: 8.2, color: C.muted }
    );
  }

  for (const item of items) {
    font(pdf, 8.4, C.ink);

    const lines = pdf.splitTextToSize(
      item,
      CW(pdf) - 7
    ) as string[];

    y = ensure(
      pdf,
      y,
      lines.length * 4.1 + 3
    );

    font(pdf, 8.5, C.accent, true);
    pdf.text("•", PAGE.left + 1, y);

    font(pdf, 8.4, C.ink);
    pdf.text(lines, PAGE.left + 6, y);

    y += lines.length * 4.1 + 3;
  }

  return y + 2;
}

function imageOnNewPage(
  pdf: jsPDF,
  image: string | undefined,
  title: string
): number {
  if (!image) return PAGE.top;

  pdf.addPage();

  const y = section(pdf, title, PAGE.top);

  try {
    const p = pdf.getImageProperties(image);

    const maxW = CW(pdf);
    const maxH = H(pdf) - y - PAGE.bottom - 4;

    const scale = Math.min(
      maxW / p.width,
      maxH / p.height
    );

    const w = p.width * scale;
    const h = p.height * scale;

    const format = /^data:image\/(jpeg|jpg)/i.test(image)
      ? "JPEG"
      : /^data:image\/webp/i.test(image)
        ? "WEBP"
        : "PNG";

    pdf.addImage(
      image,
      format,
      (W(pdf) - w) / 2,
      y,
      w,
      h,
      undefined,
      "FAST"
    );
  } catch (e) {
    paragraph(
      pdf,
      `The stored visual could not be embedded: ${
        e instanceof Error ? e.message : "unsupported image format"
      }`,
      y,
      { color: C.muted }
    );
  }

  return H(pdf) - PAGE.bottom + 1;
}

function addCover(
  pdf: jsPDF,
  report: ProjectReportRecord,
  title: string,
  visuals: ReportVisuals | null
): void {
  const p = project(report);

  pdf.setFillColor(...C.accent);
  pdf.rect(0, 0, W(pdf), 14, "F");

  font(pdf, 10, C.accent, true);
  pdf.text("SMART CITY PLANNER", PAGE.left, 29);

  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(0.8);

  pdf.line(
    PAGE.left,
    34,
    PAGE.left + 40,
    34
  );

  font(pdf, 24, C.ink, true);

  const titleLines = pdf.splitTextToSize(
    title,
    CW(pdf) - 4
  ) as string[];

  pdf.text(titleLines, PAGE.left, 49);

  let y = 49 + titleLines.length * 9.2 + 6;

  font(pdf, 12, C.muted);

  pdf.text(
    pdf.splitTextToSize(
      first(p, ["name", "project_name"], "Untitled Planning Project"),
      CW(pdf)
    ) as string[],
    PAGE.left,
    y
  );

  y += 13;

  y = keyValues(
    pdf,
    [
      ["Project ID", first(p, ["id", "project_id"])],
      [
        "Location",
        `${first(p, ["city"], "Unspecified city")}, ${first(p, ["state"], "Unspecified state")}`,
      ],
      [
        "Development type",
        first(p, ["building_type", "buildingType"]),
      ],
      [
        "Site area",
        isMissing(p.area)
          ? "Not available"
          : `${val(p.area)} m² (project input; verify against GIS)`,
      ],
      ["Indicative budget", first(p, ["budget"])],
      ["Generated", dateText()],
      [
        "Report status",
        "Preliminary AI-assisted assessment — professional verification required",
      ],
    ],
    y
  );

  if (visuals?.architectureMap && y < H(pdf) - 48) {
    try {
      const img = visuals.architectureMap;
      const props = pdf.getImageProperties(img);

      const maxW = CW(pdf) * 0.9;
      const maxH = Math.min(72, H(pdf) - y - 32);

      const scale = Math.min(
        maxW / props.width,
        maxH / props.height
      );

      if (scale > 0) {
        pdf.addImage(
          img,
          /^data:image\/(jpeg|jpg)/i.test(img) ? "JPEG" : "PNG",
          (W(pdf) - props.width * scale) / 2,
          y + 2,
          props.width * scale,
          props.height * scale,
          undefined,
          "FAST"
        );
      }
    } catch {
      // Keep the cover usable if an optional preview is invalid.
    }
  }

  font(pdf, 7.2, C.muted);

  pdf.text(
    "Conceptual planning support only. Not a survey, sanctioned plan, engineering certificate or statutory approval.",
    PAGE.left,
    H(pdf) - 10
  );
}

function addExecutive(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const p = project(report);
  const agents = artifact(report, "agents");
  const scenario = artifact(report, "scenario");
  const ev = rec(
    scenario.evaluation ??
    scenario.results ??
    scenario.assessment
  );
  const lands = artifact(report, "lands");

  y = section(pdf, "1. Executive Summary", y);

  y = paragraph(
    pdf,
    first(
      p,
      ["description", "summary"],
      "This report consolidates saved project inputs and planning outputs. Interpret findings in light of the data completeness, source quality and validation status recorded in this report."
    ),
    y
  );

  y = keyValues(
    pdf,
    [
      [
        "Proposed development",
        first(p, ["building_type", "buildingType"]),
      ],
      [
        "Location",
        `${first(p, ["city"], "Not available")}, ${first(p, ["state"], "Not available")}`,
      ],
      [
        "Site area",
        first(
          lands,
          ["area_m2", "area", "measured_area"],
          first(p, ["area"])
        ),
      ],
      ["Budget", first(p, ["budget"])],
      [
        "Planning score",
        first(
          ev,
          ["overall_score", "score"],
          first(agents, ["overall_score", "score"], "Not calculated")
        ),
      ],
      [
        "Recorded status",
        first(
          ev,
          ["status", "scenario_status", "compliance_status"],
          "Pending verification"
        ),
      ],
    ],
    y
  );

  return paragraph(
    pdf,
    "A score is not a compliance certificate. Missing measurements or rules are not assumed to pass; estimated values must be confirmed before decisions are made.",
    y,
    { size: 8, color: C.muted }
  );
}

function coordinatesRows(land: Dict): string[][] {
  const coords = arr(
    land.coordinates ??
    land.boundary_coordinates ??
    land.boundary
  );

  return coords.slice(0, 250).map((v, i) => {
    if (Array.isArray(v)) {
      // GeoJSON coordinate order is [longitude, latitude].
      return [String(i + 1), val(v[1]), val(v[0])];
    }

    const o = rec(v);

    return [
      String(i + 1),
      first(o, ["lat", "latitude", "y"]),
      first(o, ["lng", "lon", "longitude", "x"]),
    ];
  });
}

function addGIS(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const land = artifact(report, "lands");
  const site = rec(
    land.site_analysis ?? land.analysis ?? land.site
  );
  const centroid = rec(land.centroid);
  const geo = rec(
    land.gis ?? land.geojson ?? land.geometry_data
  );

  y = section(
    pdf,
    "2. GIS Site Analysis and Parcel Geometry",
    y
  );

  y = keyValues(
    pdf,
    [
      [
        "Boundary / geometry status",
        first(
          land,
          ["geometry_status", "boundary_status", "validation_status"],
          first(geo, ["status"], "Not validated in saved data")
        ),
      ],
      [
        "Coordinate reference system",
        first(
          land,
          ["crs", "coordinate_reference_system", "srid"],
          first(
            geo,
            ["crs", "coordinate_reference_system"],
            "Unknown; confirm CRS"
          )
        ),
      ],
      [
        "Site area",
        first(
          land,
          ["area_m2", "area", "measured_area"],
          first(site, ["area_m2", "area"])
        ),
      ],
      [
        "Perimeter",
        first(
          land,
          ["perimeter_m", "perimeter", "perimeter_meters"],
          first(geo, ["perimeter_m", "perimeter"])
        ),
      ],
      [
        "Centroid latitude",
        first(
          centroid,
          ["lat", "latitude"],
          first(land, ["centroid_lat", "latitude"])
        ),
      ],
      [
        "Centroid longitude",
        first(
          centroid,
          ["lng", "lon", "longitude"],
          first(land, ["centroid_lng", "centroid_lon", "longitude"])
        ),
      ],
      [
        "Geometry validity",
        first(
          land,
          ["is_valid", "geometry_valid", "validity"],
          first(geo, ["is_valid", "validity"], "Not verified")
        ),
      ],
      [
        "Site description",
        first(site, ["summary", "description", "characteristics"]),
      ],
    ],
    y
  );

  const boundaryRows = coordinatesRows(land);

  if (boundaryRows.length) {
    const allCoordinates = arr(
      land.coordinates ??
      land.boundary_coordinates ??
      land.boundary
    );

    y = table(
      pdf,
      `Parcel Boundary Coordinates (${boundaryRows.length} of ${allCoordinates.length})`,
      ["Point", "Latitude", "Longitude"],
      boundaryRows,
      y,
      [1, 2, 2]
    );

    if (allCoordinates.length > 250) {
      y = paragraph(
        pdf,
        "Coordinate table limited to the first 250 points for readability. Full geometry should remain available in the source GIS/GeoJSON export.",
        y,
        { size: 7.8, color: C.muted }
      );
    }
  } else {
    y = paragraph(
      pdf,
      "No parcel coordinate list was found in the saved land artifact. A map preview alone is not enough to independently calculate area, perimeter, or legal boundary position.",
      y,
      { size: 8.2, color: C.muted }
    );
  }

  const metrics = rec(
    land.geometry_metrics ??
    land.metrics ??
    geo.metrics
  );

  const metricRows = Object.entries(metrics).map(
    ([k, v]) => [label(k), val(v)]
  );

  if (metricRows.length) {
    y = table(
      pdf,
      "Additional Computed Site Metrics",
      ["Metric", "Value"],
      metricRows,
      y,
      [2, 3]
    );
  }

  const landUse = arr(
    land.surrounding_land_use ??
    land.land_use ??
    site.surrounding_land_use
  );

  if (landUse.length) {
    y = bullets(pdf, "Surrounding Land Use", landUse, y);
  }

  return y;
}

function addBuffers(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const land = artifact(report, "lands");

  const infra = rec(
    land.infrastructure ??
      land.nearbyInfrastructure ??
      land.nearby_infrastructure ??
      land.poi_analysis
  );

  const bufferData = rec(
    land.buffers ??
      land.analysis_buffers ??
      infra.buffers ??
      infra.proximity_buffers
  );

  y = section(
    pdf,
    "2. Configurable Proximity Buffers",
    y
  );

  const rows: string[][] = [];

  for (const metres of [500, 1000, 2000]) {
    const keys = [
      String(metres),
      `${metres}m`,
      `${metres}_m`,
      `${metres / 1000}km`,
      `${metres / 1000}_km`,
      metres === 500
        ? "500m"
        : metres === 1000
          ? "1km"
          : "2km",
    ];

    let entry: unknown;

    for (const key of keys) {
      if (!isMissing(bufferData[key])) {
        entry = bufferData[key];
        break;
      }
    }

    const result = rec(entry);
    const places = arr(
      result.items ??
        result.places ??
        result.features
    );

    const counts = rec(
      result.counts ??
        result.category_counts ??
        result.summary
    );

    const hasResult =
      entry !== undefined &&
      entry !== null;

    const status = first(
      result,
      ["status", "availability"],
      hasResult
        ? "Saved result"
        : "Not calculated"
    );

    const featureCount = first(
      result,
      [
        "total_count",
        "total",
        "count",
        "feature_count",
      ],
      places.length
        ? String(places.length)
        : first(
            counts,
            ["total", "count"],
            "Not recorded"
          )
    );

    rows.push([
      metres === 500
        ? "500 m"
        : metres === 1000
          ? "1 km"
          : "2 km",
      status,
      featureCount,
      first(
        result,
        ["source", "provider", "data_source"],
        first(
          infra,
          ["source", "provider", "data_source"],
          "Not recorded"
        )
      ),
      dateText(
        firstRaw(result, [
          "retrieved_at",
          "retrievedAt",
          "fetched_at",
          "fetchedAt",
          "retrieval_date",
          "updated_at",
          "updatedAt",
          "timestamp",
        ])
      ),
    ]);
  }

  y = table(
    pdf,
    "Buffer Coverage Summary",
    [
      "Radius",
      "Status",
      "Features",
      "Source",
      "Retrieved",
    ],
    rows,
    y,
    [1.1, 1.5, 0.8, 1.4, 1.4]
  );

  y = paragraph(
    pdf,
    "Buffer results are reported only when a matching saved result exists. Nearby infrastructure results do not by themselves establish that 500 m, 1 km, or 2 km buffer analysis has been calculated. Straight-line distance is not equivalent to road-network travel distance.",
    y,
    { size: 8, color: C.muted }
  );

  return y;
}

function formatInfrastructureDistance(item: Dict): string {
  const distanceM = item.distance_m;
  const distanceKm = item.distance_km;

  if (!isMissing(distanceM)) {
    return `${String(distanceM)} m`;
  }

  if (!isMissing(distanceKm)) {
    return `${String(distanceKm)} km`;
  }

  const distance = firstRaw(item, [
    "distance",
    "distance_to_site",
  ]);

  if (isMissing(distance)) {
    return "Not available";
  }

  if (typeof distance === "string") {
    const trimmed = distance.trim();

    if (/\b(km|kilometers?|meters?|m)\b/i.test(trimmed)) {
      return trimmed;
    }
  }

  return `${String(distance)} m`;
}

function addInfrastructure(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const land = artifact(report, "lands");

  const infra = rec(
    land.infrastructure ??
      land.nearbyInfrastructure ??
      land.nearby_infrastructure ??
      land.poi_analysis
  );

  const categoryKeys = [
    "hospitals",
    "schools",
    "colleges",
    "parks",
    "bus_stops",
    "police",
    "fire_stations",
  ] as const;

  const savedItems = arr(
    infra.items ??
      infra.features ??
      infra.places ??
      infra.nearby_places ??
      land.nearby_places
  );

  const items = savedItems.length
    ? savedItems
    : categoryKeys.flatMap((key) =>
        arr(infra[key] ?? land[key]).map((place) => {
          const item = rec(place);

          return {
            ...item,
            category:
              item.category ??
              key.replace(/_/g, " "),
          };
        })
      );

  y = section(
    pdf,
    "3. Surrounding Infrastructure and Accessibility",
    y
  );

  if (items.length > 0) {
    const rows: string[][] = items.map((value) => {
      const item = rec(value);

      return [
        first(
          item,
          ["name", "label", "title"],
          "Unnamed feature"
        ),
        first(
          item,
          ["category", "type", "class"],
          "Unclassified"
        ),
        formatInfrastructureDistance(item),
        first(item, ["lat", "latitude"]),
        first(item, ["lon", "lng", "longitude"]),
        first(
          item,
          ["source", "provider"],
          first(
            infra,
            ["source", "provider", "data_source"],
            "OpenStreetMap"
          )
        ),
      ];
    });

    y = table(
      pdf,
      "Nearby GIS Features",
      [
        "Feature",
        "Category",
        "Distance",
        "Lat",
        "Lon",
        "Source",
      ],
      rows,
      y,
      [2, 1.6, 1.1, 1.1, 1.1, 1.5]
    );
  } else {
    y = paragraph(
      pdf,
      "No nearby features were found in the saved report artifact. This does not establish that infrastructure is absent from the area. Refresh the nearby infrastructure data in the Project section and save the results before exporting the report.",
      y,
      { size: 8.2, color: C.muted }
    );
  }

  const retrievedAt = firstRaw(infra, [
    "retrieved_at",
    "retrievedAt",
    "fetched_at",
    "fetchedAt",
    "retrieval_date",
    "updated_at",
    "updatedAt",
    "timestamp",
  ]);

  const siteCenter = rec(
    infra.siteCenter ??
      infra.site_center ??
      infra.center
  );

  const total = first(
    infra,
    ["total", "total_count", "feature_count"],
    items.length ? String(items.length) : "0"
  );

  y = keyValues(
    pdf,
    [
      [
        "Connectivity summary",
        first(
          infra,
          ["accessibility_summary", "summary", "connectivity"],
          items.length
            ? `${total} nearby features saved`
            : "No saved nearby features"
        ),
      ],
      [
        "Coverage / query radius",
        first(
          infra,
          ["radius_m", "radius", "search_radius", "coverage"],
          "Not recorded"
        ),
      ],
      [
        "Dataset source",
        first(
          infra,
          ["source", "provider", "data_source"],
          items.length ? "OpenStreetMap" : "Not recorded"
        ),
      ],
      [
        "Site query centre",
        siteCenter.lat !== undefined &&
        siteCenter.lng !== undefined
          ? `${String(siteCenter.lat)}, ${String(siteCenter.lng)}`
          : "Not recorded",
      ],
      [
        "Retrieved at",
        retrievedAt
          ? dateText(retrievedAt)
          : "Not recorded",
      ],
      [
        "Data limitations",
        first(
          infra,
          ["limitations", "coverage_limitations", "caveats"],
          "OpenStreetMap coverage may be incomplete. Missing results do not prove real-world absence."
        ),
      ],
    ],
    y
  );

  return y;
}

function addGeometryValidation(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const land = artifact(report, "lands");
  const arch = artifact(report, "architecture");
  const scenario = artifact(report, "scenario");

  const validation = rec(
    land.geometry_validation ??
    land.validation ??
    arch.geometry_validation ??
    scenario.geometry_validation
  );

  const constraints = arr(
    validation.checks ??
    validation.constraints ??
    validation.results ??
    land.geometry_checks
  ).map(rec);

  y = section(
    pdf,
    "5. Measurable Layout and Geometry Validation",
    y
  );

  y = keyValues(
    pdf,
    [
      [
        "Validation engine / method",
        first(validation, ["engine", "method", "validator", "version"]),
      ],
      [
        "Validation timestamp",
        dateText(
          firstRaw(validation, [
            "validated_at",
            "timestamp",
            "updated_at",
          ])
        ),
      ],
      [
        "Parcel boundary check",
        first(
          validation,
          ["boundary_status", "boundary_check", "within_parcel"],
          "Pending / not recorded"
        ),
      ],
      [
        "Overlap check",
        first(
          validation,
          ["overlap_status", "overlap_check"],
          "Pending / not recorded"
        ),
      ],
      [
        "Setback check",
        first(
          validation,
          ["setback_status", "setback_check"],
          "Pending / not recorded"
        ),
      ],
      [
        "Site coverage",
        first(validation, [
          "site_coverage_percent",
          "coverage_percent",
          "site_coverage",
        ]),
      ],
      [
        "Building footprint",
        first(validation, [
          "building_footprint_m2",
          "footprint_area",
          "building_area",
        ]),
      ],
      [
        "Road area / width",
        first(validation, [
          "road_area_m2",
          "road_area",
          "road_width_summary",
        ]),
      ],
      [
        "Open-space area / ratio",
        first(validation, [
          "open_space_m2",
          "open_space_area",
          "open_space_percent",
        ]),
      ],
      [
        "Parking area / capacity",
        first(validation, [
          "parking_area_m2",
          "parking_area",
          "parking_capacity",
        ]),
      ],
      [
        "Overall geometry status",
        first(
          validation,
          ["status", "overall_status"],
          "Not validated in saved data"
        ),
      ],
    ],
    y
  );

  if (constraints.length) {
    const rows = constraints.map((o, i) => [
      first(o, ["name", "rule", "constraint", "check"], `Check ${i + 1}`),
      normalStatus(first(o, ["status", "result"])),
      first(o, ["actual", "value", "measured"]),
      first(o, ["required", "limit", "expected"]),
      first(o, ["message", "reason", "details", "notes"]),
    ]);

    y = table(
      pdf,
      "Geometry Check Results",
      ["Check", "Status", "Actual", "Required", "Details"],
      rows,
      y,
      [1.4, 0.9, 1.1, 1.1, 2.3]
    );
  } else {
    y = paragraph(
      pdf,
      "No individual geometry-validation checks were found. Do not interpret a generated drawing or AI narrative as proof that polygons do not overlap, buildings lie inside the parcel, or setbacks and road widths comply. These checks must be computed by the backend using valid geometry and applicable constraints.",
      y,
      { size: 8.2, color: C.amber }
    );
  }

  const areas = rec(
    validation.area_breakdown ??
    validation.land_use_allocation ??
    arch.area_breakdown
  );

  const areaRows = Object.entries(areas).map(
    ([k, v]) => [label(k), val(v)]
  );

  if (areaRows.length) {
    y = table(
      pdf,
      "Land Allocation Breakdown",
      ["Use", "Area / value"],
      areaRows,
      y,
      [2, 3]
    );
  }

  return y;
}

function normalStatus(s: string): string {
  const t = s.trim().toLowerCase().replace(/[ _-]+/g, " ");

  if (["pass", "passed", "compliant", "valid", "success"].includes(t)) {
    return "PASS";
  }

  if (["fail", "failed", "non compliant", "invalid", "error"].includes(t)) {
    return "FAIL";
  }

  if (["n/a", "na", "not applicable"].includes(t)) {
    return "NOT APPLICABLE";
  }

  if (
    [
      "pending",
      "unknown",
      "not checked",
      "not validated",
      "requires review",
    ].includes(t)
  ) {
    return "PENDING";
  }

  return s || "PENDING";
}

function addRegulatory(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const d = dataFromArtifact(
    report,
    ["municipal", "regulations", "regulatory", "lands"]
  );

  const rules = arr(
    d.rules ??
    d.regulations ??
    d.requirements ??
    d.municipal_rules ??
    d.rule_results ??
    d.constraints
  ).map(rec);

  y = section(
    pdf,
    "4. Explainable Municipal Regulatory Assessment",
    y
  );

  y = paragraph(
    pdf,
    "Each rule must be checked against the applicable jurisdiction, development type and current source. A retrieved clause is evidence for review, not automatic proof of legal applicability.",
    y,
    { size: 8.1, color: C.muted }
  );

  if (rules.length) {
    const rows = rules.map((r, i) => [
      first(r, ["name", "title", "rule", "parameter", "topic"], `Rule ${i + 1}`),
      first(r, ["required", "standard", "limit", "requirement", "rule_value"]),
      first(r, ["proposed", "actual", "value", "measured"]),
      normalStatus(first(r, ["status", "result", "compliance_status"], "PENDING")),
      first(r, ["source_document", "document", "source", "bylaw", "reference"]),
      first(r, ["page", "page_number", "clause", "section", "paragraph"]),
    ]);

    y = table(
      pdf,
      "Rule-by-Rule Evidence Register",
      ["Parameter", "Required", "Proposed", "Status", "Source", "Page / Clause"],
      rows,
      y,
      [1.5, 1, 1, 0.9, 1.6, 1.1]
    );
  } else {
    y = paragraph(
      pdf,
      "No structured municipal rule list was found in the saved artifacts. FAR/FSI, setbacks, height, ground coverage, parking, fire access and other statutory requirements remain PENDING until checked against the current applicable official regulations.",
      y,
      { size: 8.2, color: C.amber }
    );
  }

  const citations = arr(
    d.citations ??
    d.sources ??
    d.retrieved_documents ??
    d.references
  ).map(rec);

  if (citations.length) {
    const rows = citations.map((s, i) => [
      first(s, ["title", "document", "name"], `Source ${i + 1}`),
      first(s, ["authority", "publisher", "issuer"]),
      first(s, ["page", "page_number", "pages"]),
      first(s, ["clause", "section", "chunk_id"]),
      first(s, ["url", "file_path", "source_id"]),
      dateText(
        firstRaw(s, [
          "published_at",
          "retrieved_at",
          "updated_at",
        ])
      ),
    ]);

    y = table(
      pdf,
      "Regulatory Source and Retrieval Register",
      ["Document", "Authority", "Page", "Clause", "Location / ID", "Date"],
      rows,
      y,
      [1.7, 1.2, 0.6, 0.8, 1.7, 1.1]
    );
  }

  const notes = arr(
    d.notes ??
    d.findings ??
    d.recommendations ??
    d.unresolved_items
  );

  if (notes.length) {
    y = bullets(pdf, "Regulatory Findings and Unresolved Items", notes, y);
  }

  return y;
}

function addAgents(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const d = artifact(report, "agents");

  const names = [
    "architecture",
    "civil",
    "sustainability",
    "municipal",
    "citizen",
  ];

  y = section(pdf, "5. Multi-Agent Assessment", y);

  const rows = names.map((n) => {
    const a = rec(d[n]);

    return [
      label(n),
      first(a, ["score", "overall_score", "rating"]),
      first(
        a,
        ["status", "result"],
        Object.keys(a).length ? "Result recorded" : "No saved result"
      ),
      first(
        a,
        ["summary", "recommendation", "conclusion", "assessment", "finding"],
        "Not available"
      ),
    ];
  });

  y = table(
    pdf,
    "Agent Findings Overview",
    ["Agent", "Score", "Status", "Summary / Finding"],
    rows,
    y,
    [1.1, 0.7, 1.2, 3.7]
  );

  const disagreements = arr(
    d.disagreements ??
    d.conflicts ??
    d.trade_offs ??
    d.tradeoffs
  );

  if (disagreements.length) {
    y = bullets(pdf, "Agent Disagreements and Trade-offs", disagreements, y);
  }

  const recommendations = arr(
    d.recommendations ??
    d.actions ??
    d.cross_agent_recommendations
  );

  if (recommendations.length) {
    y = bullets(pdf, "Cross-Agent Recommendations", recommendations, y);
  }

  for (const n of names) {
    const a = rec(d[n]);

    const detail = first(
      a,
      ["summary", "analysis", "assessment", "reasoning", "recommendation", "conclusion"],
      ""
    );

    const findings = arr(
      a.recommendations ??
      a.actions ??
      a.issues ??
      a.findings
    );

    if (detail || findings.length) {
      y = section(pdf, `${label(n)} Agent — Detail`, y);

      if (detail) y = paragraph(pdf, detail, y);

      if (findings.length) {
        y = bullets(pdf, "Observations / Actions", findings, y);
      }
    }
  }

  return y;
}

function floors(report: ProjectReportRecord): Dict[] {
  const a = artifact(report, "architecture");
  const sp = rec(a.space_program ?? a.spaceProgram);

  return arr(sp.floors ?? a.floors).map(rec);
}

function addArchitecture(
  pdf: jsPDF,
  report: ProjectReportRecord,
  visuals: ReportVisuals | null,
  y: number
): number {
  const a = artifact(report, "architecture");
  const fs = floors(report);

  y = section(
    pdf,
    "6. Architectural Design and Space Planning",
    y
  );

  y = keyValues(
    pdf,
    [
      [
        "Design concept",
        first(a, ["design_concept", "concept", "summary", "description"]),
      ],
      [
        "Built-up area",
        first(a, ["total_built_up_area", "built_up_area", "total_area"]),
      ],
      [
        "Floor count",
        first(
          a,
          ["floor_count", "number_of_floors"],
          fs.length ? String(fs.length) : "Not available"
        ),
      ],
      [
        "Footprint area",
        first(a, [
          "footprint_area_m2",
          "building_footprint_m2",
          "footprint_area",
        ]),
      ],
      [
        "Design status",
        first(a, ["status", "design_status"], "Preliminary / unverified"),
      ],
    ],
    y
  );

  const map =
    visuals?.architectureMap ??
    (firstRaw(a, [
      "site_plan_image",
      "layout_image",
      "map_image",
    ]) as string | undefined);

  if (map) {
    y = imageOnNewPage(
      pdf,
      map,
      "Architectural Site Plan / Latest Saved Layout"
    );
  }

  if (visuals?.building3D) {
    y = imageOnNewPage(
      pdf,
      visuals.building3D,
      "Interactive 3D Building Model"
    );
  }

  if (fs.length) {
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];

      const name = first(
        f,
        ["name", "label"],
        i === 0 ? "Ground Floor" : `Floor ${i + 1}`
      );

      const spaceRows = arr(f.spaces ?? f.rooms).map((v, j) => {
        const s = rec(v);
        const area = Number(s.area_m2 ?? s.area);
        const floorArea = Number(f.area_m2 ?? f.area);

        return [
          String(j + 1),
          first(s, ["name", "label"], "Unnamed space"),
          first(s, ["type", "category"]),
          Number.isFinite(area) && area > 0
            ? `${area.toFixed(1)} m²`
            : "Not available",
          Number.isFinite(area) && area > 0 && floorArea > 0
            ? `${((area / floorArea) * 100).toFixed(1)}%`
            : "Not available",
        ];
      });

      y = table(
        pdf,
        `${name} — Space Schedule`,
        ["No.", "Space", "Type", "Area", "% floor"],
        spaceRows,
        y,
        [0.6, 2, 1.4, 1, 1]
      );

      const snap = visuals?.floorPlans?.find(
        (x) => x.floor === i
      );

      if (snap?.image) {
        y = imageOnNewPage(pdf, snap.image, `${name} — Floor Plan`);
      }
    }
  } else {
    y = paragraph(
      pdf,
      "No floor-by-floor space program is available in the saved architecture artifact.",
      y,
      { size: 8.1, color: C.muted }
    );
  }

  const notes = arr(
    a.recommendations ??
    a.design_notes ??
    a.key_features
  );

  if (notes.length) {
    y = bullets(pdf, "Design Notes", notes, y);
  }

  return y;
}

function addScoring(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const scenario = artifact(report, "scenario");

  const ev = rec(
    scenario.evaluation ??
    scenario.results ??
    scenario.assessment
  );

  const constraints = arr(
    ev.constraints ??
    scenario.constraints ??
    ev.checks
  ).map(rec);

  const scoreBreakdown = rec(
    ev.score_breakdown ??
    ev.component_scores ??
    ev.scores ??
    scenario.score_breakdown
  );

  y = section(
    pdf,
    "9. Constraint Evaluation and Score Breakdown",
    y
  );

  y = keyValues(
    pdf,
    [
      ["Overall score", first(ev, ["overall_score", "score"], "Not calculated")],
      ["Compliance score", first(ev, ["compliance_score"])],
      ["Geometry score", first(ev, ["geometry_score"])],
      ["Sustainability score", first(ev, ["sustainability_score"])],
      ["Accessibility score", first(ev, ["accessibility_score"])],
      ["Risk level", first(ev, ["risk_level", "risk_classification", "risk"])],
      [
        "Status",
        first(
          ev,
          ["status", "scenario_status", "compliance_status"],
          "Pending verification"
        ),
      ],
    ],
    y
  );

  const scoreRows = Object.entries(scoreBreakdown).map(([k, v]) => {
    const o = rec(v);

    return [
      label(k),
      typeof v === "object"
        ? first(o, ["score", "value", "weighted_score"])
        : val(v),
      first(o, ["weight", "weight_percent"]),
      first(o, ["explanation", "reason", "notes"]),
    ];
  });

  if (scoreRows.length) {
    y = table(
      pdf,
      "Transparent Scoring Components",
      ["Criterion", "Score", "Weight", "Explanation"],
      scoreRows,
      y,
      [1.5, 0.8, 0.8, 2.9]
    );
  }

  if (constraints.length) {
    const rows = constraints.map((c, i) => [
      first(c, ["name", "constraint", "title", "rule"], `Constraint ${i + 1}`),
      normalStatus(first(c, ["status", "result"], "PENDING")),
      first(c, ["actual", "value", "measured"]),
      first(c, ["required", "limit", "expected"]),
      first(c, ["message", "details", "reason", "source"]),
    ]);

    y = table(
      pdf,
      "Constraint-by-Constraint Results",
      ["Constraint", "Status", "Actual", "Required", "Notes / Evidence"],
      rows,
      y,
      [1.4, 0.8, 1, 1, 2.6]
    );
  } else {
    y = paragraph(
      pdf,
      "No individual constraint checks were saved. Until computed checks are available, the layout remains unverified rather than compliant by default.",
      y,
      { size: 8.1, color: C.amber }
    );
  }

  return y;
}

function addScenarios(
  pdf: jsPDF,
  report: ProjectReportRecord,
  visuals: ReportVisuals | null,
  y: number
): number {
  const s = artifact(report, "scenario");

  const ev = rec(
    s.evaluation ??
    s.results ??
    s.assessment
  );

  y = section(
    pdf,
    "10. Scenario Analysis and Trade-offs",
    y
  );

  y = keyValues(
    pdf,
    [
      [
        "Selected intervention",
        first(
          s,
          ["intervention", "selected_intervention"],
          first(ev, ["intervention"])
        ),
      ],
      [
        "Scenario status",
        first(ev, ["status", "scenario_status"], "Pending verification"),
      ],
      [
        "Feasibility summary",
        first(
          ev,
          ["summary", "feasibility", "conclusion"],
          first(s, ["summary", "description"])
        ),
      ],
    ],
    y
  );

  if (visuals?.scenarioMap) {
    y = imageOnNewPage(pdf, visuals.scenarioMap, "Selected Scenario Plan");
  }

  const alternatives = arr(
    s.alternatives ??
    s.scenarios ??
    ev.alternatives ??
    ev.scenarios
  ).map(rec);

  if (alternatives.length) {
    const rows = alternatives.map((a, i) => [
      first(a, ["name", "title", "id"], `Option ${i + 1}`),
      first(a, ["land_utilization_percent", "land_utilization", "utilization"]),
      first(a, ["estimated_cost", "cost", "budget"]),
      first(a, ["green_space_percent", "green_space", "open_space_percent"]),
      first(a, ["accessibility_score", "accessibility"]),
      first(a, ["drainage_risk", "flood_risk", "risk_level"]),
      first(a, ["energy_potential", "solar_potential"]),
      first(a, ["score", "overall_score"]),
      first(a, ["status", "feasibility"]),
    ]);

    y = table(
      pdf,
      "Alternative Scenario Comparison",
      [
        "Option",
        "Utilization",
        "Est. cost",
        "Green space",
        "Access",
        "Drainage risk",
        "Energy",
        "Score",
        "Status",
      ],
      rows,
      y,
      [1.2, 0.9, 1, 0.9, 0.7, 1, 0.7, 0.7, 0.9]
    );

    const detailRows = alternatives.map((a, i) => [
      first(a, ["name", "title", "id"], `Option ${i + 1}`),
      first(a, ["summary", "description", "recommendation", "tradeoffs", "trade_offs"]),
      first(a, ["advantages", "benefits", "pros"]),
      first(a, ["risks", "limitations", "cons"]),
    ]);

    y = table(
      pdf,
      "Scenario Rationale and Trade-offs",
      ["Option", "Summary", "Advantages", "Risks / limitations"],
      detailRows,
      y,
      [1, 2, 1.5, 1.5]
    );
  } else {
    y = paragraph(
      pdf,
      "No saved alternative scenarios were found. The report does not fabricate alternatives or rank scenarios without metrics.",
      y,
      { size: 8.1, color: C.muted }
    );
  }

  const recommendations = arr(
    ev.recommendations ??
    s.recommendations ??
    ev.actions
  );

  if (recommendations.length) {
    y = bullets(pdf, "Scenario Recommendations", recommendations, y);
  }

  return y;
}

function addDataSources(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const lands = artifact(report, "lands");
  const artifacts = rec(report.artifacts);

  const sources: Dict[] = [];

  const candidates = [
    ["GIS / land", lands],
    [
      "Infrastructure",
      rec(
        lands.infrastructure ??
        lands.nearby_infrastructure ??
        lands.poi_analysis
      ),
    ],
    [
      "Regulatory",
      dataFromArtifact(report, ["municipal", "regulations", "regulatory"]),
    ],
    [
      "Geometry validation",
      rec(
        lands.geometry_validation ??
        lands.validation ??
        artifact(report, "architecture").geometry_validation
      ),
    ],
  ] as Array<[string, Dict]>;

  for (const [name, d] of candidates) {
    const nested = arr(
      d.sources ??
      d.citations ??
      d.data_sources ??
      d.retrieved_documents
    ).map(rec);

    if (nested.length) {
      for (const item of nested) {
        sources.push({ section: name, ...item });
      }
    } else if (
      first(d, ["source", "provider", "data_source"], "") ||
      first(d, ["retrieved_at", "retrieval_date", "updated_at"], "")
    ) {
      sources.push({ section: name, ...d });
    }
  }

  y = section(
    pdf,
    "7. Data Sources, Freshness and Limitations",
    y
  );

  if (sources.length) {
    const rows = sources.map((s, i) => [
      first(s, ["section"], `Source ${i + 1}`),
      first(s, ["title", "name", "source", "provider", "data_source"]),
      first(s, ["url", "source_url", "file_path", "source_id", "document_id"]),
      first(s, ["page", "page_number", "clause", "section"]),
      dateText(
        firstRaw(s, [
          "retrieved_at",
          "retrieval_date",
          "updated_at",
          "timestamp",
        ])
      ),
      first(s, ["limitations", "coverage_limitations", "notes", "caveats"]),
    ]);

    y = table(
      pdf,
      "Source Register",
      [
        "Dataset",
        "Source / document",
        "URL / ID",
        "Page / clause",
        "Retrieved",
        "Limitations",
      ],
      rows,
      y,
      [0.9, 1.4, 1.4, 0.8, 1.1, 1.4]
    );
  } else {
    y = paragraph(
      pdf,
      "No structured source register with retrieval timestamps was found in the saved artifacts. Source attribution and freshness cannot be independently verified from the current project record.",
      y,
      { size: 8.1, color: C.amber }
    );
  }

  const quality = rec(
    lands.data_quality ??
    lands.quality ??
    artifact(report, "scenario").data_quality
  );

  const qualityRows = Object.entries(quality).map(([k, v]) => [
    label(k),
    typeof v === "object"
      ? first(rec(v), ["status", "value", "rating", "description"])
      : val(v),
  ]);

  if (qualityRows.length) {
    y = table(
      pdf,
      "Data Quality and Completeness",
      ["Dimension", "Assessment"],
      qualityRows,
      y,
      [2, 3]
    );
  }

  const reg = dataFromArtifact(
    report,
    ["municipal", "regulations", "regulatory"]
  );

  const missing = arr(
    reg.missing_rules ??
    reg.unresolved_rules ??
    reg.unknowns ??
    reg.pending_items
  );

  if (missing.length) {
    y = bullets(
      pdf,
      "Missing / Unresolved Regulatory Information",
      missing,
      y
    );
  }

  y = paragraph(
    pdf,
    "Data limitations: third-party map data can be incomplete or outdated; an absent mapped feature does not establish real-world absence. Coordinate order and CRS must be confirmed before spatial calculations. Distances measured in a buffer may be straight-line distances, not route distances. Estimates and AI recommendations are not substitutes for verified surveys, field inspection or professional engineering analysis.",
    y,
    { size: 8.1 }
  );

  y = paragraph(
    pdf,
    "Professional-use disclaimer: this is an AI-assisted preliminary planning assessment. It is not a title search, cadastral survey, sanctioned building plan, statutory compliance certificate, environmental clearance, structural design or engineering certification. Confirm land ownership and boundaries, current municipal regulations, infrastructure conditions, costs and technical calculations with authoritative sources and qualified professionals before construction, financing or official submission.",
    y,
    { size: 8.1, color: C.muted }
  );

  const rows = Object.entries(artifacts).map(([k, raw]) => {
    const a = rec(raw);

    return [
      label(k),
      dateText(a.updatedAt),
      a.data ? "Saved data present" : "No data field found",
    ];
  });

  if (rows.length) {
    y = table(
      pdf,
      "Saved Artifact Register",
      ["Artifact", "Last updated", "Record status"],
      rows,
      y,
      [1.5, 1.8, 1.7]
    );
  }

  return y;
}

function addRecommendations(
  pdf: jsPDF,
  report: ProjectReportRecord,
  y: number
): number {
  const s = artifact(report, "scenario");
  const a = artifact(report, "agents");
  const ev = rec(s.evaluation);

  const items = [
    ...arr(s.recommendations),
    ...arr(ev.recommendations),
    ...arr(a.recommendations),
    ...arr(s.actions),
  ];

  y = section(
    pdf,
    "8. Recommendations and Next Steps",
    y
  );

  if (items.length) {
    y = bullets(pdf, "Recorded Recommendations", items, y);
  } else {
    y = bullets(
      pdf,
      "Recommended Verification Actions",
      [
        "Confirm parcel ownership and boundary using authoritative cadastral records and a qualified survey.",
        "Validate geometry in a suitable projected CRS; check polygon validity, overlaps, setbacks and site coverage using explicit calculations.",
        "Verify each municipal rule against the current official regulation, including jurisdiction, applicability, page and clause.",
        "Confirm nearby roads and facilities using current datasets and field checks where decisions depend on completeness.",
        "Review estimated cost, accessibility, drainage, parking and environmental assumptions with qualified professionals.",
        "Re-run the plan after each material input change and retain version history and validation evidence.",
      ],
      y
    );
  }

  return y;
}

function addFooter(
  pdf: jsPDF,
  projectId: unknown
): void {
  const count = pdf.getNumberOfPages();

  for (let page = 2; page <= count; page++) {
    pdf.setPage(page);

    const h = H(pdf);

    pdf.setDrawColor(...C.line);

    pdf.line(
      PAGE.left,
      h - 12,
      W(pdf) - PAGE.right,
      h - 12
    );

    font(pdf, 7, C.muted);

    pdf.text(
      `Smart City Planner | Project ${val(projectId, "—")}`,
      PAGE.left,
      h - 7
    );

    pdf.text(
      `Page ${page} of ${count}`,
      W(pdf) - PAGE.right,
      h - 7,
      { align: "right" }
    );
  }
}

async function loadVisuals(
  report: ProjectReportRecord
): Promise<ReportVisuals | null> {
  try {
    return await getReportVisuals(report.project.id);
  } catch (e) {
    console.error("[Reports] Failed to load saved visuals:", e);
    return null;
  }
}

function makePdf(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
}

async function generateReport(
  report: ProjectReportRecord,
  kind: PdfKind
): Promise<void> {
  if (!report?.project || isMissing(report.project.id)) {
    throw new Error(
      "Cannot generate a report without a valid project record and project ID."
    );
  }

  const visuals = await loadVisuals(report);
  const pdf = makePdf();

  const title =
    kind === "architecture"
      ? "Architecture & Space Planning Report"
      : kind === "scenario"
        ? "Scenario Assessment Report"
        : "Comprehensive Urban Planning Assessment";

  addCover(pdf, report, title, visuals);

  pdf.addPage();

  let y = PAGE.top;

  y = section(pdf, "Report Contents", y);

  const contents =
    kind === "architecture"
      ? [
          "Executive summary",
          "Municipal regulatory assessment",
          "Architectural design and space planning",
          "Data sources, freshness and limitations",
          "Recommendations and next steps",
        ]
      : kind === "scenario"
        ? [
            "Executive summary",
            "Configurable proximity buffers",
            "Surrounding infrastructure and accessibility",
            "Municipal regulatory assessment",
            "Multi-agent assessment",
            "Data sources, freshness and limitations",
            "Recommendations and next steps",
          ]
        : [
            "Executive summary",
            "Configurable proximity buffers",
            "Surrounding infrastructure and accessibility",
            "Municipal regulatory assessment",
            "Multi-agent assessment",
            "Architectural design and space planning",
            "Data sources, freshness and limitations",
            "Recommendations and next steps",
          ];

  contents.forEach((item, index) => {
    font(pdf, 9, C.ink);

    pdf.text(
      `${String(index + 1).padStart(2, "0")}   ${item}`,
      PAGE.left + 1,
      y
    );

    rule(pdf, y + 2);

    y += 8.5;
  });

  y += 5;

  paragraph(
    pdf,
    "Contents are a guide; long sections may continue on subsequent pages. The report includes only values present in saved artifacts and explicitly marks missing validation or source evidence.",
    y,
    { size: 8, color: C.muted }
  );

  // 1. Executive Summary
  pdf.addPage();
  y = PAGE.top;
  y = addExecutive(pdf, report, y);

  // 2. Proximity Buffers
  // 3. Infrastructure and Accessibility
  // These are excluded from the architecture-only report.
  if (kind !== "architecture") {
    pdf.addPage();
    y = PAGE.top;
    y = addBuffers(pdf, report, y);

    y = addInfrastructure(pdf, report, y);
  }

  // 4. Municipal Regulatory Assessment
  pdf.addPage();
  y = PAGE.top;
  y = addRegulatory(pdf, report, y);

  // 5. Multi-Agent Assessment
  if (kind !== "architecture") {
    pdf.addPage();
    y = PAGE.top;
    y = addAgents(pdf, report, y);
  }

  // 6. Architectural Design and Space Planning
  // Excluded from the scenario-only report.
  if (kind !== "scenario") {
    pdf.addPage();
    y = PAGE.top;
    y = addArchitecture(pdf, report, visuals, y);
  }

  // Removed: Geometry Validation.
  // Removed: Constraint Evaluation and Score Breakdown.
  // Removed: Scenario Analysis and Trade-offs.

  // 7. Data Sources, Freshness and Limitations
  pdf.addPage();
  y = PAGE.top;
  y = addDataSources(pdf, report, y);

  // 8. Recommendations and Next Steps
  pdf.addPage();
  y = PAGE.top;
  y = addRecommendations(pdf, report, y);

  addFooter(pdf, report.project.id);

  const file =
    kind === "architecture"
      ? "architecture-planning-report.pdf"
      : kind === "scenario"
        ? "scenario-assessment-report.pdf"
        : "complete-urban-planning-assessment.pdf";

  pdf.save(file);
}
export async function downloadScenarioPdf(
  report: ProjectReportRecord
): Promise<void> {
  try {
    await generateReport(report, "scenario");
    console.info("[Reports] Scenario report generated.");
  } catch (e) {
    console.error(
      "[Reports] Scenario PDF generation failed:",
      e
    );

    throw e;
  }
}

export async function downloadEverythingPdf(
  report: ProjectReportRecord
): Promise<void> {
  try {
    await generateReport(report, "complete");
    console.info("[Reports] Comprehensive planning report generated.");
  } catch (e) {
    console.error(
      "[Reports] Complete PDF generation failed:",
      e
    );

    throw e;
  }
}

export async function downloadArchitecturePdf(
  report: ProjectReportRecord
): Promise<void> {
  try {
    await generateReport(report, "architecture");
    console.info("[Reports] Architecture report generated.");
  } catch (e) {
    console.error(
      "[Reports] Architecture PDF generation failed:",
      e
    );

    throw e;
  }
}