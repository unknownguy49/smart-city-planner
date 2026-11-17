"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LuBot,
  LuBuilding2,
  LuCircleCheck,
  LuDownload,
  LuFileJson,
  LuFileText,
  LuFolder,
  LuLoaderCircle,
  LuMap,
  LuRefreshCw,
  LuSearch,
  LuSparkles,
} from "react-icons/lu";

import AppLayout from "../../components/layout/AppLayout";

import ReportVisualGallery from "../../components/reports/ReportVisualGallery";

import api from "../../services/api";

import {
  getReportStore,
  saveProjectSnapshot,
  type ProjectReportRecord,
  type ReportArtifactType,
  type ReportProject,
} from "../../lib/reportStore";

import {
  downloadArchitecturePdf,
  downloadEverythingPdf,
  downloadScenarioPdf,
} from "../../lib/reportPdf";

interface ApiProject
  extends ReportProject {
  id: number | string;
  name: string;
}

interface ApiSavedArtifact {
  id: number;
  project_id: number;
  artifact_type: string;
  name: string;
  data: Record<string, unknown>;
  version: number;
  created_at: string | null;
  updated_at: string | null;
}

interface ApiAnalysis {
  id: number;
  project_id: number;
  full_result: Record<string, unknown> | null;
  created_at: string | null;
}

const artifactMeta: Record<
  ReportArtifactType,
  {
    title: string;
    description: string;
    fileName: string;
    kind:
      | "json"
      | "pdf";
    icon: typeof LuFileText;
  }
> = {
  agents: {
    title:
      "AI Agent Analysis",

    description:
      "Architecture, civil, sustainability, municipal and citizen analysis.",

    fileName:
      "agents.json",

    kind: "json",

    icon: LuBot,
  },

  lands: {
    title:
      "Land & Site Data",

    description:
      "Saved parcel geometry, coordinates and measured site area.",

    fileName:
      "lands.json",

    kind: "json",

    icon: LuMap,
  },

  architecture: {
    title:
      "Architecture Room Plan",

    description:
      "Generated architecture specification and available room programme.",

    fileName:
      "architecture_room.pdf",

    kind: "pdf",

    icon: LuBuilding2,
  },

  scenario: {
    title:
      "Scenario Design",

    description:
      "Scenario evaluation and generated what-if design output.",

    fileName:
      "scenario_design.pdf",

    kind: "pdf",

    icon: LuSparkles,
  },
};

function formatDate(
  value?: string
) {
  if (!value) {
    return "Not generated";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not generated";
  }

  return date.toLocaleString();
}

function downloadJson(
  project: ApiProject,
  type: ReportArtifactType,
  data: Record<string, unknown>
) {
  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        ),
      ],
      {
        type:
          "application/json",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;

  anchor.download =
    `${project.name
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      ) || "project"}-${type}.json`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  document.body.removeChild(
    anchor
  );

  URL.revokeObjectURL(
    url
  );
}

function artifactCount(
  record:
    | ProjectReportRecord
    | null
) {
  return record
    ? Object.keys(
        record.artifacts
      ).length
    : 0;
}

