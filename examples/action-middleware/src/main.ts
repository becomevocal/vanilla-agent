import "vanilla-agent/widget.css";
import "./index.css";

import {
  initChatWidget,
  type ChatWidgetMessage,
  type ChatWidgetConfig,
  DEFAULT_WIDGET_CONFIG
} from "vanilla-agent";
import {
  collectPageContext,
  formatPageContext,
  parseActionResponse,
  executeAction,
  saveChatHistory,
  loadChatHistory,
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
if (navMessage) {
  const navMessageObj: ChatWidgetMessage = {
    id: `nav-${Date.now()}`,
    role: "assistant",
    content: navMessage,
    createdAt: new Date().toISOString(),
    streaming: false
  };
  savedMessages = [...savedMessages, navMessageObj];
}

// Track messages for saving and action execution
let allMessages: ChatWidgetMessage[] = savedMessages.length > 0 ? [...savedMessages] : [];
let processedActionIds = new Set<string>();

// Create a custom config with middleware hooks
const config: ChatWidgetConfig = {
  ...DEFAULT_WIDGET_CONFIG,
  apiUrl: proxyUrl,
  initialMessages: savedMessages.length > 0 ? savedMessages : undefined,
  launcher: {
    ...DEFAULT_WIDGET_CONFIG.launcher,
    autoExpand: shouldAutoOpen,
    width: "min(920px, 95vw)",
    title: "Shopping Assistant",
    subtitle: "I can help you find products and add them to your cart",
    iconText: "🛍️"
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
  postprocessMessage: ({ text, streaming, message }) => {
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
    if (!streaming && message.role === "assistant" && !message.variant) {
      // Only process each message once
      if (!processedActionIds.has(message.id)) {
        processedActionIds.add(message.id);
        
        // Parse JSON action response
        const action = parseActionResponse(text);
        
        if (action) {
          // Execute action after a short delay to ensure message is rendered
          setTimeout(() => {
            executeAction(action, (actionText) => {
              // For nav actions, the page will reload, so this won't execute
              // For message actions, the text is already in the message
              // For message_and_click, the click happens automatically
            });
          }, 300);
          
          // Return the text portion for display
          if (action.action === "message") {
            return action.text;
          } else if ("text" in action) {
            return action.text;
          }
        }
      }
    }
    
    // During streaming, return as-is
    return text;
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
        // Add the navigation message to chat
        // The server will handle this when the widget opens and sends a request
      }, 300);
    }
  }
});

// Expose controller for debugging
(window as any).widgetController = widgetController;

