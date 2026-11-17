
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  LuBot,
  LuBuilding2,
  LuCircleAlert,
  LuFileText,
  LuLeaf,
  LuLoaderCircle,
  LuRuler,
  LuShieldCheck,
  LuUsers,
} from "react-icons/lu";

import api from "../../services/api";
import { useProjectStore } from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";

import AgentCard from "./AgentCard";
import ScoreCard from "./ScoreCard";
import ExecutiveSummary from "./ExecutiveSummary";
import SiteContextPanel from "./SiteContextPanel";

import ExportReportButton from "../../components/dashboard/ExportReportButton";
import ScenarioPanel from "../../components/scenario/ScenarioPanel";
import DesignPanel from "../../components/design/DesignPanel";
import ChatbotPanel from "../../components/chatbot/ChatbotPanel";

import type { DesignSpecification } from "../../services/design";

interface ProjectCoordinate {
  lat: number;
  lng: number;
}

interface ProjectResponse {
  id: number | string;
  name: string;
  building_type: string;
  commercial_subtype?: string | null;
  budget?: number;
  city?: string;
  state?: string;
  area?: number;
  description?: string;
  coordinates?: ProjectCoordinate[] | null;
}

interface ConstraintItem {
  constraint: string;
  status: string;
  actual?: unknown;
  required?: unknown;
  message?: string;
  severity?: string;
  source?: string;
}

interface ConstraintEvaluation {
  status: string;
  compliance_score: number;
  applicability?: unknown;
  summary: {
    total_constraints: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  constraints: ConstraintItem[];
}

interface AnalysisResult {
  overall_score: number;
  architecture?: Record<string, unknown>;
  civil?: Record<string, unknown>;
  sustainability?: Record<string, unknown>;
  municipal?: Record<string, unknown>;
  citizen?: Record<string, unknown>;
  constraints?: ConstraintEvaluation;
  site_context?: Record<string, unknown>;
  [key: string]: unknown;
}

interface AnalysisHistoryItem {
  project_id: number | string;
  full_result?: AnalysisResult | null;
  overall_score?: number;
  architecture?: Record<string, unknown>;
  civil?: Record<string, unknown>;
  sustainability?: Record<string, unknown>;
  municipal?: Record<string, unknown>;
  citizen?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}


const agents = [
  {
    key: "architecture",
    title: "Architecture Agent",
    description: "Building layout and architectural planning",
    icon: LuBuilding2,
  },
  {
    key: "civil",
    title: "Civil Agent",
    description: "Infrastructure and engineering assessment",
    icon: LuRuler,
  },
  {
    key: "sustainability",
    title: "Sustainability Agent",
    description: "Environmental and resource efficiency",
    icon: LuLeaf,
  },
  {
    key: "municipal",
    title: "Municipal Agent",
    description: "Regulations and planning compliance",
    icon: LuShieldCheck,
  },
  {
    key: "citizen",
    title: "Citizen Agent",
    description: "Community impact and public considerations",
    icon: LuUsers,
  },
] as const;

export default function AgentDashboard() {
  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadingProject, setLoadingProject] =
    useState(true);

  const {
    projectId,
    projectName,
    buildingType,
    commercialSubtype,
    budget,
    city,
    state,
    coordinates,
    designProjectId,
    setProject,
    setDesign,
    clearDesign,
  } = useProjectStore();

  const area = usePolygonStore(
    (state) => state.area
  );

  const setPolygonCoordinates =
    usePolygonStore(
      (state) => state.setCoordinates
    );

  const setPolygonArea =
    usePolygonStore(
      (state) => state.setArea
    );

