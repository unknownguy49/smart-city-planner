"use client";

import { useEffect } from "react";

import {
  captureArchitectureReportVisuals,
  captureScenarioReportVisuals,
} from "../../services/reportSnapshots";

interface CaptureEventDetail {
  projectId:
    | number
    | string;

  kind:
    | "architecture"
    | "scenario";
}

export default function ReportSnapshotBridge() {
  useEffect(() => {
    let captureQueue = Promise.resolve();
    const pending = new Set<string>();

    function handleCapture(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<CaptureEventDetail>;

      const detail =
        customEvent.detail;

      if (
        detail?.projectId ===
          undefined ||
        detail?.projectId ===
          null ||
        !detail?.kind
      ) {
        console.warn(
          "[Reports] Capture event received without a valid project ID or report type.",
          detail
        );

        return;
      }

      const key = `${String(detail.projectId)}:${detail.kind}`;
      if (pending.has(key)) {
        console.info("[Reports] Duplicate capture request ignored:", key);
        return;
      }
      pending.add(key);

      console.info("[Reports] Capture event received:", detail);
      captureQueue = captureQueue
        .then(async () => {
          if (detail.kind === "architecture") await captureArchitectureReportVisuals(detail.projectId);
          if (detail.kind === "scenario") await captureScenarioReportVisuals(detail.projectId);
        })
        .catch((error) => {
          console.error("[Reports] Visual capture failed:", error);
        })
        .finally(() => pending.delete(key));
    }

    window.addEventListener(
      "smart-city:capture-report-visuals",
      handleCapture
    );

    console.log(
      "[Reports] ReportSnapshotBridge mounted."
    );

    return () => {
      window.removeEventListener(
        "smart-city:capture-report-visuals",
        handleCapture
      );
    };
  }, []);

  return null;
}