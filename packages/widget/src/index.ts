import {
  initAgentWidget as initAgentWidgetFn,
  type AgentWidgetInitHandle
} from "./runtime/init";

export type {
  AgentWidgetConfig,
  AgentWidgetTheme,
  AgentWidgetFeatureFlags,
  AgentWidgetInitOptions,
  AgentWidgetMessage,
  AgentWidgetLauncherConfig,
  AgentWidgetEvent,
  AgentWidgetStreamParser,
  AgentWidgetStreamParserResult
} from "./types";

export { initAgentWidgetFn as initAgentWidget };
export {
  createAgentExperience,
  type AgentWidgetController
} from "./ui";
export {
  AgentWidgetSession,
  type AgentWidgetSessionStatus
} from "./session";
export { AgentWidgetClient } from "./client";
export { createLocalStorageAdapter } from "./utils/storage";
export {
  createActionManager,
  defaultActionHandlers,
  defaultJsonActionParser
} from "./utils/actions";
export {
  markdownPostprocessor,
  escapeHtml,
  directivePostprocessor
} from "./postprocessors";
export { 
  createPlainTextParser,
  createJsonStreamParser,
  createFlexibleJsonStreamParser,
  createRegexJsonParser,
  createXmlParser
} from "./utils/formatting";
export type { AgentWidgetInitHandle };

// Plugin system exports
export type { AgentWidgetPlugin } from "./plugins/types";
export { pluginRegistry } from "./plugins/registry";

// Default configuration exports
export { DEFAULT_WIDGET_CONFIG, mergeWithDefaults } from "./defaults";

export default initAgentWidgetFn;
