import {
  LuChartBar,
  LuCircleAlert,
} from "react-icons/lu";

interface ScoreCardProps {
  score: number;
}

function getScoreState(score: number) {
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

export default function ScoreCard({
  score,
}: ScoreCardProps) {
  const safeScore = Math.max(
    0,
    Math.min(100, score)
  );

  const state =
    getScoreState(safeScore);

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
        boxShadow:
          "var(--shadow-md)",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="p-4 sm:p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  "var(--primary-soft)",
                color:
                  "var(--primary)",
              }}
            >
              <LuChartBar
                size={20}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.12em]"
                style={{
                  color:
                    "var(--primary)",
                }}
              >
                Planning Assessment
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Smart City Score
              </h2>
            </div>
          </div>

          <p
            className="mt-5 max-w-xl text-sm leading-6"
            style={{
              color:
                "var(--text-secondary)",
            }}
          >
            The overall score represents the result
            returned by the multi-agent planning analysis
            for the current project.
          </p>

          <div className="mt-5 sm:mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Overall assessment
              </span>

              <span
                className="text-xs font-semibold"
                style={{
                  color:
                    state.color,
                }}
              >
                {state.label}
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full"
              style={{
                backgroundColor:
                  "var(--surface-tertiary)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${safeScore}%`,
                  backgroundColor:
                    state.color,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex flex-row items-center justify-between gap-4 border-t p-4 sm:p-6 lg:flex-col lg:items-center lg:justify-center lg:border-l lg:border-t-0"
          style={{
            backgroundColor:
              "var(--surface-secondary)",
            borderColor:
              "var(--border)",
          }}
        >
          <div className="flex items-baseline gap-1">
            <span
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{
                color:
                  "var(--text-primary)",
              }}
            >
              {safeScore}
            </span>

            <span
              className="text-lg font-medium"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              /100
            </span>
          </div>

          <div
            className="mt-0 rounded-full border px-3 py-1 lg:mt-3"
            style={{
              backgroundColor:
                state.background,
              borderColor:
                state.border,
            }}
          >
            <span
              className="text-xs font-semibold"
              style={{
                color:
                  state.color,
              }}
            >
              {state.label}
            </span>
          </div>

          {safeScore < 60 && (
            <div className="mt-2 flex items-center gap-1.5 lg:mt-3">
              <LuCircleAlert
                size={13}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--danger)",
                }}
              />

              <span
                className="text-[10px]"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Review agent recommendations
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}