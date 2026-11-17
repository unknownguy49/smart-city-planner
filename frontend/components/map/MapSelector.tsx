"use client";

import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  useMap,
} from "react-leaflet";

import { EditControl } from "react-leaflet-draw";

import L from "leaflet";

import * as turf from "@turf/turf";

import { usePolygonStore } from "../../store/polygonStore";
import { useProjectStore } from "../../store/projectStore";

interface Location {
  lat: number;
  lng: number;
}

function MapUpdater({
  location,
}: {
  location: Location | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView(
        [location.lat, location.lng],
        16
      );
    }
  }, [location, map]);

  return null;
}

function SavedPolygonRestorer({
  coordinates,
}: {
  coordinates: Location[];
}) {
  const map = useMap();

  useEffect(() => {
    if (
      !coordinates ||
      coordinates.length < 3
    ) {
      return;
    }

    const latLngs =
      coordinates.map(
        (coordinate) =>
          L.latLng(
            coordinate.lat,
            coordinate.lng
          )
      );

    const polygon =
      L.polygon(latLngs, {
        color: "blue",
        weight: 3,
        fillOpacity: 0.2,
      });

    polygon.addTo(map);

    map.fitBounds(
      polygon.getBounds(),
      {
        padding: [30, 30],
      }
    );

    return () => {
      map.removeLayer(polygon);
    };
  }, [coordinates, map]);

  return null;
}

export default function MapSelector() {
  const [location, setLocation] =
    useState<Location | null>(null);

  const setPolygonCoordinates =
    usePolygonStore(
      (state) => state.setCoordinates
    );

  const setGeoJson =
    usePolygonStore(
      (state) => state.setGeoJson
    );

  const setArea =
    usePolygonStore(
      (state) => state.setArea
    );

  const clearPolygon =
    usePolygonStore(
      (state) => state.clearPolygon
    );

  const setProjectCoordinates =
    useProjectStore(
      (state) => state.setCoordinates
    );

  const clearProjectCoordinates =
    useProjectStore(
      (state) => state.clearCoordinates
    );

  const searchLocation =
    useProjectStore(
      (state) => state.searchLocation
    );

  const savedCoordinates =
    useProjectStore(
      (state) => state.coordinates
    );

  const projectId =
    useProjectStore(
      (state) => state.projectId
    );

  useEffect(() => {
    setLocation(null);
  }, [projectId]);

  useEffect(() => {
    if (searchLocation) {
      setLocation(searchLocation);
    }
  }, [searchLocation]);

  useEffect(() => {
    if (
      savedCoordinates &&
      savedCoordinates.length >= 3
    ) {
      setPolygonCoordinates(
        savedCoordinates
      );

      setProjectCoordinates(
        savedCoordinates
      );

      const turfCoordinates =
        savedCoordinates.map(
          (coordinate) => [
            coordinate.lng,
            coordinate.lat,
          ]
        );

      turfCoordinates.push(
        turfCoordinates[0]
      );

      const geojson = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            turfCoordinates,
          ],
        },
      } as any;

      const calculatedArea =
        turf.area(geojson);

      setGeoJson(geojson);

      setArea(calculatedArea);

      console.log(
        "========== SAVED POLYGON RESTORED =========="
      );

      console.log(
        "Coordinates:",
        savedCoordinates
      );

      console.log(
        "Area:",
        calculatedArea,
        "m²"
      );
    } else {
      clearPolygon();
    }
  }, [
    savedCoordinates,
    setPolygonCoordinates,
    setProjectCoordinates,
    setGeoJson,
    setArea,
    clearPolygon,
  ]);

  useEffect(() => {
    delete (
      L.Icon.Default.prototype as any
    )._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

      iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  function handleCreated(event: any) {
    const layer =
      event.layer as L.Polygon;

    const geojson =
      layer.toGeoJSON();

    const calculatedArea =
      turf.area(geojson);

    const coordinates =
      geojson.geometry
        .coordinates[0] as number[][];

    const polygonCoordinates: Location[] =
      coordinates
        .slice(0, -1)
        .map((coordinate) => ({
          lat: coordinate[1],
          lng: coordinate[0],
        }));

    setPolygonCoordinates(
      polygonCoordinates
    );

    setGeoJson(
      geojson as any
    );

    setArea(
      calculatedArea
    );

    setProjectCoordinates(
      polygonCoordinates
    );

    console.log(
      "========== POLYGON =========="
    );

    console.log(
      "Area:",
      calculatedArea,
      "m²"
    );

    console.log(
      "Coordinates:",
      polygonCoordinates
    );
  }

  function handleDeleted() {
    setPolygonCoordinates([]);
    setArea(0);
    setGeoJson(null);
    clearProjectCoordinates();

    console.log(
      "Polygon cleared"
    );
  }

  const defaultCenter: [
    number,
    number
  ] = location
    ? [
        location.lat,
        location.lng,
      ]
    : [
        17.3850,
        78.4867,
      ];

  return (
    <MapContainer
      key={
        projectId !== null &&
        projectId !== undefined
          ? String(projectId)
          : "no-project"
      }
      center={defaultCenter}
      zoom={13}
      className="site-planning-leaflet"
      style={{
        height: "100%",
        width: "100%",
      }}
    >
      <MapUpdater
        location={location}
      />

      <SavedPolygonRestorer
        coordinates={
          savedCoordinates ?? []
        }
      />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={
            handleCreated
          }
          onDeleted={
            handleDeleted
          }
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
            polygon: true,
          }}
          edit={{
            edit: true,
            remove: true,
          } as any}
        />
      </FeatureGroup>
    </MapContainer>
  );
}