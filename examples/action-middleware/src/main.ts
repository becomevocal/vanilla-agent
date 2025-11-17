import "vanilla-agent/widget.css";
import "./index.css";

import {
  initAgentWidget,
  type AgentWidgetMessage,
  type AgentWidgetConfig,
  DEFAULT_WIDGET_CONFIG,
  createLocalStorageAdapter,
  defaultActionHandlers,
  createJsonStreamParser
} from "vanilla-agent";
import {
  collectPageContext,
  formatPageContext,
  parseActionResponse,
  executeAction,
  loadChatHistory,
  checkNavigationFlag,
  STORAGE_KEY
} from "./middleware";
import type { AgentWidgetStorageAdapter, AgentWidgetStoredState } from "vanilla-agent";

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

// Create a custom storage adapter that syncs with our data structure
const createSyncedStorageAdapter = (): AgentWidgetStorageAdapter => {
  const baseAdapter = createLocalStorageAdapter(STORAGE_KEY);
  
  return {
    load: () => {
      try {
        // First try to load from widget SDK's format
        const widgetState = baseAdapter.load?.();
        if (widgetState) {
          return widgetState;
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
        
        const data = parsed as { chatHistory: any[] };
        return {
          messages: data.chatHistory || [],
          metadata: {
            processedActionMessageIds: []
          }
        };
      } catch (error) {
        console.error("[Storage Adapter] Failed to load:", error);
        return null;
      }
    },
    save: (state: AgentWidgetStoredState) => {
      try {
        // Save using widget SDK's format
        baseAdapter.save?.(state);
        
        // Also save to our custom format for backwards compatibility
        const data = {
          chatHistory: state.messages || []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("[Storage Adapter] Failed to save:", error);
      }
    },
    clear: () => {
      try {
        baseAdapter.clear?.();
      } catch (error) {
        console.error("[Storage Adapter] Failed to clear:", error);
      }
    }
  };
};

// Create a custom config with middleware hooks
const config: AgentWidgetConfig = {
  ...DEFAULT_WIDGET_CONFIG,
  apiUrl: proxyUrl,
  initialMessages: savedMessages.length > 0 ? savedMessages : undefined,
  clearChatHistoryStorageKey: STORAGE_KEY,
  streamParser: createJsonStreamParser, // Use JSON parser for structured responses
  // Use widget SDK's default action handlers - they work with the action manager's built-in deduplication
  actionHandlers: [
    defaultActionHandlers.message,
    defaultActionHandlers.messageAndClick,
    // Custom handler for nav_then_click
    (action, context) => {
      if (action.type !== "nav_then_click") return;
      
      const payload = action.payload as { page: string; on_load_text: string };
      const url = payload?.page;
      const text = payload?.on_load_text || "Navigating...";
      
      if (!url) {
        return { handled: true, displayText: text };
      }
      
      // Save navigation flag and navigate
      const navFlag = {
        onLoadText: text,
        timestamp: Date.now()
      };
      localStorage.setItem("vanilla-agent-nav-flag", JSON.stringify(navFlag));
      
      // Navigate to the page (handle both absolute and relative URLs)
      let targetUrl = url;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        const baseUrl = window.location.origin;
        targetUrl = new URL(targetUrl, baseUrl).toString();
      }
      
      // Navigate after a short delay to allow message to render
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
      
      return { handled: true, displayText: text };
    }
  ],
  // Use custom storage adapter that syncs with our data structure
  storageAdapter: createSyncedStorageAdapter(),
  launcher: {
    ...DEFAULT_WIDGET_CONFIG.launcher,
    autoExpand: shouldAutoOpen,
    width: "min(920px, 95vw)",
    title: "Shopping Assistant",
    subtitle: "I can help you find products and add them to your cart",
    agentIconText: "🛍️"
  },
  theme: {
    ...DEFAULT_WIDGET_CONFIG.theme,
    accent: "#0ea5e9"
  },
  copy: {
    ...DEFAULT_WIDGET_CONFIG.copy,
    welcomeTitle: "Hi, what can I help you with?",
    welcomeSubtitle: "Try asking for products or adding items to your cart"
  },
  suggestionChips: [
    "I am looking for a black shirt in medium",
    "Show me available products",
    "Add an item to cart"
  ],
  debug: true
};

// Initialize widget
const widgetController = initAgentWidget({
  target: "#launcher-root",
  config,
  onReady: () => {
    // Handle navigation message after widget is ready
    if (navMessage && shouldAutoOpen) {
      setTimeout(() => {
        widgetController.open();
        // Add the navigation message to chat
        // The server will handle this when the widget opens and sends a request
      }, 300);
    }
  }
});

// Expose controller for debugging
(window as any).widgetController = widgetController;

