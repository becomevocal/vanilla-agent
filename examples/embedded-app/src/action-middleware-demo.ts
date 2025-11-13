import "vanilla-agent/widget.css";
import "./index.css";

import {
  initAgentWidget,
  type AgentWidgetMessage,
  type AgentWidgetConfig,
  type AgentWidgetStreamParser,
  type AgentWidgetStreamParserResult,
  markdownPostprocessor,
  DEFAULT_WIDGET_CONFIG
} from "vanilla-agent";
import {
  collectPageContext,
  formatPageContext,
  parseActionResponse,
  executeAction,
  saveChatHistory,
  loadChatHistory,
  loadExecutedActionIds,
  saveExecutedActionId,
  checkNavigationFlag
} from "./middleware";
import { createJsonStreamParser } from "vanilla-agent";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ??
  `http://localhost:${proxyPort}/api/chat/dispatch-action`;

// Intercept fetch to add DOM context to requests
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  
  // Only intercept our API endpoint
  if (url.includes("/api/chat/dispatch-action") && init?.method === "POST") {
    try {
      const body = JSON.parse(init.body as string);
      const messages = body.messages || [];
      
      // Collect page context
      const elements = collectPageContext();
      const pageContext = formatPageContext(elements);
      
      // Add page context to the last user message
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "user") {
          lastMessage.content = `${lastMessage.content}\n\n---\n\n${pageContext}`;
        }
      }
      
      init.body = JSON.stringify(body);
    } catch (e) {
      console.error("Failed to modify request:", e);
    }
  }
  
  return originalFetch(input, init);
};

// Load chat history from localStorage
let savedMessages = loadChatHistory();

// Check for navigation flag and auto-open if needed
const navMessage = checkNavigationFlag();
const shouldAutoOpen = navMessage !== null;

// If we have a navigation message, add it as an initial assistant message
// But only add it once - check if it's already in savedMessages to prevent duplicates
if (navMessage) {
  const navMessageExists = savedMessages.some(msg => 
    msg.role === "assistant" && msg.content === navMessage
  );
  
  if (!navMessageExists) {
    const navMessageObj: AgentWidgetMessage = {
      id: `nav-${Date.now()}`,
      role: "assistant",
      content: navMessage,
      createdAt: new Date().toISOString(),
      streaming: false
    };
    savedMessages = [...savedMessages, navMessageObj];
  }
}

// Track messages for saving and action execution
let allMessages: AgentWidgetMessage[] = savedMessages.length > 0 ? [...savedMessages] : [];
// Load previously executed action IDs from localStorage
let processedActionIds = new Set<string>(loadExecutedActionIds());
// Store raw JSON for action parsing (map by message ID)
let rawJsonByMessageId = new Map<string, string>();

// Store the last raw JSON globally (will be associated with message ID in postprocessMessage)
let lastRawJson: string | null = null;

// Create a custom parser that wraps the JSON parser and stores raw content
const createActionAwareParser = (): AgentWidgetStreamParser => {
  const baseParser = createJsonStreamParser();
  
  return {
    processChunk: (accumulatedContent: string): AgentWidgetStreamParserResult | string | null | Promise<AgentWidgetStreamParserResult | string | null> => {
      // Call the base parser
      const result = baseParser.processChunk(accumulatedContent);
      
      // Handle async result
      if (result instanceof Promise) {
        return result.then((resolvedResult) => {
          // Store the raw JSON for action parsing
          if (resolvedResult && typeof resolvedResult === 'object' && 'raw' in resolvedResult && resolvedResult.raw) {
            lastRawJson = resolvedResult.raw;
            console.log("[Parser] Stored raw JSON, length:", resolvedResult.raw.length);
          }
          return resolvedResult;
        });
      }
      
      // Handle synchronous result
      if (result && typeof result === 'object' && 'raw' in result && result.raw) {
        lastRawJson = result.raw;
        console.log("[Parser] Stored raw JSON, length:", result.raw.length);
      }
      
      return result;
    },
    getExtractedText: () => baseParser.getExtractedText(),
    close: () => {
      // Clear the raw JSON when parsing is complete
      lastRawJson = null;
      return baseParser.close?.();
    }
  };
};

