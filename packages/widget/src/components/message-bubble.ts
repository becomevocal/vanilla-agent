import { createElement } from "../utils/dom";
import { 
  AgentWidgetMessage, 
  AgentWidgetMessageLayoutConfig,
  AgentWidgetAvatarConfig,
  AgentWidgetTimestampConfig
} from "../types";

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

/**
 * Create an avatar element
 */
const createAvatar = (
  avatarConfig: AgentWidgetAvatarConfig,
  role: "user" | "assistant"
): HTMLElement => {
  const avatar = createElement(
    "div",
    "tvw-flex-shrink-0 tvw-w-8 tvw-h-8 tvw-rounded-full tvw-flex tvw-items-center tvw-justify-center tvw-text-sm"
  );

  const avatarContent = role === "user" 
    ? avatarConfig.userAvatar 
    : avatarConfig.assistantAvatar;

  if (avatarContent) {
    // Check if it's a URL or emoji/text
    if (avatarContent.startsWith("http") || avatarContent.startsWith("/") || avatarContent.startsWith("data:")) {
      const img = createElement("img") as HTMLImageElement;
      img.src = avatarContent;
      img.alt = role === "user" ? "User" : "Assistant";
      img.className = "tvw-w-full tvw-h-full tvw-rounded-full tvw-object-cover";
      avatar.appendChild(img);
    } else {
      // Emoji or text
      avatar.textContent = avatarContent;
      avatar.classList.add(
        role === "user" ? "tvw-bg-cw-accent" : "tvw-bg-cw-primary",
        "tvw-text-white"
      );
    }
  } else {
    // Default avatar
    avatar.textContent = role === "user" ? "U" : "A";
    avatar.classList.add(
      role === "user" ? "tvw-bg-cw-accent" : "tvw-bg-cw-primary",
      "tvw-text-white"
    );
  }

  return avatar;
};

/**
 * Create a timestamp element
 */
const createTimestamp = (
  message: AgentWidgetMessage,
  timestampConfig: AgentWidgetTimestampConfig
): HTMLElement => {
  const timestamp = createElement(
    "div",
    "tvw-text-xs tvw-text-cw-muted"
  );

  const date = new Date(message.createdAt);
  
  if (timestampConfig.format) {
    timestamp.textContent = timestampConfig.format(date);
  } else {
    // Default format: HH:MM
    timestamp.textContent = date.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  }

  return timestamp;
};

/**
 * Get bubble classes based on layout preset
 */
const getBubbleClasses = (
  role: "user" | "assistant" | "system",
  layout: AgentWidgetMessageLayoutConfig["layout"] = "bubble"
): string[] => {
  const baseClasses = ["vanilla-message-bubble", "tvw-max-w-[85%]"];

  switch (layout) {
    case "flat":
      // Flat layout: no bubble styling, just text
      if (role === "user") {
        baseClasses.push(
          "vanilla-message-user-bubble",
          "tvw-ml-auto",
          "tvw-text-cw-primary",
          "tvw-py-2"
        );
      } else {
        baseClasses.push(
          "vanilla-message-assistant-bubble",
          "tvw-text-cw-primary",
          "tvw-py-2"
        );
      }
      break;

    case "minimal":
      // Minimal layout: reduced padding and styling
      baseClasses.push(
        "tvw-text-sm",
        "tvw-leading-relaxed"
      );
      if (role === "user") {
        baseClasses.push(
          "vanilla-message-user-bubble",
          "tvw-ml-auto",
          "tvw-bg-cw-accent",
          "tvw-text-white",
          "tvw-px-3",
          "tvw-py-2",
          "tvw-rounded-lg"
        );
      } else {
        baseClasses.push(
          "vanilla-message-assistant-bubble",
          "tvw-bg-cw-surface",
          "tvw-text-cw-primary",
          "tvw-px-3",
          "tvw-py-2",
          "tvw-rounded-lg"
        );
      }
      break;

    case "bubble":
    default:
      // Default bubble layout
      baseClasses.push(
        "tvw-rounded-2xl",
        "tvw-text-sm",
        "tvw-leading-relaxed",
        "tvw-shadow-sm"
      );
      if (role === "user") {
        baseClasses.push(
          "vanilla-message-user-bubble",
          "tvw-ml-auto",
          "tvw-bg-cw-accent",
          "tvw-text-white",
          "tvw-px-5",
          "tvw-py-3"
        );
      } else {
        baseClasses.push(
          "vanilla-message-assistant-bubble",
          "tvw-bg-cw-surface",
          "tvw-border",
          "tvw-border-cw-message-border",
          "tvw-text-cw-primary",
          "tvw-px-5",
          "tvw-py-3"
        );
      }
      break;
  }

  return baseClasses;
};

