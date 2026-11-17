"use client";

import { useRef, useState } from "react";
import { LuMic, LuMicOff } from "react-icons/lu";

import {
  LuBot,
  LuCheck,
  LuCircleAlert,
  LuClipboardCheck,
  LuSend,
  LuX,
} from "react-icons/lu";

import api from "../../services/api";
import {
  useProjectStore,
  type ArchitectureStyle,
} from "../../store/projectStore";
import { usePolygonStore } from "../../store/polygonStore";

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

type AgentData = Record<string, unknown>;

interface AnalysisResult {
  overall_score: number;
  architecture?: AgentData;
  civil?: AgentData;
  sustainability?: AgentData;
  municipal?: AgentData;
  citizen?: AgentData;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProposedChange {
  type: string;
  parameters: Record<string, JsonValue>;
  [key: string]: unknown;
}

interface ChatResponse {
  message?: string;
  response?: string;
  proposed_changes?: ProposedChange[] | null;
  proposed_change?: ProposedChange | null;
  change?: ProposedChange | null;
  requires_confirmation?: boolean;
  confirmation_required?: boolean;
  intent?: string;
  [key: string]: unknown;
}

interface ScenarioResult {
  status?: string;
  scenario_status?: string;
  overall_score?: number;
  compliance_score?: number;
  scoring?: {
    overall_score?: number;
    score?: number;
    planning_score?: number;
    status?: string;
    agent_scores?: Record<string, number>;
    [key: string]: unknown;
  };
  constraints?: {
    compliance_score?: number;
    compliance?: number;
    results?: ConstraintResult[];
    [key: string]: unknown;
  };
  results?: ConstraintResult[];
  [key: string]: unknown;
}

interface ConstraintResult {
  constraint?: string;
  name?: string;
  status?: string;
  actual?: unknown;
  required?: unknown;
  message?: string;
  severity?: string;
  source?: string;
  [key: string]: unknown;
}

interface ApplyResponse {
  status?: string;
  source?: string;
  applied_change?: ProposedChange;
  scenario_project?: Record<string, unknown>;
  scenario_result?: ScenarioResult;
  [key: string]: unknown;
}

interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

interface ChatbotPanelProps {
  analysisResult: AnalysisResult;
}

function getAgentScore(
  agent: AgentData | undefined
): number | null {
  if (!agent) {
    return null;
  }

  const possibleScores = [
    agent.score,
    agent.overall_score,
    agent.agent_score,
    agent.planning_score,
  ];

  for (const value of possibleScores) {
    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

function describeProposedChange(
  change: ProposedChange
): string {
  const parameters =
    change.parameters ?? {};

  switch (change.type) {
    case "parking": {
      const spaces =
        parameters.parking_spaces;

      return `Increase parking to ${String(
        spaces ?? "the requested value"
      )} spaces.`;
    }

    case "road_widening": {
      const width =
        parameters.proposed_width_m;

      return `Increase road width to ${String(
        width ?? "the requested value"
      )} m.`;
    }

    case "footpath": {
      const width =
        parameters.footpath_width_m;

      return `Set the footpath width to ${String(
        width ?? "the requested value"
      )} m.`;
    }

    case "green_space": {
      const percentage =
        parameters.green_area_percentage;

      return `Increase green area to ${String(
        percentage ?? "the requested value"
      )}%.`;
    }

    case "architecture_style": {
      const style = parameters.style;

      return `Change the architectural style to ${String(
        style ?? "the requested style"
      )}.`;
    }

    case "room_count": {
      const details: string[] = [];

      if (typeof parameters.bedrooms === "number") {
        details.push(`${parameters.bedrooms} bedrooms`);
      }

      if (typeof parameters.bathrooms === "number") {
        details.push(`${parameters.bathrooms} bathrooms`);
      }

      return `Update the room layout to include ${details.join(
        " and "
      )}.`;
    }

    default:
      return `Apply the proposed ${change.type.replace(
        /_/g,
        " "
      )} change.`;
  }
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
    typeof result.scoring.overall_score ===
      "number"
  ) {
    return result.scoring.overall_score;
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
    typeof result.scoring.planning_score ===
      "number"
  ) {
    return result.scoring.planning_score;
  }

  return null;
}

function getConstraints(
  result: ScenarioResult | null
): ConstraintResult[] {
  if (!result) {
    return [];
  }

  if (
    Array.isArray(result.results)
  ) {
    return result.results;
  }

  if (
    result.constraints &&
    Array.isArray(
      result.constraints.results
    )
  ) {
    return result.constraints.results;
  }

  return [];
}

function getStatusTone(
  status?: string
): "success" | "warning" | "danger" | "neutral" {
  const normalized =
    String(status ?? "")
      .toLowerCase();

  if (
    normalized.includes("infeasible") ||
    normalized.includes("not feasible") ||
    normalized.includes("fail") ||
    normalized.includes("not recommended")
  ) {
    return "danger";
  }

  if (
    normalized.includes("pass") ||
    normalized.includes("feasible") ||
    normalized.includes("recommended")
  ) {
    return "success";
  }

  if (
    normalized.includes("warning") ||
    normalized.includes("condition")
  ) {
    return "warning";
  }

  return "neutral";
}

function getToneClasses(
  tone:
    | "success"
    | "warning"
    | "danger"
    | "neutral"
) {
  if (tone === "success") {
    return {
      border:
        "border-[var(--success-border)]",
      background:
        "bg-[var(--success-soft)]",
      text:
        "text-[var(--success)]",
    };
  }

  if (tone === "warning") {
    return {
      border:
        "border-[var(--warning-border)]",
      background:
        "bg-[var(--warning-soft)]",
      text:
        "text-[var(--warning)]",
    };
  }

  if (tone === "danger") {
    return {
      border:
        "border-[var(--danger-border)]",
      background:
        "bg-[var(--danger-soft)]",
      text:
        "text-[var(--danger)]",
    };
  }

  return {
    border:
      "border-[var(--border)]",
    background:
      "bg-[var(--surface-secondary)]",
    text:
      "text-[var(--text-secondary)]",
  };
}

function formatScore(
  value: number | null
) {
  return value !== null
    ? value.toFixed(1)
    : "—";
}

function getChangeLabel(
  type: string
) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
function detectArchitectureStyle(
  message: string
): ArchitectureStyle | null {
  const text = message.toLowerCase();

  const styles: {
    style: ArchitectureStyle;
    keywords: string[];
  }[] = [
    {
      style: "modern",
      keywords: ["modern", "contemporary"],
    },
    {
      style: "vastu",
      keywords: ["vastu", "vastu-compliant"],
    },
    {
      style: "luxury",
      keywords: ["luxury", "luxurious", "premium"],
    },
    {
      style: "efficient",
      keywords: ["efficient", "space-efficient"],
    },
    {
      style: "courtyard",
      keywords: ["courtyard", "central courtyard"],
    },
    {
      style: "rental",
      keywords: ["rental", "rental-focused"],
    },
  ];

  const asksForStyle =
    /\b(change|switch|make|use|design|convert|set)\b/.test(text) ||
    /\b(style|architecture|architectural)\b/.test(text);

  if (!asksForStyle) {
    return null;
  }

  for (const item of styles) {
    if (
      item.keywords.some((keyword) =>
        text.includes(keyword)
      )
    ) {
      return item.style;
    }
  }

  return null;
}




function detectRoomCountChange(
  message: string
): ProposedChange | null {
  const text = message.toLowerCase().trim();

  const numberWords: Record<string, number> = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  function parseCount(value: string): number | null {
    const normalized = value.toLowerCase().trim();

    if (/^\d+$/.test(normalized)) {
      return Number(normalized);
    }

    return numberWords[normalized] ?? null;
  }

  const countPattern =
    "(\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)";

  const bedroomPatterns = [
    new RegExp(
      `\\b${countPattern}\\s*[- ]?\\s*bedrooms?\\b`,
      "i"
    ),
    new RegExp(
      `\\bbedrooms?\\s+(?:to|at|of)\\s+${countPattern}\\b`,
      "i"
    ),
  ];

  const bathroomPatterns = [
    new RegExp(
      `\\b${countPattern}\\s*[- ]?\\s*bath(?:rooms?)?\\b`,
      "i"
    ),
    new RegExp(
      `\\bbath(?:rooms?)?\\s+(?:to|at|of)\\s+${countPattern}\\b`,
      "i"
    ),
  ];

  function findCount(patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match) {
        const count = parseCount(match[1]);

        if (
          count !== null &&
          Number.isInteger(count) &&
          count >= 0 &&
          count <= 20
        ) {
          return count;
        }
      }
    }

    return null;
  }

