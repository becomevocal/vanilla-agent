import type { ChatWidgetPlugin } from "./plugins/types";

export type ChatWidgetFeatureFlags = {
  showReasoning?: boolean;
  showToolCalls?: boolean;
};

export type ChatWidgetTheme = {
  primary?: string;
  secondary?: string;
  surface?: string;
  muted?: string;
  accent?: string;
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  radiusFull?: string;
};

export type ChatWidgetLauncherConfig = {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  iconUrl?: string;
  iconText?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoExpand?: boolean;
  width?: string;
};

export type ChatWidgetConfig = {
  apiUrl?: string;
  flowId?: string;
  headers?: Record<string, string>;
  copy?: {
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    inputPlaceholder?: string;
    sendButtonLabel?: string;
  };
  theme?: ChatWidgetTheme;
  features?: ChatWidgetFeatureFlags;
  launcher?: ChatWidgetLauncherConfig;
  initialMessages?: ChatWidgetMessage[];
  suggestionChips?: string[];
  debug?: boolean;
  formEndpoint?: string;
  launcherWidth?: string;
  postprocessMessage?: (context: {
    text: string;
    message: ChatWidgetMessage;
    streaming: boolean;
  }) => string;
  plugins?: ChatWidgetPlugin[];
};

export type ChatWidgetMessageRole = "user" | "assistant" | "system";

export type ChatWidgetReasoning = {
  id: string;
  status: "pending" | "streaming" | "complete";
  chunks: string[];
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
};

export type ChatWidgetToolCall = {
  id: string;
  name?: string;
  status: "pending" | "running" | "complete";
  args?: unknown;
  chunks?: string[];
  result?: unknown;
  duration?: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
};

export type ChatWidgetMessageVariant = "assistant" | "reasoning" | "tool";

export type ChatWidgetMessage = {
  id: string;
  role: ChatWidgetMessageRole;
  content: string;
  createdAt: string;
  streaming?: boolean;
  variant?: ChatWidgetMessageVariant;
  sequence?: number;
  reasoning?: ChatWidgetReasoning;
  toolCall?: ChatWidgetToolCall;
  tools?: ChatWidgetToolCall[];
};

export type ChatWidgetEvent =
  | { type: "message"; message: ChatWidgetMessage }
  | { type: "status"; status: "connecting" | "connected" | "error" | "idle" }
  | { type: "error"; error: Error };

export type ChatWidgetInitOptions = {
  target: string | HTMLElement;
  config?: ChatWidgetConfig;
  useShadowDom?: boolean;
  onReady?: () => void;
};
