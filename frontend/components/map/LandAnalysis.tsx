"use client";

import * as turf from "@turf/turf";
import {
  LuChartArea,
  LuCircleAlert,
  LuMapPin,
  LuRuler,
} from "react-icons/lu";

import { usePolygonStore } from "../../store/polygonStore";

export default function LandAnalysis() {
  const coordinates = usePolygonStore(
    (state) => state.coordinates
  );

  if (coordinates.length < 3) {
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
        <PanelHeader />

        <div
          className="
            mt-4
            flex
            items-start
            gap-3
            rounded-lg
            border
            p-4
          "
          style={{
            backgroundColor:
              "var(--warning-soft)",
            borderColor:
              "var(--warning-border)",
          }}
        >
          <LuCircleAlert
            size={17}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
            style={{
              color:
                "var(--warning)",
            }}
          />

          <p
            className="
              text-sm
              leading-5
            "
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            Draw a land polygon on the map
            to calculate the selected site's
            area and measurements.
          </p>
        </div>
      </section>
    );
  }

  const polygonCoordinates =
    coordinates.map(
      (coordinate) =>
        [
          coordinate.lng,
          coordinate.lat,
        ] as [number, number]
    );

  const firstPoint =
    polygonCoordinates[0];

  const lastPoint =
    polygonCoordinates[
      polygonCoordinates.length - 1
    ];

  const isClosed =
    firstPoint[0] === lastPoint[0] &&
    firstPoint[1] === lastPoint[1];

  if (!isClosed) {
    polygonCoordinates.push(
      firstPoint
    );
  }

  const polygon = turf.polygon([
    polygonCoordinates,
  ]);

  const calculatedArea =
    turf.area(polygon);

  const areaInHectares =
    calculatedArea / 10000;

  const areaInAcres =
    calculatedArea / 4046.8564224;

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
        <PanelHeader />
      </div>

      <div className="p-5">

        <div
          className="
            rounded-lg
            border
            p-4
          "
          style={{
            backgroundColor:
              "var(--primary-soft)",
            borderColor:
              "var(--primary-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <LuChartArea
              size={16}
              strokeWidth={1.8}
              style={{
                color:
                  "var(--primary)",
              }}
            />

            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.08em]
              "
              style={{
                color:
                  "var(--primary)",
              }}
            >
              Land Area
            </p>
          </div>

          <p
            className="
              mt-2
              text-2xl
              font-bold
              tracking-tight
            "
            style={{
              color:
                "var(--text-primary)",
            }}
          >
            {calculatedArea.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 2,
              }
            )}{" "}
            m²
          </p>
        </div>

        <div className="mt-4 divide-y">
          <AnalysisRow
            label="Hectares"
            value={`${areaInHectares.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 2,
              }
            )} ha`}
          />

          <AnalysisRow
            label="Acres"
            value={`${areaInAcres.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 2,
              }
            )} acres`}
          />

          <AnalysisRow
            label="Polygon Points"
            value={String(
              coordinates.length
            )}
          />
        </div>

      </div>
    </section>
  );
}

function PanelHeader() {
  return (
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
        <LuChartArea
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
          Land Analysis
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
          Calculated site measurements
        </p>
      </div>
    </div>
  );
}

function AnalysisRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
        py-3
      "
    >
      <span
        className="
          flex
          items-center
          gap-2
          text-sm
          font-medium
        "
        style={{
          color:
            "var(--text-secondary)",
        }}
      >
        <LuRuler
          size={14}
          strokeWidth={1.7}
          style={{
            color:
              "var(--text-muted)",
          }}
        />

        {label}
      </span>

      <span
        className="
          text-sm
          font-semibold
        "
        style={{
          color:
            "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}