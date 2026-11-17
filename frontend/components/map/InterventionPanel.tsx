"use client";

import { useState } from "react";
import axios from "axios";
import {
  LuBot,
  LuBuilding2,
  LuCircleAlert,
  LuFileText,
  LuLeaf,
  LuRuler,
  LuShieldCheck,
  LuUsers,
} from "react-icons/lu";

import { useProjectStore } from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";

interface AgentResult {
  score?: number;
  status?: string;
  risk_level?: string;
  recommendations?: string[];
  recommendation?: string;
  summary?: string;
  analysis?: string;
  [key: string]: unknown;
}

interface ConstraintDetail {
  constraint?: string;
  status?: string;
  actual?: number | string | null;
  required?: number | string | null;
  message?: string;
  severity?: string;
  source?: string;
  [key: string]: unknown;
}

interface InterventionResult {
  intervention: {
    type: string;
    parameters: Record<string, number>;
  };

  status: string;

  scenario_project?: Record<string, unknown>;

  constraints?: {
    status?: string;
    compliance_score?: number;
    summary?: Record<string, unknown>;
    constraints?: ConstraintDetail[];
  };

  scoring?: {
    overall_score?: number;
    agent_scores?: Record<string, number>;
  };

  architecture?: AgentResult;
  civil?: AgentResult;
  sustainability?: AgentResult;
  municipal?: AgentResult;
  citizen?: AgentResult;

  planning_decision?: Record<string, unknown>;

  project_summary?: Record<string, unknown>;

  osm?: Record<string, unknown>;
}

interface InterventionPanelProps {
  onResult?: (
    result: InterventionResult
  ) => void;
}

const interventions = [
  {
    value: "road_widening",
    label: "Road Widening",
  },
  {
    value: "green_space",
    label: "Green Space",
  },
];