  useEffect(() => {
    let active = true;

    async function loadSavedProject() {
      if (!projectId) {
        if (active) {
          setLoadingProject(false);
        }

        return;
      }

      try {
        const response =
          await api.get<ProjectResponse>(
            `/projects/${projectId}`
          );

        if (!active) {
          return;
        }

        const savedProject =
          response.data;

        const savedCoordinates =
          Array.isArray(savedProject.coordinates)
            ? savedProject.coordinates
            : [];

        const savedArea =
          typeof savedProject.area === "number"
            ? savedProject.area
            : 0;

        setProject({
          id: savedProject.id,
          name: savedProject.name ?? "",
          building_type:
            savedProject.building_type ?? "",
          commercial_subtype:
            savedProject.commercial_subtype ?? null,
          city: savedProject.city ?? "",
          state: savedProject.state ?? "",
          area: savedArea,
          budget: savedProject.budget ?? 0,
          description:
            savedProject.description ?? "",
          coordinates: savedCoordinates,
        });

        setPolygonCoordinates(
          savedCoordinates
        );

        setPolygonArea(
          savedArea
        );

        setResult(null);

        const currentDesignProjectId =
          useProjectStore.getState().designProjectId;

        if (
          currentDesignProjectId !== null &&
          String(currentDesignProjectId) !==
            String(savedProject.id)
        ) {
          clearDesign();
        }
      } catch (error) {
        console.error(
          "Failed to load saved project:",
          error
        );
      } finally {
        if (active) {
          setLoadingProject(false);
        }
      }
    }

    void loadSavedProject();

    return () => {
      active = false;
    };
  }, [
    projectId,
    setProject,
    clearDesign,
    setPolygonCoordinates,
    setPolygonArea,
  ]);

  
  async function analyzeProject() {
    if (!projectName || !buildingType) {
      alert("Please create a project first.");
      return;
    }

    if (!projectId) {
      alert("Please select or save a project first.");
      return;
    }

    if (!coordinates || coordinates.length < 3) {
      alert("Please select or draw the project site first.");
      return;
    }

    if (!area || area <= 0) {
      alert("Please define a valid project area first.");
      return;
    }

    if (
      buildingType.toLowerCase() === "commercial" &&
      !commercialSubtype
    ) {
      alert("Please select a commercial subtype first.");
      return;
    }

    const numericProjectId = Number(projectId);

    if (
      !Number.isSafeInteger(numericProjectId) ||
      numericProjectId <= 0
    ) {
      alert("The selected project ID is invalid. Reload the project.");
      return;
    }

    const payload = {
      project_id: numericProjectId,
      project_name: projectName,
      building_type: buildingType,
      commercial_subtype: commercialSubtype || null,
      city: city || "",
      state: state || "",
      budget: Number(budget) || 0,
      area: Number(area),
      coordinates: coordinates.map((point) => ({
        lat: Number(point.lat),
        lng: Number(point.lng),
      })),
    };

    try {
      setLoading(true);

      console.log(
        "Planner request payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await api.post<AnalysisResult>(
        "/planner/analyze",
        payload
      );

      const analysis = response.data;

      // Preserve the existing generated-design integration.
      const architecture = analysis.architecture;

      if (architecture && typeof architecture === "object") {
        const rawDesign = architecture.design_specification;

        if (
          rawDesign &&
          typeof rawDesign === "object" &&
          !Array.isArray(rawDesign)
        ) {
          const candidate =
            rawDesign as Partial<DesignSpecification>;

          if (
            candidate.site &&
            typeof candidate.site === "object" &&
            candidate.building &&
            typeof candidate.building === "object" &&
            candidate.site_elements &&
            typeof candidate.site_elements === "object" &&
            candidate.regulatory_basis &&
            typeof candidate.regulatory_basis === "object"
          ) {
            setDesign(candidate as DesignSpecification);
          }
        }
      }

      setResult(analysis);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Project analysis validation/backend error:",
          error.response?.data
        );

        console.error("HTTP status:", error.response?.status);
        console.error("Request URL:", error.config?.url);
        console.error("Request payload:", error.config?.data);

        const detail = error.response?.data?.detail;

        alert(
          error.response?.status === 422
            ? `Invalid analysis request: ${
                typeof detail === "string"
                  ? detail
                  : JSON.stringify(detail ?? error.response?.data)
              }`
            : error.response?.status === 401
              ? "Your session is invalid or expired. Please sign in again."
              : "Project analysis failed. Check the browser console and backend logs."
        );
      } else {
        console.error("Project analysis failed:", error);
        alert("Project analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }


  if (loadingProject) {
    return (
      <section
        className="flex min-h-[280px] items-center justify-center rounded-xl border"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <LuLoaderCircle
            size={24}
            className="animate-spin"
            style={{ color: "var(--primary)" }}
          />

          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading project data...
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
      <section
        className="rounded-xl border"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex min-w-0 flex-col gap-4 border-b p-4 sm:gap-5 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6"
          style={{
            borderColor: "var(--border)",
          }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                <LuBot
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{
                    color: "var(--text-muted)",
                  }}
                >
                  Current Project
                </p>

                <h2
                  className="mt-0.5 truncate text-lg font-semibold"
                  style={{
                    color: "var(--text-primary)",
                  }}
                >
                  {projectName ||
                    "No project selected"}
                </h2>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={analyzeProject}
            disabled={loading}
            className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto lg:h-10"
            style={{
              backgroundColor:
                "var(--primary)",
              color:
                "var(--primary-foreground)",
              boxShadow:
                "0 4px 12px rgba(37, 99, 235, 0.18)",
            }}
          >
            {loading ? (
              <>
                <LuLoaderCircle
                  size={16}
                  className="animate-spin"
                />
                Running Analysis
              </>
            ) : (
              <>
                <LuBot
                  size={16}
                  strokeWidth={2}
                />
                Analyze Project
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <div className="p-4 sm:p-5">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: "var(--text-muted)",
              }}
            >
              Building Type
            </p>

            <p
              className="mt-2 text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {buildingType || "Not specified"}
            </p>

            {commercialSubtype && (
              <p
                className="mt-1 text-xs"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                {commercialSubtype}
              </p>
            )}
          </div>

          <div
            className="p-4 sm:p-5"
            style={{
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: "var(--text-muted)",
              }}
            >
              Location
            </p>

            <p
              className="mt-2 text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {city || "Not specified"}
            </p>

            {state && (
              <p
                className="mt-1 text-xs"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                {state}
              </p>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: "var(--text-muted)",
              }}
            >
              Land Area
            </p>

            <p
              className="mt-2 text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {area
                ? `${area.toLocaleString()} m²`
                : "Not defined"}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: "var(--text-muted)",
              }}
            >
              Budget
            </p>

            <p
              className="mt-2 text-sm font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              {budget
                ? `₹${budget.toLocaleString()}`
                : "Not specified"}
            </p>
          </div>
        </div>
      </section>

