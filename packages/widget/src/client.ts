import {
  AgentWidgetConfig,
  AgentWidgetMessage,
  AgentWidgetEvent,
  AgentWidgetStreamParser,
  AgentWidgetContextProvider,
  AgentWidgetRequestMiddleware,
  AgentWidgetRequestPayload
} from "./types";
import { 
  extractTextFromJson, 
  createPlainTextParser,
  createJsonStreamParser,
  createRegexJsonParser,
  createXmlParser
} from "./utils/formatting";

type DispatchOptions = {
  messages: AgentWidgetMessage[];
  signal?: AbortSignal;
};

type SSEHandler = (event: AgentWidgetEvent) => void;

const DEFAULT_ENDPOINT = "https://api.travrse.ai/v1/dispatch";

/**
 * Maps parserType string to the corresponding parser factory function
 */
function getParserFromType(parserType?: "plain" | "json" | "regex-json" | "xml"): () => AgentWidgetStreamParser {
  switch (parserType) {
    case "json":
      return createJsonStreamParser;
    case "regex-json":
      return createRegexJsonParser;
    case "xml":
      return createXmlParser;
    case "plain":
    default:
      return createPlainTextParser;
  }
}

export class AgentWidgetClient {
  private readonly apiUrl: string;
  private readonly headers: Record<string, string>;
  private readonly debug: boolean;
  private readonly createStreamParser: () => AgentWidgetStreamParser;
  private readonly contextProviders: AgentWidgetContextProvider[];
  private readonly requestMiddleware?: AgentWidgetRequestMiddleware;