export default function InterventionPanel({
  onResult,
}: InterventionPanelProps) {
  const {
    projectName,
    buildingType,
    commercialSubtype,
    city,
    state,
    budget,
    area,
    coordinates,
  } = useProjectStore();

  const polygonArea =
    usePolygonStore(
      (state) => state.area
    );

  const [
    intervention,
    setIntervention,
  ] = useState(
    "road_widening"
  );

  const [
    currentRoadWidth,
    setCurrentRoadWidth,
  ] = useState(12);

  const [
    proposedRoadWidth,
    setProposedRoadWidth,
  ] = useState(18);

  const [
    proposedGreenArea,
    setProposedGreenArea,
  ] = useState(20);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState<InterventionResult | null>(
    null
  );

  async function handleAnalyze() {
    setError("");
    setResult(null);

    if (!projectName) {
      setError(
        "Please create or select a project first."
      );

      return;
    }

    if (coordinates.length < 3) {
      setError(
        "Please draw/select a land area on the map first."
      );

      return;
    }

    const parameters: Record<
      string,
      number
    > = {};

    if (
      intervention ===
      "road_widening"
    ) {
      if (
        currentRoadWidth <= 0 ||
        proposedRoadWidth <= 0
      ) {
        setError(
          "Road widths must be greater than 0."
        );

        return;
      }

      if (
        proposedRoadWidth <=
        currentRoadWidth
      ) {
        setError(
          "Proposed road width should be greater than the current width."
        );

        return;
      }

      parameters.current_width =
        currentRoadWidth;

      parameters.proposed_width =
        proposedRoadWidth;
    }

    if (
      intervention ===
      "green_space"
    ) {
      if (
        proposedGreenArea <= 0 ||
        proposedGreenArea > 100
      ) {
        setError(
          "Green area percentage must be between 1 and 100."
        );

        return;
      }

      parameters.target_percentage =
        proposedGreenArea;
    }

    const project = {
      project_name:
        projectName,

      building_type:
        buildingType,

      commercial_subtype:
        commercialSubtype || null,

      city,

      state,

      jurisdiction:
        state,

      budget,

      area:
        polygonArea > 0
          ? polygonArea
          : area,

      coordinates,
    };

    try {
      setLoading(true);

      const response =
        await axios.post<InterventionResult>(
          "http://127.0.0.1:8000/planner/intervention",
          {
            project,
            intervention,
            parameters,
          }
        );

      const interventionResult =
        response.data;

      setResult(
        interventionResult
      );

      onResult?.(
        interventionResult
      );

      console.log(
        "========== INTERVENTION RESULT =========="
      );

      console.log(
        interventionResult
      );
    } catch (
      requestError: unknown
    ) {
      console.error(
        "Intervention analysis failed:",
        requestError
      );

      if (
        axios.isAxiosError(
          requestError
        )
      ) {
        const detail =
          requestError.response
            ?.data?.detail;

        setError(
          typeof detail ===
          "string"
            ? detail
            : "Intervention analysis failed."
        );
      } else {
        setError(
          "Intervention analysis failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function renderAgentResult(
    title: string,
    icon: React.ReactNode,
    agent: AgentResult | undefined
  ) {
    if (!agent) {
      return null;
    }

    return (
      <div
        className="
          border-t
          py-5
        "
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
            "
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className="
                text-sm
                font-semibold
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {title}
            </h4>

            <div className="mt-3 space-y-2">
              {typeof agent.score ===
                "number" && (
                <MetricRow
                  label="Score"
                  value={String(
                    agent.score
                  )}
                />
              )}

              {agent.status && (
                <MetricRow
                  label="Status"
                  value={
                    agent.status
                  }
                />
              )}

              {agent.risk_level && (
                <MetricRow
                  label="Risk Level"
                  value={
                    agent.risk_level
                  }
                />
              )}
            </div>

            {agent.summary && (
              <TextBlock
                label="Summary"
                value={
                  agent.summary
                }
              />
            )}

            {agent.analysis && (
              <TextBlock
                label="Analysis"
                value={
                  agent.analysis
                }
              />
            )}

            {agent.recommendation && (
              <TextBlock
                label="Recommendation"
                value={
                  agent.recommendation
                }
              />
            )}

            {agent.recommendations &&
              agent.recommendations.length >
                0 && (
                <div className="mt-4">
                  <p
                    className="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                    "
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    Recommendations
                  </p>

                  <ul
                    className="
                      mt-2
                      space-y-2
                    "
                  >
                    {agent.recommendations.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={`${title}-${index}`}
                          className="
                            flex
                            items-start
                            gap-2
                            text-sm
                            leading-5
                          "
                          style={{
                            color:
                              "var(--text-secondary)",
                          }}
                        >
                          <span
                            className="
                              mt-2
                              h-1.5
                              w-1.5
                              shrink-0
                              rounded-full
                            "
                            style={{
                              backgroundColor:
                                "var(--primary)",
                            }}
                          />

                          <span>
                            {item}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
      "
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
      }}
    >
      <div
        className="
          border-b
          px-5
          py-5
          sm:px-6
        "
        style={{
          backgroundColor:
            "var(--surface-secondary)",
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-lg
            "
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            <LuBot
              size={20}
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.14em]
              "
              style={{
                color:
                  "var(--primary)",
              }}
            >
              AI Planning Analysis
            </p>

            <h2
              className="
                mt-1
                text-lg
                font-semibold
                tracking-tight
              "
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              Smart City Intervention
            </h2>

            <p
              className="
                mt-1.5
                max-w-2xl
                text-sm
                leading-5
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              Select an improvement scenario
              and evaluate its feasibility for
              the selected area.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">

        <div
          className="
            rounded-xl
            border
            p-4
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
              "
              style={{
                backgroundColor:
                  "var(--surface)",
                color:
                  "var(--primary)",
              }}
            >
              <LuBuilding2
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Current Project
              </p>

              <p
                className="
                  mt-1
                  truncate
                  text-sm
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                {projectName ||
                  "No project selected"}
              </p>

              {buildingType && (
                <p
                  className="
                    mt-1
                    text-xs
                  "
                  style={{
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  {buildingType}

                  {buildingType.toLowerCase() ===
                    "commercial" &&
                    commercialSubtype
                    ? ` • ${commercialSubtype}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">

          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
              "
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <LuRuler
                size={16}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h3
                className="
                  text-sm
                  font-semibold
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Intervention Parameters
              </h3>

              <p
                className="
                  mt-0.5
                  text-xs
                "
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Define the scenario to evaluate.
              </p>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-5
              md:grid-cols-2
            "
          >
            <FieldContainer>
              <label
                htmlFor="intervention"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                "
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Improvement Type
              </label>

              <select
                id="intervention"
                value={intervention}
                onChange={(event) =>
                  setIntervention(
                    event.target.value
                  )
                }
                className="
                  h-11
                  w-full
                  rounded-lg
                  border
                  px-3.5
                  text-sm
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-2
                  focus:ring-[var(--focus-ring)]
                "
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                  color:
                    "var(--text-primary)",
                }}
              >
                {interventions.map(
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
            </FieldContainer>

            {intervention ===
              "road_widening" && (
              <>
                <FieldContainer>
                  <label
                    htmlFor="current-width"
                    className="
                      mb-2
                      block
                      text-sm
                      font-medium
                    "
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Current Road Width (m)
                  </label>

                  <input
                    id="current-width"
                    type="number"
                    min="1"
                    value={
                      currentRoadWidth
                    }
                    onChange={(event) =>
                      setCurrentRoadWidth(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    className="
                      h-11
                      w-full
                      rounded-lg
                      border
                      px-3.5
                      text-sm
                      outline-none
                      transition
                      focus:border-[var(--primary)]
                      focus:ring-2
                      focus:ring-[var(--focus-ring)]
                    "
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </FieldContainer>

                <FieldContainer>
                  <label
                    htmlFor="proposed-width"
                    className="
                      mb-2
                      block
                      text-sm
                      font-medium
                    "
                    style={{
                      color:
                        "var(--text-primary)",
                    }}
                  >
                    Proposed Road Width (m)
                  </label>

                  <input
                    id="proposed-width"
                    type="number"
                    min="1"
                    value={
                      proposedRoadWidth
                    }
                    onChange={(event) =>
                      setProposedRoadWidth(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    className="
                      h-11
                      w-full
                      rounded-lg
                      border
                      px-3.5
                      text-sm
                      outline-none
                      transition
                      focus:border-[var(--primary)]
                      focus:ring-2
                      focus:ring-[var(--focus-ring)]
                    "
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />
                </FieldContainer>
              </>
            )}

            {intervention ===
              "green_space" && (
              <FieldContainer>
                <label
                  htmlFor="green-area"
                  className="
                    mb-2
                    block
                    text-sm
                    font-medium
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Proposed Green Area (%)
                </label>

                <div className="relative">
                  <input
                    id="green-area"
                    type="number"
                    min="1"
                    max="100"
                    value={
                      proposedGreenArea
                    }
                    onChange={(event) =>
                      setProposedGreenArea(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    className="
                      h-11
                      w-full
                      rounded-lg
                      border
                      px-3.5
                      pr-12
                      text-sm
                      outline-none
                      transition
                      focus:border-[var(--primary)]
                      focus:ring-2
                      focus:ring-[var(--focus-ring)]
                    "
                    style={{
                      backgroundColor:
                        "var(--surface)",
                      borderColor:
                        "var(--border)",
                      color:
                        "var(--text-primary)",
                    }}
                  />

                  <span
                    className="
                      pointer-events-none
                      absolute
                      right-3.5
                      top-1/2
                      -translate-y-1/2
                      text-sm
                      font-medium
                    "
                    style={{
                      color:
                        "var(--text-muted)",
                    }}
                  >
                    %
                  </span>
                </div>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                  "
                  style={{
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Percentage of the project
                  area reserved for green
                  space.
                </p>
              </FieldContainer>
            )}
          </div>
        </div>

        {error && (
          <div
            className="
              mt-5
              flex
              items-start
              gap-3
              rounded-lg
              border
              p-4
            "
            style={{
              backgroundColor:
                "var(--danger-soft)",
              borderColor:
                "var(--danger-border)",
            }}
          >
            <LuCircleAlert
              size={18}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
              style={{
                color:
                  "var(--danger)",
              }}
            />

            <p
              className="
                text-sm
                leading-5
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              {error}
            </p>
          </div>
        )}

        <div
          className="
            mt-6
            flex
            flex-col
            gap-3
            rounded-xl
            border
            p-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <LuBot
              size={17}
              strokeWidth={1.8}
              style={{
                color:
                  "var(--primary)",
              }}
            />

            <p
              className="
                text-xs
                leading-5
              "
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              The selected scenario will be
              evaluated by the planning agents.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-2
              rounded-lg
              px-5
              text-sm
              font-semibold
              transition
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            style={{
              backgroundColor:
                "var(--primary)",
              color:
                "var(--primary-foreground)",
            }}
          >
            <LuBot
              size={16}
              strokeWidth={1.8}
            />

            {loading
              ? "Analyzing..."
              : "Analyze Improvement"}
          </button>
        </div>

        {result && (
          <div className="mt-7">

            <div
              className="
                flex
                items-start
                gap-3
                border-b
                pb-5
              "
              style={{
                borderColor:
                  "var(--border)",
              }}
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                "
                style={{
                  backgroundColor:
                    "var(--success-soft)",
                  color:
                    "var(--success)",
                }}
              >
                <LuShieldCheck
                  size={20}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.14em]
                  "
                  style={{
                    color:
                      "var(--success)",
                  }}
                >
                  Analysis Complete
                </p>

                <h3
                  className="
                    mt-1
                    text-lg
                    font-semibold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Intervention Result
                </h3>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

              <ResultCard
                title="Status"
                icon={
                  <LuShieldCheck
                    size={16}
                    strokeWidth={1.8}
                  />
                }
              >
                <p
                  className="
                    text-lg
                    font-bold
                  "
                  style={{
                    color:
                      "var(--text-primary)",
                  }}
                >
                  {result.status}
                </p>
              </ResultCard>

              {result.scoring && (
                <ResultCard
                  title="Planning Score"
                  icon={
                    <LuRuler
                      size={16}
                      strokeWidth={1.8}
                    />
                  }
                >
                  {typeof result.scoring
                    .overall_score ===
                  "number" ? (
                    <p
                      className="
                        text-2xl
                        font-bold
                      "
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    >
                      {
                        result.scoring
                          .overall_score
                      }
                    </p>
                  ) : (
                    <p
                      className="
                        text-sm
                      "
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Not available
                    </p>
                  )}
                </ResultCard>
              )}

            </div>

            {result.constraints && (
              <div
                className="
                  mt-4
                  overflow-hidden
                  rounded-xl
                  border
                "
                style={{
                  backgroundColor:
                    "var(--surface)",
                  borderColor:
                    "var(--border)",
                }}
              >
                <div
                  className="
                    border-b
                    px-5
                    py-4
                  "
                  style={{
                    backgroundColor:
                      "var(--surface-secondary)",
                    borderColor:
                      "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <LuShieldCheck
                      size={17}
                      strokeWidth={1.8}
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    />

                    <h3
                      className="
                        text-sm
                        font-semibold
                      "
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      Constraint Evaluation
                    </h3>
                  </div>
                </div>

                <div className="p-5">

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="
                        rounded-full
                        px-3
                        py-1
                        text-xs
                        font-semibold
                      "
                      style={{
                        backgroundColor:
                          "var(--primary-soft)",
                        color:
                          "var(--primary)",
                      }}
                    >
                      {result.constraints
                        .status ||
                        "Not available"}
                    </span>

                    {typeof result.constraints
                      .compliance_score ===
                      "number" && (
                      <span
                        className="
                          text-sm
                          font-medium
                        "
                        style={{
                          color:
                            "var(--text-secondary)",
                        }}
                      >
                        Compliance Score:{" "}
                        <strong
                          style={{
                            color:
                              "var(--text-primary)",
                          }}
                        >
                          {
                            result
                              .constraints
                              .compliance_score
                          }
                        </strong>
                      </span>
                    )}
                  </div>

                  {result.constraints
                    .constraints &&
                    result.constraints
                      .constraints.length >
                      0 && (
                      <div className="mt-5">

                        <p
                          className="
                            text-xs
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                          "
                          style={{
                            color:
                              "var(--text-muted)",
                          }}
                        >
                          Detailed Checks
                        </p>

                        <div className="mt-3 space-y-3">
                          {result.constraints.constraints.map(
                            (
                              constraint,
                              index
                            ) => (
                              <div
                                key={`${constraint.constraint ?? "constraint"}-${index}`}
                                className="
                                  rounded-lg
                                  border
                                  p-4
                                "
                                style={{
                                  backgroundColor:
                                    "var(--surface-secondary)",
                                  borderColor:
                                    "var(--border)",
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p
                                    className="
                                      text-sm
                                      font-semibold
                                    "
                                    style={{
                                      color:
                                        "var(--text-primary)",
                                    }}
                                  >
                                    {constraint.constraint ??
                                      `Constraint ${
                                        index +
                                        1
                                      }`}
                                  </p>

                                  {constraint.status && (
                                    <span
                                      className="
                                        shrink-0
                                        rounded-full
                                        px-2.5
                                        py-1
                                        text-[10px]
                                        font-semibold
                                        uppercase
                                        tracking-[0.06em]
                                      "
                                      style={{
                                        backgroundColor:
                                          "var(--surface)",
                                        color:
                                          "var(--text-secondary)",
                                      }}
                                    >
                                      {
                                        constraint.status
                                      }
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 space-y-1.5">

                                  {constraint.actual !==
                                    undefined && (
                                    <DetailRow
                                      label="Actual"
                                      value={String(
                                        constraint.actual
                                      )}
                                    />
                                  )}

                                  {constraint.required !==
                                    undefined && (
                                    <DetailRow
                                      label="Required"
                                      value={String(
                                        constraint.required
                                      )}
                                    />
                                  )}

                                  {constraint.severity && (
                                    <DetailRow
                                      label="Severity"
                                      value={
                                        constraint.severity
                                      }
                                    />
                                  )}

                                  {constraint.source && (
                                    <DetailRow
                                      label="Source"
                                      value={
                                        constraint.source
                                      }
                                    />
                                  )}

                                </div>

                                {constraint.message && (
                                  <p
                                    className="
                                      mt-3
                                      text-sm
                                      leading-5
                                    "
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
                            )
                          )}
                        </div>

                      </div>
                    )}

                </div>
              </div>
            )}

            <div
              className="
                mt-4
                overflow-hidden
                rounded-xl
                border
              "
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border)",
              }}
            >
              <div
                className="
                  border-b
                  px-5
                  py-4
                "
                style={{
                  backgroundColor:
                    "var(--surface-secondary)",
                  borderColor:
                    "var(--border)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <LuBot
                    size={18}
                    strokeWidth={1.8}
                    style={{
                      color:
                        "var(--primary)",
                    }}
                  />

                  <div>
                    <h3
                      className="
                        text-sm
                        font-semibold
                      "
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      AI Recommendations
                    </h3>

                    <p
                      className="
                        mt-0.5
                        text-xs
                      "
                      style={{
                        color:
                          "var(--text-muted)",
                      }}
                    >
                      Analysis from the planning
                      agents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5">

                {renderAgentResult(
                  "Architecture Agent",
                  <LuBuilding2
                    size={17}
                    strokeWidth={1.8}
                  />,
                  result.architecture
                )}

                {renderAgentResult(
                  "Civil Agent",
                  <LuRuler
                    size={17}
                    strokeWidth={1.8}
                  />,
                  result.civil
                )}

                {renderAgentResult(
                  "Sustainability Agent",
                  <LuLeaf
                    size={17}
                    strokeWidth={1.8}
                  />,
                  result.sustainability
                )}

                {renderAgentResult(
                  "Municipal Agent",
                  <LuShieldCheck
                    size={17}
                    strokeWidth={1.8}
                  />,
                  result.municipal
                )}

                {renderAgentResult(
                  "Citizen Agent",
                  <LuUsers
                    size={17}
                    strokeWidth={1.8}
                  />,
                  result.citizen
                )}

              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
}

function FieldContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>{children}</div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="
          text-xs
          font-medium
        "
        style={{
          color:
            "var(--text-muted)",
        }}
      >
        {label}:
      </span>

      <span
        className="
          text-xs
          font-semibold
        "
        style={{
          color:
            "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4">
      <p
        className="
          text-xs
          font-semibold
          uppercase
          tracking-[0.08em]
        "
        style={{
          color:
            "var(--text-muted)",
        }}
      >
        {label}
      </p>

      <p
        className="
          mt-1.5
          text-sm
          leading-6
        "
        style={{
          color:
            "var(--text-secondary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ResultCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        p-4
      "
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            color:
              "var(--primary)",
          }}
        >
          {icon}
        </span>

        <p
          className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.08em]
          "
          style={{
            color:
              "var(--text-muted)",
          }}
        >
          {title}
        </p>
      </div>

      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className="shrink-0 font-medium"
        style={{
          color:
            "var(--text-muted)",
        }}
      >
        {label}:
      </span>

      <span
        className="min-w-0"
        style={{
          color:
            "var(--text-secondary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}