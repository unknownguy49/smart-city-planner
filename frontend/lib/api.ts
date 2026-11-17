
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Coordinate = {
  lat: number;
  lng: number;
};

export type ProjectInput = {
  name: string;
  building_type: string;
  commercial_subtype?: string | null;
  city: string;
  state: string;
  area: number;
  budget: number;
  description?: string;
  coordinates: Coordinate[];
};

export type Project = ProjectInput & {
  id: number;
  owner_uid: string;
  created_at: string;
  updated_at?: string;
};

export type ArtifactType =
  | "design"
  | "layout"
  | "scenario"
  | "report"
  | "change";

export type SavedArtifact<T = Record<string, unknown>> = {
  id: number;
  project_id: number;
  artifact_type: ArtifactType;
  name: string;
  data: T;
  version: number;
  created_at: string | null;
  updated_at: string | null;
};

export type SavedAnalysis = {
  id: number;
  project_id: number;
  overall_score?: number | null;
  full_result: Record<string, unknown>;
  created_at?: string | null;
  [key: string]: unknown;
};

export type SavedConversation = {
  id: number;
  project_id: number;
  title: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SavedMessage = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  extra_data?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type SavedAsset = {
  id: number;
  project_id: number;
  asset_type: "model2d" | "model3d" | "image" | "report" | "document" | "other";
  file_name: string;
  content_type?: string | null;
  file_size?: number | null;
  storage_provider: string;
  storage_key: string;
  file_url?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  await auth.authStateReady();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${token}`);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const responseText = await response.text();
  let result: unknown = null;

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }
  }

  if (!response.ok) {
    const detail =
      typeof result === "object" && result !== null
        ? (result as { detail?: string }).detail
        : undefined;

    throw new Error(
      detail || `Request failed (${response.status})`,
    );
  }

  return result as T;
}

/* Projects */

export function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/projects/");
}

export function getProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`);
}

export function createProject(data: ProjectInput): Promise<Project> {
  return apiFetch<Project>("/projects/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProject(
  id: number,
  data: Partial<ProjectInput>,
): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: number): Promise<{ message: string }> {
  return apiFetch(`/projects/${id}`, { method: "DELETE" });
}

/* Land boundary: persisted as a project artifact */

export function saveLandBoundary(
  projectId: number,
  geojson: Record<string, unknown>,
  area: number,
) {
  return Promise.all([
    updateProject(projectId, { area }),
    saveArtifact(projectId, "layout", "land-boundary", {
      geojson,
      area,
      savedAt: new Date().toISOString(),
    }),
  ]);
}

export async function getLandBoundary(projectId: number) {
  const artifacts = await getArtifacts(projectId, "layout");
  return artifacts.find((item) => item.name === "land-boundary") ?? null;
}

/* AI analysis */

export function getAnalyses(projectId: number): Promise<SavedAnalysis[]> {
  return apiFetch<SavedAnalysis[]>(`/projects/${projectId}/analyses`);
}

export async function getLatestAnalysis(
  projectId: number,
): Promise<SavedAnalysis | null> {
  const analyses = await getAnalyses(projectId);
  return analyses.length ? analyses[0] : null;
}

/* Designs, layouts, scenarios, reports, and change history */

export function getArtifacts(
  projectId: number,
  type?: ArtifactType,
): Promise<SavedArtifact[]> {
  const query = type
    ? `?artifact_type=${encodeURIComponent(type)}`
    : "";

  return apiFetch<SavedArtifact[]>(
    `/projects/${projectId}/artifacts${query}`,
  );
}

export function saveArtifact<T extends Record<string, unknown>>(
  projectId: number,
  artifact_type: ArtifactType,
  name: string,
  data: T,
): Promise<SavedArtifact<T>> {
  return apiFetch<SavedArtifact<T>>(
    `/projects/${projectId}/artifacts`,
    {
      method: "POST",
      body: JSON.stringify({ artifact_type, name, data }),
    },
  );
}

export function deleteArtifact(
  projectId: number,
  artifactId: number,
): Promise<{ success: boolean }> {
  return apiFetch(
    `/projects/${projectId}/artifacts/${artifactId}`,
    { method: "DELETE" },
  );
}

/* Chatbot conversations */

export function createConversation(
  projectId: number,
  title = "Planning chat",
): Promise<SavedConversation> {
  return apiFetch<SavedConversation>(
    `/projects/${projectId}/conversations`,
    {
      method: "POST",
      body: JSON.stringify({ title }),
    },
  );
}

export function getConversations(
  projectId: number,
): Promise<SavedConversation[]> {
  return apiFetch<SavedConversation[]>(
    `/projects/${projectId}/conversations`,
  );
}

export function getMessages(
  conversationId: number,
): Promise<SavedMessage[]> {
  return apiFetch<SavedMessage[]>(
    `/conversations/${conversationId}/messages`,
  );
}

export function saveMessage(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string,
  extra_data?: Record<string, unknown>,
): Promise<SavedMessage> {
  return apiFetch<SavedMessage>(
    `/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ role, content, extra_data }),
    },
  );
}

/* 2D/3D model and file metadata */

export function getAssets(projectId: number): Promise<SavedAsset[]> {
  return apiFetch<SavedAsset[]>(`/projects/${projectId}/assets`);
}

export function saveAssetMetadata(
  projectId: number,
  asset: Omit<SavedAsset, "id" | "project_id">,
): Promise<SavedAsset> {
  return apiFetch<SavedAsset>(`/projects/${projectId}/assets`, {
    method: "POST",
    body: JSON.stringify(asset),
  });
}
