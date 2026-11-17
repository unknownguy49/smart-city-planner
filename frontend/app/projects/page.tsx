"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuFolder,
  LuMap,
  LuPlus,
  LuRefreshCw,
} from "react-icons/lu";

import api from "../../services/api";
import AppLayout from "../../components/layout/AppLayout";
import ProjectCard from "../../components/projects/ProjectCard";

interface Coordinate {
  lat: number;
  lng: number;
}


interface Project {
  id: number | string;
  created_at?: string | null;
  updated_at?: string | null;
  name: string;
  building_type: string;
  commercial_subtype?: string | null;
  city?: string;
  state?: string;
  area?: number;
  budget?: number;
  description?: string;
  coordinates?: Coordinate[] | null;
}


function sortProjectsNewestFirst(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const timeA = a.created_at
      ? Date.parse(a.created_at)
      : 0;

    const timeB = b.created_at
      ? Date.parse(b.created_at)
      : 0;

    const safeTimeA = Number.isFinite(timeA) ? timeA : 0;
    const safeTimeB = Number.isFinite(timeB) ? timeB : 0;

    if (safeTimeA !== safeTimeB) {
      return safeTimeB - safeTimeA;
    }

    return Number(b.id) - Number(a.id);
  });
}


export default function ProjectsPage() {
  const [projects, setProjects] =
    useState<Project[]>([]);

  async function loadProjects() {
    try {
      const response =
        await api.get<Project[]>(
          "/projects/"
        );

      setProjects(sortProjectsNewestFirst(response.data));
    } catch (error) {
      console.error(
        "Failed to load projects:",
        error
      );
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchProjects() {
      try {
        const response =
          await api.get<Project[]>(
            "/projects/"
          );

        if (active) {
          setProjects(sortProjectsNewestFirst(response.data));
        }
      } catch (error) {
        console.error(
          "Failed to load projects:",
          error
        );
      }
    }

    void fetchProjects();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout>
      <div className="space-y-7">

        <section
          className="
            flex
            flex-col
            gap-5
            rounded-2xl
            border
            p-6
            sm:p-7
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
          }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
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
                <LuFolder
                  size={20}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <p
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
                  Workspace
                </p>

                <h1
                  className="
                    mt-0.5
                    text-2xl
                    font-bold
                    tracking-tight
                    sm:text-3xl
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  My Projects
                </h1>
              </div>
            </div>

            <p
              className="
                mt-4
                max-w-2xl
                text-sm
                leading-6
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Manage your urban planning
              projects, review their
              requirements and continue
              site planning from where you
              left off.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                void loadProjects();
              }}
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-lg
                border
                px-3.5
                text-sm
                font-medium
                transition-colors
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
              <LuRefreshCw
                size={16}
                strokeWidth={1.8}
              />

              Refresh
            </button>

            <Link
              href="/projects/new"
              className="
                inline-flex
                h-10
                items-center
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
                size={17}
                strokeWidth={2}
              />

              New Project
            </Link>
          </div>
        </section>

        <section>
          <div
            className="
              mb-4
              flex
              items-end
              justify-between
              gap-4
            "
          >
            <div>
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
                Project Workspace
              </h2>

              <p
                className="mt-1 text-sm"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                {projects.length === 0
                  ? "No projects have been created yet."
                  : `${projects.length} ${
                      projects.length === 1
                        ? "project"
                        : "projects"
                    } in your workspace.`}
              </p>
            </div>

            {projects.length > 0 && (
              <div
                className="
                  hidden
                  items-center
                  gap-2
                  rounded-lg
                  border
                  px-3
                  py-1.5
                  sm:flex
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
                <LuFolder
                  size={14}
                  strokeWidth={1.8}
                />

                <span className="text-xs font-medium">
                  {projects.length} total
                </span>
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <div
              className="
                flex
                min-h-[360px]
                flex-col
                items-center
                justify-center
                rounded-2xl
                border
                border-dashed
                px-6
                py-12
                text-center
              "
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border-strong)",
              }}
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-xl
                "
                style={{
                  backgroundColor:
                    "var(--primary-soft)",
                  color:
                    "var(--primary)",
                }}
              >
                <LuFolder
                  size={25}
                  strokeWidth={1.6}
                />
              </div>

              <h3
                className="
                  mt-5
                  text-lg
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                No projects yet
              </h3>

              <p
                className="
                  mt-2
                  max-w-md
                  text-sm
                  leading-6
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Create your first planning
                project to define the site,
                development requirements,
                budget and land parameters.
              </p>

              <Link
                href="/projects/new"
                className="
                  mt-6
                  inline-flex
                  h-10
                  items-center
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

                Create Your First Project
              </Link>
            </div>
          ) : (
            <div
              className="
                grid
                grid-cols-1
                gap-4
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {projects.map(
                (project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    refresh={loadProjects}
                  />
                )
              )}
            </div>
          )}
        </section>

        <section
          className="
            flex
            flex-col
            gap-4
            rounded-xl
            border
            p-5
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:p-6
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
              "
              style={{
                backgroundColor:
                  "var(--surface)",
                color:
                  "var(--primary)",
                border:
                  "1px solid var(--border)",
              }}
            >
              <LuMap
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p
                className="
                  text-sm
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Continue your planning workflow
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  leading-5
                "
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Open a project to continue
                with site selection and
                spatial planning.
              </p>
            </div>
          </div>

          <Link
            href="/map"
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
            Open Site Planner

            <LuMap
              size={15}
              strokeWidth={1.8}
            />
          </Link>
        </section>

      </div>
    </AppLayout>
  );
}