  constructor(private config: AgentWidgetConfig = {}) {
    this.apiUrl = config.apiUrl ?? DEFAULT_ENDPOINT;
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers
    };
    this.debug = Boolean(config.debug);
    // Use custom stream parser if provided, otherwise use parserType, or fall back to plain text parser
    this.createStreamParser = config.streamParser ?? getParserFromType(config.parserType);
    this.contextProviders = config.contextProviders ?? [];
    this.requestMiddleware = config.requestMiddleware;
  }

  public async dispatch(options: DispatchOptions, onEvent: SSEHandler) {
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    onEvent({ type: "status", status: "connecting" });

    const body = await this.buildPayload(options.messages);

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

  private async buildPayload(
    messages: AgentWidgetMessage[]
  ): Promise<AgentWidgetRequestPayload> {
    const normalizedMessages = messages
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      })
      .map((message) => ({
        role: message.role,
        content: message.rawContent || message.content,
        createdAt: message.createdAt
      }));

    const payload: AgentWidgetRequestPayload = {
      messages: normalizedMessages,
      ...(this.config.flowId && { flowId: this.config.flowId })
    };

    if (this.contextProviders.length) {
      const contextAggregate: Record<string, unknown> = {};
      await Promise.all(
        this.contextProviders.map(async (provider) => {
          try {
            const result = await provider({
              messages,
              config: this.config
            });
            if (result && typeof result === "object") {
              Object.assign(contextAggregate, result);
            }
          } catch (error) {
            if (typeof console !== "undefined") {
              // eslint-disable-next-line no-console
              console.warn("[AgentWidget] Context provider failed:", error);
            }
          }
        })
      );

      if (Object.keys(contextAggregate).length) {
        payload.context = contextAggregate;
      }
    }

    if (this.requestMiddleware) {
      try {
        const result = await this.requestMiddleware({
          payload: { ...payload },
          config: this.config
        });
        if (result && typeof result === "object") {
          return result as AgentWidgetRequestPayload;
        }
      } catch (error) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.error("[AgentWidget] Request middleware error:", error);
        }
      }
    }

    return payload;
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

    const ensureStringContent = (value: unknown): string => {
      if (typeof value === "string") {
        return value;
      }
      if (value === null || value === undefined) {
        return "";
      }
      // Convert objects/arrays to JSON string
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    // Maintain stateful stream parsers per message for incremental parsing
    const streamParsers = new Map<string, AgentWidgetStreamParser>();
    // Track accumulated raw content for structured formats (JSON, XML, etc.)
    const rawContentBuffers = new Map<string, string>();

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
          // Only process chunks for prompt steps, not tool/context steps
          const stepType = (payload as any).stepType;
          const executionType = (payload as any).executionType;
          if (stepType === "tool" || executionType === "context") {
            // Skip tool-related chunks - they're handled by tool_start/tool_complete
            continue;
          }
          const assistant = ensureAssistantMessage();
          const chunk = payload.text ?? payload.delta ?? payload.content ?? "";
          if (chunk) {
            // Accumulate raw content for structured format parsing
            const rawBuffer = rawContentBuffers.get(assistant.id) ?? "";
            const accumulatedRaw = rawBuffer + chunk;
            // Store raw content for action parsing, but NEVER set assistant.content to raw JSON
            assistant.rawContent = accumulatedRaw;
            
            // Use stream parser to parse
            if (!streamParsers.has(assistant.id)) {
              streamParsers.set(assistant.id, this.createStreamParser());
            }
            const parser = streamParsers.get(assistant.id)!;
            
            // Check if content looks like JSON
            const looksLikeJson = accumulatedRaw.trim().startsWith('{') || accumulatedRaw.trim().startsWith('[');
            
            // Store raw buffer before processing (needed for step_complete handler)
            if (looksLikeJson) {
              rawContentBuffers.set(assistant.id, accumulatedRaw);
            }
            
            // Check if this is a plain text parser (marked with __isPlainTextParser)
            const isPlainTextParser = (parser as any).__isPlainTextParser === true;
            
            // If plain text parser, just append the chunk directly
            if (isPlainTextParser) {
              assistant.content += chunk;
              // Clear any raw buffer/parser since we're in plain text mode
              rawContentBuffers.delete(assistant.id);
              streamParsers.delete(assistant.id);
              assistant.rawContent = undefined;
              emitMessage(assistant);
              continue;
            }
            
            // Try to parse with the parser (for structured parsers)
            const parsedResult = parser.processChunk(accumulatedRaw);
            
            // Handle async parser result
            if (parsedResult instanceof Promise) {
              parsedResult.then((result) => {
                // Extract text from result (could be string or object)
                const text = typeof result === 'string' ? result : result?.text ?? null;
                
                if (text !== null && text.trim() !== "") {
                  // Parser successfully extracted text
                  // Update the message content with extracted text
                  const currentAssistant = assistantMessage;
                  if (currentAssistant && currentAssistant.id === assistant.id) {
                    currentAssistant.content = text;
                    emitMessage(currentAssistant);
                  }
                } else if (!looksLikeJson && !accumulatedRaw.trim().startsWith('<')) {
                  // Not a structured format - show as plain text
                  const currentAssistant = assistantMessage;
                  if (currentAssistant && currentAssistant.id === assistant.id) {
                    currentAssistant.content += chunk;
                    rawContentBuffers.delete(currentAssistant.id);
                    streamParsers.delete(currentAssistant.id);
                    currentAssistant.rawContent = undefined;
                    emitMessage(currentAssistant);
                  }
                }
                // Otherwise wait for more chunks (incomplete structured format)
                // Don't emit message if parser hasn't extracted text yet
              }).catch(() => {
                // On error, treat as plain text
                assistant.content += chunk;
                rawContentBuffers.delete(assistant.id);
                streamParsers.delete(assistant.id);
                assistant.rawContent = undefined;
                emitMessage(assistant);
              });
            } else {
              // Synchronous parser result
              // Extract text from result (could be string, null, or object)
              const text = typeof parsedResult === 'string' ? parsedResult : parsedResult?.text ?? null;
              
              if (text !== null && text.trim() !== "") {
                // Parser successfully extracted text
                // Buffer is already set above
                assistant.content = text;
                emitMessage(assistant);
              } else if (!looksLikeJson && !accumulatedRaw.trim().startsWith('<')) {
                // Not a structured format - show as plain text
                assistant.content += chunk;
                // Clear any raw buffer/parser if we were in structured format mode
                rawContentBuffers.delete(assistant.id);
                streamParsers.delete(assistant.id);
                assistant.rawContent = undefined;
                emitMessage(assistant);
              }
              // Otherwise wait for more chunks (incomplete structured format)
              // Don't emit message if parser hasn't extracted text yet
            }
            
            // IMPORTANT: Don't call getExtractedText() and emit messages here
            // This was causing raw JSON to be displayed because getExtractedText() 
            // wasn't extracting the "text" field correctly during streaming
          }
          if (payload.isComplete) {
            const finalContent = payload.result?.response ?? assistant.content;
            if (finalContent) {
              // Check if we have raw content buffer that needs final processing
              const rawBuffer = rawContentBuffers.get(assistant.id);
              const contentToProcess = rawBuffer ?? ensureStringContent(finalContent);
              assistant.rawContent = contentToProcess;
              
              // Try to extract text from final structured content
              const parser = streamParsers.get(assistant.id);
              let extractedText: string | null = null;
              
              if (parser) {
                // First check if parser already has extracted text
                extractedText = parser.getExtractedText();
                
                if (extractedText === null) {
                  // Try extracting with regex
                  extractedText = extractTextFromJson(contentToProcess);
                }
                
                if (extractedText === null) {
                  // Try parser.processChunk as last resort
                  const parsedResult = parser.processChunk(contentToProcess);
                  if (parsedResult instanceof Promise) {
                    parsedResult.then((result) => {
                      // Extract text from result (could be string or object)
                      const text = typeof result === 'string' ? result : result?.text ?? null;
                      if (text !== null) {
                        const currentAssistant = assistantMessage;
                        if (currentAssistant && currentAssistant.id === assistant.id) {
                          currentAssistant.content = text;
                          currentAssistant.streaming = false;
                          emitMessage(currentAssistant);
                        }
                      }
                    });
                  } else {
                    // Extract text from synchronous result
                    extractedText = typeof parsedResult === 'string' ? parsedResult : parsedResult?.text ?? null;
                  }
                }
              }
              
            // Set content: use extracted text if available, otherwise use raw content
            if (extractedText !== null && extractedText.trim() !== "") {
              assistant.content = extractedText;
            } else if (!rawContentBuffers.has(assistant.id)) {
              // Only use raw final content if we didn't accumulate chunks
              assistant.content = ensureStringContent(finalContent);
            }
              
              // Clean up parser and buffer
              const parserToClose = streamParsers.get(assistant.id);
              if (parserToClose) {
                const closeResult = parserToClose.close?.();
                if (closeResult instanceof Promise) {
                  closeResult.catch(() => {});
                }
                streamParsers.delete(assistant.id);
              }
              rawContentBuffers.delete(assistant.id);
              assistant.streaming = false;
              emitMessage(assistant);
            }
          }
        } else if (payloadType === "step_complete") {
          // Only process completions for prompt steps, not tool/context steps
          const stepType = (payload as any).stepType;
          const executionType = (payload as any).executionType;
          if (stepType === "tool" || executionType === "context") {
            // Skip tool-related completions - they're handled by tool_complete
            continue;
          }
          const finalContent = payload.result?.response;
          const assistant = ensureAssistantMessage();
          if (finalContent !== undefined && finalContent !== null) {
            // Check if we already have extracted text from streaming
            const parser = streamParsers.get(assistant.id);
            let hasExtractedText = false;
            
            if (parser) {
              // First check if parser already extracted text during streaming
              const currentExtractedText = parser.getExtractedText();
              const rawBuffer = rawContentBuffers.get(assistant.id);
              const contentToProcess = rawBuffer ?? ensureStringContent(finalContent);
              
              // Always set rawContent so action parsers can access the raw JSON
              assistant.rawContent = contentToProcess;
              
              if (currentExtractedText !== null && currentExtractedText.trim() !== "") {
                // We already have extracted text from streaming - use it
                assistant.content = currentExtractedText;
                hasExtractedText = true;
              } else {
                // No extracted text yet - try to extract from final content
                
                // Try fast path first
                const extractedText = extractTextFromJson(contentToProcess);
                if (extractedText !== null) {
                  assistant.content = extractedText;
                  hasExtractedText = true;
                } else {
                  // Try parser
                  const parsedResult = parser.processChunk(contentToProcess);
                  if (parsedResult instanceof Promise) {
                    parsedResult.then((result) => {
                      // Extract text from result (could be string or object)
                      const text = typeof result === 'string' ? result : result?.text ?? null;
                      
                      if (text !== null && text.trim() !== "") {
                        const currentAssistant = assistantMessage;
                        if (currentAssistant && currentAssistant.id === assistant.id) {
                          currentAssistant.content = text;
                          currentAssistant.streaming = false;
                          emitMessage(currentAssistant);
                        }
                      } else {
                        // No extracted text - check if we should show raw content
                        const finalExtractedText = parser.getExtractedText();
                        if (finalExtractedText === null || finalExtractedText.trim() === "") {
                          // No extracted text available - show raw content only if no streaming happened
                          const currentAssistant = assistantMessage;
                          if (currentAssistant && currentAssistant.id === assistant.id) {
                            // Only show raw content if we never had any extracted text
                            if (!rawContentBuffers.has(assistant.id)) {
                              currentAssistant.content = ensureStringContent(finalContent);
                            }
                            currentAssistant.streaming = false;
                            emitMessage(currentAssistant);
                          }
                        }
                      }
                    });
                  } else {
                    // Extract text from synchronous result
                    const text = typeof parsedResult === 'string' ? parsedResult : parsedResult?.text ?? null;
                    
                    if (text !== null && text.trim() !== "") {
                      assistant.content = text;
                      hasExtractedText = true;
                    } else {
                      // Check stub one more time
                      const finalExtractedText = parser.getExtractedText();
                      if (finalExtractedText !== null && finalExtractedText.trim() !== "") {
                        assistant.content = finalExtractedText;
                        hasExtractedText = true;
                      }
                    }
                  }
                }
              }
            }
            
            // Ensure rawContent is set even if there's no parser (for action parsing)
            if (!assistant.rawContent) {
              const rawBuffer = rawContentBuffers.get(assistant.id);
              assistant.rawContent = rawBuffer ?? ensureStringContent(finalContent);
            }
            
            // Only show raw content if we never extracted any text and no buffer was used
            if (!hasExtractedText && !rawContentBuffers.has(assistant.id)) {
              // No extracted text and no streaming happened - show raw content
              assistant.content = ensureStringContent(finalContent);
            }
            
            // Clean up parser and buffer
            if (parser) {
              const closeResult = parser.close?.();
              if (closeResult instanceof Promise) {
                closeResult.catch(() => {});
              }
            }
            streamParsers.delete(assistant.id);
            rawContentBuffers.delete(assistant.id);
            assistant.streaming = false;
            emitMessage(assistant);
          } else {
            // No final content, just mark as complete and clean up
            streamParsers.delete(assistant.id);
            rawContentBuffers.delete(assistant.id);
            assistant.streaming = false;
            emitMessage(assistant);
          }
        } else if (payloadType === "flow_complete") {
          const finalContent = payload.result?.response;
          if (finalContent !== undefined && finalContent !== null) {
            const assistant = ensureAssistantMessage();
            // Check if we have raw content buffer that needs final processing
            const rawBuffer = rawContentBuffers.get(assistant.id);
            const stringContent = rawBuffer ?? ensureStringContent(finalContent);
            assistant.rawContent = stringContent;
            // Try to extract text from structured content
            let displayContent = ensureStringContent(finalContent);
            const parser = streamParsers.get(assistant.id);
            if (parser) {
              const extractedText = extractTextFromJson(stringContent);
              if (extractedText !== null) {
                displayContent = extractedText;
              } else {
                // Try parser if it exists
                const parsedResult = parser.processChunk(stringContent);
                if (parsedResult instanceof Promise) {
                  parsedResult.then((result) => {
                    // Extract text from result (could be string or object)
                    const text = typeof result === 'string' ? result : result?.text ?? null;
                    if (text !== null) {
                      const currentAssistant = assistantMessage;
                      if (currentAssistant && currentAssistant.id === assistant.id) {
                        currentAssistant.content = text;
                        currentAssistant.streaming = false;
                        emitMessage(currentAssistant);
                      }
                    }
                  });
                }
                const currentText = parser.getExtractedText();
                if (currentText !== null) {
                  displayContent = currentText;
                }
              }
            }
            // Clean up parser and buffer
            streamParsers.delete(assistant.id);
            rawContentBuffers.delete(assistant.id);
            if (displayContent !== assistant.content) {
              assistant.content = displayContent;
              emitMessage(assistant);
            }
            assistant.streaming = false;
            emitMessage(assistant);
          } else {
            // No final content, just mark as complete and clean up
            if (assistantMessage !== null) {
              // Clean up any remaining parsers/buffers
              // TypeScript narrowing issue - assistantMessage is checked for null above
              const msg: AgentWidgetMessage = assistantMessage;
              streamParsers.delete(msg.id);
              rawContentBuffers.delete(msg.id);
              msg.streaming = false;
              emitMessage(msg);
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
