import { ChatWidgetSessionStatus } from "../session";

export const statusCopy: Record<ChatWidgetSessionStatus, string> = {
  idle: "Online",
  connecting: "Connecting…",
  connected: "Streaming…",
  error: "Offline"
};

