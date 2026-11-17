import {
  LuBot,
  LuCircleCheck,
  LuLightbulb,
} from "react-icons/lu";

interface AgentResult {
  recommendations?: string[];
}

interface AnalysisResult {
  overall_score: number;
  architecture?: AgentResult;
  civil?: AgentResult;
  sustainability?: AgentResult;
  municipal?: AgentResult;
  citizen?: AgentResult;
}

interface Props {
  result: AnalysisResult | null;
}

export default function ExecutiveSummary({
  result,
}: Props) {
  if (!result) {
    return null;
  }

  const recommendations = [
    ...(result.architecture
      ?.recommendations ?? []),
    ...(result.civil?.recommendations ??
      []),
    ...(result.sustainability
      ?.recommendations ?? []),
    ...(result.municipal
      ?.recommendations ?? []),
    ...(result.citizen
      ?.recommendations ?? []),
  ];

  return (
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
        className="border-b p-4 sm:p-5 lg:p-6"
        style={{
          backgroundColor:
            "var(--primary-soft)",
          borderColor:
            "var(--border)",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  "var(--surface)",
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
              <h2
                className="text-lg font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                AI Executive Summary
              </h2>

              <p
                className="mt-0.5 text-xs"
                style={{
                  color:
                    "var(--text-muted)",
                }}
              >
                Consolidated recommendations from all
                planning agents
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span
              className="text-3xl font-bold tracking-tight"
              style={{
                color:
                  "var(--primary)",
              }}
            >
              {result.overall_score}
            </span>

            <span
              className="text-sm font-medium"
              style={{
                color:
                  "var(--text-muted)",
              }}
            >
              /100
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 lg:p-6">
        {recommendations.length >
        0 ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <LuLightbulb
                size={16}
                strokeWidth={1.8}
                style={{
                  color:
                    "var(--warning)",
                }}
              />

              <h3
                className="text-sm font-semibold"
                style={{
                  color:
                    "var(--text-primary)",
                }}
              >
                Key Recommendations
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recommendations
                .slice(0, 10)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${index}-${item}`}
                      className="flex items-start gap-2.5 rounded-lg border p-3"
                      style={{
                        backgroundColor:
                          "var(--surface-secondary)",
                        borderColor:
                          "var(--border)",
                      }}
                    >
                      <LuCircleCheck
                        size={15}
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
          </>
        ) : (
          <p
            className="text-sm"
            style={{
              color:
                "var(--text-muted)",
            }}
          >
            No consolidated recommendations were
            returned by the analysis.
          </p>
        )}
      </div>
    </section>
  );
}