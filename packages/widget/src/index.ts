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
  AgentWidgetStreamParserResult,
  AgentWidgetRequestPayload,
  AgentWidgetCustomFetch,
  AgentWidgetSSEEventParser,
  AgentWidgetSSEEventResult,
  AgentWidgetHeadersFunction,
  // Layout types
  AgentWidgetLayoutConfig,
  AgentWidgetHeaderLayoutConfig,
  AgentWidgetMessageLayoutConfig,
  AgentWidgetAvatarConfig,
  AgentWidgetTimestampConfig,
  WidgetLayoutSlot,
  SlotRenderer,
  SlotRenderContext,
  HeaderRenderContext,
  MessageRenderContext,
  // Markdown types
  AgentWidgetMarkdownConfig,
  AgentWidgetMarkdownOptions,
  AgentWidgetMarkdownRendererOverrides
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
  directivePostprocessor,
  createMarkdownProcessor,
  createMarkdownProcessorFromConfig,
  createDirectivePostprocessor
} from "./postprocessors";
export type { MarkdownProcessorOptions } from "./postprocessors";
export {
  createPlainTextParser,
  createJsonStreamParser,
  createFlexibleJsonStreamParser,
  createRegexJsonParser,
  createXmlParser
} from "./utils/formatting";
export { generateCodeSnippet } from "./utils/code-generators";
export type { CodeFormat } from "./utils/code-generators";
export type { AgentWidgetInitHandle };

// Plugin system exports
export type { AgentWidgetPlugin } from "./plugins/types";
export { pluginRegistry } from "./plugins/registry";

// Component system exports
export { componentRegistry } from "./components/registry";
export type { ComponentRenderer, ComponentContext } from "./components/registry";
export {
  createComponentStreamParser,
  isComponentDirectiveType
} from "./utils/component-parser";
export type { ComponentDirective } from "./utils/component-parser";
export {
  renderComponentDirective,
  createComponentMiddleware,
  hasComponentDirective,
  extractComponentDirectiveFromMessage
} from "./utils/component-middleware";

// Default configuration exports
export { DEFAULT_WIDGET_CONFIG, mergeWithDefaults } from "./defaults";

// Layout system exports
export {
  buildHeader,
  buildComposer,
  attachHeaderToContainer
} from "./components/panel";
export type {
  HeaderElements,
  HeaderBuildContext,
  ComposerElements,
  ComposerBuildContext
} from "./components/panel";
export {
  headerLayouts,
  getHeaderLayout,
  buildHeaderWithLayout,
  buildDefaultHeader,
  buildMinimalHeader,
  buildExpandedHeader
} from "./components/header-layouts";
export type {
  HeaderLayoutContext,
  HeaderLayoutRenderer
} from "./components/header-layouts";
export {
  createStandardBubble,
  createBubbleWithLayout,
  createTypingIndicator
} from "./components/message-bubble";
export type { MessageTransform } from "./components/message-bubble";

export default initAgentWidgetFn;
