import { createElement } from "../utils/dom";
import { AgentWidgetConfig } from "../types";
import { positionMap } from "../utils/positioning";
import { buildHeader, attachHeaderToContainer, HeaderElements } from "./header-builder";
import { buildHeaderWithLayout } from "./header-layouts";
import { buildComposer, ComposerElements } from "./composer-builder";

export interface PanelWrapper {
  wrapper: HTMLElement;
  panel: HTMLElement;
}

export const createWrapper = (config?: AgentWidgetConfig): PanelWrapper => {
  const launcherEnabled = config?.launcher?.enabled ?? true;

  if (!launcherEnabled) {
    // For inline embed mode, use flex layout to ensure the widget fills its container
    // and only the chat messages area scrolls
    const wrapper = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-h-full tvw-flex tvw-flex-col tvw-flex-1 tvw-min-h-0"
    );
    const panel = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-flex-1 tvw-flex tvw-flex-col tvw-min-h-0"
    );
    wrapper.appendChild(panel);
    return { wrapper, panel };
  }

  const launcher = config?.launcher ?? {};
  const position =
    launcher.position && positionMap[launcher.position]
      ? positionMap[launcher.position]
      : positionMap["bottom-right"];

  const wrapper = createElement(
    "div",
    `tvw-fixed ${position} tvw-z-50 tvw-transition`
  );

  const panel = createElement(
    "div",
    "tvw-relative tvw-min-h-[320px]"
  );
  const launcherWidth = config?.launcher?.width ?? config?.launcherWidth;
  const width = launcherWidth ?? "min(400px, calc(100vw - 24px))";
  panel.style.width = width;
  panel.style.maxWidth = width;

  wrapper.appendChild(panel);
  return { wrapper, panel };
};

export interface PanelElements {
  container: HTMLElement;
  body: HTMLElement;
  messagesWrapper: HTMLElement;
  suggestions: HTMLElement;
  textarea: HTMLTextAreaElement;
  sendButton: HTMLButtonElement;
  sendButtonWrapper: HTMLElement;
  micButton: HTMLButtonElement | null;
  micButtonWrapper: HTMLElement | null;
  composerForm: HTMLFormElement;
  statusText: HTMLElement;
  introTitle: HTMLElement;
  introSubtitle: HTMLElement;
  closeButton: HTMLButtonElement;
  closeButtonWrapper: HTMLElement;
  clearChatButton: HTMLButtonElement | null;
  clearChatButtonWrapper: HTMLElement | null;
  iconHolder: HTMLElement;
  headerTitle: HTMLElement;
  headerSubtitle: HTMLElement;
  // Exposed for potential header replacement
  header: HTMLElement;
  footer: HTMLElement;
}

export const buildPanel = (config?: AgentWidgetConfig, showClose = true): PanelElements => {
  // Use flex-1 and min-h-0 to ensure the container fills its parent and allows
  // the body (chat messages area) to scroll while header/footer stay fixed
  const container = createElement(
    "div",
    "tvw-flex tvw-h-full tvw-w-full tvw-flex-1 tvw-min-h-0 tvw-flex-col tvw-bg-cw-surface tvw-text-cw-primary tvw-rounded-2xl tvw-overflow-hidden tvw-shadow-2xl tvw-border tvw-border-cw-border"
  );

  // Build header using layout config if available, otherwise use standard builder
  const headerLayoutConfig = config?.layout?.header;
  const headerElements: HeaderElements = headerLayoutConfig
    ? buildHeaderWithLayout(config!, headerLayoutConfig, { showClose })
    : buildHeader({ config, showClose });

  // Build body with intro card and messages wrapper
  const body = createElement(
    "div",
    "tvw-flex tvw-flex-1 tvw-min-h-0 tvw-flex-col tvw-gap-6 tvw-overflow-y-auto tvw-bg-cw-container tvw-px-6 tvw-py-6"
  );
  body.id = "vanilla-agent-scroll-container";
  
  const introCard = createElement(
    "div",
    "tvw-rounded-2xl tvw-bg-cw-surface tvw-p-6 tvw-shadow-sm"
  );
  const introTitle = createElement(
    "h2",
    "tvw-text-lg tvw-font-semibold tvw-text-cw-primary"
  );
  introTitle.textContent = config?.copy?.welcomeTitle ?? "Hello 👋";
  const introSubtitle = createElement(
    "p",
    "tvw-mt-2 tvw-text-sm tvw-text-cw-muted"
  );
  introSubtitle.textContent =
    config?.copy?.welcomeSubtitle ??
    "Ask anything about your account or products.";
  introCard.append(introTitle, introSubtitle);

  const messagesWrapper = createElement(
    "div",
    "tvw-flex tvw-flex-col tvw-gap-3"
  );

  body.append(introCard, messagesWrapper);

  // Build composer/footer using extracted builder
  const composerElements: ComposerElements = buildComposer({ config });

  // Assemble container with header, body, and footer
  attachHeaderToContainer(container, headerElements, config);
  container.append(body, composerElements.footer);

  return {
    container,
    body,
    messagesWrapper,
    suggestions: composerElements.suggestions,
    textarea: composerElements.textarea,
    sendButton: composerElements.sendButton,
    sendButtonWrapper: composerElements.sendButtonWrapper,
    micButton: composerElements.micButton,
    micButtonWrapper: composerElements.micButtonWrapper,
    composerForm: composerElements.composerForm,
    statusText: composerElements.statusText,
    introTitle,
    introSubtitle,
    closeButton: headerElements.closeButton,
    closeButtonWrapper: headerElements.closeButtonWrapper,
    clearChatButton: headerElements.clearChatButton,
    clearChatButtonWrapper: headerElements.clearChatButtonWrapper,
    iconHolder: headerElements.iconHolder,
    headerTitle: headerElements.headerTitle,
    headerSubtitle: headerElements.headerSubtitle,
    header: headerElements.header,
    footer: composerElements.footer
  };
};

// Re-export builder types and functions for plugin use
export { buildHeader, buildComposer, attachHeaderToContainer };
export type { HeaderElements, HeaderBuildContext } from "./header-builder";
export type { ComposerElements, ComposerBuildContext } from "./composer-builder";
