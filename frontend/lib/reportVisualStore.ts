export interface FloorReportSnapshot {
  floor: number;
  label: string;
  image: string;
}

export interface ReportVisuals {
  architectureMap?: string;
  floorPlans: FloorReportSnapshot[];
  scenarioMap?: string;
  scenarioDesign?: string;
  building3D?: string;
  updatedAt: string;
}

interface StoredVisualRecord {
  projectId: string;
  visuals: ReportVisuals;
}

const DB_NAME =
  "smart-city-planner-report-visuals";

const STORE_NAME = "visuals";

const DB_VERSION = 1;

function canUseIndexedDb() {
  return (
    typeof window !== "undefined" &&
    "indexedDB" in window
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames.contains(
            STORE_NAME
          )
        ) {
          database.createObjectStore(
            STORE_NAME,
            {
              keyPath:
                "projectId",
            }
          );
        }
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              "Failed to open report visual storage."
            )
        );
    }
  );
}

export async function saveReportVisuals(
  projectId: number | string,
  visuals: ReportVisuals
) {
  if (!canUseIndexedDb()) {
    return;
  }

  const database =
    await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .put({
          projectId: String(
            projectId
          ),
          visuals,
        } satisfies StoredVisualRecord);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error(
              "Failed to save report visuals."
            )
        );
    }
  );

  database.close();

  window.dispatchEvent(
    new CustomEvent(
      "smart-city:report-visuals-updated"
    )
  );
}

export async function getReportVisuals(
  projectId: number | string
): Promise<ReportVisuals | null> {
  if (!canUseIndexedDb()) {
    return null;
  }

  const database =
    await openDatabase();

  const result =
    await new Promise<
      StoredVisualRecord | undefined
    >(
      (resolve, reject) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              STORE_NAME
            )
            .get(
              String(projectId)
            );

        request.onsuccess =
          () =>
            resolve(
              request.result as
                | StoredVisualRecord
                | undefined
            );

        request.onerror = () =>
          reject(
            request.error
          );
      }
    );

  database.close();

  return (
    result?.visuals ??
    null
  );
}

export async function mergeReportVisuals(
  projectId: number | string,
  visuals: Partial<ReportVisuals>
) {
  if (!canUseIndexedDb()) {
    return;
  }

  const existing =
    await getReportVisuals(
      projectId
    );

  await saveReportVisuals(
    projectId,
    {
      architectureMap:
        visuals.architectureMap ??
        existing?.architectureMap,

      floorPlans:
        visuals.floorPlans ??
        existing?.floorPlans ??
        [],

      scenarioMap:
        visuals.scenarioMap ??
        existing?.scenarioMap,

      scenarioDesign:
        visuals.scenarioDesign ??
        existing?.scenarioDesign,

      building3D:
        visuals.building3D ??
        existing?.building3D,

      updatedAt:
        new Date().toISOString(),
    }
  );
}

export async function clearReportVisuals(
  projectId: number | string
) {
  if (!canUseIndexedDb()) {
    return;
  }

  const database =
    await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .delete(
          String(projectId)
        );

      transaction.oncomplete =
        () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error
        );
    }
  );

  database.close();
}

export async function clearAllReportVisuals() {
  if (!canUseIndexedDb()) {
    return;
  }

  const database =
    await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .clear();

      transaction.oncomplete =
        () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error
        );
    }
  );

  database.close();
}