      {!result && !loading && (
        <section
          className="rounded-xl border p-4 sm:p-6 lg:p-8"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <LuBot
                size={23}
                strokeWidth={1.7}
              />
            </div>

            <h2
              className="mt-4 text-xl font-semibold"
              style={{
                color: "var(--text-primary)",
              }}
            >
              Ready for AI analysis
            </h2>

            <p
              className="mx-auto mt-2 max-w-xl text-sm leading-6"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              The planning engine will evaluate your
              project across five specialized domains and
              generate recommendations, scores and
              planning insights.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-5 sm:gap-3">
              {agents.map((agent) => {
                const Icon = agent.icon;

                return (
                  <div
                    key={agent.key}
                    className="rounded-lg border p-2.5 sm:p-3"
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                    }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                      style={{
                        color: "var(--primary)",
                      }}
                    />

                    <p
                      className="mt-2 text-xs font-medium"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {agent.title.replace(
                        " Agent",
                        ""
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={analyzeProject}
              className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition hover:opacity-90 sm:mt-6 sm:w-auto"
              style={{
                backgroundColor:
                  "var(--primary)",
                color:
                  "var(--primary-foreground)",
              }}
            >
              <LuBot
                size={16}
                strokeWidth={2}
              />
              Start AI Analysis
            </button>
          </div>
        </section>
      )}

      {loading && (
        <section
          className="rounded-xl border p-4 sm:p-6"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <LuLoaderCircle
                size={22}
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
                AI analysis in progress
              </p>

              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Evaluating project requirements and
                generating multi-agent recommendations.
              </p>
            </div>
          </div>
        </section>
      )}

      {result && (
        <>
          <ScoreCard
            score={result.overall_score}
          />

          <ExecutiveSummary
            result={result}
          />
          {result.constraints && (
            <section
              className="rounded-xl border p-4 sm:p-5 lg:p-6"
              style={{
                backgroundColor: "var(--surface-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="mb-5 flex items-start gap-3">
                <LuShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />

                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Regulatory Constraint Assessment
                  </h2>

                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Planning and regulatory checks evaluated for this project.
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5 sm:grid-cols-4 sm:gap-3">
                <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Compliance score
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.constraints.compliance_score}%
                  </p>
                </div>

                <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Passed
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.constraints.summary.passed}
                  </p>
                </div>

                <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Warnings
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.constraints.summary.warnings}
                  </p>
                </div>

                <div className="min-w-0 rounded-lg border p-3 sm:p-4">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Failed
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {result.constraints.summary.failed}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Overall status:</span>

                <span className="rounded-full border px-3 py-1 text-sm font-semibold">
                  {result.constraints.status}
                </span>

                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {result.constraints.summary.total_constraints} checks evaluated
                </span>
              </div>

              <div className="space-y-3">
                {result.constraints.constraints.map((item, index) => (
                  <div
                    key={`${item.constraint}-${index}`}
                    className="min-w-0 rounded-lg border p-3.5 sm:p-4"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.constraint}
                      </h3>

                      <span className="rounded-full border px-2.5 py-1 text-xs font-semibold">
                        {item.status}
                      </span>
                    </div>

                    {item.message && (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.message}
                      </p>
                    )}

                    {(item.actual !== undefined || item.required !== undefined) && (
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {item.actual !== undefined && (
                          <p>
                            <span style={{ color: "var(--text-muted)" }}>
                              Actual:{" "}
                            </span>
                            {String(item.actual ?? "Not available")}
                          </p>
                        )}

                        {item.required !== undefined && (
                          <p>
                            <span style={{ color: "var(--text-muted)" }}>
                              Required:{" "}
                            </span>
                            {String(item.required ?? "Not available")}
                          </p>
                        )}
                      </div>
                    )}

                    <div
                      className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.severity && <span>Severity: {item.severity}</span>}
                      {item.source && <span>Source: {item.source}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {result.site_context &&
            typeof result.site_context === "object" &&
            !Array.isArray(result.site_context) && (
              <SiteContextPanel
                context={
                  result.site_context as React.ComponentProps<
                    typeof SiteContextPanel
                  >["context"]
                }
              />
            )}



          <section>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <LuBot
                  size={18}
                  strokeWidth={1.8}
                  style={{
                    color: "var(--primary)",
                  }}
                />

                <h2
                  className="text-lg font-semibold tracking-tight"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Agent Analysis
                </h2>
              </div>

              <p
                className="mt-1 text-sm"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Detailed findings from each specialized
                planning agent.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
              {agents.map((agent) => {
                const Icon = agent.icon;

                const agentData =
                  result[
                    agent.key
                  ] as
                    | Record<
                        string,
                        unknown
                      >
                    | undefined;

                return (
                  <AgentCard
                    key={agent.key}
                    title={agent.title}
                    description={
                      agent.description
                    }
                    icon={Icon}
                    data={agentData}
                  />
                );
              })}
            </div>
          </section>

          <div
            className="flex flex-col items-stretch justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4"
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  color:
                    "var(--primary)",
                }}
              >
                <LuFileText
                  size={17}
                  strokeWidth={1.8}
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
                  Planning Report
                </p>

                <p
                  className="text-xs"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Export the complete AI analysis.
                </p>
              </div>
            </div>

            <ExportReportButton
              report={result}
            />
          </div>

          <DesignPanel
            project={{
              project_name:
                projectName,

              building_type:
                buildingType,

              commercial_subtype:
                commercialSubtype,

              city,

              state,

              budget,

              area,

              coordinates,
            }}
            architecture={
              result.architecture ??
              {}
            }
          />

          <ScenarioPanel
            analysisResult={result}
          />

          <ChatbotPanel
            analysisResult={result}
          />
        </>
      )}

      {!result && !loading && (
        <div
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{
            backgroundColor:
              "var(--warning-soft)",
            borderColor:
              "var(--warning-border)",
          }}
        >
          <LuCircleAlert
            size={18}
            className="mt-0.5 shrink-0"
            style={{
              color: "var(--warning)",
            }}
          />

          <p
            className="text-sm leading-5"
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            Make sure a project has been created and
            its land parcel has been selected before
            starting the analysis.
          </p>
        </div>
      )}
    </div>
  );
}