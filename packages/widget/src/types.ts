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
  container?: string;
  border?: string;
  divider?: string;
  messageBorder?: string;
  inputBackground?: string;
  callToAction?: string;
  callToActionBackground?: string;
  sendButtonBackgroundColor?: string;
  sendButtonTextColor?: string;
  sendButtonBorderColor?: string;
  closeButtonColor?: string;
  closeButtonBackgroundColor?: string;
  closeButtonBorderColor?: string;
  micIconColor?: string;
  micBackgroundColor?: string;
  micBorderColor?: string;
  recordingIconColor?: string;
  recordingBackgroundColor?: string;
  recordingBorderColor?: string;
  inputFontFamily?: "sans-serif" | "serif" | "mono";
  inputFontWeight?: string;
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  launcherRadius?: string;
  buttonRadius?: string;
};

export type ChatWidgetLauncherConfig = {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  textHidden?: boolean;
  iconUrl?: string;
  agentIconText?: string;
  agentIconName?: string;
  agentIconHidden?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoExpand?: boolean;
  width?: string;
  callToActionIconText?: string;
  callToActionIconName?: string;
  callToActionIconColor?: string;
  callToActionIconBackgroundColor?: string;
  callToActionIconHidden?: boolean;
  callToActionIconPadding?: string;
  agentIconSize?: string;
  callToActionIconSize?: string;
  headerIconSize?: string;
  headerIconName?: string;
  headerIconHidden?: boolean;
  closeButtonSize?: string;
  closeButtonColor?: string;
  closeButtonBackgroundColor?: string;
  closeButtonBorderWidth?: string;
  closeButtonBorderColor?: string;
  closeButtonBorderRadius?: string;
  closeButtonPlacement?: "inline" | "top-right";
};

export type ChatWidgetSendButtonConfig = {
  borderWidth?: string;
  borderColor?: string;
  paddingX?: string;
  paddingY?: string;
  iconText?: string;
  iconName?: string;
  useIcon?: boolean;
  tooltipText?: string;
  showTooltip?: boolean;
  backgroundColor?: string;
  textColor?: string;
  size?: string;
};

export type ChatWidgetStatusIndicatorConfig = {
  visible?: boolean;
  idleText?: string;
  connectingText?: string;
  connectedText?: string;
  errorText?: string;
};

export type ChatWidgetVoiceRecognitionConfig = {
  enabled?: boolean;
  pauseDuration?: number;
  iconName?: string;
  iconSize?: string;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  paddingX?: string;
  paddingY?: string;
  tooltipText?: string;
  showTooltip?: boolean;
  recordingIconColor?: string;
  recordingBackgroundColor?: string;
  recordingBorderColor?: string;
  showRecordingIndicator?: boolean;
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
  sendButton?: ChatWidgetSendButtonConfig;
  statusIndicator?: ChatWidgetStatusIndicatorConfig;
  voiceRecognition?: ChatWidgetVoiceRecognitionConfig;
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
