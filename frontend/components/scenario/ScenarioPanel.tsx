"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useState,
} from "react";
import {
  LuArrowRight,
  LuBus,
  LuBuilding2,
  LuCar,
  LuChevronDown,
  LuCircleAlert,
  LuCircleCheck,
  LuDroplets,
  LuFileText,
  LuLeaf,
  LuLightbulb,
  LuLoaderCircle,
  LuMap,
  LuRefreshCw,
  LuRuler,
  LuShieldCheck,
  LuSignal,
  LuTrees,
  LuZap,
  LuSun,
} from "react-icons/lu";

import api from "../../services/api";

import {
  generateScenarioDesign,
  type ScenarioDesignResponse,
} from "../../services/scenarioDesign";

import { useProjectStore } from "../../store/projectStore";

const ScenarioDesignMap = dynamic(
  () => import("./ScenarioDesignMap"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[520px] items-center justify-center rounded-xl border"
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <LuMap
            size={22}
            strokeWidth={1.7}
            style={{
              color:
                "var(--primary)",
            }}
          />

          <p
            className="text-sm font-medium"
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            Loading scenario map...
          </p>
        </div>
      </div>
    ),
  }
);

type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

type AgentData =
  Record<string, unknown>;

interface AnalysisResult {
  overall_score: number;
  architecture?: AgentData;
  civil?: AgentData;
  sustainability?: AgentData;
  municipal?: AgentData;
  citizen?: AgentData;
  area?: number;
  [key: string]: unknown;
}

interface ScenarioProject {
  projectId?: string | number | null;
  projectName: string;
  buildingType: string;
  commercialSubtype?: string | null;
  city: string;
  state: string;
  budget: number;
  area: number;
  coordinates: unknown[];
}

interface ConstraintCheck {
  name?: string;
  status?: string;
  actual?: unknown;
  required?: unknown;
  message?: string;
  severity?: string;
  source?: string;
  [key: string]: unknown;
}

interface ScenarioConstraints {
  compliance_score?: number;
  compliance?: number;
  results?: ConstraintCheck[];
  [key: string]:
    | string
    | number
    | boolean
    | null
    | ConstraintCheck[]
    | undefined;
}

interface ScenarioScoring {
  overall_score?: number;
  score?: number;
  planning_score?: number;
  status?: string;
  decision?: string;
  agent_scores?: Record<
    string,
    number
  >;
  weights?: Record<
    string,
    number
  >;
  risk_levels?: Record<
    string,
    string
  >;
  [key: string]:
    | string
    | number
    | boolean
    | null
    | Record<string, number>
    | Record<string, string>
    | undefined;
}

interface ScenarioResult {
  status?: string;
  scenario_status?: string;
  intervention?: string;
  description?: string;
  project?: Record<
    string,
    unknown
  >;
  constraints?: ScenarioConstraints;
  scoring?: ScenarioScoring;
  overall_score?: number;
  compliance_score?: number;
  results?: ConstraintCheck[];
  message?: string;
  [key: string]: unknown;
}

interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

const INTERVENTIONS = [
  {
    value: "road_widening",
    label: "Road Widening",
    description:
      "Increase the width of an existing road.",
    icon: LuRuler,
  },
  {
    value: "traffic_signal",
    label: "Traffic Signal",
    description:
      "Install a traffic signal.",
    icon: LuSignal,
  },
  {
    value: "new_road",
    label: "New Road",
    description:
      "Create a new road connection.",
    icon: LuMap,
  },
  {
    value: "footpath",
    label: "Footpath",
    description:
      "Add or improve pedestrian footpaths.",
    icon: LuArrowRight,
  },
  {
    value: "parking",
    label: "Parking",
    description:
      "Introduce or expand parking.",
    icon: LuCar,
  },
  {
    value: "commercial_building",
    label: "Commercial Building",
    description:
      "Introduce a commercial development.",
    icon: LuBuilding2,
  },
  {
    value: "residential_building",
    label: "Residential Building",
    description:
      "Introduce a residential development.",
    icon: LuBuilding2,
  },
  {
    value: "green_space",
    label: "Green Space",
    description:
      "Create or expand green/open space.",
    icon: LuTrees,
  },
  {
    value: "bus_stop",
    label: "Bus Stop",
    description:
      "Create or improve a bus stop.",
    icon: LuBus,
  },
  {
    value: "street_lighting",
    label: "Street Lighting",
    description:
      "Install or improve street lighting.",
    icon: LuLightbulb,
  },
  {
    value: "drainage",
    label: "Drainage",
    description:
      "Improve stormwater drainage.",
    icon: LuDroplets,
  },
  {
    value: "rainwater_harvesting",
    label: "Rainwater Harvesting",
    description:
      "Introduce rainwater harvesting.",
    icon: LuDroplets,
  },
  {
    value: "solar",
    label: "Solar",
    description:
      "Introduce solar energy infrastructure.",
    icon: LuSun,
  },
  {
    value: "ev_charging",
    label: "EV Charging",
    description:
      "Install EV charging infrastructure.",
    icon: LuZap,
  },
] as const;

interface ScenarioPanelProps {
  analysisResult: AnalysisResult;
}

function formatValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (
    typeof value === "object"
  ) {
    try {
      return JSON.stringify(
        value
      );
    } catch {
      return "—";
    }
  }

  return String(value);
}