/**
 * Create standard message bubble
 * Supports layout configuration for avatars, timestamps, and visual presets
 */
export const createStandardBubble = (
  message: AgentWidgetMessage,
  transform: MessageTransform,
  layoutConfig?: AgentWidgetMessageLayoutConfig
): HTMLElement => {
  const config = layoutConfig ?? {};
  const layout = config.layout ?? "bubble";
  const avatarConfig = config.avatar;
  const timestampConfig = config.timestamp;
  const showAvatar = avatarConfig?.show ?? false;
  const showTimestamp = timestampConfig?.show ?? false;
  const avatarPosition = avatarConfig?.position ?? "left";
  const timestampPosition = timestampConfig?.position ?? "below";

  // Create the bubble element
  const classes = getBubbleClasses(message.role, layout);
  const bubble = createElement("div", classes.join(" "));

  // Add message content
  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = transform({
    text: message.content,
    message,
    streaming: Boolean(message.streaming),
    raw: message.rawContent
  });

  // Add inline timestamp if configured
  if (showTimestamp && timestampPosition === "inline" && message.createdAt) {
    const timestamp = createTimestamp(message, timestampConfig!);
    timestamp.classList.add("tvw-ml-2", "tvw-inline");
    contentDiv.appendChild(timestamp);
  }

  bubble.appendChild(contentDiv);

  // Add timestamp below if configured
  if (showTimestamp && timestampPosition === "below" && message.createdAt) {
    const timestamp = createTimestamp(message, timestampConfig!);
    timestamp.classList.add("tvw-mt-1");
    bubble.appendChild(timestamp);
  }

  // Add typing indicator if this is a streaming assistant message
  if (message.streaming && message.role === "assistant") {
    if (!message.content || !message.content.trim()) {
      const typingIndicator = createTypingIndicator();
      bubble.appendChild(typingIndicator);
    }
  }

  // If no avatar needed, return bubble directly
  if (!showAvatar || message.role === "system") {
    return bubble;
  }

  // Create wrapper with avatar
  const wrapper = createElement(
    "div",
    `tvw-flex tvw-gap-2 ${message.role === "user" ? "tvw-flex-row-reverse" : ""}`
  );

  const avatar = createAvatar(avatarConfig!, message.role);

  if (avatarPosition === "right" || (avatarPosition === "left" && message.role === "user")) {
    wrapper.append(bubble, avatar);
  } else {
    wrapper.append(avatar, bubble);
  }

  // Adjust bubble max-width when avatar is present
  bubble.classList.remove("tvw-max-w-[85%]");
  bubble.classList.add("tvw-max-w-[calc(85%-2.5rem)]");

  return wrapper;
};

/**
 * Create bubble with custom renderer support
 * Uses custom renderer if provided in layout config, otherwise falls back to standard bubble
 */
export const createBubbleWithLayout = (
  message: AgentWidgetMessage,
  transform: MessageTransform,
  layoutConfig?: AgentWidgetMessageLayoutConfig
): HTMLElement => {
  const config = layoutConfig ?? {};

  // Check for custom renderers
  if (message.role === "user" && config.renderUserMessage) {
    return config.renderUserMessage({
      message,
      config: {} as any, // Will be populated by caller
      streaming: Boolean(message.streaming)
    });
  }

  if (message.role === "assistant" && config.renderAssistantMessage) {
    return config.renderAssistantMessage({
      message,
      config: {} as any, // Will be populated by caller
      streaming: Boolean(message.streaming)
    });
  }

  // Fall back to standard bubble
  return createStandardBubble(message, transform, layoutConfig);
};
