import AppLayout from "@/components/layout/AppLayout";

import ProjectForm from "@/components/forms/ProjectForm";

import SearchLocation from "@/components/map/SearchLocation";

import MapWrapper from "@/components/map/MapWrapper";

import LandInfo from "@/components/map/LandInfo";

import LandAnalysis from "@/components/map/LandAnalysis";

import NearbyInfrastructure from "@/components/map/NearbyInfrastructure";

import MapLegend from "@/components/map/MapLegend";

import SaveLandButton from "@/components/map/SaveLandButton";

import InterventionPanel from "@/components/map/InterventionPanel";

export default function MapPage() {
  return (
    <AppLayout>

      <div className="max-w-7xl mx-auto py-8">

        <h1 className="text-4xl font-bold mb-8">
          🏙 Smart City Planner
        </h1>

        {/* Project */}

        <div className="mb-8">
          <ProjectForm />
        </div>

        {/* Search */}

        <div className="mb-6">
          <SearchLocation />
        </div>

        {/* Map and analysis */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2">

            <MapWrapper />

            <InterventionPanel />

          </div>

          <div className="space-y-6">

            <LandInfo />

            <LandAnalysis />

            <NearbyInfrastructure />

            <MapLegend />

            <SaveLandButton />

          </div>

        </div>

      </div>

    </AppLayout>
  );
}