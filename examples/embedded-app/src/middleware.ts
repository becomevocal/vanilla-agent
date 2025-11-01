import type { ChatWidgetMessage } from "@chaty-assistant/vanilla";

export type ActionResponse =
  | {
      action: "message";
      text: string;
    }
  | {
      action: "nav_then_click";
      page: string;
      on_load_text: string;
    }
  | {
      action: "message_and_click";
      element: string;
      text: string;
    }
  | {
      action: "checkout";
      text: string;
      items: Array<{
        name: string;
        price: number; // Price in cents
        quantity: number;
      }>;
    };

export type PageElement = {
  className: string;
  innerText: string;
  tagName: string;
};

const STORAGE_KEY = "chaty-action-middleware";
const NAV_FLAG_KEY = "chaty-nav-flag";
const EXECUTED_ACTIONS_KEY = "chaty-executed-actions"; // Track which message IDs have had actions executed

export interface StorageData {
  chatHistory: ChatWidgetMessage[];
  navFlag?: {
    onLoadText: string;
    timestamp: number;
  };
  executedActionIds?: string[]; // Track message IDs that have had actions executed
}

/**
 * Collects all DOM elements with their classnames and innerText
 * to provide context to the LLM about available page elements
 */
export function collectPageContext(): PageElement[] {
  const elements: PageElement[] = [];
  const seen = new Set<string>();

  // Walk through all elements in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const className = element.className;
      
      // Skip elements without meaningful class names or text
      if (
        typeof className === "string" &&
        className.trim() &&
        element.innerText.trim()
      ) {
        const key = `${element.tagName}.${className}`;
        if (!seen.has(key)) {
          seen.add(key);
          elements.push({
            className: className.trim(),
            innerText: element.innerText.trim().substring(0, 200), // Limit text length
            tagName: element.tagName.toLowerCase()
          });
        }
      }
    }
    node = walker.nextNode();
  }

  return elements;
}

/**
 * Formats page context as a string for inclusion in LLM prompt
 */
export function formatPageContext(elements: PageElement[]): string {
  if (elements.length === 0) {
    return "No interactive elements found on the page.";
  }

  const grouped = elements
    .map(
      (el) =>
        `- ${el.tagName}.${el.className}: "${el.innerText.substring(0, 100)}"`
    )
    .join("\n");

  return `Available page elements:\n${grouped}`;
}

/**
 * Parses JSON response from LLM
 * Handles both complete JSON and potentially malformed JSON
 * Returns null if JSON cannot be parsed or is incomplete
 */
export function parseActionResponse(text: string): ActionResponse | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    
    // Remove markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }
    
    // Find the first opening brace
    const firstBraceIndex = jsonText.indexOf('{');
    if (firstBraceIndex === -1) {
      return null;
    }
    
    // Start from the first opening brace and find the matching closing brace
    let braceCount = 0;
    let jsonEndIndex = -1;
    
    for (let i = firstBraceIndex; i < jsonText.length; i++) {
      if (jsonText[i] === '{') {
        braceCount++;
      } else if (jsonText[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEndIndex = i;
          break;
        }
      }
    }
    
    if (jsonEndIndex === -1) {
      return null; // No matching closing brace found
    }
    
    // Extract the JSON substring
    jsonText = jsonText.substring(firstBraceIndex, jsonEndIndex + 1);
    
    const parsed = JSON.parse(jsonText);
    
    // Validate action type
    if (
      parsed.action === "message" &&
      typeof parsed.text === "string"
    ) {
      return parsed as ActionResponse;
    }
    
    if (
      parsed.action === "nav_then_click" &&
      typeof parsed.page === "string" &&
      typeof parsed.on_load_text === "string"
    ) {
      return parsed as ActionResponse;
    }
    
    if (
      parsed.action === "message_and_click" &&
      typeof parsed.element === "string" &&
      typeof parsed.text === "string"
    ) {
      return parsed as ActionResponse;
    }
    
    if (
      parsed.action === "checkout" &&
      typeof parsed.text === "string" &&
      Array.isArray(parsed.items) &&
      parsed.items.every(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "name" in item &&
          "price" in item &&
          "quantity" in item &&
          typeof (item as { name: unknown; price: unknown; quantity: unknown }).name === "string" &&
          typeof (item as { name: unknown; price: unknown; quantity: unknown }).price === "number" &&
          typeof (item as { name: unknown; price: unknown; quantity: unknown }).quantity === "number"
      )
    ) {
      return parsed as ActionResponse;
    }
    
    console.warn("Invalid action response format:", parsed);
    return null;
  } catch (error) {
    // If it's a JSON parse error, return null
    console.error("JSON parse error:", error, "Text:", text);
    return null;
  }
}

/**
 * Executes an action based on the parsed response
 */
let isNavigating = false; // Flag to prevent multiple navigations
const NAVIGATION_TIMEOUT = 2000; // 2 second timeout to prevent duplicate navigations

