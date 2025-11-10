import { AgentWidgetConfig, AgentWidgetMessage, AgentWidgetEvent } from "./types";

type DispatchOptions = {
  messages: AgentWidgetMessage[];
  signal?: AbortSignal;
};

type SSEHandler = (event: AgentWidgetEvent) => void;

const DEFAULT_ENDPOINT = "https://api.travrse.ai/v1/dispatch";

export class AgentWidgetClient {
  private readonly apiUrl: string;
  private readonly headers: Record<string, string>;
  private readonly debug: boolean;

  constructor(private config: AgentWidgetConfig = {}) {
    this.apiUrl = config.apiUrl ?? DEFAULT_ENDPOINT;
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers
    };
    this.debug = Boolean(config.debug);
  }

  public async dispatch(options: DispatchOptions, onEvent: SSEHandler) {
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    onEvent({ type: "status", status: "connecting" });

    // Build simplified payload with just messages and optional flowId
    // Sort by createdAt to ensure chronological order (not local sequence)
    const body = {
      messages: options.messages
        .slice()
        .sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        })
        .map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt
        })),
      ...(this.config.flowId && { flowId: this.config.flowId })
    };

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug("[AgentWidgetClient] dispatch body", body);
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      const error = new Error(
        `Chat backend request failed: ${response.status} ${response.statusText}`
      );
      onEvent({ type: "error", error });
      throw error;
    }

    onEvent({ type: "status", status: "connected" });
    try {
      await this.streamResponse(response.body, onEvent);
    } finally {
      onEvent({ type: "status", status: "idle" });
    }
  }

  private async streamResponse(
    body: ReadableStream<Uint8Array>,
    onEvent: SSEHandler
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const baseSequence = Date.now();
    let sequenceCounter = 0;
    const nextSequence = () => baseSequence + sequenceCounter++;

    const cloneMessage = (msg: AgentWidgetMessage): AgentWidgetMessage => {
      const reasoning = msg.reasoning
        ? {
            ...msg.reasoning,
            chunks: [...msg.reasoning.chunks]
          }
        : undefined;
      const toolCall = msg.toolCall
        ? {
            ...msg.toolCall,
            chunks: msg.toolCall.chunks ? [...msg.toolCall.chunks] : undefined
          }
        : undefined;
      const tools = msg.tools
        ? msg.tools.map((tool) => ({
            ...tool,
            chunks: tool.chunks ? [...tool.chunks] : undefined
          }))
        : undefined;

      return {
        ...msg,
        reasoning,
        toolCall,
        tools
      };
    };

    const emitMessage = (msg: AgentWidgetMessage) => {
      onEvent({
        type: "message",
        message: cloneMessage(msg)
      });
    };

    let assistantMessage: AgentWidgetMessage | null = null;
    const reasoningMessages = new Map<string, AgentWidgetMessage>();
    const toolMessages = new Map<string, AgentWidgetMessage>();
    const reasoningContext = {
      lastId: null as string | null,
      byStep: new Map<string, string>()
    };
    const toolContext = {
      lastId: null as string | null,
      byCall: new Map<string, string>()
    };

    const normalizeKey = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      try {
        return String(value);
      } catch (error) {
        return null;
      }
    };

    const getStepKey = (payload: Record<string, any>) =>
      normalizeKey(
        payload.stepId ??
          payload.step_id ??
          payload.step ??
          payload.parentId ??
          payload.flowStepId ??
          payload.flow_step_id
      );

    const getToolCallKey = (payload: Record<string, any>) =>
      normalizeKey(
        payload.callId ??
          payload.call_id ??
          payload.requestId ??
          payload.request_id ??
          payload.toolCallId ??
          payload.tool_call_id ??
          payload.stepId ??
          payload.step_id
      );

    const ensureAssistantMessage = () => {
      if (assistantMessage) return assistantMessage;
      assistantMessage = {
        id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
        variant: "assistant",
        sequence: nextSequence()
      };
      emitMessage(assistantMessage);
      return assistantMessage;
    };

    const trackReasoningId = (stepKey: string | null, id: string) => {
      reasoningContext.lastId = id;
      if (stepKey) {
        reasoningContext.byStep.set(stepKey, id);
      }
    };

    const resolveReasoningId = (
      payload: Record<string, any>,
      allowCreate: boolean
    ): string | null => {
      const rawId = payload.reasoningId ?? payload.id;
      const stepKey = getStepKey(payload);
      if (rawId) {
        const resolved = String(rawId);
        trackReasoningId(stepKey, resolved);
        return resolved;
      }
      if (stepKey) {
        const existing = reasoningContext.byStep.get(stepKey);
        if (existing) {
          reasoningContext.lastId = existing;
          return existing;
        }
      }
      if (reasoningContext.lastId && !allowCreate) {
        return reasoningContext.lastId;
      }
      if (!allowCreate) {
        return null;
      }
      const generated = `reason-${nextSequence()}`;
      trackReasoningId(stepKey, generated);
      return generated;
    };

    const ensureReasoningMessage = (reasoningId: string) => {
      const existing = reasoningMessages.get(reasoningId);
      if (existing) {
        return existing;
      }

      const message: AgentWidgetMessage = {
        id: `reason-${reasoningId}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
        variant: "reasoning",
        sequence: nextSequence(),
        reasoning: {
          id: reasoningId,
          status: "streaming",
          chunks: []
        }
      };

      reasoningMessages.set(reasoningId, message);
      emitMessage(message);
      return message;
    };

    const trackToolId = (callKey: string | null, id: string) => {
      toolContext.lastId = id;
      if (callKey) {
        toolContext.byCall.set(callKey, id);
      }
    };

    const resolveToolId = (
      payload: Record<string, any>,
      allowCreate: boolean
    ): string | null => {
      const rawId = payload.toolId ?? payload.id;
      const callKey = getToolCallKey(payload);
      if (rawId) {
        const resolved = String(rawId);
        trackToolId(callKey, resolved);
        return resolved;
      }
      if (callKey) {
        const existing = toolContext.byCall.get(callKey);
        if (existing) {
          toolContext.lastId = existing;
          return existing;
        }
      }
      if (toolContext.lastId && !allowCreate) {
        return toolContext.lastId;
      }
      if (!allowCreate) {
        return null;
      }
      const generated = `tool-${nextSequence()}`;
      trackToolId(callKey, generated);
      return generated;
    };

    const ensureToolMessage = (toolId: string) => {
      const existing = toolMessages.get(toolId);
      if (existing) {
        return existing;
      }

      const message: AgentWidgetMessage = {
        id: `tool-${toolId}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
        variant: "tool",
        sequence: nextSequence(),
        toolCall: {
          id: toolId,
          status: "pending"
        }
      };

      toolMessages.set(toolId, message);
      emitMessage(message);
      return message;
    };

    const resolveTimestamp = (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          return parsed;
        }
        const dateParsed = Date.parse(value);
        if (!Number.isNaN(dateParsed)) {
          return dateParsed;
        }
      }
      return Date.now();
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const lines = event.split("\n");
        let eventType = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          } else if (line.startsWith("data:")) {
            data += line.replace("data:", "").trim();
          }
        }

        if (!data) continue;
        let payload: any;
        try {
          payload = JSON.parse(data);
        } catch (error) {
          onEvent({
            type: "error",
            error:
              error instanceof Error
                ? error
                : new Error("Failed to parse chat stream payload")
          });
          continue;
        }

        const payloadType =
          eventType !== "message" ? eventType : payload.type ?? "message";

        if (payloadType === "reason_start") {
          const reasoningId =
            resolveReasoningId(payload, true) ?? `reason-${nextSequence()}`;
          const reasoningMessage = ensureReasoningMessage(reasoningId);
          reasoningMessage.reasoning = reasoningMessage.reasoning ?? {
            id: reasoningId,
            status: "streaming",
            chunks: []
          };
          reasoningMessage.reasoning.startedAt =
            reasoningMessage.reasoning.startedAt ??
            resolveTimestamp(payload.startedAt ?? payload.timestamp);
          reasoningMessage.reasoning.completedAt = undefined;
          reasoningMessage.reasoning.durationMs = undefined;
          reasoningMessage.streaming = true;
          reasoningMessage.reasoning.status = "streaming";
          emitMessage(reasoningMessage);
        } else if (payloadType === "reason_chunk") {
          const reasoningId =
            resolveReasoningId(payload, false) ??
            resolveReasoningId(payload, true) ??
            `reason-${nextSequence()}`;
          const reasoningMessage = ensureReasoningMessage(reasoningId);
          reasoningMessage.reasoning = reasoningMessage.reasoning ?? {
            id: reasoningId,
            status: "streaming",
            chunks: []
          };
          reasoningMessage.reasoning.startedAt =
            reasoningMessage.reasoning.startedAt ??
            resolveTimestamp(payload.startedAt ?? payload.timestamp);
          const chunk =
            payload.reasoningText ??
            payload.text ??
            payload.delta ??
            "";
          if (chunk && payload.hidden !== true) {
            reasoningMessage.reasoning.chunks.push(String(chunk));
          }
          reasoningMessage.reasoning.status = payload.done ? "complete" : "streaming";
          if (payload.done) {
            reasoningMessage.reasoning.completedAt = resolveTimestamp(
              payload.completedAt ?? payload.timestamp
            );
            const start = reasoningMessage.reasoning.startedAt ?? Date.now();
            reasoningMessage.reasoning.durationMs = Math.max(
              0,
              (reasoningMessage.reasoning.completedAt ?? Date.now()) - start
            );
          }
          reasoningMessage.streaming = reasoningMessage.reasoning.status !== "complete";
          emitMessage(reasoningMessage);
        } else if (payloadType === "reason_complete") {
          const reasoningId =
            resolveReasoningId(payload, false) ??
            resolveReasoningId(payload, true) ??
            `reason-${nextSequence()}`;
          const reasoningMessage = reasoningMessages.get(reasoningId);
          if (reasoningMessage?.reasoning) {
            reasoningMessage.reasoning.status = "complete";
            reasoningMessage.reasoning.completedAt = resolveTimestamp(
              payload.completedAt ?? payload.timestamp
            );
            const start = reasoningMessage.reasoning.startedAt ?? Date.now();
            reasoningMessage.reasoning.durationMs = Math.max(
              0,
              (reasoningMessage.reasoning.completedAt ?? Date.now()) - start
            );
            reasoningMessage.streaming = false;
            emitMessage(reasoningMessage);
          }
          const stepKey = getStepKey(payload);
          if (stepKey) {
            reasoningContext.byStep.delete(stepKey);
          }
        } else if (payloadType === "tool_start") {
          const toolId =
            resolveToolId(payload, true) ?? `tool-${nextSequence()}`;
          const toolMessage = ensureToolMessage(toolId);
          const tool = toolMessage.toolCall ?? {
            id: toolId,
            status: "pending"
          };
          tool.name = payload.toolName ?? tool.name;
          tool.status = "running";
          if (payload.args !== undefined) {
            tool.args = payload.args;
          }
          tool.startedAt =
            tool.startedAt ??
            resolveTimestamp(payload.startedAt ?? payload.timestamp);
          tool.completedAt = undefined;
          tool.durationMs = undefined;
          toolMessage.toolCall = tool;
          toolMessage.streaming = true;
          emitMessage(toolMessage);
        } else if (payloadType === "tool_chunk") {
          const toolId =
            resolveToolId(payload, false) ??
            resolveToolId(payload, true) ??
            `tool-${nextSequence()}`;
          const toolMessage = ensureToolMessage(toolId);
          const tool = toolMessage.toolCall ?? {
            id: toolId,
            status: "running"
          };
          tool.startedAt =
            tool.startedAt ??
            resolveTimestamp(payload.startedAt ?? payload.timestamp);
          const chunkText =
            payload.text ?? payload.delta ?? payload.message ?? "";
          if (chunkText) {
            tool.chunks = tool.chunks ?? [];
            tool.chunks.push(String(chunkText));
          }
          tool.status = "running";
          toolMessage.toolCall = tool;
          toolMessage.streaming = true;
          emitMessage(toolMessage);
        } else if (payloadType === "tool_complete") {
          const toolId =
            resolveToolId(payload, false) ??
            resolveToolId(payload, true) ??
            `tool-${nextSequence()}`;
          const toolMessage = ensureToolMessage(toolId);
          const tool = toolMessage.toolCall ?? {
            id: toolId,
            status: "running"
          };
          tool.status = "complete";
          if (payload.result !== undefined) {
            tool.result = payload.result;
          }
          if (typeof payload.duration === "number") {
            tool.duration = payload.duration;
          }
          tool.completedAt = resolveTimestamp(
            payload.completedAt ?? payload.timestamp
          );
          if (typeof payload.duration === "number") {
            tool.durationMs = payload.duration;
          } else {
            const start = tool.startedAt ?? Date.now();
            tool.durationMs = Math.max(
              0,
              (tool.completedAt ?? Date.now()) - start
            );
          }
          toolMessage.toolCall = tool;
          toolMessage.streaming = false;
          emitMessage(toolMessage);
          const callKey = getToolCallKey(payload);
          if (callKey) {
            toolContext.byCall.delete(callKey);
          }
        } else if (payloadType === "step_chunk") {
          const assistant = ensureAssistantMessage();
          const chunk = payload.text ?? payload.delta ?? payload.content ?? "";
          if (chunk) {
            assistant.content += chunk;
            emitMessage(assistant);
          }
          if (payload.isComplete) {
            const finalContent = payload.result?.response ?? assistant.content;
            if (finalContent) {
              assistant.content = finalContent;
              assistant.streaming = false;
              emitMessage(assistant);
            }
          }
        } else if (payloadType === "step_complete") {
          const finalContent = payload.result?.response;
          const assistant = ensureAssistantMessage();
          if (finalContent) {
            assistant.content = finalContent;
            assistant.streaming = false;
            emitMessage(assistant);
          } else {
            // No final content, just mark as complete
            assistant.streaming = false;
            emitMessage(assistant);
          }
        } else if (payloadType === "flow_complete") {
          const finalContent = payload.result?.response;
          if (finalContent) {
            const assistant = ensureAssistantMessage();
            if (finalContent !== assistant.content) {
              assistant.content = finalContent;
              emitMessage(assistant);
            }
            assistant.streaming = false;
            emitMessage(assistant);
          } else {
            const existingAssistant = assistantMessage;
            if (existingAssistant) {
              const assistantFinal = existingAssistant as AgentWidgetMessage;
              assistantFinal.streaming = false;
              emitMessage(assistantFinal);
            }
          }
          onEvent({ type: "status", status: "idle" });
        } else if (payloadType === "error" && payload.error) {
          onEvent({
            type: "error",
            error:
              payload.error instanceof Error
                ? payload.error
                : new Error(String(payload.error))
          });
        }
      }
    }
  }
}
