import type { ChatWidgetMessage } from "site-agent/types";

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
    };

export type PageElement = {
  className: string;
  innerText: string;
  tagName: string;
};

const STORAGE_KEY = "site-agent-action-middleware";
const NAV_FLAG_KEY = "site-agent-nav-flag";

export interface StorageData {
  chatHistory: ChatWidgetMessage[];
  navFlag?: {
    onLoadText: string;
    timestamp: number;
  };
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
 */
export function parseActionResponse(text: string): ActionResponse | null {
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text.trim();
    
    // Remove markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }
    
    // Try to find JSON object in the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
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
    
    console.warn("Invalid action response format:", parsed);
    return null;
  } catch (error) {
    console.error("Failed to parse action response:", error);
    return null;
  }
}

/**
 * Executes an action based on the parsed response
 */
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
  } else if (action.action === "nav_then_click") {
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
    window.location.href = targetUrl;
  }
}

/**
 * Saves chat history to localStorage
 */
export function saveChatHistory(messages: ChatWidgetMessage[]): void {
  try {
    const data: StorageData = {
      chatHistory: messages.map((msg) => ({
        ...msg,
        // Remove any non-serializable properties
        streaming: false
      }))
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

