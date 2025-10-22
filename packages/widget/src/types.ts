export type TravrseFeatureFlags = {
  suggestions?: boolean;
  transcript?: boolean;
  avatar?: boolean;
  timestamp?: boolean;
  collapsible?: boolean;
};

export type TravrseChatTheme = {
  primary?: string;
  secondary?: string;
  surface?: string;
  muted?: string;
  accent?: string;
};

export type TravrseLauncherConfig = {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  iconUrl?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoExpand?: boolean;
  width?: string;
};

export type TravrseChatConfig = {
  /**
   * URL to your Travrse proxy endpoint. Defaults to the official API.
   */
  apiUrl?: string;
  /**
   * Optional initialization payload forwarded to your backend.
   */
  metadata?: Record<string, unknown>;
  /**
   * Optional flow identifier providing routing context.
   */
  flowId?: string;
  /**
   * Provide per-request headers (e.g. auth cookies when proxying through your backend).
   */
  headers?: Record<string, string>;
  /**
   * Custom text copy for the widget.
   */
  copy?: {
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    inputPlaceholder?: string;
    sendButtonLabel?: string;
  };
  /**
   * Theme overrides. Translated into CSS custom properties.
   */
  theme?: TravrseChatTheme;
  /**
   * Granular feature toggles.
   */
  features?: TravrseFeatureFlags;
  /**
   * Launcher button configuration when embedding via script.
   */
  launcher?: TravrseLauncherConfig;
  /**
   * Pre-seeded messages shown before the user starts typing.
   */
  initialMessages?: TravrseMessage[];
  /**
   * Optional list of quick replies appended under the composer.
   */
  suggestionChips?: string[];
  /**
   * Enable verbose logging for debugging.
   */
  debug?: boolean;
  /**
   * Optional endpoint used by built-in interactive directives (e.g. forms).
   * Defaults to `/form`.
   */
  /**
   * Width override for floating launcher popover. Accepts any CSS length (e.g. '400px' or '90vw').
   */
  launcherWidth?: string;
  formEndpoint?: string;
  /**
   * Optional hook to transform assistant/user message text before rendering.
   * Return HTML (make sure it's sanitized if you render rich content).
   */
  postprocessMessage?: (context: {
    text: string;
    message: TravrseMessage;
    streaming: boolean;
  }) => string;
};

export type TravrseMessageRole = "user" | "assistant" | "system";

export type TravrseMessage = {
  id: string;
  role: TravrseMessageRole;
  content: string;
  createdAt: string;
  streaming?: boolean;
};

export type TravrseChatEvent =
  | { type: "message"; message: TravrseMessage }
  | { type: "status"; status: "connecting" | "connected" | "error" | "idle" }
  | { type: "error"; error: Error };

export type TravrseInitOptions = {
  /**
   * CSS selector or HTMLElement where the widget should render.
   */
  target: string | HTMLElement;
  /**
   * Runtime configuration used when mounting the widget via `initTravrseChat`.
   */
  config?: TravrseChatConfig;
  /**
   * When true, renders the widget inside a shadow root to encapsulate styles.
   */
  useShadowDom?: boolean;
  /**
   * Optional callback invoked after the widget has been fully mounted.
   */
  onReady?: () => void;
};