export default function ReportsPage() {
  const [
    projects,
    setProjects,
  ] = useState<ApiProject[]>(
    []
  );

  const [latestAnalysis, setLatestAnalysis] =
  useState<ApiAnalysis | null>(null);

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  useEffect(() => {
  if (!selectedId) {
    setLatestAnalysis(null);
    return;
  }

  let active = true;

  setLatestAnalysis(null);

  api.get<ApiAnalysis[]>(
    `/projects/${selectedId}/analyses`
  )
    .then((response) => {
      if (active) {
        setLatestAnalysis(
          Array.isArray(response.data)
            ? response.data[0] ?? null
            : null
        );
      }
    })
    .catch((error) => {
      if (active) {
        console.error(
          "Failed to load project analysis:",
          error
        );
        setLatestAnalysis(null);
      }
    });

  return () => {
    active = false;
  };
}, [selectedId]);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    reportStore,
    setReportStore,
  ] = useState(
    getReportStore()
  );

  const [
    serverArchitecture,
    setServerArchitecture,
  ] = useState<ApiSavedArtifact | null>(null);

  const [
    serverScenario,
    setServerScenario,
  ] = useState<ApiSavedArtifact | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  async function loadProjects(
    refresh = false
  ) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response =
        await api.get<ApiProject[]>(
          "/projects/"
        );

      const nextProjects =
        Array.isArray(
          response.data
        )
          ? response.data
          : [];

      nextProjects.forEach(
        (project) => {
          saveProjectSnapshot(
            project
          );
        }
      );

      setProjects(
        nextProjects
      );

      setSelectedId(
        (current) => {
          if (
            current &&
            nextProjects.some(
              (project) =>
                String(
                  project.id
                ) === current
            )
          ) {
            return current;
          }

          return nextProjects.length
            ? String(
                nextProjects[0]
                  .id
              )
            : "";
        }
      );
    } catch (error) {
      console.error(
        "Failed to load report projects:",
        error
      );
    } finally {
      setLoading(false);

      setRefreshing(false);

      setReportStore(
        getReportStore()
      );
    }
  }

  useEffect(() => {
    if (!selectedId) {
      setServerArchitecture(null);
      setServerScenario(null);
      return;
    }

    let active = true;

    setServerArchitecture(null);
    setServerScenario(null);

    api.get<ApiSavedArtifact[]>(
      `/projects/${selectedId}/artifacts`
    )
      .then((response) => {
        if (!active) {
          return;
        }

        const artifacts = Array.isArray(response.data)
          ? response.data
          : [];

        const architectureArtifact = artifacts.find(
          (artifact) =>
            artifact.name === "Architecture Room Plan" &&
            artifact.artifact_type === "design"
        );

        const scenarioArtifact = artifacts.find(
          (artifact) =>
            artifact.name === "Scenario Design" &&
            artifact.artifact_type === "scenario"
        );

        setServerArchitecture(
          architectureArtifact ?? null
        );

        setServerScenario(
          scenarioArtifact ?? null
        );
      })
      .catch((error) => {
        console.error(
          "Failed to load project report artifacts:",
          error
        );

        if (active) {
          setServerArchitecture(null);
          setServerScenario(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    void loadProjects();

    const handleUpdate =
      () => {
        setReportStore(
          getReportStore()
        );
      };

    window.addEventListener(
      "smart-city:reports-updated",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "smart-city:reports-updated",
        handleUpdate
      );
    };
  }, []);

  const filteredProjects =
    useMemo(() => {
      const value =
        query
          .trim()
          .toLowerCase();

      if (!value) {
        return projects;
      }

      return projects.filter(
        (project) =>
          [
            project.name,
            project.city,
            project.state,
            project.building_type,
          ]
            .filter(Boolean)
            .some(
              (item) =>
                String(item)
                  .toLowerCase()
                  .includes(value)
            )
      );
    }, [
      projects,
      query,
    ]);

  const selectedProject =
    projects.find(
      (project) =>
        String(
          project.id
        ) === selectedId
    );

  const localReport = selectedProject
    ? reportStore[String(selectedProject.id)] ?? null
    : null;

  const selectedReport: ProjectReportRecord | null =
  selectedProject
    ? {
        project: localReport?.project ?? selectedProject,
        artifacts: {
          ...localReport?.artifacts,

          ...(latestAnalysis &&
          String(latestAnalysis.project_id) ===
            String(selectedProject.id) &&
          latestAnalysis.full_result
            ? {
                agents: {
                  type: "agents",
                  updatedAt:
                    latestAnalysis.created_at ?? "",
                  data: latestAnalysis.full_result,
                },
              }
            : {}),

          ...(serverArchitecture &&
          String(serverArchitecture.project_id) ===
            String(selectedProject.id)
            ? {
                architecture: {
                  type: "architecture",
                  updatedAt:
                    serverArchitecture.updated_at ?? "",
                  data: serverArchitecture.data,
                },
              }
            : {}),

          ...(serverScenario &&
          String(serverScenario.project_id) ===
            String(selectedProject.id)
            ? {
                scenario: {
                  type: "scenario",
                  updatedAt:
                    serverScenario.updated_at ?? "",
                  data: serverScenario.data,
                },
              }
            : {}),
        },
      }
    : null;

  const count =
    artifactCount(
      selectedReport
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">

        <section
  className="relative min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-6 lg:p-8"
  style={{
    backgroundColor: "var(--surface)",
    borderColor: "var(--border)",
  }}
>
  <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: "var(--primary-soft)",
          color: "var(--primary)",
        }}
      >
        <LuFileText size={23} strokeWidth={1.8} />
      </div>

      <div className="min-w-0">
        <p
          className="text-xs font-bold uppercase tracking-[0.16em]"
          style={{ color: "var(--primary)" }}
        >
          Planning workspace
        </p>

        <h1
          className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "var(--text-primary)" }}
        >
          Reports & Artifacts
        </h1>

        <p
          className="mt-2 max-w-2xl text-sm leading-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Review your saved site data, AI analysis, architectural
          designs, and planning scenarios. Select a project to
          inspect its artifacts and export reports.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--surface-secondary)",
            }}
          >
            {projects.length} projects
          </span>

          <span
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--surface-secondary)",
            }}
          >
            {count} saved artifacts for selected project
          </span>
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={() => void loadProjects(true)}
      disabled={refreshing}
      className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 self-start rounded-lg border px-4 text-sm font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:self-center"
      style={{
        backgroundColor: "var(--surface-secondary)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
      }}
    >
      <LuRefreshCw
        size={16}
        className={refreshing ? "animate-spin" : undefined}
      />
      {refreshing ? "Refreshing…" : "Refresh projects"}
    </button>
  </div>
