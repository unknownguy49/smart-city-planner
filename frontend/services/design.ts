
import api from "@/services/api";

export interface DesignCoordinate {
  lat: number;
  lng: number;
}


export interface SpaceProgramSpace {
  name?: string | null;
  type?: string | null;
  area_m2?: number | null;
}

export interface SpaceProgramFloor {
  floor?: number | null;
  name?: string | null;
  area_m2?: number | null;
  total_allocated_area_m2?: number | null;
  spaces?: SpaceProgramSpace[] | null;
}

export interface SpaceProgram {
  building_type?: string | null;
  building_subtype?: string | null;
  number_of_floors?: number | null;
  total_builtup_area_m2?: number | null;
  floor_area_m2?: number | null;
  total_allocated_area_m2?: number | null;
  floors?: SpaceProgramFloor[] | null;
  status?: string | null;
}


export interface DesignSpecification {
  site: {
    area_m2: number;
    jurisdiction?: string;
    state?: string;
    city?: string;
  };

  building: {
    type?: string;
    subtype?: string;
    floors?: number;
    height_m?: number | null;
    far?: number | null;
    ground_coverage_percent?: number | null;
    estimated_builtup_area_m2?: number | null;
    footprint_area_m2?: number | null;
  };

  site_elements: {
    parking: boolean;
    parking_capacity: number;
    green_area: boolean;
    pedestrian_circulation: boolean;
    service_access: boolean;
    fire_access: boolean;
  };

  regulatory_basis: {
    selected_commercial_control?: Record<string, unknown> | null;
  };

  coordinates?: DesignCoordinate[] | null;
  space_program?: SpaceProgram | null;

  site_layout?: {
    schema_version?: string;
    coordinate_system?: string;
    boundary?: {
      type?: string | null;
      coordinates?: number[][][] | null;
      status?: string;
    };
    building_footprint?: {
      geometry?: unknown;
      target_area_m2?: number | null;
      status?: string;
    };
    site_context?: Record<string, unknown> | null;
    site_suitability?: Record<string, unknown> | null;
    validation?: {
      boundary_coordinates_valid?: boolean;
      topology_checked?: boolean;
      regulatory_compliance_checked?: boolean;
    };
  };
}

export interface DesignResponse {
  status: string;
  design_specification: DesignSpecification;
}

export async function generateDesign(
  project: Record<string, unknown>,
  architecture: Record<string, unknown>,
): Promise<DesignResponse> {
  const response = await api.post<DesignResponse>(
    "/design/generate",
    { project, architecture },
  );

  return response.data;
}
