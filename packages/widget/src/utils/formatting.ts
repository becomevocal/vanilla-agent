import { AgentWidgetReasoning, AgentWidgetToolCall, AgentWidgetStreamParser, AgentWidgetStreamParserResult } from "../types";
import { parse as parsePartialJson, STR, OBJ } from "partial-json";

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
 * Creates a regex-based parser for extracting text from JSON streams.
 * This is a simpler alternative to schema-stream that uses regex to extract
 * the 'text' field incrementally as JSON streams in.
 * 
 * This can be used as an alternative parser option.
 */
const createRegexJsonParserInternal = (): {
  processChunk(accumulatedContent: string): Promise<AgentWidgetStreamParserResult | string | null>;
  getExtractedText(): string | null;
  close?(): Promise<void>;
} => {
  let extractedText: string | null = null;
  let processedLength = 0;
  
  // Regex-based extraction for incremental JSON parsing
  const extractTextFromIncompleteJson = (jsonString: string): string | null => {
    // Look for "text": "value" pattern, handling incomplete strings
    // Match: "text": " followed by any characters (including incomplete)
    const textFieldRegex = /"text"\s*:\s*"((?:[^"\\]|\\.|")*?)"/;
    const match = jsonString.match(textFieldRegex);
    
    if (match && match[1]) {
      // Unescape the string value
      try {
        // Replace escaped characters
        let unescaped = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        return unescaped;
      } catch {
        return match[1];
      }
    }
    
    // Also try to match incomplete text field (text field that hasn't closed yet)
    // Look for "text": " followed by content that may not be closed
    const incompleteTextFieldRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)/;
    const incompleteMatch = jsonString.match(incompleteTextFieldRegex);
    
    if (incompleteMatch && incompleteMatch[1]) {
      // Unescape the partial string value
      try {
        let unescaped = incompleteMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        return unescaped;
      } catch {
        return incompleteMatch[1];
      }
    }
    
    return null;
  };
  
  return {
    getExtractedText: () => extractedText,
    processChunk: async (accumulatedContent: string): Promise<AgentWidgetStreamParserResult | string | null> => {
      // Skip if no new content
      if (accumulatedContent.length <= processedLength) {
        return extractedText !== null
          ? { text: extractedText, raw: accumulatedContent }
          : null;
      }
      
      // Validate that the accumulated content looks like valid JSON
      const trimmed = accumulatedContent.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return null;
      }
      
      // Try to extract text field using regex
      const extracted = extractTextFromIncompleteJson(accumulatedContent);
      if (extracted !== null) {
        extractedText = extracted;
      }
      
      // Update processed length
      processedLength = accumulatedContent.length;
      
      // Return both the extracted text and raw JSON
      if (extractedText !== null) {
        return {
          text: extractedText,
          raw: accumulatedContent
        };
      }

      return null;
    },
    close: async () => {
      // No cleanup needed for regex-based parser
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

/**
 * Plain text parser - passes through text as-is without any parsing.
 * This is the default parser.
 */
export const createPlainTextParser = (): AgentWidgetStreamParser => {
  const parser: AgentWidgetStreamParser = {
    processChunk: (accumulatedContent: string): string | null => {
      // Always return null to indicate this isn't a structured format
      // Content will be displayed as plain text
      return null;
    },
    getExtractedText: (): string | null => {
      return null;
    }
  };
  // Mark this as a plain text parser
  (parser as any).__isPlainTextParser = true;
  return parser;
};

/**
 * JSON parser using regex-based extraction.
 * Extracts the 'text' field from JSON responses using regex patterns.
 * This is a simpler regex-based alternative to createJsonStreamParser.
 * Less robust for complex/malformed JSON but has no external dependencies.
 */
export const createRegexJsonParser = (): AgentWidgetStreamParser => {
  const regexParser = createRegexJsonParserInternal();
  
  return {
    processChunk: async (accumulatedContent: string): Promise<AgentWidgetStreamParserResult | string | null> => {
      // Only process if it looks like JSON
      const trimmed = accumulatedContent.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return null;
      }
      return regexParser.processChunk(accumulatedContent);
    },
    getExtractedText: regexParser.getExtractedText.bind(regexParser),
    close: regexParser.close?.bind(regexParser)
  };
};

/**
 * JSON stream parser using partial-json library.
 * Extracts the 'text' field from JSON responses using the partial-json library,
 * which is specifically designed for parsing incomplete JSON from LLMs.
 * This is the recommended parser as it's more robust than regex.
 * 
 * Library: https://github.com/promplate/partial-json-parser-js
 */
export const createJsonStreamParser = (): AgentWidgetStreamParser => {
  let extractedText: string | null = null;
  let processedLength = 0;
  
  return {
    getExtractedText: () => extractedText,
    processChunk: (accumulatedContent: string): AgentWidgetStreamParserResult | string | null => {
      // Validate that the accumulated content looks like JSON
      const trimmed = accumulatedContent.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return null;
      }
      
      // Skip if no new content
      if (accumulatedContent.length <= processedLength) {
        return extractedText !== null
          ? { text: extractedText, raw: accumulatedContent }
          : null;
      }
      
      try {
        // Parse partial JSON - allow partial strings and objects
        // STR | OBJ allows incomplete strings and objects during streaming
        const parsed = parsePartialJson(accumulatedContent, STR | OBJ);
        
        // Extract text field if available
        if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
          extractedText = parsed.text;
        }
      } catch (error) {
        // If parsing fails completely, keep the last extracted text
        // This can happen with very malformed JSON
      }
      
      // Update processed length
      processedLength = accumulatedContent.length;
      
      // Return both the extracted text and raw JSON
      if (extractedText !== null) {
        return {
          text: extractedText,
          raw: accumulatedContent
        };
      }

      return null;
    },
    close: () => {
      // No cleanup needed
    }
  };
};

/**
 * XML stream parser.
 * Extracts text from <text>...</text> tags in XML responses.
 */
export const createXmlParser = (): AgentWidgetStreamParser => {
  let extractedText: string | null = null;
  
  return {
    processChunk: (accumulatedContent: string): AgentWidgetStreamParserResult | string | null => {
      // Return null if not XML format
      const trimmed = accumulatedContent.trim();
      if (!trimmed.startsWith('<')) {
        return null;
      }
      
      // Extract text from <text>...</text> tags
      // Handle both <text>content</text> and <text attr="value">content</text>
      const match = accumulatedContent.match(/<text[^>]*>([\s\S]*?)<\/text>/);
      if (match && match[1]) {
        extractedText = match[1];
        // For XML, we typically don't need the raw content for middleware
        // but we can include it for consistency
        return { text: extractedText, raw: accumulatedContent };
      }
      
      return null;
    },
    getExtractedText: (): string | null => {
      return extractedText;
    }
  };
};







