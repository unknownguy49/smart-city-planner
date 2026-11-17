"use client";

import {
  LuBus,
  LuBuilding2,
  LuGraduationCap,
  LuMap,
  LuMedal,
  LuShield,
  LuTrees,
} from "react-icons/lu";

const legendItems = [
  {
    label: "Hospital",
    color: "#ef4444",
    icon: LuMedal,
  },
  {
    label: "School",
    color: "#3b82f6",
    icon: LuBuilding2,
  },
  {
    label: "College",
    color: "#1e3a8a",
    icon: LuGraduationCap,
  },
  {
    label: "Park",
    color: "#22c55e",
    icon: LuTrees,
  },
  {
    label: "Bus Stop",
    color: "#eab308",
    icon: LuBus,
  },
  {
    label: "Police Station",
    color: "#9333ea",
    icon: LuShield,
  },
  {
    label: "Fire Station",
    color: "#f97316",
    icon: LuBuilding2,
  },
];

export default function MapLegend() {
  return (
    <section
      className="
        rounded-xl
        border
        p-5
      "
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
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
          <LuMap
            size={16}
            strokeWidth={1.8}
          />
        </div>

        <div>
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
            Map Legend
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
            Nearby infrastructure markers
          </p>
        </div>
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-2
          gap-2
        "
      >
        {legendItems.map(
          (item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  px-2.5
                  py-2
                "
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  borderColor:
                    "var(--border)",
                }}
              >
                <span
                  className="
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-md
                  "
                  style={{
                    backgroundColor:
                      item.color,
                    color:
                      "#ffffff",
                  }}
                >
                  <Icon
                    size={13}
                    strokeWidth={1.8}
                  />
                </span>

                <span
                  className="
                    truncate
                    text-[11px]
                    font-medium
                  "
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}