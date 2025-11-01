import "@chaty-assistant/vanilla/widget.css";
import "./index.css";

import {
  initChatWidget,
  type ChatWidgetMessage,
  type ChatWidgetConfig,
  markdownPostprocessor
} from "@chaty-assistant/vanilla";
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
    const navMessageObj: ChatWidgetMessage = {
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
let allMessages: ChatWidgetMessage[] = savedMessages.length > 0 ? [...savedMessages] : [];
// Load previously executed action IDs from localStorage
let processedActionIds = new Set<string>(loadExecutedActionIds());

// Create a custom config with middleware hooks
const config: ChatWidgetConfig = {
  apiUrl: proxyUrl,
  initialMessages: savedMessages.length > 0 ? savedMessages : undefined,
  launcher: {
    enabled: true,
    autoExpand: shouldAutoOpen,
    width: "min(920px, 95vw)",
    title: "Shopping Assistant",
    subtitle: "I can help you find products and add them to your cart",
    iconText: "🛍️"
  },
  theme: {
    primary: "#111827",
    accent: "#0ea5e9",
    surface: "#ffffff",
    muted: "#64748b"
  },
  copy: {
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
    
    console.log("[Action Middleware] Checking message:", {
      role: message.role,
      variant: message.variant,
      isRegularAssistant,
      textPreview: text.substring(0, 50)
    });
    
    if (isRegularAssistant) {
      // Check if text looks like JSON (contains { and })
      const trimmed = text.trim();
      const looksLikeJson = trimmed.startsWith('{') || text.includes('{');
      
      console.log("[Action Middleware] Assistant message detected:", {
        role: message.role,
        variant: message.variant,
        looksLikeJson,
        streaming
      });
      
      if (streaming) {
        // During streaming, suppress ALL content that contains {
        // This catches JSON even if it's just the first chunk "{"
        if (looksLikeJson) {
          console.log("[Action Middleware] Suppressing JSON during streaming");
          return ""; // Suppress rendering during streaming
        }
        console.log("[Action Middleware] Not JSON during streaming, returning as-is");
        return text;
      } else {
        // Streaming is complete - parse the JSON and extract text
        // The text parameter should be the full JSON from step_complete
        console.log("[Action Middleware] Streaming complete, text:", text.substring(0, 200));
        
        // Always try to parse if it looks like JSON
        if (looksLikeJson) {
          const action = parseActionResponse(text);
          console.log("[Action Middleware] Parsed action:", action);
          
          if (action) {
            // Only execute once when streaming completes
            // Check both in-memory Set and localStorage to prevent re-execution
            if (!processedActionIds.has(message.id)) {
              processedActionIds.add(message.id);
              saveExecutedActionId(message.id); // Persist to localStorage
              console.log("[Action Middleware] Executing action for message:", message.id, action.action);
              
              // For nav_then_click, add a small delay to ensure processedActionIds is set
              // before navigation happens (which prevents duplicate executions)
              // For other actions, use a small delay
              if (action.action === "nav_then_click") {
                // Add delay to ensure processedActionIds is set before navigation
                setTimeout(() => {
                  executeAction(action, () => {});
                }, 100);
              } else {
                setTimeout(() => {
                  executeAction(action, () => {});
                }, 300);
              }
            } else {
              console.log("[Action Middleware] Action already processed for message:", message.id, "- skipping execution");
            }
            
            // Return the text portion for display with markdown parsing
            let displayText = "";
            if (action.action === "message") {
              displayText = action.text;
            } else if ("text" in action) {
              displayText = action.text;
            }
            
            if (displayText) {
              console.log("[Action Middleware] Returning message text:", displayText);
              // Apply markdown parsing to convert markdown links to HTML
              return markdownPostprocessor(displayText);
            }
            
            // If no text to display, return empty string
            return "";
          } else {
            console.error("[Action Middleware] Failed to parse JSON action response:", text);
            // Return empty string to suppress invalid JSON
            return "";
          }
        }
        
        // If it doesn't look like JSON, return as-is with markdown parsing
        console.log("[Action Middleware] Doesn't look like JSON, returning as-is");
        return markdownPostprocessor(text);
      }
    }
    
    // For non-assistant messages or if no action detected, return as-is with markdown parsing
    console.log("[Action Middleware] Not assistant message or has variant, returning as-is", {
      role: message.role,
      variant: message.variant
    });
    return markdownPostprocessor(text);
  },
  debug: true
};

// Initialize widget
const widgetController = initChatWidget({
  target: "#launcher-root",
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

// Expose controller for debugging
(window as any).widgetController = widgetController;

