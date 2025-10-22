export type ChatWidgetFeatureFlags = {
  suggestions?: boolean;
  transcript?: boolean;
  avatar?: boolean;
  timestamp?: boolean;
  collapsible?: boolean;
};

export type ChatWidgetTheme = {
  primary?: string;
  secondary?: string;
  surface?: string;
  muted?: string;
  accent?: string;
};

export type ChatWidgetLauncherConfig = {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  iconUrl?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoExpand?: boolean;
  width?: string;
};

export type ChatWidgetConfig = {
  apiUrl?: string;
  metadata?: Record<string, unknown>;
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
  postprocessMessage?: (context: {
    text: string;
    message: ChatWidgetMessage;
    streaming: boolean;
  }) => string;
};

export type ChatWidgetMessageRole = "user" | "assistant" | "system";

export type ChatWidgetMessage = {
  id: string;
  role: ChatWidgetMessageRole;
  content: string;
  createdAt: string;
  streaming?: boolean;
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
