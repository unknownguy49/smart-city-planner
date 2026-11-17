"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuArrowRight,
  LuBot,
  LuBuilding2,
  LuFileText,
  LuFolder,
  LuMap,
  LuPlus,
} from "react-icons/lu";

import AppLayout from "../../components/layout/AppLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

type OverviewCounts = {
  projects: number;
  landSelected: number;
  aiReports: number;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");


const workflow = [
  {
    number: "01",
    title: "Create a project",
    description:
      "Define the building requirements, location, land area and budget.",
    href: "/projects/new",
    icon: LuPlus,
  },
  {
    number: "02",
    title: "Select the land",
    description:
      "Choose and analyze a land parcel using the interactive map.",
    href: "/map",
    icon: LuMap,
  },
  {
    number: "03",
    title: "Run AI analysis",
    description:
      "Generate planning recommendations and conceptual designs.",
    href: "/planner",
    icon: LuBot,
  },
];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [counts, setCounts] = useState<OverviewCounts>({
    projects: 0,
    landSelected: 0,
    aiReports: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatsLoading(false);
      setCounts({ projects: 0, landSelected: 0, aiReports: 0 });
      return;
    }

    let cancelled = false;

    async function loadOverview() {
      setStatsLoading(true);
      setStatsError("");

      try {
        const token = await user!.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [projectsResponse, reportsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/projects/`, { headers, cache: "no-store" }),
          fetch(`${API_BASE_URL}/planner/history`, { headers, cache: "no-store" }),
        ]);

        if (!projectsResponse.ok) {
          throw new Error(`Could not load projects (${projectsResponse.status}).`);
        }
        if (!reportsResponse.ok) {
          throw new Error(`Could not load AI reports (${reportsResponse.status}).`);
        }

        const projects = await projectsResponse.json();
        const reports = await reportsResponse.json();

        if (!Array.isArray(projects) || !Array.isArray(reports)) {
          throw new Error("The API returned an unexpected overview response.");
        }

        const landResults = await Promise.all(
          projects.map(async (project: { id: number }) => {
            const response = await fetch(`${API_BASE_URL}/land/${project.id}`, {
              headers,
              cache: "no-store",
            });
            if (!response.ok) return false;
            const land = await response.json();
            return Boolean(land?.geojson);
          }),
        );

        if (!cancelled) {
          setCounts({
            projects: projects.length,
            landSelected: landResults.filter(Boolean).length,
            aiReports: reports.length,
          });
        }
      } catch (error) {
        console.error("Failed to load dashboard overview:", error);
        if (!cancelled) {
          setStatsError(
            error instanceof Error
              ? error.message
              : "Could not load dashboard overview.",
          );
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const metrics = [
    {
      title: "Projects",
      value: statsLoading ? "…" : String(counts.projects),
      description: "Planning projects created",
      icon: LuFolder,
    },
    {
      title: "Land Selected",
      value: statsLoading ? "…" : String(counts.landSelected),
      description: "Projects with a saved land boundary",
      icon: LuMap,
    },
    {
      title: "AI Reports",
      value: statsLoading ? "…" : String(counts.aiReports),
      description: "Planning analyses generated",
      icon: LuFileText,
    },
  ];

  return (
    <ProtectedRoute>
    <AppLayout>
      <div className="min-w-0 space-y-6 lg:space-y-8">

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            p-5
            sm:p-6
            lg:p-8
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              h-64
              w-64
              rounded-full
              opacity-20
            "
            style={{
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            }}
          />

          <div className="relative max-w-3xl">
            <div className="mb-4 flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                "
                style={{
                  backgroundColor:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                <LuBuilding2
                  size={19}
                  strokeWidth={1.8}
                />
              </div>

              <span
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                "
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                Urban Planning Workspace
              </span>
            </div>

            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                sm:text-3xl
                lg:text-4xl
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Smart City Planner
            </h1>

            <p
              className="
                mt-3
                max-w-2xl
                text-sm
                leading-6
                sm:text-base
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Analyze land, define development
              requirements and use AI-assisted
              planning workflows to develop
              informed urban design concepts.
            </p>

            <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row sm:mt-6">
              <Link
                href="/projects/new"
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  px-4
                  text-sm
                  font-semibold
                  transition
                  hover:opacity-90
                "
                style={{
                  backgroundColor:
                    "var(--primary)",
                  color:
                    "var(--primary-foreground)",
                }}
              >
                <LuPlus
                  size={16}
                  strokeWidth={2}
                />

                Create Project
              </Link>

              <Link
                href="/map"
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  px-4
                  text-sm
                  font-medium
                  transition
                  hover:bg-[var(--surface-hover)]
                "
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-secondary)",
                }}
              >
                <LuMap
                  size={16}
                  strokeWidth={1.8}
                />

                Open Site Planner
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2
              className="
                text-lg
                font-semibold
                tracking-tight
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Workspace Overview
            </h2>

            <p
              className="mt-1 text-sm"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Current activity across your
              planning workspace.
            </p>
            {statsError && (
              <p className="mt-2 text-sm text-red-600" role="status">
                Overview could not be refreshed: {statsError}
              </p>
            )}
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              sm:gap-4
              lg:grid-cols-3
            "
          >
            {metrics.map(
              (metric) => {
                const Icon =
                  metric.icon;

                return (
                  <div
                    key={metric.title}
                    className="
                      rounded-xl
                      border
                      p-4
                      transition
                      hover:-translate-y-0.5
                      sm:p-5
                    "
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      boxShadow:
                        "var(--shadow-sm)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className="
                            text-sm
                            font-medium
                          "
                          style={{
                            color:
                              "var(--text-secondary)",
                          }}
                        >
                          {metric.title}
                        </p>

                        <p
                          className="
                            mt-3
                            text-3xl
                            font-bold
                            tracking-tight
                          "
                          style={{
                            color:
                              "var(--text-primary)",
                          }}
                        >
                          {metric.value}
                        </p>
                      </div>

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-lg
                        "
                        style={{
                          backgroundColor:
                            "var(--primary-soft)",
                          color:
                            "var(--primary)",
                        }}
                      >
                        <Icon
                          size={19}
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>

                    <p
                      className="
                        mt-3
                        text-xs
                      "
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      {metric.description}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2
              className="
                text-lg
                font-semibold
                tracking-tight
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Planning Workflow
            </h2>

            <p
              className="mt-1 text-sm"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Follow the core workflow to
              move from a project brief to
              an AI-assisted planning result.
            </p>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:gap-4
              lg:grid-cols-3
            "
          >
            {workflow.map(
              (step) => {
                const Icon =
                  step.icon;

                return (
                  <Link
                    key={step.number}
                    href={step.href}
                    className="
                      group
                      rounded-xl
                      border
                      p-4
                      transition-all
                      sm:p-5
                      duration-150
                      hover:-translate-y-0.5
                      hover:shadow-md
                    "
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="
                          text-xs
                          font-bold
                          tracking-[0.12em]
                        "
                        style={{
                          color:
                            "var(--text-disabled)",
                        }}
                      >
                        {step.number}
                      </span>

                      <div
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-lg
                          transition
                          group-hover:scale-105
                        "
                        style={{
                          backgroundColor:
                            "var(--surface-secondary)",
                          color:
                            "var(--primary)",
                        }}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>

                    <h3
                      className="
                        mt-5
                        text-base
                        font-semibold
                      "
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {step.title}
                    </h3>

                    <p
                      className="
                        mt-2
                        text-sm
                        leading-6
                      "
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {step.description}
                    </p>

                    <div
                      className="
                        mt-5
                        inline-flex
                        items-center
                        gap-1.5
                        text-xs
                        font-semibold
                      "
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    >
                      Open workflow

                      <LuArrowRight
                        size={14}
                        strokeWidth={2}
                        className="
                          transition-transform
                          group-hover:translate-x-0.5
                        "
                      />
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        </section>

        <section
          className="
            rounded-xl
            border
            p-5
            sm:p-6
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <LuBot
                  size={18}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--primary)",
                  }}
                />

                <h2
                  className="
                    text-sm
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  AI-assisted planning
                </h2>
              </div>

              <p
                className="
                  mt-1.5
                  text-sm
                  leading-5
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Generate land analysis,
                planning recommendations,
                conceptual layouts and
                technical outputs from your
                project requirements.
              </p>
            </div>

            <Link
              href="/planner"
              className="
                inline-flex
                shrink-0
                items-center
                gap-2
                text-sm
                font-semibold
              "
              style={{
                color:
                  "var(--primary)",
              }}
            >
              Open AI Analysis

              <LuArrowRight
                size={15}
                strokeWidth={2}
              />
            </Link>
          </div>
        </section>

      </div>
    </AppLayout>
    </ProtectedRoute>
  );
}