export function executeAction(
  action: ActionResponse,
  onMessage: (text: string) => void
): void {
  if (action.action === "message") {
    // Just display the message
    onMessage(action.text);
  } else if (action.action === "message_and_click") {
    // Display message and click element
    onMessage(action.text);
    
    // Find and click the element
    const element = document.querySelector(action.element);
    if (element && element instanceof HTMLElement) {
      setTimeout(() => {
        element.click();
      }, 500); // Small delay to ensure message is visible
    } else {
      console.warn(`Element not found: ${action.element}`);
    }
  } else if (action.action === "checkout") {
    // Display message and create Stripe checkout
    onMessage(action.text);
    
    // Create checkout session via API
    fetch(`${window.location.origin.replace(/:\d+$/, "")}:43111/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: action.items,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl;
        } else {
          console.error("Failed to create checkout session:", data.error);
          alert("Failed to create checkout session. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Checkout error:", error);
        alert("Failed to create checkout session. Please try again.");
      });
  } else if (action.action === "nav_then_click") {
    // Prevent duplicate navigation
    if (isNavigating) {
      console.warn("[Action Middleware] Navigation already in progress, ignoring duplicate nav_then_click");
      return;
    }
    
    // Check if we've already navigated recently (stored in sessionStorage)
    const lastNavTime = sessionStorage.getItem("chaty-last-nav-time");
    const now = Date.now();
    if (lastNavTime) {
      const timeSinceLastNav = now - parseInt(lastNavTime, 10);
      if (timeSinceLastNav < NAVIGATION_TIMEOUT) {
        console.warn("[Action Middleware] Navigation happened too recently, ignoring duplicate nav_then_click");
        return;
      }
    }
    
    isNavigating = true;
    sessionStorage.setItem("chaty-last-nav-time", now.toString());
    
    // Save navigation flag and navigate
    const navFlag = {
      onLoadText: action.on_load_text,
      timestamp: Date.now()
    };
    localStorage.setItem(NAV_FLAG_KEY, JSON.stringify(navFlag));
    
    // Navigate to the page (handle both absolute and relative URLs)
    let targetUrl = action.page;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      // Relative URL - make it relative to current origin
      const baseUrl = window.location.origin;
      targetUrl = new URL(targetUrl, baseUrl).toString();
    }
    
    console.log("[Action Middleware] Scheduling navigation to:", targetUrl);
    
    // Add a delay to ensure all checks are complete before navigation
    // This also gives time for processedActionIds to be set
    setTimeout(() => {
      if (isNavigating) {
        console.log("[Action Middleware] Navigating to:", targetUrl);
        window.location.href = targetUrl;
      } else {
        console.warn("[Action Middleware] Navigation cancelled - flag was cleared");
      }
    }, 500); // 500ms delay to allow checks to complete
  }
}

/**
 * Saves chat history to localStorage
 */
export function saveChatHistory(messages: ChatWidgetMessage[]): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const existingData: StorageData = stored ? JSON.parse(stored) : { chatHistory: [] };
    
    const data: StorageData = {
      chatHistory: messages.map((msg) => ({
        ...msg,
        // Remove any non-serializable properties
        streaming: false
      })),
      executedActionIds: existingData.executedActionIds || []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
}

/**
 * Loads chat history from localStorage
 */
export function loadChatHistory(): ChatWidgetMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StorageData = JSON.parse(stored);
      return data.chatHistory || [];
    }
  } catch (error) {
    console.error("Failed to load chat history:", error);
  }
  return [];
}

/**
 * Loads executed action IDs from localStorage
 */
export function loadExecutedActionIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: StorageData = JSON.parse(stored);
      return new Set(data.executedActionIds || []);
    }
  } catch (error) {
    console.error("Failed to load executed action IDs:", error);
  }
  return new Set();
}

/**
 * Saves executed action ID to localStorage
 */
export function saveExecutedActionId(messageId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const existingData: StorageData = stored ? JSON.parse(stored) : { chatHistory: [] };
    
    const executedIds = existingData.executedActionIds || [];
    if (!executedIds.includes(messageId)) {
      executedIds.push(messageId);
      // Keep only the last 100 executed IDs to prevent localStorage from growing too large
      const data: StorageData = {
        ...existingData,
        executedActionIds: executedIds.slice(-100)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Failed to save executed action ID:", error);
  }
}

/**
 * Checks for navigation flag and returns the message to display
 */
export function checkNavigationFlag(): string | null {
  try {
    const stored = localStorage.getItem(NAV_FLAG_KEY);
    if (stored) {
      const flag = JSON.parse(stored);
      // Clear the flag after reading
      localStorage.removeItem(NAV_FLAG_KEY);
      
      // Check if flag is still valid (within 5 minutes)
      const age = Date.now() - flag.timestamp;
      if (age < 5 * 60 * 1000) {
        return flag.onLoadText;
      }
    }
  } catch (error) {
    console.error("Failed to check navigation flag:", error);
  }
  return null;
}

