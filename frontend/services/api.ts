
import axios from "axios";
import { auth } from "@/lib/firebase";

import {
  getCurrentProjectSnapshot,
  saveProjectSnapshot,
  type ReportProject,
} from "../lib/reportStore";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Attach the current Firebase user's ID token to API requests.
 *
 * If Firebase has not restored a signed-in user, this interceptor
 * leaves the request unauthenticated. Protected backend endpoints
 * should reject it rather than bypass authentication.
 */
api.interceptors.request.use(
  async (config) => {
    const requestPath = (config.url ?? "").split("?")[0];
    const isPublicHealthCheck = requestPath === "/health";

    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      if (isPublicHealthCheck) return config;
      throw new Error("Your session has expired. Please sign in again.");
    }

    const token = await user.getIdToken();
    config.headers.set("Authorization", `Bearer ${token}`);

    return config;
  },
  (error) => Promise.reject(error)
);

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function projectFromCurrentStore(): ReportProject | null {
  const current = getCurrentProjectSnapshot();

  if (!current?.projectId && !current?.id) {
    return null;
  }

  return {
    id: current.projectId ?? current.id ?? "",
    name: current.projectName ?? "Project",
    building_type: current.buildingType ?? "",
    commercial_subtype: current.commercialSubtype ?? null,
    city: current.city ?? "",
    state: current.state ?? "",

    area:
      typeof current.area === "number"
        ? current.area
        : null,

    budget:
      typeof current.budget === "number"
        ? current.budget
        : null,

    description: current.description ?? null,
  };
}

function captureProjectResponse(data: unknown) {
  const project = asRecord(data);

  const idCandidate =
    project.id ?? project.projectId;

  if (
    typeof idCandidate !== "string" &&
    typeof idCandidate !== "number"
  ) {
    return;
  }

  const buildingType =
    project.building_type ?? project.buildingType;

  const commercialSubtype =
    project.commercial_subtype ??
    project.commercialSubtype;

  const city = project.city;
  const state = project.state;
  const area = project.area;
  const budget = project.budget;
  const description = project.description;

  saveProjectSnapshot({
    id: idCandidate,

    name: String(
      project.name ??
        project.project_name ??
        "Project"
    ),

    building_type:
      typeof buildingType === "string"
        ? buildingType
        : "",

    commercial_subtype:
      typeof commercialSubtype === "string"
        ? commercialSubtype
        : null,

    city:
      typeof city === "string" ? city : "",

    state:
      typeof state === "string" ? state : "",

    area:
      typeof area === "number" ? area : null,

    budget:
      typeof budget === "number" ? budget : null,

    description:
      typeof description === "string"
        ? description
        : null,
  });
}

/**
 * Preserve project snapshot capture.
 *
 * Scenario, architecture, and analysis artifacts are not
 * persisted through this response interceptor.
 */
api.interceptors.response.use(
  (response) => {
    try {
      if (typeof window === "undefined") {
        return response;
      }

      const url = response.config.url ?? "";

      const method = (
        response.config.method ?? ""
      ).toLowerCase();

      const payload = asRecord(
        response.config.data
      );

      // Capture newly created projects.
      if (
        method === "post" &&
        (url === "/projects/" || url === "/projects")
      ) {
        captureProjectResponse(response.data);
      }

      // Update the local project snapshot after PUT /projects/{id}.
      if (
        method === "put" &&
        /^\/projects\/[^/]+\/?$/.test(url)
      ) {
        const id = url
          .split("/")
          .filter(Boolean)
          .pop();

        if (id) {
          const current = projectFromCurrentStore();

          saveProjectSnapshot({
            id,

            name: current?.name ?? "Project",

            building_type:
              current?.building_type ?? "",

            commercial_subtype:
              current?.commercial_subtype ?? null,

            city: current?.city ?? "",
            state: current?.state ?? "",

            area:
              typeof payload.area === "number"
                ? payload.area
                : current?.area ?? null,

            budget: current?.budget ?? null,

            description:
              current?.description ?? null,
          });
        }
      }
    } catch (error) {
      console.error(
        "Project snapshot capture failed:",
        error
      );
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
