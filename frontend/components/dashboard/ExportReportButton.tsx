
"use client";

import * as XLSX from "xlsx";
import { LuFileJson, LuFileSpreadsheet } from "react-icons/lu";

interface Props {
  report: Record<string, unknown> | null;
}

type ReviewRow = {
  Section: string;
  Parameter: string;
  Value: string | number | boolean;
  "Review Notes": string;
};

const LABELS: Record<string, string> = {
  project_name: "Project Name",
  building_type: "Building Type",
  commercial_subtype: "Building Subtype",
  development_type: "Development Type",
  city: "City",
  state: "State",
  jurisdiction: "Jurisdiction",
  budget: "Project Budget",
  area: "Site Area",
  area_m2: "Area",
  overall_score: "Overall Planning Score",
  score: "Assessment Score",
  score_interpretation: "Score Interpretation",
  status: "Status",
  planning_status: "Planning Status",
  planning_decision: "Planning Decision",
  road_width: "Road Width",
  road_width_source: "Road Width Source",
  parking_capacity: "Parking Capacity",
  foundation: "Foundation Recommendation",
  solar_capacity_kw: "Solar Capacity",
  green_area_percentage: "Green Area Percentage",
  rainwater_harvesting: "Rainwater Harvesting",
  facility_counts: "Facility Counts",
  total_allocated_area_m2: "Total Allocated Area",
  allocated_area_m2: "Allocated Area",
  building_count: "Building Count",
  risk_levels: "Risk Levels",
  compliance_score: "Compliance Score",
  applicability: "Applicability",
  recommendation_count: "Recommendation Count",
  priority_summary: "Recommendation Priority Summary",
  recommendations: "Recommendations",
  coordinates: "Site Coordinates",
  latitude: "Latitude",
  longitude: "Longitude",
  lat: "Latitude",
  lng: "Longitude",
  distance: "Distance",
  error: "Error",
  summary: "Summary",
  type: "Type",
  analysis_id: "Analysis ID",
  project_id: "Project ID",
};

const IMPORTANT_KEYS = new Set([
  "project_name",
  "building_type",
  "commercial_subtype",
  "development_type",
  "city",
  "state",
  "jurisdiction",
  "budget",
  "area",
  "area_m2",
  "overall_score",
  "score",
  "score_interpretation",
  "status",
  "planning_status",
  "planning_decision",
  "road_width",
  "road_width_source",
  "parking_capacity",
  "foundation",
  "solar_capacity_kw",
  "green_area_percentage",
  "rainwater_harvesting",
  "facility_counts",
  "total_allocated_area_m2",
  "allocated_area_m2",
  "building_count",
  "risk_levels",
  "compliance_score",
  "applicability",
  "recommendation_count",
  "priority_summary",
  "recommendations",
  "coordinates",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "distance",
  "error",
  "summary",
  "analysis_id",
  "project_id",
]);

const SECTION_NAMES: Record<string, string> = {
  project: "Project Overview",
  project_summary: "Project Overview",
  site_context: "Site Assessment",
  site_suitability: "Site Suitability",
  architecture: "Architecture Review",
  civil: "Civil & Infrastructure",
  sustainability: "Sustainability Review",
  municipal: "Municipal Assessment",
  citizen: "Community & Accessibility",
  scoring: "Planning Evaluation",
  constraints: "Risks & Constraints",
  recommendations: "Recommendations",
  osm: "Existing Infrastructure",
  planning_decision: "Planning Evaluation",
  agent_scores: "Agent Analysis",
};

function humanize(key: string): string {
  return LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length === 0
      ? "None recorded"
      : `${value.length} records — see details below`;
  }

  return "See individual review fields";
}

function addRow(
  rows: ReviewRow[],
  section: string,
  parameter: string,
  value: unknown,
  notes = ""
): void {
  rows.push({
    Section: section,
    Parameter: parameter,
    Value: formatValue(value),
    "Review Notes": notes,
  });
}

