import { AgentWidgetReasoning, AgentWidgetToolCall } from "../types";

export const formatUnknownValue = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

export const formatReasoningDuration = (reasoning: AgentWidgetReasoning) => {
  const end = reasoning.completedAt ?? Date.now();
  const start = reasoning.startedAt ?? end;
  const durationMs =
    reasoning.durationMs !== undefined
      ? reasoning.durationMs
      : Math.max(0, end - start);
  const seconds = durationMs / 1000;
  if (seconds < 0.1) {
    return "Thought for <0.1 seconds";
  }
  const formatted =
    seconds >= 10
      ? Math.round(seconds).toString()
      : seconds.toFixed(1).replace(/\.0$/, "");
  return `Thought for ${formatted} seconds`;
};

export const describeReasonStatus = (reasoning: AgentWidgetReasoning) => {
  if (reasoning.status === "complete") return formatReasoningDuration(reasoning);
  if (reasoning.status === "pending") return "Waiting";
  return "";
};

export const formatToolDuration = (tool: AgentWidgetToolCall) => {
  const durationMs =
    typeof tool.duration === "number"
      ? tool.duration
      : typeof tool.durationMs === "number"
        ? tool.durationMs
        : Math.max(
            0,
            (tool.completedAt ?? Date.now()) -
              (tool.startedAt ?? tool.completedAt ?? Date.now())
          );
  const seconds = durationMs / 1000;
  if (seconds < 0.1) {
    return "Used tool for <0.1 seconds";
  }
  const formatted =
    seconds >= 10
      ? Math.round(seconds).toString()
      : seconds.toFixed(1).replace(/\.0$/, "");
  return `Used tool for ${formatted} seconds`;
};

export const describeToolStatus = (status: AgentWidgetToolCall["status"]) => {
  if (status === "complete") return "";
  if (status === "pending") return "Starting";
  return "Running";
};

export const describeToolTitle = (tool: AgentWidgetToolCall) => {
  if (tool.status === "complete") {
    return formatToolDuration(tool);
  }
  return "Using tool...";
};





