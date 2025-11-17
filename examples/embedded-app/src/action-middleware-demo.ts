import "vanilla-agent/widget.css";
import "./index.css";

import {
  initAgentWidget,
  type AgentWidgetMessage,
  type AgentWidgetConfig,
  type AgentWidgetStreamParser,
  type AgentWidgetStreamParserResult,
  markdownPostprocessor,
  DEFAULT_WIDGET_CONFIG,
  createLocalStorageAdapter,
  defaultActionHandlers
} from "vanilla-agent";
import {
  collectPageContext,
  formatPageContext,
  parseActionResponse,
  executeAction,
  loadChatHistory,
  loadExecutedActionIds,
  saveExecutedActionId,
  checkNavigationFlag,
  STORAGE_KEY
} from "./middleware";
import { createJsonStreamParser } from "vanilla-agent";
// Import types directly from the widget package
import type { 
  AgentWidgetStorageAdapter, 
  AgentWidgetStoredState, 
  AgentWidgetRequestPayload 
} from "../../../packages/widget/src/types";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ??
  `http://localhost:${proxyPort}/api/chat/dispatch-action`;

// Create a context provider that collects page context for metadata
const pageContextProvider = () => {
  const elements = collectPageContext();
  const formattedContext = formatPageContext(elements);
  
  // Return context in a format suitable for metadata
  return {
    page_elements: elements.slice(0, 50), // Limit to first 50 elements
    page_element_count: elements.length,
    page_context: formattedContext,
    page_url: window.location.href,
    page_title: document.title,
    timestamp: new Date().toISOString()
  };
};

// Load chat history from localStorage
let savedMessages = loadChatHistory();

// Create a custom storage adapter that syncs our executedActionIds with widget SDK metadata
// This wraps the widget SDK's storage adapter to sync our data structure
const createSyncedStorageAdapter = () => {
  const baseAdapter = createLocalStorageAdapter(STORAGE_KEY);
  
  return {
    load: () => {
      try {
        // First try to load from widget SDK's format
        const widgetState = baseAdapter.load?.();
        if (widgetState && typeof widgetState === 'object' && !('then' in widgetState)) {
          // Sync widget SDK's processedActionMessageIds with our executedActionIds
          const state = widgetState as any as AgentWidgetStoredState;
          const widgetProcessedIds = Array.isArray(state.metadata?.processedActionMessageIds)
            ? state.metadata.processedActionMessageIds as string[]
            : [];
          
          // Update our in-memory Set
          widgetProcessedIds.forEach(id => processedActionIds.add(id));
          
          return state;
        }
        
        // Fallback to our custom format
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const parsed = JSON.parse(stored);
        // Handle both StorageData structure and plain array
        if (Array.isArray(parsed)) {
          return {
            messages: parsed,
            metadata: {
              processedActionMessageIds: []
            }
          };
        }
        
        const data = parsed as { chatHistory: any[]; executedActionIds?: string[] };
        const processedIds = data.executedActionIds || [];
        
        // Update our in-memory Set
        processedIds.forEach(id => processedActionIds.add(id));
        
        return {
          messages: data.chatHistory || [],
          metadata: {
            processedActionMessageIds: processedIds
          }
        };
      } catch (error) {
        console.error("[Storage Adapter] Failed to load:", error);
        return null;
      }
    },
    save: (state: AgentWidgetStoredState) => {
      try {
        // Save using widget SDK's format, but also sync to our format
        baseAdapter.save?.(state);
        
        // Also save to our custom format for backwards compatibility
        const widgetProcessedIds = Array.isArray(state.metadata?.processedActionMessageIds)
          ? state.metadata.processedActionMessageIds as string[]
          : [];
        
        const data = {
          chatHistory: state.messages || [],
          executedActionIds: widgetProcessedIds
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        // Update our in-memory Set
        widgetProcessedIds.forEach(id => processedActionIds.add(id));
      } catch (error) {
        console.error("[Storage Adapter] Failed to save:", error);
      }
    },
    clear: () => {
      try {
        baseAdapter.clear?.();
        processedActionIds.clear();
      } catch (error) {
        console.error("[Storage Adapter] Failed to clear:", error);
      }
    }
  };
};

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

// Load previously executed action IDs from localStorage (for syncing with widget SDK metadata)
let processedActionIds = new Set<string>(loadExecutedActionIds());
console.log("[Action Middleware] Loaded processedActionIds:", Array.from(processedActionIds));
console.log("[Action Middleware] Loaded savedMessages:", savedMessages.map(m => ({ id: m.id, role: m.role, hasRawContent: !!m.rawContent })));
// Debug: Check localStorage structure
try {
  const stored = localStorage.getItem("vanilla-agent-action-middleware");
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log("[Action Middleware] localStorage structure:", {
      isArray: Array.isArray(parsed),
      hasExecutedActionIds: !Array.isArray(parsed) && parsed.executedActionIds,
      executedActionIdsCount: !Array.isArray(parsed) ? (parsed.executedActionIds?.length || 0) : 0
    });
  }
} catch (e) {
  console.error("[Action Middleware] Failed to inspect localStorage:", e);
}
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
  // Use widget SDK's default action handlers - they work with the action manager's built-in deduplication
  actionHandlers: [
    defaultActionHandlers.message,
    defaultActionHandlers.messageAndClick
  ],
  // Use custom storage adapter that syncs our executedActionIds with widget SDK metadata
  storageAdapter: createSyncedStorageAdapter(),
  // Add context provider to send DOM content in metadata
  contextProviders: [pageContextProvider],
  // Move context to metadata in request (like sample.html)
  requestMiddleware: ({ payload }) => {
    if (payload.context) {
      // Return a new payload with metadata instead of context
      return {
        ...payload,
        metadata: payload.context,
        context: undefined
      } as AgentWidgetRequestPayload & { metadata?: Record<string, unknown> };
    }
    return payload;
  },
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
    
    // Note: Message persistence is handled automatically by the widget SDK's storage adapter
    // No need to manually save here - the widget SDK saves messages and metadata automatically
    
    // Note: Action execution is now handled by the widget SDK's action manager and default handlers
    // The widget SDK automatically prevents re-execution via processedActionMessageIds in metadata
    // We only need to handle custom actions (like nav_then_click) if needed
    
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

// Clear in-memory state when chat is cleared
// (localStorage is automatically cleared via clearChatHistoryStorageKey config option)
window.addEventListener("vanilla-agent:clear-chat", () => {
  console.log("[Action Middleware] Clear chat event received, clearing in-memory state");
  processedActionIds.clear();
  rawJsonByMessageId.clear();
});

// Expose controller for debugging
(window as any).widgetController = widgetController;