// Create a custom config with middleware hooks
const config: AgentWidgetConfig = {
  ...DEFAULT_WIDGET_CONFIG,
  apiUrl: proxyUrl,
  initialMessages: savedMessages.length > 0 ? savedMessages : undefined,
  clearChatHistoryStorageKey: "vanilla-agent-action-middleware",  // Automatically clear localStorage on clear chat
  streamParser: createActionAwareParser,  // Use our custom parser that provides both text and raw
  launcher: {
    ...DEFAULT_WIDGET_CONFIG.launcher,
    enabled: true,
    autoExpand: shouldAutoOpen,
    width: "min(920px, 95vw)",
    title: "Shopping Assistant",
    subtitle: "I can help you find products and add them to your cart",
    agentIconText: "🛍️"
  },
  theme: {
    ...DEFAULT_WIDGET_CONFIG.theme,
    primary: "#111827",
    accent: "#0ea5e9",
    surface: "#ffffff",
    muted: "#64748b"
  },
  copy: {
    ...DEFAULT_WIDGET_CONFIG.copy,
    welcomeTitle: "Hi, what can I help you with?",
    welcomeSubtitle: "Try asking for products or adding items to your cart",
    inputPlaceholder: "Type your message…",
    sendButtonLabel: "Send"
  },
  suggestionChips: [
    "I am looking for a black shirt in medium",
    "Show me available products",
    "Add an item to cart"
  ],
  postprocessMessage: ({ text, streaming, message }) => {
    console.log("[Action Middleware] postprocessMessage called:", { 
      role: message.role, 
      streaming, 
      textLength: text.length,
      textPreview: text.substring(0, 100),
      messageId: message.id
    });
    
    // Track all messages
    if (!streaming) {
      const existingIndex = allMessages.findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        allMessages[existingIndex] = { ...message, streaming: false };
      } else {
        allMessages.push({ ...message, streaming: false });
      }
      
      // Save to localStorage periodically
      saveChatHistory(allMessages);
    }
    
    // Parse and execute actions for assistant messages
    // Check if this is a regular assistant message (not reasoning or tool)
    // We process if role is "assistant" AND variant is NOT "reasoning" or "tool"
    const isRegularAssistant = message.role === "assistant" && 
      message.variant !== "reasoning" && message.variant !== "tool";
    
    if (isRegularAssistant) {
      // The parser stores raw JSON in lastRawJson
      // During streaming, capture it and associate with this message
      if (streaming && lastRawJson) {
        // Store the raw JSON for this message for action parsing
        rawJsonByMessageId.set(message.id, lastRawJson);
        console.log("[Action Middleware] Associated raw JSON with message:", message.id, "length:", lastRawJson.length);
      }
      
      if (!streaming) {
        // Streaming complete - check if we have a stored raw JSON for action parsing
        const storedRawJson = rawJsonByMessageId.get(message.id);
        
        if (storedRawJson) {
          console.log("[Action Middleware] Parsing action from stored raw JSON");
          const action = parseActionResponse(storedRawJson);
          console.log("[Action Middleware] Parsed action:", action);
          
          if (action) {
            // Only execute once when streaming completes
            if (!processedActionIds.has(message.id)) {
              processedActionIds.add(message.id);
              saveExecutedActionId(message.id);
              console.log("[Action Middleware] Executing action:", action.action);
              
              // Execute with a small delay
              if (action.action === "nav_then_click") {
                setTimeout(() => {
                  executeAction(action, () => {});
                }, 100);
              } else {
                setTimeout(() => {
                  executeAction(action, () => {});
                }, 300);
              }
            }
            
            // Extract display text from action
            let displayText = "";
            if (action.action === "message") {
              displayText = action.text;
            } else if ("text" in action) {
              displayText = action.text;
            }
            
            if (displayText) {
              console.log("[Action Middleware] Returning extracted message text");
              return markdownPostprocessor(displayText);
            }
            
            return "";
          }
        }
      }
    }
    
    // For streaming of non-JSON or no action: return text as-is (the parser already extracted any needed text)
    // For non-assistant messages: return as-is
    return markdownPostprocessor(text);
  },
  debug: true
};

// Initialize widget
const widgetController = initAgentWidget({
  target: "#launcher-root",
  useShadowDom: false,
  config,
  onReady: () => {
    // Handle navigation message after widget is ready
    if (navMessage && shouldAutoOpen) {
      setTimeout(() => {
        widgetController.open();
      }, 300);
    }
  }
});

// Clear in-memory arrays when chat is cleared
// (localStorage is automatically cleared via clearChatHistoryStorageKey config option)
window.addEventListener("vanilla-agent:clear-chat", () => {
  console.log("[Action Middleware] Clear chat event received, clearing in-memory state");
  allMessages = [];
  processedActionIds.clear();
  rawJsonByMessageId.clear();
});

// Expose controller for debugging
(window as any).widgetController = widgetController;
