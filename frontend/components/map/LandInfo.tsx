"use client";

import {
  LuCheck,
  LuCircleAlert,
  LuFileJson,
  LuMapPin,
  LuRuler,
} from "react-icons/lu";

import { usePolygonStore } from "../../store/polygonStore";

export default function LandInfo() {
  const {
    coordinates,
    area,
    geoJson,
  } = usePolygonStore();

  const areaInAcres =
    area / 4046.85642;

  const areaInSqMeters = area;

  const selected = Boolean(geoJson);

  return (
    <section
      className="
        overflow-hidden
        rounded-xl
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
          flex
          items-center
          gap-3
          border-b
          px-5
          py-4
        "
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
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
            size={17}
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
            Land Information
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
            Current site selection details
          </p>
        </div>
      </div>

      <div className="p-5">

        <div className="grid grid-cols-2 gap-3">

          <InfoItem
            icon={selected ? LuCheck : LuCircleAlert}
            label="Polygon Status"
            value={
              selected
                ? "Selected"
                : "Not selected"
            }
            status={selected}
          />

          <InfoItem
            icon={LuRuler}
            label="Vertices"
            value={String(
              coordinates.length
            )}
          />

          <InfoItem
            icon={LuRuler}
            label="Area"
            value={`${areaInSqMeters.toFixed(
              2
            )} m²`}
          />

          <InfoItem
            icon={LuRuler}
            label="Acres"
            value={`${areaInAcres.toFixed(
              2
            )} ac`}
          />

        </div>

        {geoJson && (
          <div className="mt-4">

            <div className="mb-2 flex items-center gap-2">
              <LuFileJson
                size={15}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--text-muted)",
                }}
              />

              <span
                className="
                  text-xs
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                GeoJSON Preview
              </span>
            </div>

            <pre
              className="
                max-h-52
                overflow-auto
                rounded-lg
                border
                p-3
                text-[11px]
                leading-5
              "
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
                borderColor:
                  "var(--border)",
                color:
                  "var(--text-secondary)",
              }}
            >
              {JSON.stringify(
                geoJson,
                null,
                2
              )}
            </pre>

          </div>
        )}

      </div>
    </section>
  );
}

interface InfoItemProps {
    icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
  label: string;
  value: string;
  status?: boolean;
}

function InfoItem({
  icon: Icon,
  label,
  value,
  status,
}: InfoItemProps) {
  return (
    <div
      className="
        rounded-lg
        border
        p-3
      "
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          strokeWidth={1.8}
          style={{
            color:
              status === true
                ? "var(--success)"
                : "var(--text-muted)",
          }}
        />

        <span
          className="
            truncate
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
          {label}
        </span>
      </div>

      <p
        className="
          mt-2
          truncate
          text-sm
          font-semibold
        "
        style={{
          color:
            status === true
              ? "var(--success)"
              : "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}