import { createElement } from "../utils/dom";
import { AgentWidgetMessage } from "../types";

export type MessageTransform = (context: {
  text: string;
  message: AgentWidgetMessage;
  streaming: boolean;
  raw?: string;
}) => string;

// Create typing indicator element
export const createTypingIndicator = (): HTMLElement => {
  const container = document.createElement("div");
  container.className = "tvw-flex tvw-items-center tvw-space-x-1 tvw-h-5 tvw-mt-2";

  const dot1 = document.createElement("div");
  dot1.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
  dot1.style.animationDelay = "0ms";

  const dot2 = document.createElement("div");
  dot2.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
  dot2.style.animationDelay = "250ms";

  const dot3 = document.createElement("div");
  dot3.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
  dot3.style.animationDelay = "500ms";

  const srOnly = document.createElement("span");
  srOnly.className = "tvw-sr-only";
  srOnly.textContent = "Loading";

  container.appendChild(dot1);
  container.appendChild(dot2);
  container.appendChild(dot3);
  container.appendChild(srOnly);

  return container;
};

export const createStandardBubble = (
  message: AgentWidgetMessage,
  transform: MessageTransform
): HTMLElement => {
  const classes = [
    "vanilla-message-bubble",
    "tvw-max-w-[85%]",
    "tvw-rounded-2xl",
    "tvw-text-sm",
    "tvw-leading-relaxed",
    "tvw-shadow-sm"
  ];

  if (message.role === "user") {
    classes.push(
      "vanilla-message-user-bubble",
      "tvw-ml-auto",
      "tvw-bg-cw-accent",
      "tvw-text-white",
      "tvw-px-5",
      "tvw-py-3"
    );
  } else {
    classes.push(
      "vanilla-message-assistant-bubble",
      "tvw-bg-cw-surface",
      "tvw-border",
      "tvw-border-cw-message-border",
      "tvw-text-cw-primary",
      "tvw-px-5",
      "tvw-py-3"
    );
  }

  const bubble = createElement("div", classes.join(" "));

  // Add message content
  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = transform({
    text: message.content,
    message,
    streaming: Boolean(message.streaming),
    raw: message.rawContent
  });
  bubble.appendChild(contentDiv);

  // Add typing indicator if this is a streaming assistant message
  // Show it when streaming starts (even if content is empty), hide it once content appears
  if (message.streaming && message.role === "assistant") {
    // Only show typing indicator if content is empty or just starting
    // Hide it once we have substantial content
    if (!message.content || !message.content.trim()) {
      const typingIndicator = createTypingIndicator();
      bubble.appendChild(typingIndicator);
    }
  }

  return bubble;
};