</section>

        <section
          className="grid min-h-0 min-w-0 grid-cols-1 overflow-hidden rounded-2xl border lg:min-h-[620px] lg:grid-cols-[310px_minmax(0,1fr)]"
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >

          <aside
            className="border-b lg:border-b-0 lg:border-r"
            style={{
              borderColor:
                "var(--border)",
            }}
          >

            <div
              className="border-b p-4"
              style={{
                borderColor:
                  "var(--border)",
              }}
            >

              <div className="flex items-center justify-between gap-3">

                <div>

                  <p
                    className="text-xs font-semibold uppercase tracking-[0.12em]"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Projects
                  </p>

                  <p
                    className="mt-1 text-sm font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Select a project
                  </p>

                </div>

                <span
                  className="rounded-md border px-2 py-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--text-muted)",
                  }}
                >
                  {
                    projects.length
                  }
                </span>

              </div>

              <div className="relative mt-4">

                <LuSearch
                  size={15}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                />

                <input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search projects"
                  className="h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--text-primary)",
                  }}
                />

              </div>

            </div>

            <div className="flex max-h-none gap-2 overflow-x-auto p-2 lg:max-h-[550px] lg:flex-col lg:gap-0 lg:overflow-x-hidden lg:overflow-y-auto">

              {loading ? (
                <div className="flex min-h-40 items-center justify-center">

                  <LuLoaderCircle
                    size={22}
                    className="animate-spin"
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                </div>
              ) : filteredProjects.length ===
                0 ? (
                <div className="px-4 py-12 text-center">

                  <LuFolder
                    size={25}
                    strokeWidth={1.6}
                    className="mx-auto"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  />

                  <p
                    className="mt-3 text-sm font-medium"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    No projects found
                  </p>

                </div>
              ) : (
                filteredProjects.map(
                  (project) => {
                    const active =
                      String(
                        project.id
                      ) ===
                      selectedId;

                    const record =
                      reportStore[
                        String(
                          project.id
                        )
                      ];

                    const projectCount =
                      artifactCount(
                        record ??
                          null
                      );

                    return (
                      <button
                        key={
                          project.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedId(
                            String(
                              project.id
                            )
                          )
                        }
                        className="mb-0 w-[220px] shrink-0 rounded-xl border p-3 text-left transition lg:mb-1 lg:w-full"
                        style={{
                          backgroundColor:
                            active
                              ? "var(--primary-soft)"
                              : "transparent",

                          borderColor:
                            active
                              ? "var(--primary-border)"
                              : "transparent",

                          color:
                            "var(--text-primary)",
                        }}
                      >

                        <div className="flex items-start gap-3">

                          <div
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor:
                                active
                                  ? "var(--surface)"
                                  : "var(--surface-secondary)",

                              color:
                                active
                                  ? "var(--primary)"
                                  : "var(--text-muted)",
                            }}
                          >
                            <LuBuilding2
                              size={16}
                              strokeWidth={
                                1.8
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-semibold">
                              {
                                project.name
                              }
                            </p>

                            <p
                              className="mt-0.5 truncate text-xs"
                              style={{
                                color:
                                  "var(--text-muted)",
                              }}
                            >
                              {[
                                project.building_type,
                                project.city,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " · "
                                ) ||
                                "Planning project"}
                            </p>

                          </div>

                          {projectCount >
                            0 && (
                            <span
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor:
                                  active
                                    ? "var(--primary)"
                                    : "var(--surface-tertiary)",

                                color:
                                  active
                                    ? "var(--primary-foreground)"
                                    : "var(--text-muted)",
                              }}
                            >
                              {
                                projectCount
                              }
                            </span>
                          )}

                        </div>

                      </button>
                    );
                  }
                )
              )}

            </div>

          </aside>

          <main className="min-w-0 p-3 sm:p-5 lg:p-7">

            {!selectedProject ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center sm:min-h-[360px] lg:min-h-[520px]">

                <LuFolder
                  size={34}
                  strokeWidth={1.5}
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                />

                <h2
                  className="mt-4 text-lg font-semibold"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  No project selected
                </h2>

                <p
                  className="mt-2 max-w-md text-sm leading-6"
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  Create or select a project
                  to view its generated planning
                  artifacts.
                </p>

              </div>
            ) : (
              <>

                <div
                  className="flex min-w-0 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between sm:pb-5"
                  style={{
                    borderColor:
                      "var(--border)",
                  }}
                >

                  <div className="min-w-0">

                    <div className="flex items-center gap-2">

                      <LuBuilding2
                        size={18}
                        strokeWidth={1.8}
                        style={{
                          color:
                            "var(--primary)",
                        }}
                      />

                      <span
                        className="text-xs font-semibold uppercase tracking-[0.12em]"
                        style={{
                          color:
                            "var(--primary)",
                        }}
                      >
                        Selected Project
                      </span>

                    </div>

                    <h2
                      className="mt-2 truncate text-xl font-bold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {
                        selectedProject.name
                      }
                    </h2>

                    <p
                      className="mt-1 text-sm"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {[
                        selectedProject.building_type,
                        selectedProject.city,
                        selectedProject.state,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          " · "
                        )}
                    </p>

                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">

                    <span
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor:
                          "var(--surface-secondary)",
                        borderColor:
                          "var(--border)",
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      <LuCircleCheck
                        size={14}
                        strokeWidth={
                          1.8
                        }
                      />

                      {count} / 4 artifacts
                    </span>

                    <button
                      type="button"
                      disabled={
                        !selectedReport ||
                        count === 0
                      }
                      onClick={() => {
                        if (
                          selectedReport
                        ) {
                          downloadEverythingPdf(
                            selectedReport
                          );
                        }
                      }}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      style={{
                        backgroundColor:
                          "var(--primary)",
                        color:
                          "var(--primary-foreground)",
                      }}
                    >
                      <LuDownload
                        size={14}
                        strokeWidth={
                          2
                        }
                      />

                      everything.pdf
                    </button>

                  </div>

                </div>

                <ReportVisualGallery
                  projectId={
                    selectedProject.id
                  }
                />

                <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-2">

                  {(
                    Object.keys(
                      artifactMeta
                    ) as ReportArtifactType[]
                  ).map(
                    (type) => {
                      const meta =
                        artifactMeta[
                          type
                        ];

                      const artifact =
                        selectedReport
                          ?.artifacts[
                            type
                          ];

                      const Icon =
                        meta.icon;

                      return (
                        <article
                          key={
                            type
                          }
                          className="min-w-0 rounded-xl border p-4 sm:p-5"
                          style={{
                            backgroundColor:
                              "var(--surface-secondary)",
                            borderColor:
                              "var(--border)",
                          }}
                        >

                          <div className="flex items-start gap-3">

                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor:
                                  artifact
                                    ? "var(--primary-soft)"
                                    : "var(--surface-tertiary)",

                                color:
                                  artifact
                                    ? "var(--primary)"
                                    : "var(--text-muted)",
                              }}
                            >
                              <Icon
                                size={19}
                                strokeWidth={
                                  1.8
                                }
                              />
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex min-w-0 flex-col items-start justify-between gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:gap-3">

                                <div>

                                  <h3
                                    className="text-sm font-semibold"
                                    style={{
                                      color:
                                        "var(--text-primary)",
                                    }}
                                  >
                                    {
                                      meta.title
                                    }
                                  </h3>

                                  <p
                                    className="mt-1 text-xs leading-5"
                                    style={{
                                      color:
                                        "var(--text-secondary)",
                                    }}
                                  >
                                    {
                                      meta.description
                                    }
                                  </p>

                                </div>

                                <span
                                  className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor:
                                      artifact
                                        ? "var(--success-soft)"
                                        : "var(--surface)",

                                    borderColor:
                                      artifact
                                        ? "var(--success-border)"
                                        : "var(--border)",

                                    color:
                                      artifact
                                        ? "var(--success)"
                                        : "var(--text-muted)",
                                  }}
                                >
                                  {artifact
                                    ? "Available"
                                    : "Not generated"}
                                </span>

                              </div>

                              <div className="mt-4 flex flex-col items-stretch justify-between gap-3 min-[420px]:flex-row min-[420px]:items-center">

                                <div>

                                  <p
                                    className="text-xs font-medium"
                                    style={{
                                      color:
                                        "var(--text-primary)",
                                    }}
                                  >
                                    {
                                      meta.fileName
                                    }
                                  </p>

                                  <p
                                    className="mt-1 text-[10px]"
                                    style={{
                                      color:
                                        "var(--text-muted)",
                                    }}
                                  >
                                    {formatDate(
                                      artifact?.updatedAt
                                    )}
                                  </p>

                                </div>

                                {artifact && (
                                  <div className="flex gap-2 self-end min-[420px]:self-auto">

                                    {meta.kind ===
                                    "json" ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          downloadJson(
                                            selectedProject,
                                            type,
                                            artifact.data
                                          )
                                        }
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition hover:bg-[var(--surface-hover)]"
                                        style={{
                                          backgroundColor:
                                            "var(--surface)",
                                          borderColor:
                                            "var(--border)",
                                          color:
                                            "var(--text-secondary)",
                                        }}
                                      >
                                        <LuFileJson
                                          size={
                                            13
                                          }
                                          strokeWidth={
                                            1.8
                                          }
                                        />

                                        JSON
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            !selectedReport
                                          ) {
                                            return;
                                          }

                                          if (
                                            type ===
                                            "architecture"
                                          ) {
                                            downloadArchitecturePdf(
                                              selectedReport
                                            );
                                          }

                                          if (
                                            type ===
                                            "scenario"
                                          ) {
                                            downloadScenarioPdf(
                                              selectedReport
                                            );
                                          }
                                        }}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition hover:opacity-90"
                                        style={{
                                          backgroundColor:
                                            "var(--primary)",
                                          color:
                                            "var(--primary-foreground)",
                                        }}
                                      >
                                        <LuDownload
                                          size={
                                            13
                                          }
                                          strokeWidth={
                                            2
                                          }
                                        />

                                        PDF
                                      </button>
                                    )}

                                  </div>
                                )}

                              </div>

                            </div>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>

                {count ===
                  0 && (
                  <div
                    className="mt-4 rounded-xl border border-dashed p-4 text-center sm:mt-5 sm:p-6"
                    style={{
                      backgroundColor:
                        "var(--surface-secondary)",
                      borderColor:
                        "var(--border-strong)",
                    }}
                  >

                    <LuFileText
                      size={26}
                      strokeWidth={
                        1.6
                      }
                      className="mx-auto"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    />

                    <p
                      className="mt-3 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      No generated artifacts yet
                    </p>

                    <p
                      className="mx-auto mt-1 max-w-lg text-xs leading-5"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      Save the project land or
                      run AI analysis,
                      architecture or scenario
                      generation. Completed
                      outputs will appear here
                      automatically.
                    </p>

                  </div>
                )}

              </>
            )}

          </main>

        </section>

      </div>
    </AppLayout>
  );
}