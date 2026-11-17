
"use client";

import {
  LuCheck,
  LuSave,
} from "react-icons/lu";

import api from "../../services/api";
import axios from "axios";

import {
  usePolygonStore,
} from "../../store/polygonStore";

import {
  useProjectStore,
} from "../../store/projectStore";

import {
  saveProjectSnapshot,
  saveReportArtifact,
} from "../../lib/reportStore";

export default function SaveLandButton() {
  const {
    area,
    geoJson,
  } = usePolygonStore();

  const {
    projectId,
    projectName,
    coordinates,
  } = useProjectStore();

  async function saveLand() {
    if (!geoJson) {
      alert("Draw a polygon first.");
      return;
    }

    if (!projectId) {
      alert("No project selected.");
      return;
    }

    if (!coordinates || coordinates.length < 3) {
      alert("Invalid project coordinates.");
      return;
    }

    try {
      console.log("========== SAVING LAND ==========");
      console.log("Project ID:", projectId);
      console.log("Project Name:", projectName);
      console.log("Area:", area);
      console.log("Coordinates:", coordinates);
      console.log("GeoJSON:", geoJson);

      // Step 1: Save land
      const landResponse = await api.post(
        "/land/save",
        {
          project_id: Number(projectId),
          project_name: projectName,
          area: area,
          geojson: geoJson,
        }
      );

      console.log(
        "Land save response:",
        landResponse.data
      );

      // Step 2: Update project
      console.log(
        "Sending PUT /projects/" + projectId + "..."
      );

      const projectResponse = await api.put(
        `/projects/${projectId}`,
        {
          area: area,
          coordinates: coordinates,
        }
      );

      console.log(
        "Project update response:",
        projectResponse.data
      );

      // Step 3: Save local snapshots
      saveProjectSnapshot({
        id: projectId,
        name: projectName || "Project",
        area,
      });

      saveReportArtifact(
        {
          id: projectId,
          name: projectName || "Project",
          area,
        },
        "lands",
        {
          area,
          coordinates,
          geojson: geoJson,
        }
      );

      console.log("========== LAND SAVED SUCCESSFULLY ==========");

      alert(
        landResponse.data?.message ||
          "Land and project coordinates saved successfully."
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("========== SAVE LAND API ERROR ==========");
        console.error("Status:", error.response?.status);
        console.error("URL:", error.config?.url);
        console.error("Method:", error.config?.method);
        console.error(
          "Validation/Error Response:",
          error.response?.data
        );
        console.error(
          "Request Payload:",
          error.config?.data
        );
        console.error("Error Message:", error.message);
        console.error("==========================================");

        alert(
          `Failed to save land (${error.response?.status ?? "Network Error"}). Check the browser console for details.`
        );
      } else {
        console.error("Failed to save land:", error);
        alert("Failed to save land. Check the browser console.");
      }
    }
  }

  const ready =
    Boolean(geoJson) &&
    Boolean(projectId) &&
    Boolean(coordinates) &&
    coordinates.length >= 3;

  return (
    <section
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: ready
              ? "var(--success-soft)"
              : "var(--surface-secondary)",
            color: ready
              ? "var(--success)"
              : "var(--text-muted)",
          }}
        >
          {ready ? (
            <LuCheck size={17} strokeWidth={2} />
          ) : (
            <LuSave size={17} strokeWidth={1.8} />
          )}
        </div>

        <div>
          <p
            className="text-sm font-semibold"
            style={{
              color: "var(--text-primary)",
            }}
          >
            Save Selected Land
          </p>

          <p
            className="mt-0.5 text-xs leading-5"
            style={{
              color: "var(--text-muted)",
            }}
          >
            {ready
              ? "Your site boundary is ready to save."
              : "Draw a valid site boundary before saving."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={saveLand}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:opacity-90"
        style={{
          backgroundColor: ready
            ? "var(--success)"
            : "var(--surface-tertiary)",
          color: ready
            ? "#ffffff"
            : "var(--text-disabled)",
        }}
      >
        <LuSave size={16} strokeWidth={1.8} />
        Save Land
      </button>
    </section>
  );
}
