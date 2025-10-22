import {
  initTravrseChat as initTravrseChatFn,
  type TravrseInitHandle
} from "./runtime/init";

export type {
  TravrseChatConfig,
  TravrseChatTheme,
  TravrseFeatureFlags,
  TravrseInitOptions,
  TravrseMessage,
  TravrseLauncherConfig
} from "./types";

export { initTravrseChatFn as initTravrseChat };
export {
  createChatExperience,
  type TravrseChatController
} from "./ui";
export type { ChatWidgetController } from "./ui";
export {
  TravrseChatSession,
  type TravrseSessionStatus
} from "./session";
export { TravrseChatClient } from "./client";
export { TravrseChatClient as ChatWidgetClient } from "./client";
export {
  markdownPostprocessor,
  escapeHtml,
  directivePostprocessor
} from "./postprocessors";
export type { TravrseInitHandle };
export type { TravrseInitHandle as ChatWidgetInitHandle };

export default initTravrseChatFn;