  const bedrooms = findCount(bedroomPatterns);
  const bathrooms = findCount(bathroomPatterns);

  if (bedrooms === null && bathrooms === null) {
    return null;
  }

  const asksForChange =
    /\b(add|remove|change|make|increase|decrease|need|want|have|set|design|convert|update|reduce|expand)\b/i.test(
      text
    );

  if (!asksForChange) {
    return null;
  }

  const parameters: Record<string, JsonValue> = {};

  if (bedrooms !== null) {
    parameters.bedrooms = bedrooms;
  }

  if (bathrooms !== null) {
    parameters.bathrooms = bathrooms;
  }

  return {
    type: "room_count",
    parameters,
  };
}



export default function ChatbotPanel({
  analysisResult,
}: ChatbotPanelProps) {
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
    architectureStyle,
    setArchitectureStyle,
    setDesign,
  } = useProjectStore();

  const polygonArea = usePolygonStore(
    (store) => store.area
  );

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello. I can explain your planning results or help you modify supported planning parameters such as parking, road width, footpath width, or green area.",
    },
  ]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    applying,
    setApplying,
  ] = useState(false);

  const [
    proposedChange,
    setProposedChange,
  ] =
    useState<ProposedChange | null>(
      null
    );

  const [
    scenarioResult,
    setScenarioResult,
  ] =
    useState<ScenarioResult | null>(
      null
    );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const effectiveArea =
    typeof polygonArea === "number" &&
    polygonArea > 0
      ? polygonArea
      : typeof analysisResult.area ===
          "number" &&
        analysisResult.area > 0
      ? analysisResult.area
      : 0;

  const project = {
    id: projectId,
    project_id: projectId,
    project_name:
      projectName ?? "",
    name:
      projectName ?? "",
    building_type:
      buildingType ?? "",
    commercial_subtype:
      commercialSubtype ?? null,
    city:
      city ?? "",
    state:
      state ?? "",
    budget:
      typeof budget === "number"
        ? budget
        : 0,
    area:
      effectiveArea,
    area_m2:
      effectiveArea,
    coordinates:
      Array.isArray(coordinates)
        ? coordinates
        : [],
  };

  
  
  type BrowserSpeechRecognition = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: {
      results: ArrayLike<ArrayLike<{ transcript: string }>>;
    }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  function startVoiceRecording() {
    if (loading || applying || isRecording || isTranscribing) return;

    const browserWindow = window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };

    const Recognition =
      browserWindow.SpeechRecognition ??
      browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "Voice input is not supported in this browser. Please use a supported version of Chrome."
      );
      return;
    }

    setError(null);

    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput((previous) =>
          previous.trim()
            ? `${previous.trim()} ${transcript}`
            : transcript
        );
      } else {
        setError("No speech was recognized. Please try again.");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Allow microphone access and try again.");
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Please try again.");
      } else {
        setError(`Voice recognition failed: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsRecording(true);

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
      recognitionRef.current = null;
      setError("Could not start voice recognition. Please try again.");
    }
  }

  function stopVoiceRecording() {
    recognitionRef.current?.stop();
  }



  async function sendMessage() {
    const trimmed =
      input.trim();

    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
    };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ]
    );

    setInput("");
    setLoading(true);
    setError(null);
    setProposedChange(null);

    const requestedStyle =
      detectArchitectureStyle(trimmed);

    if (requestedStyle) {
      setProposedChange({
        type: "architecture_style",
        parameters: {
          style: requestedStyle,
          previous_style: architectureStyle,
        },
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `I propose changing the architectural style from ${architectureStyle} to ${requestedStyle}. Confirm to apply this change.`,
        },
      ]);

      setLoading(false);
      return;
    }

    
    const requestedRoomChange = detectRoomCountChange(trimmed);

    console.log("ROOM COUNT DEBUG:", {
      message: trimmed,
      detectedChange: requestedRoomChange,
    });

    if (requestedRoomChange) {
      setProposedChange(requestedRoomChange);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I have prepared a room-layout change for your review. Confirm to apply it to the shared floor-plan data.",
        },
      ]);

      setLoading(false);
      return;
    }


    try {
      const response =
        await api.post<ChatResponse>(
          "/chatbot/message",
          {
            message: trimmed,
            project,
            analysis:
              analysisResult,
            design:
              design ?? {},
          }
        );

      const data =
        response.data;

      let proposed:
        ProposedChange | null =
        null;

      if (
        Array.isArray(
          data.proposed_changes
        ) &&
        data.proposed_changes.length > 0
      ) {
        const firstChange =
          data.proposed_changes[0];

        if (
          firstChange &&
          typeof firstChange ===
            "object" &&
          typeof firstChange.type ===
            "string"
        ) {
          proposed =
            firstChange;
        }
      }

      if (
        !proposed &&
        data.proposed_change &&
        typeof data.proposed_change ===
          "object" &&
        typeof data.proposed_change.type ===
          "string"
      ) {
        proposed =
          data.proposed_change;
      }

      if (
        !proposed &&
        data.change &&
        typeof data.change ===
          "object" &&
        typeof data.change.type ===
          "string"
      ) {
        proposed =
          data.change;
      }

      if (proposed) {
        setProposedChange(
          proposed
        );
      }

      const assistantText =
        data.message ??
        data.response ??
        "I could not generate a response.";

      setMessages(
        (previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              assistantText,
          },
        ]
      );
    
    } catch (caughtError: unknown) {
      console.error("Chatbot error:", caughtError);

      const apiError = caughtError as ApiError;
      const status = apiError.response?.status;
      const responseData = apiError.response?.data;

      let errorMessage = "Chatbot request failed.";

      if (
        responseData &&
        typeof responseData === "object" &&
        "detail" in responseData
      ) {
        const detail = (
          responseData as { detail?: unknown }
        ).detail;

        if (typeof detail === "string") {
          errorMessage = detail;
        }
      } else if (status) {
        errorMessage = `Chatbot request failed with HTTP ${status}. Check the API URL and backend logs.`;
      } else if (caughtError instanceof Error) {
        errorMessage = caughtError.message;
      }

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }

  }

  async function applyProposedChange() {
    if (
      !proposedChange ||
      applying
    ) {
      return;
    }

    setApplying(true);
    setError(null);

    if (proposedChange.type === "architecture_style") {
      const style = proposedChange.parameters.style;

      const validStyles: ArchitectureStyle[] = [
        "modern",
        "vastu",
        "luxury",
        "efficient",
        "courtyard",
        "rental",
      ];

      if (
        typeof style !== "string" ||
        !validStyles.includes(style as ArchitectureStyle)
      ) {
        setError("The requested architectural style is invalid.");
        setApplying(false);
        return;
      }

      setArchitectureStyle(style as ArchitectureStyle);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Architectural style updated to ${style}.`,
        },
      ]);

      setProposedChange(null);
      setApplying(false);
      return;
    }

    
    if (proposedChange.type === "room_count") {
      try {
        if (!design?.space_program?.floors?.length) {
          throw new Error(
            "Generate a building design with floor and room data before modifying the room layout."
          );
        }

        const parameters = proposedChange.parameters;

        const requestedCounts = {
          bedroom:
            typeof parameters.bedrooms === "number"
              ? parameters.bedrooms
              : null,
          bathroom:
            typeof parameters.bathrooms === "number"
              ? parameters.bathrooms
              : null,
        };

        const floors = design.space_program.floors.map(
          (floor) => ({
            ...floor,
            spaces: [...(floor.spaces ?? [])],
          })
        );

        function matchesRoomType(
          space: { name?: string | null; type?: string | null },
          type: "bedroom" | "bathroom"
        ) {
          const value = `${space.type ?? ""} ${space.name ?? ""}`
            .toLowerCase()
            .replace(/[_-]/g, " ");

          return type === "bedroom"
            ? /\b(bedroom|bed room)\b/.test(value)
            : /\b(bathroom|bath room|toilet|washroom|wc)\b/.test(
                value
              );
        }

        function updateRoomCount(
          type: "bedroom" | "bathroom",
          targetCount: number
        ) {
          let currentCount = floors.reduce(
            (total, floor) =>
              total +
              (floor.spaces ?? []).filter((space) =>
                matchesRoomType(space, type)
              ).length,
            0
          );

          // Remove excess rooms, starting from the last floor.
          for (
            let floorIndex = floors.length - 1;
            floorIndex >= 0 && currentCount > targetCount;
            floorIndex--
          ) {
            const spaces = floors[floorIndex].spaces ?? [];

            for (
              let index = spaces.length - 1;
              index >= 0 && currentCount > targetCount;
              index--
            ) {
              if (matchesRoomType(spaces[index], type)) {
                spaces.splice(index, 1);
                currentCount--;
              }
            }
          }

          // Add missing rooms to the first floor.
          while (currentCount < targetCount) {
            const spaces = floors[0].spaces ?? [];

            if (!floors[0].spaces) {
              floors[0].spaces = spaces;
            }

            const nextNumber =
              spaces.filter((space) =>
                matchesRoomType(space, type)
              ).length + 1;

            spaces.push({
              name:
                type === "bedroom"
                  ? `Bedroom ${nextNumber}`
                  : `Bathroom ${nextNumber}`,
              type,
              area_m2: type === "bedroom" ? 14 : 5,
            });

            currentCount++;
          }
        }

        for (const type of ["bedroom", "bathroom"] as const) {
          const targetCount = requestedCounts[type];

          if (targetCount !== null) {
            updateRoomCount(type, targetCount);
          }
        }

        const updatedDesign = {
          ...design,
          space_program: {
            ...design.space_program,
            floors,
          },
        };

        setDesign(updatedDesign);

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              "The room layout has been updated in the shared design data. Check both the 2D floor plan and 3D preview.",
          },
        ]);

        setProposedChange(null);
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "The room layout could not be updated.";

        setError(message);

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: message,
          },
        ]);
      } finally {
        setApplying(false);
      }

      return;
    }


    try {
      const agentScores = {
        architecture:
          getAgentScore(
            analysisResult.architecture
          ),
        civil:
          getAgentScore(
            analysisResult.civil
          ),
        sustainability:
          getAgentScore(
            analysisResult.sustainability
          ),
        municipal:
          getAgentScore(
            analysisResult.municipal
          ),
        citizen:
          getAgentScore(
            analysisResult.citizen
          ),
      };

      if (
        Object.values(
          agentScores
        ).some(
          (score) =>
            typeof score !==
            "number"
        )
      ) {
        throw new Error(
          "Current agent scores are incomplete. Please run the project analysis again."
        );
      }

      const response =
        await api.post<ApplyResponse>(
          "/chatbot/apply",
          {
            project,
            change:
              proposedChange,
            architecture:
              analysisResult.architecture ??
              {},
            civil:
              analysisResult.civil ??
              {},
            sustainability:
              analysisResult.sustainability ??
              {},
            municipal:
              analysisResult.municipal ??
              {},
            citizen:
              analysisResult.citizen ??
              {},
            design:
              design ?? {},
            agent_scores:
              agentScores,
          }
        );

      const result =
        response.data
          ?.scenario_result ??
        null;

      setScenarioResult(
        result
      );

      window.dispatchEvent(
        new CustomEvent(
          "smart-city:chatbot-scenario",
          {
            detail: {
              intervention:
                proposedChange.type,
              parameters:
                proposedChange.parameters,
              scenarioProject:
                response.data
                  ?.scenario_project ??
                null,
              scenarioResult:
                result,
            },
          }
        )
      );

      setMessages(
        (previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              "The planning change was evaluated. See the scenario result below.",
          },
        ]
      );

      setProposedChange(
        null
      );
    } catch (
      caughtError: unknown
    ) {
      console.error(
        "Apply chatbot change error:",
        caughtError
      );

      const apiError =
        caughtError as ApiError;

      let errorMessage =
        "The planning change could not be applied.";

      if (
        apiError.response?.data
      ) {
        const responseData =
          apiError.response.data;

        if (
          typeof responseData ===
            "object" &&
          responseData !== null &&
          "detail" in responseData
        ) {
          const detail =
            (
              responseData as {
                detail?: unknown;
              }
            ).detail;

          if (
            typeof detail ===
            "string"
          ) {
            errorMessage =
              detail;
          }
        }
      } else if (
        caughtError instanceof Error
      ) {
        errorMessage =
          caughtError.message;
      }

      setError(
        errorMessage
      );

      setMessages(
        (previous) => [
          ...previous,
          {
            role: "assistant",
            content:
              errorMessage,
          },
        ]
      );
    } finally {
      setApplying(false);
    }
  }

  function cancelProposedChange() {
    setProposedChange(
      null
    );

    setMessages(
      (previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "The proposed change was cancelled.",
        },
      ]
    );
  }

  
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !loading &&
      !applying &&
      !isRecording &&
      !isTranscribing
    ) {
      event.preventDefault();
      void sendMessage();
    }
  }


  const scenarioScore =
    getScenarioScore(
      scenarioResult
    );

  const baselineScore =
    typeof analysisResult.overall_score ===
    "number"
      ? analysisResult.overall_score
      : null;

  const scoreDifference =
    scenarioScore !== null &&
    baselineScore !== null
      ? scenarioScore -
        baselineScore
      : null;

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

  const constraints =
    getConstraints(
      scenarioResult
    );

  const scenarioTone =
    getStatusTone(
      scenarioStatus ??
        undefined
    );

  const scenarioToneClasses =
    getToneClasses(
      scenarioTone
    );

  return (
    <section className="mt-10">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">

        <div className="border-b border-[var(--border)] bg-[var(--surface-secondary)] px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <LuBot
                size={22}
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  AI Design & Planning Assistant
                </h2>

                <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--success)]">
                  AI Assisted
                </span>
              </div>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                Ask about your planning analysis, change architectural styles,
                or propose supported planning modifications.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">

            <div className="max-h-[520px] min-h-[260px] overflow-y-auto p-4 sm:p-5">
              <div className="space-y-4">
                {messages.map(
                  (
                    message,
                    index
                  ) => {
                    const isUser =
                      message.role ===
                      "user";

                    return (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${
                          isUser
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex max-w-[88%] items-start gap-3 ${
                            isUser
                              ? "flex-row-reverse"
                              : "flex-row"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              isUser
                                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"
                            }`}
                          >
                            {isUser ? (
                              <span className="text-[10px] font-bold">
                                YOU
                              </span>
                            ) : (
                              <LuBot
                                size={16}
                                strokeWidth={1.8}
                              />
                            )}
                          </div>

                          <div
                            className={`rounded-xl px-4 py-3 text-sm leading-6 ${
                              isUser
                                ? "rounded-tr-sm bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-sm)]"
                                : "rounded-tl-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]">
                        <LuBot
                          size={16}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className="rounded-xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-muted)]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-muted)] [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-muted)] [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {proposedChange && (
              <div className="border-t border-[var(--border)] p-4 sm:p-5">
                <div className="rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--primary-border)] bg-[var(--surface)] text-[var(--primary)]">
                      <LuClipboardCheck
                        size={18}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          Proposed Planning Change
                        </p>

                        <span className="rounded-full border border-[var(--primary-border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
                          {getChangeLabel(
                            proposedChange.type
                          )}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                        {describeProposedChange(
                          proposedChange
                        )}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={
                            applyProposedChange
                          }
                          disabled={
                            applying
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <LuCheck
                            size={16}
                            strokeWidth={2}
                          />

                          {applying
                            ? "Evaluating..."
                            : "Confirm & Apply"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelProposedChange
                          }
                          disabled={
                            applying
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <LuX
                            size={16}
                            strokeWidth={1.8}
                          />

                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="border-t border-[var(--border)] p-4 sm:p-5">
                <div className="flex items-start gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4">
                  <LuCircleAlert
                    size={19}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0 text-[var(--danger)]"
                  />

                  <div>
                    <p className="text-sm font-semibold text-[var(--danger)]">
                      Request Error
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            
            <div className="border-t border-[var(--border)] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about the analysis or propose a change..."
                  disabled={loading || applying || isTranscribing}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-disabled)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />

                {/* Voice recording button */}
                <button
                  type="button"
                  onClick={
                    isRecording
                      ? stopVoiceRecording
                      : startVoiceRecording
                  }
                  disabled={loading || applying || isTranscribing}
                  aria-label={
                    isRecording ? "Stop recording" : "Start voice input"
                  }
                  title={
                    isRecording ? "Stop recording" : "Speak your instruction"
                  }
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isRecording
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {isRecording ? (
                    <LuMicOff size={17} />
                  ) : (
                    <LuMic size={17} />
                  )}

                  {isRecording ? "Stop" : "Voice"}
                </button>

                {/* Send button */}
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    loading ||
                    applying ||
                    isRecording ||
                    isTranscribing ||
                    !input.trim()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LuSend size={16} strokeWidth={1.8} />

                  {loading ? "Sending..." : "Send"}
                </button>
              </div>

              {/* Voice status messages */}
              {isRecording && (
                <p className="mt-2 text-xs text-red-600">
                  Listening… Click Stop when you finish speaking.
                </p>
              )}

              {isTranscribing && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Converting your speech to text…
                </p>
              )}

              {/* Existing help text */}
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Press Enter to send. Confirmed planning changes are evaluated
                as scenarios before being surfaced to the planning workspace.
              </p>
            </div>

          </div>

          {scenarioResult && (
            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-start gap-3 border-b border-[var(--border)] bg-[var(--surface-secondary)] p-4 sm:p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]">
                  <LuClipboardCheck
                    size={18}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Scenario Result
                  </h3>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Result of the confirmed
                    planning change.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Baseline Score
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {formatScore(
                      baselineScore
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Scenario Score
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {formatScore(
                      scenarioScore
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Score Change
                  </p>

                  <p
                    className={`mt-2 text-2xl font-semibold tracking-tight ${
                      scoreDifference !==
                        null &&
                      scoreDifference > 0
                        ? "text-[var(--success)]"
                        : scoreDifference !==
                              null &&
                          scoreDifference <
                            0
                        ? "text-[var(--danger)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {scoreDifference !==
                    null
                      ? `${
                          scoreDifference >
                          0
                            ? "+"
                            : ""
                        }${scoreDifference.toFixed(
                          1
                        )}`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-5 sm:px-5">
                <div
                  className={`rounded-xl border p-4 ${scenarioToneClasses.border} ${scenarioToneClasses.background}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${scenarioToneClasses.text}`}
                      >
                        Scenario Status
                      </p>

                      <p className="mt-1.5 font-semibold text-[var(--text-primary)]">
                        {scenarioStatus ??
                          "Not specified"}
                      </p>
                    </div>

                    {complianceScore !==
                      null && (
                      <div className="text-right">
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${scenarioToneClasses.text}`}
                        >
                          Compliance
                        </p>

                        <p className="mt-1.5 font-semibold text-[var(--text-primary)]">
                          {Number(
                            complianceScore
                          ).toFixed(
                            1
                          )}
                          %
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {constraints.length >
                0 && (
                <div className="border-t border-[var(--border)] p-4 sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      Constraint Evaluation
                    </h4>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Planning constraints returned
                      by the scenario evaluation.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {constraints.map(
                      (
                        constraint,
                        index
                      ) => {
                        const tone =
                          getStatusTone(
                            constraint.status
                          );

                        const toneClasses =
                          getToneClasses(
                            tone
                          );

                        return (
                          <div
                            key={`${constraint.name ?? constraint.constraint ?? "constraint"}-${index}`}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {constraint.name ??
                                  constraint.constraint ??
                                  "Constraint"}
                              </p>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${toneClasses.border} ${toneClasses.background} ${toneClasses.text}`}
                              >
                                {constraint.status ??
                                  "UNKNOWN"}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                  Actual
                                </p>

                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                  {constraint.actual !==
                                  undefined
                                    ? String(
                                        constraint.actual
                                      )
                                    : "—"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                  Required
                                </p>

                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                  {constraint.required !==
                                  undefined
                                    ? String(
                                        constraint.required
                                      )
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            {constraint.message && (
                              <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--text-muted)]">
                                {
                                  constraint.message
                                }
                              </p>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}