"use client";

import { useAuth } from "@/contexts/AuthContext";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  LuBuilding2,
  LuCircleDollarSign,
  LuFileText,
  LuMapPin,
  LuRuler,
} from "react-icons/lu";

import { useProjectStore } from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";
import api from "../../services/api";

const COMMERCIAL_SUBTYPES = [
  "Convenient/Neighbourhood shopping centre",
  "Sector shopping",
  "Sub-district centre",
  "Central business district",
  "Hotels",
  "Banks",
  "Cinema/multiplex",
  "Informal/bazaar market",
  "Warehousing/godowns",
];

interface SavedProject {
  id: number | string;
  name: string;
  building_type: string;
  commercial_subtype?: string | null;
  city?: string;
  state?: string;
  area?: number;
  budget?: number;
  description?: string;
}

interface ProjectFormState {
  name: string;
  buildingType: string;
  commercialSubtype: string;
  city: string;
  state: string;
  area: string;
  budget: string;
  description: string;
}

export default function ProjectForm() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();

  const { setProject } =
    useProjectStore();

  const clearPolygon =
    usePolygonStore(
      (state) => state.clearPolygon
    );

  const [project, setProjectForm] =
    useState<ProjectFormState>({
      name: "",
      buildingType: "",
      commercialSubtype: "",
      city: "",
      state: "",
      area: "",
      budget: "",
      description: "",
    });

  const [loading, setLoading] =
    useState(false);

  function updateProject(
    field: keyof ProjectFormState,
    value: string
  ) {
    setProjectForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createProject() {
    if (
      !project.name ||
      !project.buildingType ||
      !project.city ||
      !project.state
    ) {
      alert(
        "Please fill all required fields."
      );

      return;
    }

    if (
      project.buildingType.toLowerCase() ===
        "commercial" &&
      !project.commercialSubtype
    ) {
      alert(
        "Please select a commercial subtype."
      );

      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: project.name,
        building_type:
          project.buildingType,
        commercial_subtype:
          project.buildingType.toLowerCase() ===
          "commercial"
            ? project.commercialSubtype
            : null,
        city: project.city,
        state: project.state,
        area: Number(project.area),
        budget: Number(project.budget),
        description:
          project.description,
      };

      console.log(
        "Sending Project:"
      );

      console.log(payload);

      if (authLoading) {
        throw new Error(
          "Authentication is still loading. Please try again."
        );
      }

      if (!user) {
        alert("Your session is missing. Please sign in again.");
        router.push("/login");
        return;
      }

      const response = await api.post<SavedProject>(
        "/projects/",
        payload,
      );

      console.log(
        "Backend Response:"
      );

      console.log(response.data);

      const savedProject =
        response.data;

      clearPolygon();

      setProject({
        id: savedProject.id,

        name:
          savedProject.name,

        building_type:
          savedProject.building_type,

        commercial_subtype:
          savedProject.commercial_subtype ??
          null,

        city:
          savedProject.city ?? "",

        state:
          savedProject.state ?? "",

        area:
          savedProject.area ?? 0,

        budget:
          savedProject.budget ?? 0,

        description:
          savedProject.description ?? "",

        coordinates: [],

        searchLocation: null,

        design: null,

        designProjectId: null,
      });

      console.log(
        "Project saved to Zustand:"
      );

      console.log({
        id: savedProject.id,

        name:
          savedProject.name,

        building_type:
          savedProject.building_type,

        commercial_subtype:
          savedProject.commercial_subtype ??
          null,

        city:
          savedProject.city ?? "",

        state:
          savedProject.state ?? "",

        area:
          savedProject.area ?? 0,

        budget:
          savedProject.budget ?? 0,

        description:
          savedProject.description ?? "",

        coordinates: [],
      });

      alert(
        "Project Created Successfully!"
      );

      router.push("/map");
    } catch (error: unknown) {
      console.error(error);

      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError =
          error as {
            response?: {
              status?: number;
              data?: unknown;
            };
          };

        console.log(
          "Status:",
          axiosError.response?.status
        );

        console.log(
          "Response:",
          axiosError.response?.data
        );

        alert(
          JSON.stringify(
            axiosError.response?.data
          )
        );
      } else if (
        error instanceof Error
      ) {
        console.log(
          error.message
        );

        alert(error.message);
      } else {
        alert(
          "An unexpected error occurred."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const isCommercial =
    project.buildingType.toLowerCase() ===
    "commercial";

  return (
    <div
      className="
        overflow-hidden
        rounded-2xl
        border
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
          border-b
          px-6
          py-5
          sm:px-7
        "
        style={{
          borderColor:
            "var(--border)",
          backgroundColor:
            "var(--surface-secondary)",
        }}
      >
        <div className="flex items-center gap-3">
          <LuFileText
            size={19}
            strokeWidth={1.8}
            style={{
              color:
                "var(--primary)",
            }}
          />

          <div>
            <h2
              className="
                text-base
                font-semibold
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Project Information
            </h2>

            <p
              className="
                mt-0.5
                text-xs
              "
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Fields marked with * are required.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 p-6 sm:p-7">
        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
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
                  size={16}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Development Details
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                  "
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Define what you are planning
                  to develop.
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
            "
          >
            <Field
              label="Project Name"
              required
              placeholder="AI Smart Hospital"
              value={project.name}
              onChange={(value) =>
                updateProject(
                  "name",
                  value
                )
              }
            />

            <Field
              label="Building Type"
              required
              placeholder="Hospital"
              value={project.buildingType}
              onChange={(value) =>
                setProjectForm(
                  (current) => ({
                    ...current,
                    buildingType:
                      value,
                    commercialSubtype:
                      "",
                  })
                )
              }
            />
          </div>

          {isCommercial && (
            <div className="mt-5">
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Commercial Subtype

                <span
                  className="ml-1"
                  style={{
                    color:
                      "var(--danger)",
                  }}
                >
                  *
                </span>
              </label>

              <select
                value={
                  project.commercialSubtype
                }
                onChange={(event) =>
                  updateProject(
                    "commercialSubtype",
                    event.target.value
                  )
                }
                className="
                  h-11
                  w-full
                  rounded-lg
                  border
                  px-3.5
                  text-sm
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-2
                  focus:ring-[var(--focus-ring)]
                "
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-primary)",
                }}
              >
                <option value="">
                  Select commercial subtype
                </option>

                {COMMERCIAL_SUBTYPES.map(
                  (subtype) => (
                    <option
                      key={subtype}
                      value={subtype}
                    >
                      {subtype}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
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
                <LuMapPin
                  size={16}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Project Location
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                  "
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Specify the general location
                  of the development.
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
            "
          >
            <Field
              label="City"
              required
              placeholder="Hyderabad"
              value={project.city}
              onChange={(value) =>
                updateProject(
                  "city",
                  value
                )
              }
            />

            <Field
              label="State"
              required
              placeholder="Telangana"
              value={project.state}
              onChange={(value) =>
                updateProject(
                  "state",
                  value
                )
              }
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
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
                <LuRuler
                  size={16}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Site Parameters
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                  "
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Provide the approximate site
                  size and available budget.
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
            "
          >
            <Field
              label="Land Area (sq.m)"
              placeholder="12000"
              type="number"
              value={project.area}
              onChange={(value) =>
                updateProject(
                  "area",
                  value
                )
              }
            />

            <div>
              <label
                className="
                  mb-2
                  flex
                  items-center
                  gap-2
                  text-sm
                  font-medium
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                <LuCircleDollarSign
                  size={15}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                />

                Budget (₹)
              </label>

              <input
                type="number"
                placeholder="500000000"
                value={project.budget}
                onChange={(event) =>
                  updateProject(
                    "budget",
                    event.target.value
                  )
                }
                className="
                  h-11
                  w-full
                  rounded-lg
                  border
                  px-3.5
                  text-sm
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-2
                  focus:ring-[var(--focus-ring)]
                "
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
        </section>

        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex
                  h-8
                  w-8
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
                <LuFileText
                  size={16}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Planning Description
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                  "
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Add any additional requirements
                  or planning context.
                </p>
              </div>
            </div>
          </div>

          <textarea
            placeholder="Describe the project requirements, intended use, planning constraints or other relevant details..."
            value={project.description}
            onChange={(event) =>
              updateProject(
                "description",
                event.target.value
              )
            }
            className="
              min-h-36
              w-full
              resize-y
              rounded-lg
              border
              px-3.5
              py-3
              text-sm
              leading-6
              outline-none
              transition
              focus:border-[var(--primary)]
              focus:ring-2
              focus:ring-[var(--focus-ring)]
            "
            style={{
              backgroundColor:
                "var(--surface-secondary)",
              borderColor:
                "var(--border)",
              color:
                "var(--text-primary)",
            }}
          />
        </section>
      </div>

      <div
        className="
          flex
          flex-col-reverse
          gap-3
          border-t
          px-6
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-7
        "
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <p
          className="
            text-xs
            leading-5
          "
          style={{
            color:
              "var(--text-muted)",
          }}
        >
          Your project will be saved before
          continuing to site planning.
        </p>

        <button
          type="button"
          onClick={createProject}
          disabled={loading}
          className="
            inline-flex
            h-11
            items-center
            justify-center
            rounded-lg
            px-5
            text-sm
            font-semibold
            transition
            hover:opacity-90
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
          style={{
            backgroundColor:
              "var(--primary)",
            color:
              "var(--primary-foreground)",
          }}
        >
          {loading
            ? "Creating..."
            : "Continue to Site Planning"}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  type?: string;
  onChange: (
    value: string
  ) => void;
}

function Field({
  label,
  required = false,
  placeholder,
  value,
  type = "text",
  onChange,
}: FieldProps) {
  return (
    <div>
      <label
        className="
          mb-2
          block
          text-sm
          font-medium
        "
        style={{
          color:
            "var(--text-primary)",
        }}
      >
        {label}

        {required && (
          <span
            className="ml-1"
            style={{
              color:
                "var(--danger)",
            }}
          >
            *
          </span>
        )}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          h-11
          w-full
          rounded-lg
          border
          px-3.5
          text-sm
          outline-none
          transition
          focus:border-[var(--primary)]
          focus:ring-2
          focus:ring-[var(--focus-ring)]
        "
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
  );
}