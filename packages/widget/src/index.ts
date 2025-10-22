import {
  initChatWidget as initChatWidgetFn,
  type ChatWidgetInitHandle
} from "./runtime/init";

export type {
  ChatWidgetConfig,
  ChatWidgetTheme,
  ChatWidgetFeatureFlags,
  ChatWidgetInitOptions,
  ChatWidgetMessage,
  ChatWidgetLauncherConfig,
  ChatWidgetEvent
} from "./types";

export { initChatWidgetFn as initChatWidget };
export {
  createChatExperience,
  type ChatWidgetController
} from "./ui";
export {
  ChatWidgetSession,
  type ChatWidgetSessionStatus
} from "./session";
export { ChatWidgetClient } from "./client";
export {
  markdownPostprocessor,
  escapeHtml,
  directivePostprocessor
} from "./postprocessors";
export type { ChatWidgetInitHandle };

export default initChatWidgetFn;
