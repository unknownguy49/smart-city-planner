"use client";

import { LuBot } from "react-icons/lu";

import AppLayout from "../../components/layout/AppLayout";
import AgentDashboard from "../../components/agents/AgentDashboard";
import { useProjectStore } from "../../store/projectStore";
import ProjectInfoCard from "../../components/dashboard/ProjectInfoCard";

export default function PlannerPage() {
  const projectId =
    useProjectStore(
      (state) => state.projectId
    );

  return (
    <AppLayout>
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
        <section
          className="relative min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-6 lg:p-7"
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex min-w-0 flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2.5 sm:mb-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor:
                      "var(--primary-soft)",
                    color:
                      "var(--primary)",
                  }}
                >
                  <LuBot
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <span
                  className="text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{
                    color:
                      "var(--primary)",
                  }}
                >
                  AI Planning Workspace
                </span>
              </div>

              <h1
                className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                AI Smart City Planner
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm leading-6 sm:mt-3 sm:text-base"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Analyze your project through
                multiple planning agents covering
                architecture, civil engineering,
                sustainability, municipal
                regulations and citizen
                considerations.
              </p>
            </div>

            <div
              className="hidden shrink-0 rounded-xl border px-4 py-3 lg:block"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
                borderColor:
                  "var(--border)",
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Analysis Engine
              </p>

              <p
                className="mt-1 text-sm font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Multi-Agent Planning
              </p>
            </div>
          </div>
        </section>

        <ProjectInfoCard />

        <AgentDashboard
          key={
            projectId !== null &&
            projectId !== undefined
              ? String(projectId)
              : "no-project"
          }
        />
      </div>
    </AppLayout>
  );
}