function getStatusState(
  status?: string
) {
  const normalized =
    String(status ?? "")
      .toLowerCase();

  if (
    normalized.includes(
      "not recommended"
    ) ||
    normalized.includes(
      "not feasible"
    ) ||
    normalized.includes(
      "infeasible"
    ) ||
    normalized.includes("fail")
  ) {
    return {
      label:
        status || "Failed",
      color:
        "var(--danger)",
      background:
        "var(--danger-soft)",
      border:
        "var(--danger-border)",
    };
  }

  if (
    normalized.includes(
      "warning"
    ) ||
    normalized.includes(
      "condition"
    )
  ) {
    return {
      label:
        status || "Warning",
      color:
        "var(--warning)",
      background:
        "var(--warning-soft)",
      border:
        "var(--warning-border)",
    };
  }

  if (
    normalized.includes(
      "pass"
    ) ||
    normalized.includes(
      "feasible"
    ) ||
    normalized.includes(
      "recommended"
    )
  ) {
    return {
      label:
        status || "Passed",
      color:
        "var(--success)",
      background:
        "var(--success-soft)",
      border:
        "var(--success-border)",
    };
  }

  return {
    label:
      status || "Unknown",
    color:
      "var(--text-secondary)",
    background:
      "var(--surface-secondary)",
    border:
      "var(--border)",
  };
}

function getScoreState(
  score: number
) {
  if (score >= 90) {
    return {
      label: "Excellent",
      color:
        "var(--success)",
      background:
        "var(--success-soft)",
      border:
        "var(--success-border)",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      color:
        "var(--primary)",
      background:
        "var(--primary-soft)",
      border:
        "var(--primary-border)",
    };
  }

  if (score >= 60) {
    return {
      label: "Moderate",
      color:
        "var(--warning)",
      background:
        "var(--warning-soft)",
      border:
        "var(--warning-border)",
    };
  }

  return {
    label: "Needs attention",
    color:
      "var(--danger)",
    background:
      "var(--danger-soft)",
    border:
      "var(--danger-border)",
  };
}

function getScenarioScore(
  result: ScenarioResult | null
): number | null {
  if (!result) {
    return null;
  }

  if (
    typeof result.overall_score ===
    "number"
  ) {
    return result.overall_score;
  }

  if (
    result.scoring &&
    typeof result.scoring
      .overall_score ===
      "number"
  ) {
    return result.scoring
      .overall_score;
  }

  if (
    result.scoring &&
    typeof result.scoring.score ===
      "number"
  ) {
    return result.scoring.score;
  }

  if (
    result.scoring &&
    typeof result.scoring
      .planning_score ===
      "number"
  ) {
    return result.scoring
      .planning_score;
  }

  return null;
}

