import api from "@/services/api";

export interface ScenarioDesignResponse {
  status: string;

  baseline_design: Record<string, unknown>;

  scenario_design: {
    site?: {
      area_m2?: number;
      jurisdiction?: string;
      state?: string;
      city?: string;
      [key: string]: unknown;
    };

    building?: {
      type?: string;
      subtype?: string;
      floors?: number;
      height_m?: number | null;
      far?: number | null;
      ground_coverage_percent?: number | null;
      estimated_builtup_area_m2?: number | null;
      [key: string]: unknown;
    };

    site_elements?: {
      parking?: boolean;
      parking_capacity?: number;
      green_area?: boolean;
      green_area_percentage?: number;
      pedestrian_circulation?: boolean;
      service_access?: boolean;
      fire_access?: boolean;

      road_width_m?: number;
      road_widening?: boolean;
      road_widening_target_m?: number;

      footpath_width_m?: number;
      traffic_signal?: boolean;
      new_road?: boolean;
      bus_stop?: boolean;
      street_lighting?: boolean;
      drainage?: boolean;
      rainwater_harvesting?: boolean;
      solar?: boolean;
      ev_charging?: boolean;

      [key: string]: unknown;
    };

    regulatory_basis?: Record<
      string,
      unknown
    >;

    coordinates?: Array<{
      lat: number;
      lng: number;
    }>;

    scenario?: {
      intervention?: string;
      parameters?: Record<
        string,
        unknown
      >;
      [key: string]: unknown;
    };

    scenario_project?: Record<
      string,
      unknown
    >;

    [key: string]: unknown;
  };
}

export async function generateScenarioDesign(
  project: Record<string, unknown>,
  design: Record<string, unknown>,
  intervention: string,
  parameters: Record<string, unknown>,
  scenarioProject?: Record<string, unknown>,
): Promise<ScenarioDesignResponse> {
  const response =
    await api.post<ScenarioDesignResponse>(
      "/planner/scenario-design",
      {
        project,
        design,
        intervention,
        parameters,
        scenario_project:
          scenarioProject,
      },
    );

  return response.data;
}