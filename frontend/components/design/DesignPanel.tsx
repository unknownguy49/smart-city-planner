"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  LuBuilding2,
  LuCircleAlert,
  LuCircleCheck,
  LuFileText,
  LuMap,
  LuRefreshCw,
  LuRuler,
  LuShieldCheck,
  LuTrash2,
} from "react-icons/lu";

import api from "../../services/api";

import {
  generateDesign,
  type DesignSpecification,
  type DesignResponse,
} from "../../services/design";
import { useProjectStore } from "../../store/projectStore";

import FloorPlan2D, {
  type ArchitectureStyle,
} from "./FloorPlan2D";

const ARCHITECTURE_STYLES: {
  value: ArchitectureStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "modern",
    label: "Modern Minimalist",
    description: "Open planning, clean geometry and simple circulation.",
  },
  {
    value: "vastu",
    label: "Indian Contemporary / Vastu",
    description: "Zoned rooms, with optional pooja space.",
  },
  {
    value: "luxury",
    label: "Luxury Architecture",
    description: "Larger suites, generous rooms and premium spaces.",
  },
  {
    value: "efficient",
    label: "Space-Efficient",
    description: "Compact circulation and smarter storage.",
  },
  {
    value: "courtyard",
    label: "Courtyard / Climate-Responsive",
    description: "Central courtyard and improved natural ventilation.",
  },
  {
    value: "rental",
    label: "Rental / Investment",
    description: "Independent access and separated living units.",
  },
];


const DesignMap = dynamic(
  () => import("./DesignMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[500px] items-center justify-center rounded-xl border"
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <LuMap
            size={22}
            strokeWidth={1.7}
            style={{
              color: "var(--primary)",
            }}
          />

          <p
            className="text-sm font-medium"
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            Loading design map...
          </p>
        </div>
      </div>
    ),
  }
);


const Building3D = dynamic(
  () => import("./Building3D"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[480px] items-center justify-center rounded-xl border"
        style={{
          backgroundColor: "var(--surface-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Loading 3D architecture viewer...
        </p>
      </div>
    ),
  }
);


interface ProjectCoordinate {
  lat: number;
  lng: number;
}

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

interface DesignSite {
  area_m2?: number | null;
  jurisdiction?: string | null;
  state?: string | null;
  city?: string | null;
}

interface DesignBuilding {
  type?: string | null;
  subtype?: string | null;
  floors?: number | null;
  height_m?: number | null;
  far?: number | null;
  ground_coverage_percent?: number | null;
  estimated_builtup_area_m2?: number | null;
  footprint_area_m2?: number | null;
}

interface DesignSiteElements {
  parking?: boolean;
  parking_capacity?: number | null;
  green_area?: boolean;
  pedestrian_circulation?: boolean;
  service_access?: boolean;
  fire_access?: boolean;
}

interface CommercialControl {
  use?: unknown;
  far?: unknown;
  ground_coverage_percent?: unknown;
  height_m?: unknown;
  [key: string]: unknown;
}

interface RegulatoryBasis {
  selected_commercial_control?: CommercialControl | null;
}

interface DesignPanelProps {
  project: Record<string, unknown>;
  architecture: Record<string, unknown>;
}

function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 1
) {
  if (
    typeof value !== "number"
  ) {
    return "—";
  }

  return value.toLocaleString(
    undefined,
    {
      maximumFractionDigits,
    }
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  tone?:
    | "default"
    | "primary"
    | "success"
    | "warning";
}) {
  const toneStyles = {
    default: {
      background:
        "var(--surface-secondary)",
      iconBackground:
        "var(--surface-tertiary)",
      iconColor:
        "var(--text-secondary)",
    },
    primary: {
      background:
        "var(--primary-soft)",
      iconBackground:
        "var(--surface)",
      iconColor:
        "var(--primary)",
    },
    success: {
      background:
        "var(--success-soft)",
      iconBackground:
        "var(--surface)",
      iconColor:
        "var(--success)",
    },
    warning: {
      background:
        "var(--warning-soft)",
      iconBackground:
        "var(--surface)",
      iconColor:
        "var(--warning)",
    },
  };

  const styles =
    toneStyles[tone];

  return (
    <div
      className="rounded-xl border p-4 transition-colors duration-150"
      style={{
        backgroundColor:
          styles.background,
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            {label}
          </p>

          <p
            className="mt-2 break-words text-sm font-semibold"
            style={{
              color:
                "var(--text-primary)",
            }}
          >
            {value}
          </p>
        </div>

        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor:
              styles.iconBackground,
            color:
              styles.iconColor,
          }}
        >
          <Icon
            size={17}
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  );
}

function SiteElementToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border p-4"
      style={{
        backgroundColor: enabled
          ? "var(--success-soft)"
          : "var(--surface-secondary)",
        borderColor: enabled
          ? "var(--success-border)"
          : "var(--border)",
      }}
    >
      <div className="min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </p>

        <p
          className="mt-1 text-xs leading-5"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </p>

        <p
          className="mt-1 text-xs font-medium"
          style={{
            color: enabled
              ? "var(--success)"
              : "var(--text-muted)",
          }}
        >
          {enabled ? "Included in design" : "Excluded from design"}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${label}`}
        onClick={onToggle}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          backgroundColor: enabled
            ? "var(--primary)"
            : "var(--border)",
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{
            transform: enabled
              ? "translateX(24px)"
              : "translateX(4px)",
          }}
        />
      </button>
    </div>
  );
}

export default function DesignPanel({
  project,
  architecture,
}: DesignPanelProps) {
  
  const [loading, setLoading] =
    useState(false);

  

  const [error, setError] =
    useState<string | null>(null);

  const architectureStyle = useProjectStore(
    (state) => state.architectureStyle
  );

  const setArchitectureStyle = useProjectStore(
    (state) => state.setArchitectureStyle
  );

  const rawDesign =
    useProjectStore(
      (state) => state.design
    );

  const design =
    rawDesign as DesignSpecification | null;

  function updateSiteElement(
    key:
      | "parking"
      | "green_area"
      | "pedestrian_circulation"
      | "service_access"
      | "fire_access"
  ) {
    if (!design) return;

    const current = design.site_elements;

    const updatedDesign: DesignSpecification = {
      ...design,
      site: {
        ...design.site,
        area_m2:
          typeof design.site.area_m2 === "number"
            ? design.site.area_m2
            : typeof project.area === "number"
              ? project.area
              : 0,
      },
      site_elements: {
        parking: current.parking ?? false,
        parking_capacity: current.parking_capacity ?? 0,
        green_area: current.green_area ?? false,
        pedestrian_circulation:
          current.pedestrian_circulation ?? false,
        service_access: current.service_access ?? false,
        fire_access: current.fire_access ?? false,
        [key]: current[key] !== true,
      },
    };

    setDesign(updatedDesign);
  }

  const setDesign =
    useProjectStore(
      (state) => state.setDesign
    );

  const clearDesign =
    useProjectStore(
      (state) => state.clearDesign
    );

  const projectId =
    useProjectStore(
      (state) =>
        state.projectId ??
        state.id
    );

  useEffect(() => {
    if (!design || projectId === null || projectId === undefined) return;

    window.dispatchEvent(
      new CustomEvent("smart-city:capture-report-visuals", {
        detail: {
          projectId,
          kind: "architecture",
        },
      })
    );
  }, [design, projectId]);

  async function handleGenerateDesign() {
    setLoading(true);
    setError(null);

    try {
      const response =
        (await generateDesign(
          project,
          architecture
        )) as DesignResponse;

      const generatedDesign =
  response.design_specification as Parameters<
    typeof setDesign
  >[0];

      setDesign(
        generatedDesign
      );

      if (
  projectId !== null &&
  projectId !== undefined
) {
  await api.post(
    `/projects/${projectId}/artifacts`,
    {
      artifact_type: "design",
      name: "Architecture Room Plan",
      data: generatedDesign,
    }
  );
}
    } catch (err) {
      console.error(
        "Design generation failed:",
        err
      );

      setError(
        "Failed to generate the design. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const projectCoordinates =
    Array.isArray(project.coordinates)
      ? (project.coordinates as ProjectCoordinate[])
      : [];

  const designCoordinates =
    Array.isArray(design?.coordinates)
      ? design.coordinates
      : [];

  const backendBoundary =
    design?.site_layout?.boundary;

  const boundaryRing =
    backendBoundary?.type === "Polygon" &&
    backendBoundary.status === "provided" &&
    Array.isArray(backendBoundary.coordinates) &&
    Array.isArray(backendBoundary.coordinates[0])
      ? backendBoundary.coordinates[0]
      : null;

  const backendBoundaryCoordinates: ProjectCoordinate[] =
    boundaryRing
      ? boundaryRing
          .filter(
            (point): point is number[] =>
              Array.isArray(point) &&
              point.length >= 2 &&
              Number.isFinite(point[0]) &&
              Number.isFinite(point[1]),
          )
          .map(([lng, lat]) => ({ lat, lng }))
      : [];

  const coordinates =
    backendBoundaryCoordinates.length >= 4
      ? backendBoundaryCoordinates
      : projectCoordinates.length >= 3
        ? projectCoordinates
        : designCoordinates;


  const siteArea =
    typeof design?.site?.area_m2 ===
    "number"
      ? design.site.area_m2
      : typeof project.area ===
          "number"
        ? project.area
        : 0;

  const buildingType =
    design?.building?.type ??
    (typeof project.building_type ===
    "string"
      ? project.building_type
      : null);

  const commercialSubtype =
    design?.building?.subtype ??
    (typeof project.commercial_subtype ===
    "string"
      ? project.commercial_subtype
      : null);

  const floors =
    typeof design?.building?.floors ===
    "number"
      ? design.building.floors
      : null;

  const groundCoveragePercent =
    typeof design?.building
      ?.ground_coverage_percent ===
    "number"
      ? design.building
          .ground_coverage_percent
      : 0;

  const parkingCapacity =
    typeof design?.site_elements
      ?.parking_capacity ===
    "number"
      ? design.site_elements
          .parking_capacity
      : 0;

  const greenArea =
    design?.site_elements?.green_area ===
    true;

  const pedestrianCirculation =
    design?.site_elements
      ?.pedestrian_circulation ===
    true;

  const serviceAccess =
    design?.site_elements
      ?.service_access ===
    true;

  const fireAccess =
    design?.site_elements?.fire_access ===
    true;

  const estimatedBuiltupArea =
    typeof design?.building
      ?.estimated_builtup_area_m2 ===
    "number"
      ? design.building
          .estimated_builtup_area_m2
      : null;

  const footprintArea =
    design?.building
      ?.footprint_area_m2 ??
    (groundCoveragePercent > 0 &&
    siteArea > 0
      ? (siteArea *
          groundCoveragePercent) /
        100
      : null);

  const selectedCommercialControl =
    design?.regulatory_basis
      ?.selected_commercial_control ??
    null;

  return (
    <section
      className="mt-8 overflow-hidden rounded-2xl border"
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
        boxShadow:
          "var(--shadow-md)",
      }}
    >
      <div
        className="border-b p-6 sm:p-7"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <LuBuilding2
                size={21}
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                AI Generated Output
              </p>

              <h2
                className="mt-1 text-xl font-bold tracking-tight"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Architecture Design
              </h2>

              <p
                className="mt-1.5 max-w-2xl text-sm leading-5"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Generate a structured conceptual
                design from the architecture analysis
                and applicable planning regulations.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {design && (
              <button
                type="button"
                onClick={clearDesign}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-secondary)",
                }}
              >
                <LuTrash2
                  size={15}
                  strokeWidth={1.8}
                />
                Clear Design
              </button>
            )}

            <button
              type="button"
              onClick={
                handleGenerateDesign
              }
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor:
                  "var(--primary)",
                color:
                  "var(--primary-foreground)",
                boxShadow:
                  "0 4px 12px rgba(37, 99, 235, 0.18)",
              }}
            >
              <LuRefreshCw
                size={15}
                strokeWidth={1.9}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              {loading
                ? "Generating..."
                : design
                  ? "Regenerate Design"
                  : "Generate Design"}
            </button>
          </div>
        </div>
      </div>

      {design && (
        <div
          className="mx-5 mt-5 flex items-start gap-3 rounded-xl border p-4 sm:mx-6"
          style={{
            backgroundColor:
              "var(--success-soft)",
            borderColor:
              "var(--success-border)",
          }}
        >
          <LuCircleCheck
            size={18}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0"
            style={{
              color:
                "var(--success)",
            }}
          />

          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Design generated successfully
            </p>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              The generated design is stored in the
              current project workspace and can be
              regenerated whenever the architecture
              analysis changes.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mx-5 mt-5 flex items-start gap-3 rounded-xl border p-4 sm:mx-6"
          style={{
            backgroundColor:
              "var(--danger-soft)",
            borderColor:
              "var(--danger-border)",
          }}
        >
          <LuCircleAlert
            size={18}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
            style={{
              color:
                "var(--danger)",
            }}
          />

          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Design generation failed
            </p>

            <p
              className="mt-1 text-xs leading-5"
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {!design && !loading && !error && (
        <div
          className="mx-5 my-5 rounded-xl border p-6 sm:mx-6 sm:p-8"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <LuBuilding2
                size={23}
                strokeWidth={1.7}
              />
            </div>

            <h3
              className="mt-4 text-lg font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Generate the conceptual design
            </h3>

            <p
              className="mt-2 text-sm leading-6"
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Use the architecture analysis and project
              constraints to generate building
              specifications, site elements, regulatory
              controls and a structured space program.
            </p>

            <button
              type="button"
              onClick={
                handleGenerateDesign
              }
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition hover:opacity-90"
              style={{
                backgroundColor:
                  "var(--primary)",
                color:
                  "var(--primary-foreground)",
              }}
            >
              <LuBuilding2
                size={16}
                strokeWidth={1.9}
              />
              Generate Design
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div
          className="mx-5 my-5 flex items-center gap-4 rounded-xl border p-5 sm:mx-6"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            <LuRefreshCw
              size={19}
              strokeWidth={1.8}
              className="animate-spin"
            />
          </div>

          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Generating architectural design
            </p>

            <p
              className="mt-1 text-xs"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Processing architecture recommendations,
              site constraints and regulatory controls.
            </p>
          </div>
        </div>
      )}

      {design && (
        <div className="space-y-8 p-5 sm:p-6 lg:p-7">
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <LuMap
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Site Information
                </h3>

                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Location and site characteristics used
                  by the generated design.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Site Area"
                value={
                  siteArea > 0
                    ? `${formatNumber(
                        siteArea,
                        2
                      )} m²`
                    : "—"
                }
                icon={LuRuler}
                tone="primary"
              />

              <MetricCard
                label="Jurisdiction"
                value={
                  design.site
                    .jurisdiction ||
                  "—"
                }
                icon={LuMap}
              />

              <MetricCard
                label="State"
                value={
                  design.site.state ||
                  "—"
                }
                icon={LuMap}
              />

              <MetricCard
                label="City"
                value={
                  design.site.city ||
                  "—"
                }
                icon={LuMap}
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <LuBuilding2
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Building Specification
                </h3>

                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Core building parameters produced by the
                  design engine.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Building Type"
                value={
                  buildingType || "—"
                }
                icon={LuBuilding2}
                tone="primary"
              />

              <MetricCard
                label="Subtype"
                value={
                  commercialSubtype ||
                  "—"
                }
                icon={LuBuilding2}
              />

              <MetricCard
                label="Floors"
                value={
                  floors ?? "—"
                }
                icon={LuRuler}
              />

              <MetricCard
                label="Height"
                value={
                  design.building
                    .height_m != null
                    ? `${design.building.height_m} m`
                    : "—"
                }
                icon={LuRuler}
              />

              <MetricCard
                label="FAR"
                value={
                  design.building
                    .far ?? "—"
                }
                icon={LuRuler}
                tone="primary"
              />

              <MetricCard
                label="Ground Coverage"
                value={
                  groundCoveragePercent >
                  0
                    ? `${groundCoveragePercent}%`
                    : "—"
                }
                icon={LuRuler}
                tone="primary"
              />

              <MetricCard
                label="Estimated Built-up"
                value={
                  estimatedBuiltupArea !=
                  null
                    ? `${formatNumber(
                        estimatedBuiltupArea
                      )} m²`
                    : "—"
                }
                icon={LuBuilding2}
                tone="primary"
              />

              <MetricCard
                label="Conceptual Footprint"
                value={
                  footprintArea !=
                  null
                    ? `${formatNumber(
                        footprintArea
                      )} m²`
                    : "—"
                }
                icon={LuRuler}
                tone="primary"
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <LuShieldCheck
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Site Elements
                </h3>

                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Operational and safety provisions
                  included in the conceptual site plan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SiteElementToggle
                label="Parking"
                description="Include or exclude parking from the site plan."
                enabled={design.site_elements.parking === true}
                onToggle={() => updateSiteElement("parking")}
              />

              <SiteElementToggle
                label="Green Area"
                description="Include or exclude landscaped green space."
                enabled={greenArea}
                onToggle={() => updateSiteElement("green_area")}
              />

              <SiteElementToggle
                label="Pedestrian Circulation"
                description="Include or exclude pedestrian pathways."
                enabled={pedestrianCirculation}
                onToggle={() =>
                  updateSiteElement("pedestrian_circulation")
                }
              />

              <SiteElementToggle
                label="Service Access"
                description="Include or exclude service vehicle access."
                enabled={serviceAccess}
                onToggle={() => updateSiteElement("service_access")}
              />

              <SiteElementToggle
                label="Fire Access"
                description="Include or exclude conceptual fire access routes."
                enabled={fireAccess}
                onToggle={() => updateSiteElement("fire_access")}
              />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <LuShieldCheck
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Regulatory Basis
                </h3>

                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Regulatory parameters referenced by the
                  generated design.
                </p>
              </div>
            </div>

            <div
              className="rounded-xl border p-5"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
                borderColor:
                  "var(--border)",
              }}
            >
              {selectedCommercialControl ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Use
                    </p>

                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {String(
                        selectedCommercialControl.use ??
                          "—"
                      )}
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Maximum FAR
                    </p>

                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {String(
                        selectedCommercialControl.far ??
                          "—"
                      )}
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Ground Coverage
                    </p>

                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {String(
                        selectedCommercialControl
                          .ground_coverage_percent ??
                          "—"
                      )}
                      %
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Maximum Height
                    </p>

                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {String(
                        selectedCommercialControl.height_m ??
                          "—"
                      )}
                      m
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <LuCircleAlert
                    size={17}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0"
                    style={{
                      color:
                        "var(--warning)",
                    }}
                  />

                  <p
                    className="text-sm"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    No structured commercial regulation
                    was returned for this design.
                  </p>
                </div>
              )}
            </div>
          </section>

          {coordinates.length >= 3 && (
            <section>
              <div className="mb-4 flex items-center gap-2.5">
                <LuMap
                  size={18}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--primary)",
                  }}
                />

                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Site Design Map
                  </h3>

                  <p
                    className="mt-0.5 text-xs"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Spatial representation of the generated
                    conceptual site arrangement.
                  </p>
                </div>
              </div>

              <div
                className="report-design-map overflow-hidden rounded-xl border"
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >
                <DesignMap
                  coordinates={coordinates}
                  area={siteArea}
                  groundCoveragePercent={groundCoveragePercent}
                  parkingCapacity={parkingCapacity}
                  parkingEnabled={design.site_elements.parking === true}
                  greenArea={greenArea}
                  pedestrianCirculation={pedestrianCirculation}
                  serviceAccess={serviceAccess}
                  fireAccess={fireAccess}
                  buildingFootprintGeometry={
                    design?.site_layout?.building_footprint?.geometry
                  }
                  buildingFootprintStatus={
                    design?.site_layout?.building_footprint?.status
                  }
                />
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <LuBuilding2
                size={18}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Architectural Floor Plan
                </h3>

                <p
                  className="mt-0.5 text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Conceptual 2D floor-plan generated from the
                  design specification and space program.
                </p>
              </div>
            </div>
            
            <div
              className="mb-4 rounded-xl border p-4"
              style={{
                backgroundColor: "var(--surface-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <label
                htmlFor="architecture-style"
                className="mb-2 block text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Architecture Style
              </label>

              <select
                id="architecture-style"
                value={architectureStyle}
                onChange={(event) =>
                  setArchitectureStyle(
                    event.target.value as ArchitectureStyle
                  )
                }
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border)",
                }}
              >
                {ARCHITECTURE_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>

              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {
                  ARCHITECTURE_STYLES.find(
                    (style) => style.value === architectureStyle
                  )?.description
                }
              </p>
            </div>

            <div className="report-floor-plan">
              <FloorPlan2D
                buildingType={buildingType}
                commercialSubtype={commercialSubtype}
                floors={floors}
                footprintArea={footprintArea}
                builtUpArea={estimatedBuiltupArea}
                spaceProgram={design?.space_program ?? null}
                coordinates={coordinates}
                parkingEnabled={design.site_elements.parking === true}
                parkingCapacity={parkingCapacity}
                greenArea={greenArea}
                pedestrianCirculation={pedestrianCirculation}
                serviceAccess={serviceAccess}
                fireAccess={fireAccess}
                architectureStyle={architectureStyle}
              />
            </div>
          </section>

          
          <section className="mt-8">
            <div className="mb-4">
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Interactive 3D Architecture
              </h3>

              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Explore your conceptual building in 3D. Rotate,
                zoom, inspect rooms, and switch between visual styles.
              </p>
            </div>

            <div className="report-building-3d">
              <Building3D
              buildingType={buildingType}
              floors={floors}
              spaceProgram={design?.space_program ?? null}
              parkingEnabled={design.site_elements.parking === true}
              parkingCapacity={parkingCapacity}
              greenArea={greenArea}
              pedestrianCirculation={pedestrianCirculation}
              serviceAccess={serviceAccess}
              fireAccess={fireAccess}
              architectureStyle={architectureStyle}
              onArchitectureStyleChange={setArchitectureStyle}
              />
            </div>
          </section>


          {design.space_program && (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <LuFileText
                    size={18}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      Space Program
                    </h3>

                    <p
                      className="mt-0.5 text-xs"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Backend-generated architectural space
                      allocation.
                    </p>
                  </div>
                </div>

                {design.space_program
                  .status && (
                  <span
                    className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={{
                      backgroundColor:
                        "var(--success-soft)",
                      borderColor:
                        "var(--success-border)",
                      color:
                        "var(--success)",
                    }}
                  >
                    <LuCircleCheck
                      size={13}
                      strokeWidth={1.9}
                    />

                    {
                      design
                        .space_program
                        .status
                    }
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Floors"
                  value={
                    design
                      .space_program
                      .number_of_floors ??
                    "—"
                  }
                  icon={LuBuilding2}
                />

                <MetricCard
                  label="Floor Area"
                  value={
                    design
                      .space_program
                      .floor_area_m2 !=
                    null
                      ? `${formatNumber(
                          design
                            .space_program
                            .floor_area_m2
                        )} m²`
                      : "—"
                  }
                  icon={LuRuler}
                />

                <MetricCard
                  label="Total Built-up"
                  value={
                    design
                      .space_program
                      .total_builtup_area_m2 !=
                    null
                      ? `${formatNumber(
                          design
                            .space_program
                            .total_builtup_area_m2
                        )} m²`
                      : "—"
                  }
                  icon={LuBuilding2}
                  tone="primary"
                />

                <MetricCard
                  label="Allocated Area"
                  value={
                    design
                      .space_program
                      .total_allocated_area_m2 !=
                    null
                      ? `${formatNumber(
                          design
                            .space_program
                            .total_allocated_area_m2
                        )} m²`
                      : "—"
                  }
                  icon={LuRuler}
                />
              </div>

              {Array.isArray(
                design.space_program
                  .floors
              ) &&
                design.space_program
                  .floors.length > 0 && (
                  <div
                    className="mt-4 overflow-hidden rounded-xl border"
                    style={{
                      borderColor:
                        "var(--border)",
                    }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-sm">
                        <thead>
                          <tr
                            style={{
                              backgroundColor:
                                "var(--surface-secondary)",
                            }}
                          >
                            <th
                              className="border-b px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color:
                                  "var(--text-muted)",
                                borderColor:
                                  "var(--border)",
                              }}
                            >
                              Floor
                            </th>

                            <th
                              className="border-b px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color:
                                  "var(--text-muted)",
                                borderColor:
                                  "var(--border)",
                              }}
                            >
                              Name
                            </th>

                            <th
                              className="border-b px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color:
                                  "var(--text-muted)",
                                borderColor:
                                  "var(--border)",
                              }}
                            >
                              Floor Area
                            </th>

                            <th
                              className="border-b px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color:
                                  "var(--text-muted)",
                                borderColor:
                                  "var(--border)",
                              }}
                            >
                              Allocated
                            </th>

                            <th
                              className="border-b px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em]"
                              style={{
                                color:
                                  "var(--text-muted)",
                                borderColor:
                                  "var(--border)",
                              }}
                            >
                              Spaces
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {design.space_program
                            .floors.map(
                              (
                                floor,
                                index
                              ) => (
                                <tr
                                  key={`${floor.floor ?? index}`}
                                  style={{
                                    backgroundColor:
                                      "var(--surface)",
                                  }}
                                >
                                  <td
                                    className="border-b px-4 py-3 text-sm font-semibold"
                                    style={{
                                      color:
                                        "var(--text-primary)",
                                      borderColor:
                                        "var(--border)",
                                    }}
                                  >
                                    {floor.floor ===
                                    0
                                      ? "Ground"
                                      : `Floor ${
                                          (floor.floor ??
                                            index) +
                                          1
                                        }`}
                                  </td>

                                  <td
                                    className="border-b px-4 py-3 text-sm"
                                    style={{
                                      color:
                                        "var(--text-secondary)",
                                      borderColor:
                                        "var(--border)",
                                    }}
                                  >
                                    {floor.name ||
                                      "—"}
                                  </td>

                                  <td
                                    className="border-b px-4 py-3 text-right text-sm"
                                    style={{
                                      color:
                                        "var(--text-secondary)",
                                      borderColor:
                                        "var(--border)",
                                    }}
                                  >
                                    {floor.area_m2 !=
                                    null
                                      ? `${formatNumber(
                                          floor.area_m2
                                        )} m²`
                                      : "—"}
                                  </td>

                                  <td
                                    className="border-b px-4 py-3 text-right text-sm"
                                    style={{
                                      color:
                                        "var(--text-secondary)",
                                      borderColor:
                                        "var(--border)",
                                    }}
                                  >
                                    {floor.total_allocated_area_m2 !=
                                    null
                                      ? `${formatNumber(
                                          floor.total_allocated_area_m2
                                        )} m²`
                                      : "—"}
                                  </td>

                                  <td
                                    className="border-b px-4 py-3 text-right text-sm font-semibold"
                                    style={{
                                      color:
                                        "var(--text-primary)",
                                      borderColor:
                                        "var(--border)",
                                    }}
                                  >
                                    {floor
                                      .spaces
                                      ?.length ??
                                      0}
                                  </td>
                                </tr>
                              )
                            )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}