function getConstraints(
  result: ScenarioResult | null
): ConstraintCheck[] {
  if (!result) {
    return [];
  }

  if (
    Array.isArray(
      result.results
    )
  ) {
    return result.results;
  }

  if (
    result.constraints &&
    Array.isArray(
      result.constraints.results
    )
  ) {
    return result.constraints
      .results;
  }

  return [];
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={15}
          strokeWidth={1.8}
        />

        <p
          className="text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{
            color:
              "var(--text-muted)",
          }}
        >
          {label}
        </p>
      </div>

      <p
        className="mt-2 text-xl font-bold tracking-tight"
        style={{
          color:
            "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function ScenarioPanel({
  analysisResult,
}: ScenarioPanelProps) {
  const {
    projectId,
    projectName,
    buildingType,
    commercialSubtype,
    budget,
    city,
    state,
    coordinates,
    design,
  } = useProjectStore();

  const [
    intervention,
    setIntervention,
  ] = useState(
    "road_widening"
  );

  const [
    proposedWidth,
    setProposedWidth,
  ] = useState("18");

  const [
    parkingSpaces,
    setParkingSpaces,
  ] = useState("20");

  const [
    footpathWidth,
    setFootpathWidth,
  ] = useState("2.5");

  const [
    greenAreaPercentage,
    setGreenAreaPercentage,
  ] = useState("30");

  const [
    scenarioResult,
    setScenarioResult,
  ] = useState<ScenarioResult | null>(
    null
  );

  const [
    scenarioDesignResult,
    setScenarioDesignResult,
  ] =
    useState<ScenarioDesignResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    designLoading,
    setDesignLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    designError,
    setDesignError,
  ] = useState<string | null>(
    null
  );

  const project: ScenarioProject =
    {
      projectId,

      projectName:
        projectName ?? "",

      buildingType:
        buildingType ?? "",

      commercialSubtype:
        commercialSubtype ?? null,

      city:
        city ?? "",

      state:
        state ?? "",

      budget:
        typeof budget ===
        "number"
          ? budget
          : 0,

      area:
        typeof analysisResult.area ===
        "number"
          ? analysisResult.area
          : 0,

      coordinates:
        Array.isArray(
          coordinates
        )
          ? coordinates
          : [],
    };

  async function saveScenarioReport(
    data: Record<string, unknown>
  ) {
    if (
      projectId === null ||
      projectId === undefined
    ) {
      return;
    }

    try {
      await api.post(
        `/projects/${projectId}/artifacts`,
        {
          artifact_type: "scenario",
          name: "Scenario Design",
          data,
        }
      );
    } catch (caughtError: unknown) {
      console.error(
        "Failed to save scenario report:",
        caughtError
      );

      setDesignError(
        caughtError instanceof Error
          ? `Scenario output was generated, but saving it failed: ${caughtError.message}`
          : "Scenario output was generated, but saving it failed."
      );
    }
  }

  useEffect(() => {
    function handleChatbotScenario(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          intervention: string;

          parameters: Record<
            string,
            JsonValue
          >;

          scenarioProject:
            Record<
              string,
              unknown
            > | null;

          scenarioResult:
            ScenarioResult | null;
        }>;

      const detail =
        customEvent.detail;

      if (!detail) {
        return;
      }

      setIntervention(
        detail.intervention
      );

      const parameters =
        detail.parameters ?? {};

      if (
        detail.intervention ===
          "parking" &&
        typeof parameters.parking_spaces ===
          "number"
      ) {
        setParkingSpaces(
          String(
            parameters.parking_spaces
          )
        );
      }

      if (
        (
          detail.intervention ===
            "road_widening" ||
          detail.intervention ===
            "new_road"
        ) &&
        typeof parameters.proposed_width_m ===
          "number"
      ) {
        setProposedWidth(
          String(
            parameters.proposed_width_m
          )
        );
      }

      if (
        detail.intervention ===
          "footpath" &&
        typeof parameters.footpath_width_m ===
          "number"
      ) {
        setFootpathWidth(
          String(
            parameters.footpath_width_m
          )
        );
      }

      if (
        detail.intervention ===
          "green_space" &&
        typeof parameters.green_area_percentage ===
          "number"
      ) {
        setGreenAreaPercentage(
          String(
            parameters.green_area_percentage
          )
        );
      }

      setScenarioResult(
        detail.scenarioResult
      );

      if (
        detail.scenarioResult
      ) {
        saveScenarioReport({
          intervention:
            detail.intervention,

          parameters,

          evaluation:
            detail.scenarioResult,

          scenario_result:
            detail.scenarioResult,
        });
      }

      setError(null);
      setDesignError(null);
      setScenarioDesignResult(
        null
      );

      if (
        !detail.scenarioResult ||
        !design
      ) {
        return;
      }

      async function generateChatbotScenarioDesign() {
        try {
          setDesignLoading(
            true
          );

          setDesignError(
            null
          );

          const response =
            await generateScenarioDesign(
              project as unknown as Record<
                string,
                unknown
              >,

              design as unknown as Record<
                string,
                unknown
              >,

              detail.intervention,

              detail.parameters,

              detail.scenarioProject ??
                undefined
            );

          setScenarioDesignResult(
            response
          );

          await saveScenarioReport({
            intervention: detail.intervention,
            parameters: detail.parameters,
            evaluation: detail.scenarioResult,
            scenario_design: response.scenario_design,
            scenario_design_response: response,
            baseline_design: response.baseline_design,
          });

          if (
            projectId !== null &&
            projectId !== undefined
          ) {
            window.dispatchEvent(
              new CustomEvent(
                "smart-city:capture-report-visuals",
                {
                  detail: {
                    projectId,
                    kind: "scenario",
                  },
                }
              )
            );
          }
        } catch (
          caughtError: unknown
        ) {
          console.error(
            "Chatbot scenario design error:",
            caughtError
          );

          if (
            caughtError instanceof
            Error
          ) {
            setDesignError(
              caughtError.message
            );
          } else {
            setDesignError(
              "Chatbot scenario design generation failed."
            );
          }
        } finally {
          setDesignLoading(
            false
          );
        }
      }

      void generateChatbotScenarioDesign();
    }

    window.addEventListener(
      "smart-city:chatbot-scenario",
      handleChatbotScenario
    );

    return () => {
      window.removeEventListener(
        "smart-city:chatbot-scenario",
        handleChatbotScenario
      );
    };
  }, [
    design,
    projectId,
  ]);

  function buildParameters(): Record<
    string,
    JsonValue
  > {
    const parameters: Record<
      string,
      JsonValue
    > = {};

    if (
      intervention ===
        "road_widening" ||
      intervention ===
        "new_road"
    ) {
      const width =
        Number(
          proposedWidth
        );

      if (
        !Number.isFinite(
          width
        ) ||
        width <= 0
      ) {
        throw new Error(
          "Please enter a valid road width."
        );
      }

      parameters.proposed_width_m =
        width;
    }

    if (
      intervention ===
      "parking"
    ) {
      const spaces =
        Number(
          parkingSpaces
        );

      if (
        !Number.isInteger(
          spaces
        ) ||
        spaces < 0
      ) {
        throw new Error(
          "Please enter a valid number of parking spaces."
        );
      }

      parameters.parking_spaces =
        spaces;
    }

    if (
      intervention ===
      "footpath"
    ) {
      const width =
        Number(
          footpathWidth
        );

      if (
        !Number.isFinite(
          width
        ) ||
        width <= 0
      ) {
        throw new Error(
          "Please enter a valid footpath width."
        );
      }

      parameters.footpath_width_m =
        width;
    }

    if (
      intervention ===
      "green_space"
    ) {
      const percentage =
        Number(
          greenAreaPercentage
        );

      if (
        !Number.isFinite(
          percentage
        ) ||
        percentage < 0 ||
        percentage > 100
      ) {
        throw new Error(
          "Green area percentage must be between 0 and 100."
        );
      }

      parameters.green_area_percentage =
        percentage;
    }

    return parameters;
  }

  async function runScenario() {
    try {
      setLoading(true);
      setError(null);
      setScenarioResult(null);
      setScenarioDesignResult(
        null
      );
      setDesignError(null);

      const parameters =
        buildParameters();

      const response =
        await api.post<ScenarioResult>(
          "/planner/scenario",
          {
            project,

            intervention,

            parameters,

            architecture:
              analysisResult
                .architecture ??
              {},

            civil:
              analysisResult.civil ??
              {},

            sustainability:
              analysisResult
                .sustainability ??
              {},

            municipal:
              analysisResult.municipal ??
              {},

            citizen:
              analysisResult.citizen ??
              {},
          }
        );

      setScenarioResult(
        response.data
      );

      void saveScenarioReport({
        intervention,
        parameters,
        evaluation: response.data,
      });
    } catch (
      caughtError: unknown
    ) {
      console.error(
        "Scenario error:",
        caughtError
      );

      const apiError =
        caughtError as ApiError;

      if (
        apiError.response
      ) {
        if (
          typeof apiError.response
            .data === "string"
        ) {
          setError(
            apiError.response.data
          );
        } else {
          try {
            setError(
              JSON.stringify(
                apiError.response.data,
                null,
                2
              )
            );
          } catch {
            setError(
              "Scenario evaluation failed."
            );
          }
        }
      } else if (
        caughtError instanceof
        Error
      ) {
        setError(
          caughtError.message
        );
      } else {
        setError(
          "Scenario evaluation failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function runScenarioDesign() {
    try {
      setDesignLoading(
        true
      );

      setDesignError(null);

      if (!design) {
        throw new Error(
          "Please generate the baseline design before generating a scenario design."
        );
      }

      if (!scenarioResult) {
        throw new Error(
          "Please evaluate the scenario first."
        );
      }

      const parameters =
        buildParameters();

      const response =
        await generateScenarioDesign(
          project as unknown as Record<
            string,
            unknown
          >,

          design as unknown as Record<
            string,
            unknown
          >,

          intervention,

          parameters,

          scenarioResult.project
        );

      setScenarioDesignResult(
        response
      );

      await saveScenarioReport({
        intervention,
        parameters,
        evaluation: scenarioResult,
        scenario_design: response.scenario_design,
        scenario_design_response: response,
        baseline_design: response.baseline_design,
      });

      if (
        projectId !== null &&
        projectId !== undefined
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "smart-city:capture-report-visuals",
            {
              detail: {
                projectId,
                kind: "scenario",
              },
            }
          )
        );
      }
    } catch (
      caughtError: unknown
    ) {
      console.error(
        "Scenario design error:",
        caughtError
      );

      if (
        caughtError instanceof
        Error
      ) {
        setDesignError(
          caughtError.message
        );
      } else {
        setDesignError(
          "Scenario design generation failed."
        );
      }
    } finally {
      setDesignLoading(
        false
      );
    }
  }

  function resetScenario() {
    setScenarioResult(null);
    setScenarioDesignResult(
      null
    );
    setError(null);
    setDesignError(null);
  }

  const selectedIntervention =
    INTERVENTIONS.find(
      (item) =>
        item.value ===
        intervention
    );

  const scenarioScore =
    getScenarioScore(
      scenarioResult
    );

  const constraints =
    getConstraints(
      scenarioResult
    );

  const scenarioStatus =
    scenarioResult?.status ??
    scenarioResult?.scenario_status ??
    scenarioResult?.scoring?.status ??
    null;

  const complianceScore =
    scenarioResult?.compliance_score ??
    scenarioResult?.constraints
      ?.compliance_score ??
    scenarioResult?.constraints
      ?.compliance ??
    null;

  const scenarioDesign =
    scenarioDesignResult?.scenario_design;

  const SelectedIcon =
    selectedIntervention?.icon ??
    LuMap;

  const scoreState =
    scenarioScore !== null
      ? getScoreState(
          scenarioScore
        )
      : null;

  return (
    <section className="mt-10">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            <LuMap
              size={18}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              What-if Planning
            </p>

            <h2
              className="mt-0.5 text-2xl font-bold tracking-tight"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Planning Scenarios
            </h2>
          </div>
        </div>

        <p
          className="mt-3 max-w-3xl text-sm leading-6"
          style={{
            color:
              "var(--text-secondary)",
          }}
        >
          Test infrastructure and planning
          interventions against the current project
          analysis and regulatory constraints.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border"
        style={{
          backgroundColor:
            "var(--surface)",
          borderColor:
            "var(--border)",
          boxShadow:
            "var(--shadow-sm)",
        }}
      >
        <div
          className="border-b p-5 sm:p-6"
          style={{
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <SelectedIcon
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h3
                className="text-base font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Configure Intervention
              </h3>

              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Select an intervention and provide the
                parameters required to evaluate its impact.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label
                htmlFor="scenario-intervention"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em]"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Intervention
              </label>

              <select
                id="scenario-intervention"
                value={
                  intervention
                }
                onChange={(
                  event
                ) => {
                  setIntervention(
                    event.target
                      .value
                  );

                  setScenarioResult(
                    null
                  );

                  setScenarioDesignResult(
                    null
                  );

                  setError(null);
                  setDesignError(
                    null
                  );
                }}
                className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--primary)]"
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-primary)",
                }}
              >
                {INTERVENTIONS.map(
                  (item) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>

              {selectedIntervention && (
                <div
                  className="mt-3 flex items-start gap-2.5 rounded-lg border p-3"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",
                    borderColor:
                      "var(--border)",
                  }}
                >
                  <SelectedIcon
                    size={15}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0"
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                  <p
                    className="text-xs leading-5"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {
                      selectedIntervention.description
                    }
                  </p>
                </div>
              )}
            </div>

            <div>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Scenario Parameters
              </p>

              {(
                intervention ===
                  "road_widening" ||
                intervention ===
                  "new_road"
              ) && (
                <div>
                  <label
                    htmlFor="road-width"
                    className="mb-1.5 block text-sm font-medium"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    Proposed Road Width (m)
                  </label>

                  <input
                    id="road-width"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      proposedWidth
                    }
                    onChange={(
                      event
                    ) =>
                      setProposedWidth(
                        event.target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </div>
              )}

              {intervention ===
                "parking" && (
                <div>
                  <label
                    htmlFor="parking-spaces"
                    className="mb-1.5 block text-sm font-medium"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    Parking Spaces
                  </label>

                  <input
                    id="parking-spaces"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      parkingSpaces
                    }
                    onChange={(
                      event
                    ) =>
                      setParkingSpaces(
                        event.target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </div>
              )}

              {intervention ===
                "footpath" && (
                <div>
                  <label
                    htmlFor="footpath-width"
                    className="mb-1.5 block text-sm font-medium"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    Footpath Width (m)
                  </label>

                  <input
                    id="footpath-width"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={
                      footpathWidth
                    }
                    onChange={(
                      event
                    ) =>
                      setFootpathWidth(
                        event.target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </div>
              )}

              {intervention ===
                "green_space" && (
                <div>
                  <label
                    htmlFor="green-area"
                    className="mb-1.5 block text-sm font-medium"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    Green Area (%)
                  </label>

                  <input
                    id="green-area"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={
                      greenAreaPercentage
                    }
                    onChange={(
                      event
                    ) =>
                      setGreenAreaPercentage(
                        event.target
                          .value
                      )
                    }
                    className="h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[var(--primary)]"
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </div>
              )}

              {intervention !==
                "road_widening" &&
                intervention !==
                  "new_road" &&
                intervention !==
                  "parking" &&
                intervention !==
                  "footpath" &&
                intervention !==
                  "green_space" && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                    style={{
                      backgroundColor:
                        "var(--surface-secondary)",
                      borderColor:
                        "var(--border)",
                    }}
                  >
                    <LuCircleCheck
                      size={16}
                      strokeWidth={1.8}
                      className="mt-0.5 shrink-0"
                      style={{
                        color:
                          "var(--success)",
                      }}
                    />

                    <p
                      className="text-xs leading-5"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      This intervention does not require
                      an additional numeric parameter.
                    </p>
                  </div>
                )}
            </div>
          </div>

          <div
            className="mt-6 flex flex-wrap gap-2 border-t pt-5"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <button
              type="button"
              onClick={
                runScenario
              }
              disabled={
                loading
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor:
                  "var(--primary)",
                color:
                  "var(--primary-foreground)",
              }}
            >
              {loading ? (
                <LuLoaderCircle
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <LuShieldCheck
                  size={15}
                  strokeWidth={1.9}
                />
              )}

              {loading
                ? "Evaluating Scenario..."
                : "Evaluate Scenario"}
            </button>

            {scenarioResult && (
              <button
                type="button"
                onClick={
                  runScenarioDesign
                }
                disabled={
                  designLoading ||
                  !design
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--success-border)",
                  color:
                    "var(--success)",
                }}
              >
                {designLoading ? (
                  <LuLoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <LuBuilding2
                    size={15}
                    strokeWidth={1.8}
                  />
                )}

                {designLoading
                  ? "Generating Design..."
                  : "Generate Scenario Design"}
              </button>
            )}

            {scenarioResult && (
              <button
                type="button"
                onClick={
                  resetScenario
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:bg-[var(--surface-hover)]"
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-secondary)",
                }}
              >
                <LuRefreshCw
                  size={15}
                  strokeWidth={1.8}
                />
                Reset
              </button>
            )}
          </div>

          {!design && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-lg border p-3"
              style={{
                backgroundColor:
                  "var(--warning-soft)",
                borderColor:
                  "var(--warning-border)",
              }}
            >
              <LuCircleAlert
                size={16}
                strokeWidth={1.8}
                className="mt-0.5 shrink-0"
                style={{
                  color:
                    "var(--warning)",
                }}
              />

              <p
                className="text-xs leading-5"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                Generate the baseline design first to
                enable Scenario Design.
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-5 rounded-xl border p-4"
              style={{
                backgroundColor:
                  "var(--danger-soft)",
                borderColor:
                  "var(--danger-border)",
              }}
            >
              <div className="flex items-start gap-2.5">
                <LuCircleAlert
                  size={17}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0"
                  style={{
                    color:
                      "var(--danger)",
                  }}
                />

                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Scenario evaluation failed
                  </p>

                  <pre
                    className="mt-2 overflow-auto whitespace-pre-wrap text-xs leading-5"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {designError && (
            <div
              className="mt-5 rounded-xl border p-4"
              style={{
                backgroundColor:
                  "var(--danger-soft)",
                borderColor:
                  "var(--danger-border)",
              }}
            >
              <div className="flex items-start gap-2.5">
                <LuCircleAlert
                  size={17}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0"
                  style={{
                    color:
                      "var(--danger)",
                  }}
                />

                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Scenario design generation failed
                  </p>

                  <pre
                    className="mt-2 overflow-auto whitespace-pre-wrap text-xs leading-5"
                    style={{
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {designError}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {scenarioResult && (
        <div className="mt-6 space-y-5">
          <section
            className="overflow-hidden rounded-xl border"
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
              boxShadow:
                "var(--shadow-sm)",
            }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Scenario Result
                  </p>

                  <h3
                    className="mt-1 text-xl font-bold tracking-tight"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    {selectedIntervention?.label ??
                      scenarioResult.intervention ??
                      "Planning Scenario"}
                  </h3>

                  {scenarioResult.description && (
                    <p
                      className="mt-2 max-w-2xl text-sm leading-6"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {
                        scenarioResult.description
                      }
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex">
                  {scenarioScore !==
                    null && (
                    <div
                      className="min-w-[120px] rounded-xl border p-4 text-center"
                      style={{
                        backgroundColor:
                          scoreState?.background,
                        borderColor:
                          scoreState?.border,
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{
                          color:
                            "var(--text-muted)",
                        }}
                      >
                        Scenario Score
                      </p>

                      <p
                        className="mt-1 text-2xl font-bold"
                        style={{
                          color:
                            scoreState?.color,
                        }}
                      >
                        {scenarioScore.toFixed(
                          1
                        )}
                      </p>
                    </div>
                  )}

                  {complianceScore !==
                    null && (
                    <div
                      className="min-w-[120px] rounded-xl border p-4 text-center"
                      style={{
                        backgroundColor:
                          "var(--surface-secondary)",
                        borderColor:
                          "var(--border)",
                      }}
                    >
                      <p
                        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{
                          color:
                            "var(--text-muted)",
                        }}
                      >
                        Compliance
                      </p>

                      <p
                        className="mt-1 text-2xl font-bold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {Number(
                          complianceScore
                        ).toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {scenarioStatus && (
                <div className="mt-5">
                  {(() => {
                    const status =
                      getStatusState(
                        scenarioStatus
                      );

                    return (
                      <span
                        className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor:
                            status.background,
                          borderColor:
                            status.border,
                          color:
                            status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-xl border"
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
            }}
          >
            <div
              className="border-b p-5 sm:p-6"
              style={{
                borderColor:
                  "var(--border)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <LuShieldCheck
                  size={18}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--primary)",
                  }}
                />

                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Constraint Evaluation
                  </h3>

                  <p
                    className="mt-1 text-xs"
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Regulatory and planning checks for the
                    proposed scenario.
                  </p>
                </div>
              </div>
            </div>

            {constraints.length ===
            0 ? (
              <div className="p-6">
                <p
                  className="text-sm"
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  No individual constraint results were
                  returned.
                </p>
              </div>
            ) : (
              <div>
                {constraints.map(
                  (
                    constraint,
                    index
                  ) => {
                    const status =
                      constraint.status ??
                      "UNKNOWN";

                    const statusState =
                      getStatusState(
                        status
                      );

                    return (
                      <div
                        key={`${constraint.name ?? "constraint"}-${index}`}
                        className="border-b p-5 last:border-b-0 sm:p-6"
                        style={{
                          borderColor:
                            "var(--border)",
                        }}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h4
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  "var(--text-primary)",
                              }}
                            >
                              {constraint.name ??
                                `Constraint ${
                                  index +
                                  1
                                }`}
                            </h4>

                            {constraint.message && (
                              <p
                                className="mt-1 text-xs leading-5"
                                style={{
                                  color:
                                    "var(--text-secondary)",
                                }}
                              >
                                {
                                  constraint.message
                                }
                              </p>
                            )}
                          </div>

                          <span
                            className="inline-flex w-fit shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              backgroundColor:
                                statusState.background,
                              borderColor:
                                statusState.border,
                              color:
                                statusState.color,
                            }}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Metric
                            label="Actual"
                            value={formatValue(
                              constraint.actual
                            )}
                            icon={
                              LuRuler
                            }
                          />

                          <Metric
                            label="Required"
                            value={formatValue(
                              constraint.required
                            )}
                            icon={
                              LuShieldCheck
                            }
                          />

                          <Metric
                            label="Severity"
                            value={
                              constraint.severity ??
                              "—"
                            }
                            icon={
                              LuCircleAlert
                            }
                          />
                        </div>

                        {constraint.source && (
                          <p
                            className="mt-3 text-[10px]"
                            style={{
                              color:
                                "var(--text-disabled)",
                            }}
                          >
                            Source:{" "}
                            {
                              constraint.source
                            }
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {scenarioResult.scoring && (
            <section
              className="rounded-xl border"
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border)",
              }}
            >
              <div
                className="border-b p-5 sm:p-6"
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <LuLightbulb
                    size={18}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      Scenario Scoring
                    </h3>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Agent-level scoring and the resulting
                      planning decision.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {scenarioResult
                  .scoring.agent_scores &&
                  Object.entries(
                    scenarioResult
                      .scoring
                      .agent_scores
                  ).length >
                    0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {Object.entries(
                        scenarioResult
                          .scoring
                          .agent_scores
                      ).map(
                        ([
                          name,
                          score,
                        ]) => {
                          const state =
                            getScoreState(
                              Number(
                                score
                              )
                            );

                          return (
                            <div
                              key={name}
                              className="rounded-xl border p-4"
                              style={{
                                backgroundColor:
                                  state.background,
                                borderColor:
                                  state.border,
                              }}
                            >
                              <p
                                className="truncate text-xs font-medium"
                                style={{
                                  color:
                                    "var(--text-secondary)",
                                }}
                              >
                                {name}
                              </p>

                              <p
                                className="mt-2 text-2xl font-bold"
                                style={{
                                  color:
                                    state.color,
                                }}
                              >
                                {Number(
                                  score
                                ).toFixed(
                                  1
                                )}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                {scenarioResult
                  .scoring
                  .decision && (
                  <div
                    className="mt-5 rounded-xl border p-4"
                    style={{
                      backgroundColor:
                        "var(--surface-secondary)",
                      borderColor:
                        "var(--border)",
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Planning Decision
                    </p>

                    <p
                      className="mt-2 text-sm leading-6"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {
                        scenarioResult
                          .scoring
                          .decision
                      }
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {scenarioDesign && (
            <section
              className="overflow-hidden rounded-xl border"
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border)",
                boxShadow:
                  "var(--shadow-sm)",
              }}
            >
              <div
                className="border-b p-5 sm:p-6"
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <LuCircleCheck
                        size={16}
                        strokeWidth={1.9}
                        style={{
                          color:
                            "var(--success)",
                        }}
                      />

                      <p
                        className="text-xs font-semibold uppercase tracking-[0.1em]"
                        style={{
                          color:
                            "var(--success)",
                        }}
                      >
                        Scenario Design Generated
                      </p>
                    </div>

                    <h3
                      className="mt-1 text-xl font-bold tracking-tight"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {selectedIntervention?.label ??
                        "Scenario Design"}
                    </h3>

                    <p
                      className="mt-2 max-w-2xl text-sm leading-6"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      This design starts from the baseline
                      design and applies the selected
                      intervention.
                    </p>
                  </div>

                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor:
                        "var(--success-soft)",
                      borderColor:
                        "var(--success-border)",
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Intervention
                    </p>

                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {scenarioDesign
                        .scenario
                        ?.intervention ??
                        intervention}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="Site Area"
                    value={`${formatValue(
                      scenarioDesign
                        .site
                        ?.area_m2
                    )} m²`}
                    icon={
                      LuMap
                    }
                  />

                  <Metric
                    label="Building Type"
                    value={formatValue(
                      scenarioDesign
                        .building
                        ?.type
                    )}
                    icon={
                      LuBuilding2
                    }
                  />

                  <Metric
                    label="Ground Coverage"
                    value={`${formatValue(
                      scenarioDesign
                        .building
                        ?.ground_coverage_percent
                    )}%`}
                    icon={
                      LuRuler
                    }
                  />

                  <Metric
                    label="Coordinates"
                    value={
                      Array.isArray(
                        scenarioDesign
                          .coordinates
                      )
                        ? scenarioDesign
                            .coordinates
                            .length
                        : 0
                    }
                    icon={
                      LuMap
                    }
                  />
                </div>

                {scenarioDesign
                  .site_elements
                  ?.road_widening && (
                  <div
                    className="mt-5 rounded-xl border p-5"
                    style={{
                      backgroundColor:
                        "var(--primary-soft)",
                      borderColor:
                        "var(--primary-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LuRuler
                        size={17}
                        strokeWidth={1.8}
                        style={{
                          color:
                            "var(--primary)",
                        }}
                      />

                      <h4
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        Road Widening
                      </h4>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Metric
                        label="New Road Width"
                        value={`${formatValue(
                          scenarioDesign
                            .site_elements
                            .road_width_m
                        )} m`}
                        icon={
                          LuRuler
                        }
                      />

                      <Metric
                        label="Target Width"
                        value={`${formatValue(
                          scenarioDesign
                            .site_elements
                            .road_widening_target_m
                        )} m`}
                        icon={
                          LuRuler
                        }
                      />

                      <Metric
                        label="Status"
                        value="Applied"
                        icon={
                          LuCircleCheck
                        }
                      />
                    </div>
                  </div>
                )}

                {scenarioDesign
                  .site_elements
                  ?.footpath_width_m !==
                  undefined && (
                  <div
                    className="mt-5 rounded-xl border p-5"
                    style={{
                      backgroundColor:
                        "var(--primary-soft)",
                      borderColor:
                        "var(--primary-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LuArrowRight
                        size={17}
                        strokeWidth={1.8}
                        style={{
                          color:
                            "var(--primary)",
                        }}
                      />

                      <h4
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        Footpath
                      </h4>
                    </div>

                    <p
                      className="mt-3 text-xl font-bold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {
                        scenarioDesign
                          .site_elements
                          .footpath_width_m
                      }{" "}
                      m
                    </p>
                  </div>
                )}

                {scenarioDesign
                  .site_elements
                  ?.parking_capacity !==
                  undefined &&
                  intervention ===
                    "parking" && (
                    <div
                      className="mt-5 rounded-xl border p-5"
                      style={{
                        backgroundColor:
                          "var(--warning-soft)",
                        borderColor:
                          "var(--warning-border)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <LuCar
                          size={17}
                          strokeWidth={1.8}
                          style={{
                            color:
                              "var(--warning)",
                          }}
                        />

                        <h4
                          className="text-sm font-semibold"
                          style={{
                            color:
                              "var(--text-primary)",
                          }}
                        >
                          Parking
                        </h4>
                      </div>

                      <p
                        className="mt-3 text-xl font-bold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        {
                          scenarioDesign
                            .site_elements
                            .parking_capacity
                        }{" "}
                        spaces
                      </p>
                    </div>
                  )}

                {scenarioDesign
                  .site_elements
                  ?.green_area_percentage !==
                  undefined && (
                  <div
                    className="mt-5 rounded-xl border p-5"
                    style={{
                      backgroundColor:
                        "var(--success-soft)",
                      borderColor:
                        "var(--success-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LuLeaf
                        size={17}
                        strokeWidth={1.8}
                        style={{
                          color:
                            "var(--success)",
                        }}
                      />

                      <h4
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        Green Space
                      </h4>
                    </div>

                    <p
                      className="mt-3 text-xl font-bold"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {
                        scenarioDesign
                          .site_elements
                          .green_area_percentage
                      }
                      %
                    </p>
                  </div>
                )}

                <div className="report-scenario-map mt-6">
                  <ScenarioDesignMap
                    intervention={
                      intervention
                    }
                    coordinates={
                      scenarioDesign.coordinates ??
                      []
                    }
                    area={
                      typeof scenarioDesign
                        .site
                        ?.area_m2 ===
                      "number"
                        ? scenarioDesign
                            .site
                            .area_m2
                        : null
                    }
                    groundCoveragePercent={
                      typeof scenarioDesign
                        .building
                        ?.ground_coverage_percent ===
                      "number"
                        ? scenarioDesign
                            .building
                            .ground_coverage_percent
                        : null
                    }
                    roadWidth={
                      typeof scenarioDesign
                        .site_elements
                        ?.road_width_m ===
                      "number"
                        ? scenarioDesign
                            .site_elements
                            .road_width_m
                        : null
                    }
                    roadWidening={
                      scenarioDesign
                        .site_elements
                        ?.road_widening ===
                      true
                    }
                    footpathWidth={
                      typeof scenarioDesign
                        .site_elements
                        ?.footpath_width_m ===
                      "number"
                        ? scenarioDesign
                            .site_elements
                            .footpath_width_m
                        : null
                    }
                    parkingCapacity={
                      typeof scenarioDesign
                        .site_elements
                        ?.parking_capacity ===
                      "number"
                        ? scenarioDesign
                            .site_elements
                            .parking_capacity
                        : null
                    }
                    greenArea={
                      scenarioDesign
                        .site_elements
                        ?.green_area ===
                      true
                    }
                    greenAreaPercentage={
                      typeof scenarioDesign
                        .site_elements
                        ?.green_area_percentage ===
                      "number"
                        ? scenarioDesign
                            .site_elements
                            .green_area_percentage
                        : null
                    }
                    pedestrianCirculation={
                      scenarioDesign
                        .site_elements
                        ?.pedestrian_circulation ===
                      true
                    }
                    serviceAccess={
                      scenarioDesign
                        .site_elements
                        ?.service_access ===
                      true
                    }
                    fireAccess={
                      scenarioDesign
                        .site_elements
                        ?.fire_access ===
                      true
                    }
                    trafficSignal={
                      scenarioDesign
                        .site_elements
                        ?.traffic_signal ===
                      true
                    }
                    newRoad={
                      scenarioDesign
                        .site_elements
                        ?.new_road ===
                      true
                    }
                    busStop={
                      scenarioDesign
                        .site_elements
                        ?.bus_stop ===
                      true
                    }
                    streetLighting={
                      scenarioDesign
                        .site_elements
                        ?.street_lighting ===
                      true
                    }
                    drainage={
                      scenarioDesign
                        .site_elements
                        ?.drainage ===
                      true
                    }
                    rainwaterHarvesting={
                      scenarioDesign
                        .site_elements
                        ?.rainwater_harvesting ===
                      true
                    }
                    solar={
                      scenarioDesign
                        .site_elements
                        ?.solar ===
                      true
                    }
                    evCharging={
                      scenarioDesign
                        .site_elements
                        ?.ev_charging ===
                      true
                    }
                  />
                </div>
              </div>

              <details
                className="border-t"
                style={{
                  borderColor:
                    "var(--border)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold sm:px-6"
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",
                    color:
                      "var(--text-primary)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <LuFileText
                      size={16}
                      strokeWidth={1.8}
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    />
                    Scenario Design Data
                  </span>

                  <LuChevronDown
                    size={16}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  />
                </summary>

                <div className="border-t p-5 sm:p-6">
                  <pre
                    className="max-h-[500px] overflow-auto rounded-xl border p-5 text-xs leading-5"
                    style={{
                      backgroundColor:
                        "var(--surface-tertiary)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {JSON.stringify(
                      scenarioDesign,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </details>
            </section>
          )}

          {scenarioResult.project && (
            <details
              className="overflow-hidden rounded-xl border"
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border)",
              }}
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold sm:px-6"
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  color:
                    "var(--text-primary)",
                }}
              >
                <span className="flex items-center gap-2">
                  <LuBuilding2
                    size={16}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />
                  Scenario Project Data
                </span>

                <LuChevronDown
                  size={16}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--text-muted)",
                    }}
                  />
              </summary>

              <div className="border-t p-5 sm:p-6">
                <pre
                  className="max-h-[500px] overflow-auto rounded-xl border p-5 text-xs leading-5"
                  style={{
                    backgroundColor:
                      "var(--surface-tertiary)",
                    borderColor:
                      "var(--border)",
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  {JSON.stringify(
                    scenarioResult.project,
                    null,
                    2
                  )}
                </pre>
              </div>
            </details>
          )}

          <details
            className="overflow-hidden rounded-xl border"
            style={{
              backgroundColor:
                "var(--surface)",
              borderColor:
                "var(--border)",
            }}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold sm:px-6"
              style={{
                backgroundColor:
                  "var(--surface-secondary)",
                color:
                  "var(--text-primary)",
              }}
            >
              <span className="flex items-center gap-2">
                <LuFileText
                  size={16}
                  strokeWidth={1.8}
                  style={{
                    color:
                      "var(--primary)",
                  }}
                />
                Technical Scenario Response
              </span>

              <LuChevronDown
                size={16}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--text-muted)",
                  }}
                />
            </summary>

            <div className="border-t p-5 sm:p-6">
              <pre
                className="max-h-[600px] overflow-auto rounded-xl border p-5 text-xs leading-5"
                style={{
                  backgroundColor:
                    "var(--surface-tertiary)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-secondary)",
                }}
              >
                {JSON.stringify(
                  scenarioResult,
                  null,
                  2
                )}
              </pre>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}