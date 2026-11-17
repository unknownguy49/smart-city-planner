
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DesignSpecification } from "../services/design";

export type ArchitectureStyle =
  | "modern"
  | "vastu"
  | "luxury"
  | "efficient"
  | "courtyard"
  | "rental";

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ProjectData {
  id?: number | string | null;
  projectId?: number | string | null;
  projectName: string;
  buildingType: string;
  commercialSubtype: string;
  city: string;
  state: string;
  budget: number;
  area: number;
  description: string;
  coordinates: Coordinate[];
  searchLocation: Coordinate | null;
  design: DesignSpecification | null;
  architectureStyle: ArchitectureStyle;
  designProjectId: number | string | null;
}

interface ProjectStore extends ProjectData {
  setArchitectureStyle: (
    style: ArchitectureStyle
  ) => void;

  setProject: (
    project: Partial<ProjectData> & {
      project_name?: string | null;
      building_type?: string | null;
      commercial_subtype?: string | null;
      name?: string | null;
    }
  ) => void;

  setProjectName: (projectName: string) => void;
  setBuildingType: (buildingType: string) => void;
  setCommercialSubtype: (commercialSubtype: string) => void;
  setCity: (city: string) => void;
  setState: (state: string) => void;
  setBudget: (budget: number) => void;
  setArea: (area: number) => void;
  setDescription: (description: string) => void;

  setCoordinates: (coordinates: Coordinate[]) => void;
  addCoordinate: (coordinate: Coordinate) => void;
  clearCoordinates: () => void;

  setSearchLocation: (
    location: Coordinate | null
  ) => void;

  setDesign: (
    design: DesignSpecification | null
  ) => void;

  clearDesign: () => void;
  clearProject: () => void;
}

const initialProject: ProjectData = {
  id: null,
  projectId: null,
  projectName: "",
  buildingType: "",
  commercialSubtype: "",
  city: "",
  state: "",
  budget: 0,
  area: 0,
  description: "",
  coordinates: [],
  searchLocation: null,
  design: null,
  architectureStyle: "modern",
  designProjectId: null,
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      ...initialProject,

      setArchitectureStyle: (architectureStyle) =>
        set({ architectureStyle }),

      setProject: (project) =>
        set((current) => {
          const incomingProjectId =
            project.projectId ?? project.id ?? null;

          const currentProjectId =
            current.projectId ?? current.id ?? null;

          const projectChanged =
            incomingProjectId !== null &&
            String(incomingProjectId) !==
              String(currentProjectId);

          const base = projectChanged
            ? initialProject
            : current;

          return {
            ...base,
            ...project,

            id:
              project.id ??
              incomingProjectId ??
              base.id,

            projectId:
              incomingProjectId ??
              base.projectId,

            projectName:
              project.projectName ??
              project.project_name ??
              project.name ??
              base.projectName,

            buildingType:
              project.buildingType ??
              project.building_type ??
              base.buildingType,

            commercialSubtype:
              project.commercialSubtype ??
              project.commercial_subtype ??
              base.commercialSubtype,

            coordinates:
              project.coordinates ??
              base.coordinates,

            searchLocation:
              project.searchLocation ??
              base.searchLocation,

            design:
              project.design ??
              base.design,

            architectureStyle:
              project.architectureStyle ??
              base.architectureStyle,

            designProjectId:
              project.designProjectId ??
              base.designProjectId,
          };
        }),

      setProjectName: (projectName) =>
        set({ projectName }),

      setBuildingType: (buildingType) =>
        set({ buildingType }),

      setCommercialSubtype: (commercialSubtype) =>
        set({ commercialSubtype }),

      setCity: (city) =>
        set({ city }),

      setState: (state) =>
        set({ state }),

      setBudget: (budget) =>
        set({ budget }),

      setArea: (area) =>
        set({ area }),

      setDescription: (description) =>
        set({ description }),

      setCoordinates: (coordinates) =>
        set({ coordinates }),

      addCoordinate: (coordinate) =>
        set((current) => ({
          coordinates: [
            ...current.coordinates,
            coordinate,
          ],
        })),

      clearCoordinates: () =>
        set({ coordinates: [] }),

      setSearchLocation: (location) =>
        set({ searchLocation: location }),

      setDesign: (design) =>
        set((current) => ({
          design,
          designProjectId: design
            ? current.projectId ?? current.id ?? null
            : null,
        })),

      clearDesign: () =>
        set({
          design: null,
          designProjectId: null,
        }),

      clearProject: () =>
        set({ ...initialProject }),
    }),
    {
      name: "smart-city-project-storage",
    }
  )
);
