
export type ReportArtifactType =
  | "agents"
  | "lands"
  | "architecture"
  | "scenario";

export interface ReportProject {
  id: number | string;
  name: string;
  building_type?: string | null;
  commercial_subtype?: string | null;
  city?: string | null;
  state?: string | null;
  area?: number | null;
  budget?: number | null;
  description?: string | null;
}

export interface ReportArtifact {
  type: ReportArtifactType;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface ProjectReportRecord {
  project: ReportProject;
  artifacts: Partial<
    Record<ReportArtifactType, ReportArtifact>
  >;
}

type ReportStore = Record<string, ProjectReportRecord>;

export interface CurrentProjectSnapshot {
  id?: number | string | null;
  projectId?: number | string | null;
  projectName?: string;
  buildingType?: string;
  commercialSubtype?: string;
  city?: string;
  state?: string;
  budget?: number;
  area?: number;
  description?: string;
}

const STORAGE_KEY = "smart-city-planner-reports-v1";
const PROJECT_STORE_KEY = "smart-city-project-storage";

const REPORTS_UPDATED_EVENT = "smart-city:reports-updated";

function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function readStore(): ReportStore {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return {};

    return parsed as ReportStore;
  } catch (error) {
    console.error("[Reports] Failed to read report storage:", error);
    return {};
  }
}

function writeStore(store: ReportStore): boolean {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(store)
    );

    window.dispatchEvent(
      new CustomEvent(REPORTS_UPDATED_EVENT)
    );

    return true;
  } catch (error) {
    console.error("[Reports] Failed to write report storage:", error);
    return false;
  }
}

function validProjectId(
  value: unknown
): value is number | string {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function normalizeSnapshot(
  value: unknown
): CurrentProjectSnapshot | null {
  if (!isRecord(value)) return null;

  const id = value.projectId ?? value.id;

  if (!validProjectId(id)) return null;

  return {
    id: validProjectId(value.id) ? value.id : id,
    projectId: validProjectId(value.projectId)
      ? value.projectId
      : id,
    projectName:
      typeof value.projectName === "string"
        ? value.projectName
        : typeof value.name === "string"
          ? value.name
          : undefined,
    buildingType:
      typeof value.buildingType === "string"
        ? value.buildingType
        : typeof value.building_type === "string"
          ? value.building_type
          : undefined,
    commercialSubtype:
      typeof value.commercialSubtype === "string"
        ? value.commercialSubtype
        : typeof value.commercial_subtype === "string"
          ? value.commercial_subtype
          : undefined,
    city:
      typeof value.city === "string"
        ? value.city
        : undefined,
    state:
      typeof value.state === "string"
        ? value.state
        : undefined,
    budget:
      typeof value.budget === "number"
        ? value.budget
        : undefined,
    area:
      typeof value.area === "number"
        ? value.area
        : undefined,
    description:
      typeof value.description === "string"
        ? value.description
        : undefined,
  };
}

export function getReportStore(): ReportStore {
  return readStore();
}

export function getCurrentProjectSnapshot():
  | CurrentProjectSnapshot
  | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(
      PROJECT_STORE_KEY
    );

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) return null;

    // Zustand persist normally stores data under "state".
    const persistedState = isRecord(parsed.state)
      ? parsed.state
      : parsed;

    return normalizeSnapshot(persistedState);
  } catch (error) {
    console.error(
      "[Reports] Failed to read current project:",
      error
    );

    return null;
  }
}

export function getProjectReport(
  projectId: number | string
): ProjectReportRecord | null {
  if (!validProjectId(projectId)) return null;

  return readStore()[String(projectId)] ?? null;
}

export function saveProjectSnapshot(
  project: ReportProject
): boolean {
  if (!validProjectId(project.id)) {
    console.warn(
      "[Reports] Skipping project snapshot without a valid ID.",
      project
    );

    return false;
  }

  const store = readStore();
  const key = String(project.id);
  const current = store[key];

  store[key] = {
    project: {
      ...(current?.project ?? {}),
      ...project,
    },
    artifacts: current?.artifacts ?? {},
  };

  return writeStore(store);
}

export function saveReportArtifact(
  project: ReportProject,
  type: ReportArtifactType,
  data: Record<string, unknown>
): boolean {
  if (!validProjectId(project.id)) {
    console.warn(
      `[Reports] Cannot save "${type}": project ID is missing.`,
      project
    );

    return false;
  }

  const store = readStore();
  const key = String(project.id);
  const current = store[key];

  store[key] = {
    project: {
      ...(current?.project ?? {}),
      ...project,
    },
    artifacts: {
      ...(current?.artifacts ?? {}),
      [type]: {
        type,
        updatedAt: new Date().toISOString(),
        data,
      },
    },
  };

  return writeStore(store);
}

function mergeNestedRecords(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...existing,
  };

  for (const [key, value] of Object.entries(incoming)) {
    const previous = result[key];

    // Merge nested agent data, such as { citizen: {...} },
    // without removing architecture/civil/sustainability results.
    if (isRecord(previous) && isRecord(value)) {
      result[key] = mergeNestedRecords(previous, value);
    } else {
      // Arrays and primitive values are replaced by the latest result.
      result[key] = value;
    }
  }

  return result;
}

export function mergeReportArtifact(
  project: ReportProject,
  type: ReportArtifactType,
  data: Record<string, unknown>
): boolean {
  if (!validProjectId(project.id)) {
    console.warn(
      `[Reports] Cannot merge "${type}": project ID is missing.`,
      project
    );

    return false;
  }

  const store = readStore();
  const key = String(project.id);
  const current = store[key];
  const existingArtifact = current?.artifacts?.[type];

  const existingData = isRecord(existingArtifact?.data)
    ? existingArtifact.data
    : {};

  store[key] = {
    project: {
      ...(current?.project ?? {}),
      ...project,
    },
    artifacts: {
      ...(current?.artifacts ?? {}),
      [type]: {
        type,
        updatedAt: new Date().toISOString(),
        data: mergeNestedRecords(existingData, data),
      },
    },
  };

  return writeStore(store);
}

export function clearProjectReport(
  projectId: number | string
): boolean {
  if (!validProjectId(projectId)) return false;

  const store = readStore();
  const key = String(projectId);

  if (!store[key]) return true;

  delete store[key];

  return writeStore(store);
}

export function clearAllReportStorage(): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);

    window.dispatchEvent(
      new CustomEvent(REPORTS_UPDATED_EVENT)
    );
  } catch (error) {
    console.error(
      "[Reports] Failed to clear report storage:",
      error
    );
  }
}
