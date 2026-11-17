"use client";

import { useEffect } from "react";

import api from "../../services/api";

import { usePolygonStore } from "../../store/polygonStore";
import { useProjectStore } from "../../store/projectStore";

export default function ProjectStateGuard() {
  const projectId =
    useProjectStore(
      (state) => state.projectId
    );

  const clearProject =
    useProjectStore(
      (state) => state.clearProject
    );

  const clearPolygon =
    usePolygonStore(
      (state) => state.clearPolygon
    );

  useEffect(() => {
    let active = true;

    async function verifyProject() {
      if (
        projectId === null ||
        projectId === undefined
      ) {
        return;
      }

      try {
        await api.get(
          `/projects/${projectId}`
        );
      } catch (error: unknown) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "response" in error
            ? (
                error as {
                  response?: {
                    status?: number;
                  };
                }
              ).response?.status
            : undefined;

        if (
          active &&
          status === 404
        ) {
          clearProject();
          clearPolygon();
        }
      }
    }

    void verifyProject();

    return () => {
      active = false;
    };
  }, [
    projectId,
    clearProject,
    clearPolygon,
  ]);

  return null;
}