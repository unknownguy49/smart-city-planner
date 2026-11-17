import type { ComponentType } from "react";
import {
  LuChevronDown,
  LuCircleCheck,
  LuFileText,
  LuLightbulb,
} from "react-icons/lu";

interface AgentData {
  agent?: string;
  summary?: string;
  score?: number;
  recommendations?: string[];
  regulation_context?: string;
  rag_context?: string;
  [key: string]: unknown;
}

interface AgentCardProps {
  title: string;
  description?: string;
  icon?: ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  data?: AgentData;
}

function formatKey(key: string): string {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function formatValue(value: unknown): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(
          undefined,
          {
            maximumFractionDigits: 2,
          }
        );
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        formatValue(item)
      )
      .join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function ObjectDetails({
  value,
}: {
  value: Record<string, unknown>;
}) {
  return (
    <div
      className="divide-y rounded-lg border"
      style={{
        backgroundColor:
          "var(--surface-secondary)",
        borderColor:
          "var(--border)",
      }}
    >
      {Object.entries(value).map(
        ([key, item]) => (
          <div
            key={key}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            <span
              className="text-xs font-medium"
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              {formatKey(key)}
            </span>

            <span
              className="text-right text-xs font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {typeof item ===
                  "object" &&
                item !== null
                ? JSON.stringify(item)
                : formatValue(item)}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function getScoreState(
  score?: number
) {
  if (
    typeof score !== "number"
  ) {
    return {
      label: "No score",
      color: "var(--text-muted)",
      background:
        "var(--surface-secondary)",
      border:
        "var(--border)",
    };
  }

  if (score >= 90) {
    return {
      label: "Excellent",
      color: "var(--success)",
      background:
        "var(--success-soft)",
      border:
        "var(--success-border)",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      color: "var(--primary)",
      background:
        "var(--primary-soft)",
      border:
        "var(--primary-border)",
    };
  }

  if (score >= 60) {
    return {
      label: "Moderate",
      color: "var(--warning)",
      background:
        "var(--warning-soft)",
      border:
        "var(--warning-border)",
    };
  }

  return {
    label: "Needs attention",
    color: "var(--danger)",
    background:
      "var(--danger-soft)",
    border:
      "var(--danger-border)",
  };
}

export default function AgentCard({
  title,
  description,
  icon: Icon,
  data,
}: AgentCardProps) {
  const scoreState =
    getScoreState(data?.score);

  if (!data) {
    return (
      <div
        className="rounded-xl border p-4 sm:p-5"
        style={{
          backgroundColor:
            "var(--surface)",
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--surface-secondary)",
              color:
                "var(--text-muted)",
            }}
          >
            {Icon ? (
              <Icon
                size={19}
                strokeWidth={1.8}
              />
            ) : (
              <LuFileText
                size={19}
                strokeWidth={1.8}
              />
            )}
          </div>

          <div>
            <h3
              className="text-base font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {title}
            </h3>

            {description && (
              <p
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-5 rounded-lg border p-4"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <p
            className="text-sm"
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            Waiting for AI analysis...
          </p>
        </div>
      </div>
    );
  }

  const hiddenFields = [
    "agent",
    "summary",
    "score",
    "recommendations",
    "regulation_context",
    "rag_context",
  ];

  const visibleEntries =
    Object.entries(data).filter(
      ([key]) =>
        !hiddenFields.includes(key)
    );

  return (
    <article
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
        className="flex flex-col items-start justify-between gap-3 border-b p-4 sm:flex-row sm:gap-4 sm:p-5"
        style={{
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor:
                "var(--primary-soft)",
              color:
                "var(--primary)",
            }}
          >
            {Icon ? (
              <Icon
                size={19}
                strokeWidth={1.8}
              />
            ) : (
              <LuFileText
                size={19}
                strokeWidth={1.8}
              />
            )}
          </div>

          <div className="min-w-0">
            <h3
              className="text-base font-semibold"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {title}
            </h3>

            {description && (
              <p
                className="mt-1 text-xs leading-5"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div
          className="shrink-0 rounded-lg border px-3 py-2 text-left sm:text-right"
          style={{
            backgroundColor:
              scoreState.background,
            borderColor:
              scoreState.border,
          }}
        >
          <p
            className="text-lg font-bold leading-5"
            style={{
              color:
                scoreState.color,
            }}
          >
            {typeof data.score ===
            "number"
              ? data.score
              : "—"}
          </p>

          <p
            className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              color:
                scoreState.color,
            }}
          >
            {scoreState.label}
          </p>
        </div>
      </div>

      {data.summary && (
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <p
            className="text-sm leading-6"
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            {data.summary}
          </p>
        </div>
      )}

      {visibleEntries.length >
        0 && (
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <div
            className="divide-y rounded-lg border"
            style={{
              borderColor:
                "var(--border)",
            }}
          >
            {visibleEntries.map(
              ([key, value]) => {
                if (
                  typeof value ===
                    "object" &&
                  value !== null &&
                  !Array.isArray(
                    value
                  )
                ) {
                  return (
                    <details
                      key={key}
                      className="group"
                    >
                      <summary
                        className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3"
                        style={{
                          color:
                            "var(--text-primary)",
                        }}
                      >
                        <span className="text-xs font-semibold">
                          {formatKey(key)}
                        </span>

                        <LuChevronDown
                          size={15}
                          strokeWidth={1.8}
                          className="transition-transform group-open:rotate-180"
                          style={{
                            color:
                              "var(--text-muted)",
                          }}
                        />
                      </summary>

                      <div className="px-4 pb-4">
                        <ObjectDetails
                          value={
                            value as Record<
                              string,
                              unknown
                            >
                          }
                        />
                      </div>
                    </details>
                  );
                }

                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {formatKey(key)}
                    </span>

                    <span
                      className="text-xs font-semibold sm:text-right"
                      style={{
                        color:
                          "var(--text-primary)",
                      }}
                    >
                      {formatValue(
                        value
                      )}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {Array.isArray(
        data.recommendations
      ) &&
        data.recommendations
          .length > 0 && (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <LuLightbulb
                size={16}
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
                Recommendations
              </h4>
            </div>

            <div className="space-y-2">
              {data.recommendations.map(
                (item, index) => (
                  <div
                    key={`${index}-${item}`}
                    className="flex items-start gap-2.5 rounded-lg border p-3"
                    style={{
                      backgroundColor:
                        "var(--success-soft)",
                      borderColor:
                        "var(--success-border)",
                    }}
                  >
                    <LuCircleCheck
                      size={16}
                      strokeWidth={1.9}
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
                      {item}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {(data.regulation_context ||
        data.rag_context) && (
        <details
          className="border-t"
          style={{
            borderColor:
              "var(--border)",
          }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4"
            style={{
              backgroundColor:
                "var(--surface-secondary)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <LuFileText
                size={16}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--primary)",
                }}
              />

              <span
                className="text-sm font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Regulation & RAG Context
              </span>
            </div>

            <LuChevronDown
              size={15}
              strokeWidth={1.8}
              style={{
                color:
                  "var(--text-muted)",
              }}
            />
          </summary>

          <div className="p-4 sm:p-5">
            <div
              className="max-h-96 overflow-auto rounded-lg border p-3 text-xs sm:p-4"
              style={{
                backgroundColor:
                  "var(--surface)",
                borderColor:
                  "var(--border)",
              }}
            >
              <p
                className="whitespace-pre-wrap text-xs leading-6"
                style={{
                  color:
                    "var(--text-secondary)",
                }}
              >
                {data.regulation_context ||
                  data.rag_context}
              </p>
            </div>
          </div>
        </details>
      )}
    </article>
  );
}