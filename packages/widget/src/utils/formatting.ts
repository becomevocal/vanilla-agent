import { AgentWidgetReasoning, AgentWidgetToolCall } from "../types";
import { SchemaStream } from "schema-stream";
import { z } from "zod";

// Export schema for use in client.ts
export const actionResponseSchema = z.object({
  action: z.string().optional(),
  text: z.string().optional(),
  page: z.string().optional(),
  element: z.string().optional(),
  items: z.array(z.any()).optional(),
  on_load_text: z.string().optional()
});

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

/**
 * Creates a schema-stream parser instance for extracting text from JSON streams.
 * This maintains state across chunks for incremental parsing.
 */
export const createJsonParser = () => {
  let extractedText: string | null = null;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let lastProcessedLength = 0;
  
  const parser = new SchemaStream(actionResponseSchema, {
    onKeyComplete({ completedPaths }) {
      // Check if text field has been completed
      const textCompleted = completedPaths.some(
        path => path.length > 0 && path[path.length - 1] === 'text'
      );
      if (textCompleted) {
        // Try to get the value from the stub
        const stub = parser.getSchemaStub(actionResponseSchema);
        if (stub && typeof stub.text === "string" && stub.text) {
          extractedText = stub.text;
        }
      }
    }
  });
  
  return {
    parser,
    getExtractedText: () => extractedText,
    processChunk: async (accumulatedContent: string): Promise<string | null> => {
      // Only process the new portion of content to avoid duplicating data
      const newContent = accumulatedContent.slice(lastProcessedLength);
      if (newContent.length === 0) {
        return extractedText;
      }
      
      lastProcessedLength = accumulatedContent.length;
      
      // Create a new transform stream for this processing (schema-stream processes full JSON)
      const transformStream = parser.parse();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(accumulatedContent));
          controller.close();
        }
      });
      
      const transformed = readable.pipeThrough(transformStream);
      const reader = transformed.getReader();
      
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            try {
              const decoded = decoder.decode(value as AllowSharedBufferSource);
              const parsed = JSON.parse(decoded);
              if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
                extractedText = parsed.text;
                return parsed.text;
              }
            } catch {
              // Continue reading
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return extractedText;
    },
    close: async () => {
      // No cleanup needed for per-chunk streams
    }
  };
};

/**
 * Extracts the text field from JSON (works with partial JSON during streaming).
 * For complete JSON, uses fast path. For incomplete JSON, returns null (use stateful parser in client.ts).
 * 
 * @param jsonString - The JSON string (can be partial/incomplete during streaming)
 * @returns The extracted text value, or null if not found or invalid
 */
export const extractTextFromJson = (jsonString: string): string | null => {
  try {
    // Try to parse complete JSON first (fast path)
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      return parsed.text;
    }
  } catch {
    // For incomplete JSON, return null - use stateful parser in client.ts
    return null;
  }
  return null;
};






