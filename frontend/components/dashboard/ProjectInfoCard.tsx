"use client";

import {
  LuBuilding2,
  LuCircleDollarSign,
  LuFileText,
  LuMap,
  LuRuler,
} from "react-icons/lu";

import { useProjectStore } from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";

export default function ProjectInfoCard() {
  const {
    projectId,
    projectName,
    buildingType,
    commercialSubtype,
    budget,
  } = useProjectStore();

  const area = usePolygonStore(
    (state) => state.area
  );

  const projectFields = [
    {
      label: "Project Name",
      value:
        projectName || "Not Selected",
      icon: LuFileText,
    },
    {
      label: "Building Type",
      value:
        buildingType || "Not Selected",
      icon: LuBuilding2,
    },
    ...(buildingType?.toLowerCase() ===
    "commercial"
      ? [
          {
            label: "Commercial Subtype",
            value:
              commercialSubtype ||
              "Not Selected",
            icon: LuBuilding2,
          },
        ]
      : []),
    {
      label: "Budget",
      value: `₹${Number(
        budget || 0
      ).toLocaleString()}`,
      icon: LuCircleDollarSign,
    },
    {
      label: "Land Area",
      value: `${Number(
        area || 0
      ).toFixed(2)} m²`,
      icon: LuRuler,
    },
  ];

  return (
    <section
      className="rounded-xl border"
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
        boxShadow:
          "var(--shadow-sm)",
      }}
    >
      <div
        className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5 lg:p-6"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            <LuMap
              size={20}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              Project Context
            </p>

            <h2
              className="mt-0.5 text-lg font-semibold tracking-tight sm:text-xl"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Current Project
            </h2>
          </div>
        </div>

        {projectId && (
          <span
            className="inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              borderColor:
                "var(--primary-border)",
              color:
                "var(--primary)",
            }}
          >
            ID #{projectId}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {projectFields.map(
          (field, index) => {
            const Icon = field.icon;

            return (
              <div
                key={field.label}
                className={`min-w-0 p-3.5 sm:p-5 ${
                  index > 0
                    ? "border-t sm:border-t-0 sm:border-l"
                    : ""
                }`}
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={15}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    {field.label}
                  </p>
                </div>

                <p
                  className="mt-2 break-words text-sm font-semibold sm:text-base"
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  {field.value}
                </p>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}