function extractReviewRows(
  report: Record<string, unknown>
): ReviewRow[] {
  const rows: ReviewRow[] = [];
  const seen = new Set<string>();

  function walk(
    value: unknown,
    section: string,
    parentKey = ""
  ): void {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return;

      value.forEach((item, index) => {
        if (item !== null && typeof item === "object") {
          const record = item as Record<string, unknown>;

          // Display each recommendation or constraint as a readable row.
          const descriptionKey = [
            "recommendation",
            "description",
            "title",
            "message",
            "issue",
            "constraint",
            "warning",
            "action",
            "name",
            "reason",
          ].find(
            (key) =>
              typeof record[key] === "string" &&
              record[key]
          );

          if (
            descriptionKey ||
            parentKey.toLowerCase().includes("recommendation") ||
            parentKey.toLowerCase().includes("constraint") ||
            parentKey.toLowerCase().includes("warning")
          ) {
            const label =
              descriptionKey
                ? String(record[descriptionKey])
                : `${humanize(parentKey)} ${index + 1}`;

            const details = Object.entries(record)
              .filter(
                ([key, child]) =>
                  key !== descriptionKey &&
                  child !== null &&
                  typeof child !== "object"
              )
              .map(
                ([key, child]) =>
                  `${humanize(key)}: ${String(child)}`
              )
              .join("; ");

            addRow(
              rows,
              section,
              `${humanize(parentKey)} ${index + 1}`,
              label,
              details
            );
          }

          walk(record, section, parentKey);
        } else if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          addRow(
            rows,
            section,
            `${humanize(parentKey)} ${index + 1}`,
            item
          );
        }
      });

      return;
    }

    if (typeof value !== "object") {
      const key = parentKey.split(".").pop() ?? parentKey;

      if (!IMPORTANT_KEYS.has(key)) return;

      const uniqueKey = `${section}|${parentKey}`;

      if (seen.has(uniqueKey)) return;
      seen.add(uniqueKey);

      let notes = "";

      if (key === "overall_score" || key === "score") {
        notes =
          "Review the scoring method and supporting evidence before making a design decision.";
      } else if (key === "budget") {
        notes = "Confirm currency, scope and cost assumptions.";
      } else if (key === "area" || key === "area_m2") {
        notes = "Confirm the measured area and units.";
      } else if (
        key === "road_width" ||
        key === "parking_capacity" ||
        key === "foundation"
      ) {
        notes = "Verify against site measurements and applicable engineering requirements.";
      } else if (
        key === "risk_levels" ||
        key === "compliance_score" ||
        key === "applicability"
      ) {
        notes = "Requires appropriate professional and regulatory verification.";
      }

      addRow(rows, section, humanize(key), value, notes);
      return;
    }

    const object = value as Record<string, unknown>;

    for (const [key, child] of Object.entries(object)) {
      const childSection =
        SECTION_NAMES[key] ?? section;

      // Include only selected review fields, not internal raw data.
      if (
        child !== null &&
        typeof child !== "object" &&
        !IMPORTANT_KEYS.has(key)
      ) {
        continue;
      }

      walk(
        child,
        childSection,
        key
      );
    }
  }

  // Establish a predictable review order.
  const preferredOrder = [
    "project",
    "project_summary",
    "site_context",
    "site_suitability",
    "planning_decision",
    "overall_score",
    "agent_scores",
    "architecture",
    "civil",
    "sustainability",
    "municipal",
    "citizen",
    "osm",
    "constraints",
    "recommendations",
    "analysis_id",
    "project_id",
  ];

  for (const key of preferredOrder) {
    if (key in report) {
      walk(
        report[key],
        SECTION_NAMES[key] ?? "Planning Evaluation",
        key
      );
    }
  }

  // Include other top-level fields only if they are useful review fields.
  for (const [key, value] of Object.entries(report)) {
    if (preferredOrder.includes(key)) continue;

    if (
      IMPORTANT_KEYS.has(key) ||
      SECTION_NAMES[key]
    ) {
      walk(
        value,
        SECTION_NAMES[key] ?? "Planning Evaluation",
        key
      );
    }
  }

  return rows;
}

function downloadJSON(
  report: Record<string, unknown>
): void {
  const blob = new Blob(
    [JSON.stringify(report, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "planner-report.json";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadExcel(
  report: Record<string, unknown>
): void {
  const rows = extractReviewRows(report);

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet(
    rows.length > 0
      ? rows
      : [{
          Section: "Review",
          Parameter: "Information",
          Value: "No supported review fields were found.",
          "Review Notes": "Check the report data structure.",
        }],
    {
      header: [
        "Section",
        "Parameter",
        "Value",
        "Review Notes",
      ],
    }
  );

  worksheet["!cols"] = [
    { wch: 27 },
    { wch: 32 },
    { wch: 45 },
    { wch: 75 },
  ];

  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
  };

  if (rows.length > 0) {
    worksheet["!autofilter"] = {
      ref: `A1:D${rows.length + 1}`,
    };
  }

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Architect Review"
  );

  XLSX.writeFile(
    workbook,
    "planner-architect-review.xlsx"
  );
}

export default function ExportReportButton({
  report,
}: Props) {
  if (!report) {
    return null;
  }

  const buttonClass =
    "rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors";

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => downloadJSON(report)}
        className={`${buttonClass} inline-flex items-center gap-2 bg-green-600 hover:bg-green-700`}
      >
        <LuFileJson size={16} strokeWidth={1.9} />
        Export JSON Report
      </button>

      <button
        type="button"
        onClick={() => downloadExcel(report)}
        className={`${buttonClass} inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700`}
      >
        <LuFileSpreadsheet size={16} strokeWidth={1.9} />
        Export Architect Review
      </button>
    </div>
  );
}