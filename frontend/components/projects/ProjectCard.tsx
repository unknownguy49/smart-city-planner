"use client";

import api from "../../services/api";

import { useRouter } from "next/navigation";

import {
  LuBuilding2,
  LuCircleDollarSign,
  LuMapPin,
  LuRuler,
  LuTrash2,
} from "react-icons/lu";

import { useProjectStore } from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";

interface Coordinate {
  lat: number;
  lng: number;
}

interface Project {
  id: number | string;
  name: string;
  building_type: string;
  commercial_subtype?: string | null;
  budget?: number | null;
  city?: string | null;
  state?: string | null;
  area?: number | null;
  description?: string | null;
  coordinates?: Coordinate[] | null;
}

interface Props {
  project: Project;
  refresh: () => void;
}

export default function ProjectCard({
  project,
  refresh,
}: Props) {
  const router = useRouter();

  const setProject =
    useProjectStore(
      (state) => state.setProject
    );

  const projectId =
    useProjectStore(
      (state) => state.projectId
    );

  const clearProject =
    useProjectStore(
      (state) => state.clearProject
    );

  const clearPolygon =
    usePolygonStore(
      (state) => state.clearPolygon
    );

  async function deleteProject() {
    const confirmDelete =
      confirm(
        "Are you sure you want to delete this project?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await api.delete(
        `/projects/${project.id}`
      );

      if (
        projectId !== null &&
        projectId !== undefined &&
        String(projectId) ===
          String(project.id)
      ) {
        clearProject();
        clearPolygon();
      }

      alert(
        "Project deleted successfully."
      );

      refresh();
    } catch (error) {
      console.error(
        "Failed to delete project:",
        error
      );

      alert(
        "Failed to delete project."
      );
    }
  }

  function openProject() {
    setProject({
      id: project.id,

      name:
        project.name ?? "",

      building_type:
        project.building_type ?? "",

      commercial_subtype:
        project.commercial_subtype ??
        null,

      budget:
        project.budget ?? 0,

      city:
        project.city ?? "",

      state:
        project.state ?? "",

      area:
        project.area ?? 0,

      description:
        project.description ?? "",

      coordinates:
        project.coordinates ?? [],

      searchLocation: null,
    });

    console.log(
      "================================"
    );

    console.log(
      "OPENED PROJECT"
    );

    console.log(
      "================================"
    );

    console.log(project);

    console.log(
      "SAVED COORDINATES:",
      project.coordinates
    );

    router.push("/map");
  }

  const location = [
    project.city,
    project.state,
  ]
    .filter(Boolean)
    .join(", ");

  const formattedBudget =
    Number(
      project.budget ?? 0
    ).toLocaleString();

  const formattedArea =
    project.area != null
      ? Number(
          project.area
        ).toLocaleString()
      : null;

  return (
    <article
      className="
        group
        flex
        min-h-[390px]
        flex-col
        overflow-hidden
        rounded-xl
        border
        transition-all
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
      <div
        className="
          flex
          items-start
          justify-between
          gap-4
          border-b
          px-5
          py-5
        "
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="min-w-0">
          <div
            className="
              mb-3
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
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <h2
            className="
              line-clamp-2
              text-lg
              font-semibold
              leading-6
              tracking-tight
            "
            style={{
              color:
                "var(--text-primary)",
            }}
          >
            {project.name}
          </h2>

          <p
            className="
              mt-1
              text-xs
              font-medium
            "
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            Project #{project.id}
          </p>
        </div>

        <span
          className="
            shrink-0
            rounded-full
            px-2.5
            py-1
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.08em]
          "
          style={{
            backgroundColor:
              "var(--primary-soft)",
            color:
              "var(--primary)",
          }}
        >
          Active
        </span>
      </div>

      <div className="flex-1 px-5 py-5">
        <div
          className="
            rounded-lg
            border
            p-3.5
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            <LuBuilding2
              size={17}
              strokeWidth={1.7}
              style={{
                color:
                  "var(--primary)",
              }}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Development Type
              </p>

              <p
                className="
                  mt-1
                  truncate
                  text-sm
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                {project.building_type ||
                  "Not specified"}
              </p>

              {project.commercial_subtype && (
                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                  "
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  {project.commercial_subtype}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div
            className="
              rounded-lg
              border
              p-3
            "
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <LuMapPin
                size={15}
                strokeWidth={1.7}
                style={{
                  color:
                    "var(--text-muted)",
                }}
              />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Location
              </span>
            </div>

            <p
              className="
                mt-2
                truncate
                text-xs
                font-medium
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
              title={
                location ||
                "Not specified"
              }
            >
              {location ||
                "Not specified"}
            </p>
          </div>

          <div
            className="
              rounded-lg
              border
              p-3
            "
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <LuRuler
                size={15}
                strokeWidth={1.7}
                style={{
                  color:
                    "var(--text-muted)",
                }}
              />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Land Area
              </span>
            </div>

            <p
              className="
                mt-2
                truncate
                text-xs
                font-medium
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {formattedArea
                ? `${formattedArea} sqm`
                : "Not specified"}
            </p>
          </div>
        </div>

        <div
          className="
            mt-3
            flex
            items-center
            gap-3
            rounded-lg
            border
            px-3
            py-3
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
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
            "
            style={{
              backgroundColor:
                "var(--success-soft)",
              color:
                "var(--success)",
            }}
          >
            <LuCircleDollarSign
              size={16}
              strokeWidth={1.7}
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.08em]
              "
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Project Budget
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-sm
                font-semibold
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              ₹{formattedBudget}
            </p>
          </div>
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-[1fr_auto]
          gap-2
          border-t
          px-5
          py-4
        "
        style={{
          borderColor:
            "var(--border)",
          backgroundColor:
            "var(--surface-secondary)",
        }}
      >
        <button
          type="button"
          onClick={openProject}
          className="
            inline-flex
            h-10
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
          <LuBuilding2
            size={16}
            strokeWidth={1.8}
          />

          Open Project
        </button>

        <button
          type="button"
          onClick={deleteProject}
          aria-label={`Delete ${project.name}`}
          title="Delete project"
          className="
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-lg
            border
            transition-colors
            hover:bg-[var(--danger-soft)]
          "
          style={{
            backgroundColor:
              "var(--surface)",
            borderColor:
              "var(--border)",
            color:
              "var(--danger)",
          }}
        >
          <LuTrash2
            size={17}
            strokeWidth={1.8}
          />
        </button>
      </div>
    </article>
  );
}