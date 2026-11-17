import { create } from "zustand";
import type { Feature, Polygon } from "geojson";

export interface PolygonPoint {
  lat: number;
  lng: number;
}

interface PolygonStore {
  coordinates: PolygonPoint[];
  geoJson: Feature<Polygon> | null;
  area: number;

  setCoordinates: (
    coords: PolygonPoint[]
  ) => void;

  setGeoJson: (
    geo: Feature<Polygon> | null
  ) => void;

  setArea: (
    area: number
  ) => void;

  clearPolygon: () => void;
}

export const usePolygonStore =
  create<PolygonStore>((set) => ({

    coordinates: [],

    geoJson: null,

    area: 0,

    setCoordinates: (coords) =>
      set({
        coordinates: coords,
      }),

    setGeoJson: (geo) =>
      set({
        geoJson: geo,
      }),

    setArea: (area) =>
      set({
        area,
      }),

    clearPolygon: () =>
      set({
        coordinates: [],
        geoJson: null,
        area: 0,
      }),

  }));