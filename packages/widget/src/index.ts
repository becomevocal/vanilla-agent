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

// Plugin system exports
export type { ChatWidgetPlugin } from "./plugins/types";
export { pluginRegistry } from "./plugins/registry";

// Default configuration exports
export { DEFAULT_WIDGET_CONFIG, mergeWithDefaults } from "./defaults";

export default initChatWidgetFn;
