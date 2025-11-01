import { createElement } from "../utils/dom";
import { ChatWidgetConfig } from "../types";
import { positionMap } from "../utils/positioning";

export interface PanelWrapper {
  wrapper: HTMLElement;
  panel: HTMLElement;
}

export const createWrapper = (config?: ChatWidgetConfig): PanelWrapper => {
  const launcherEnabled = config?.launcher?.enabled ?? true;

  if (!launcherEnabled) {
    const wrapper = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-h-full"
    );
    const panel = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-h-full tvw-min-h-[360px]"
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
  const width = launcherWidth ?? "min(360px, calc(100vw - 24px))";
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
  composerForm: HTMLFormElement;
  statusText: HTMLElement;
  introTitle: HTMLElement;
  introSubtitle: HTMLElement;
  closeButton: HTMLButtonElement;
}

export const buildPanel = (config?: ChatWidgetConfig, showClose = true): PanelElements => {
  const container = createElement(
    "div",
    "tvw-flex tvw-h-full tvw-w-full tvw-flex-col tvw-bg-cw-surface tvw-text-cw-primary tvw-rounded-2xl tvw-overflow-hidden tvw-shadow-2xl tvw-border tvw-border-gray-100"
  );

  const header = createElement(
    "div",
    "tvw-flex tvw-items-center tvw-gap-3 tvw-bg-cw-surface tvw-px-6 tvw-py-5 tvw-border-b tvw-border-gray-100"
  );

  const iconHolder = createElement(
    "div",
    "tvw-flex tvw-h-12 tvw-w-12 tvw-items-center tvw-justify-center tvw-rounded-xl tvw-bg-cw-primary tvw-text-white tvw-text-xl"
  );
  iconHolder.textContent = config?.launcher?.iconUrl ? "" : (config?.launcher?.iconText ?? "💬");

  if (config?.launcher?.iconUrl) {
    const img = createElement("img") as HTMLImageElement;
    img.src = config.launcher.iconUrl;
    img.alt = "";
    img.className = "tvw-h-12 tvw-w-12 tvw-rounded-xl tvw-object-cover";
    iconHolder.replaceChildren(img);
  }

  const headerCopy = createElement("div", "tvw-flex tvw-flex-col");
  const title = createElement(
    "span",
    "tvw-text-base tvw-font-semibold"
  );
  title.textContent =
    config?.launcher?.title ?? "Chat Assistant";
  const subtitle = createElement(
    "span",
    "tvw-text-sm tvw-text-cw-muted"
  );
  subtitle.textContent =
    config?.launcher?.subtitle ?? "Here to help you get answers fast";

  headerCopy.append(title, subtitle);
  header.append(iconHolder, headerCopy);

  const closeButton = createElement(
    "button",
    "tvw-ml-auto tvw-inline-flex tvw-h-8 tvw-w-8 tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none"
  ) as HTMLButtonElement;
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close chat");
  closeButton.textContent = "×";
  closeButton.style.display = showClose ? "" : "none";
  header.appendChild(closeButton);

  const body = createElement(
    "div",
    "tvw-flex tvw-flex-1 tvw-min-h-0 tvw-flex-col tvw-gap-6 tvw-overflow-y-auto tvw-bg-[#f8fafc] tvw-px-6 tvw-py-6"
  );
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

  const footer = createElement(
    "div",
    "tvw-border-t tvw-border-gray-100 tvw-bg-cw-surface tvw-px-6 tvw-py-4"
  );
  const suggestions = createElement(
    "div",
    "tvw-mb-3 tvw-flex tvw-flex-wrap tvw-gap-2"
  );
  const composerForm = createElement(
    "form",
    "tvw-flex tvw-items-end tvw-gap-3 tvw-rounded-2xl tvw-border tvw-border-gray-200 tvw-bg-white tvw-px-4 tvw-py-3"
  ) as HTMLFormElement;
  const textarea = createElement("textarea") as HTMLTextAreaElement;
  textarea.placeholder = config?.copy?.inputPlaceholder ?? "Type your message…";
  textarea.className =
    "tvw-min-h-[48px] tvw-flex-1 tvw-resize-none tvw-border-none tvw-bg-transparent tvw-text-sm tvw-text-cw-primary focus:tvw-outline-none";
  textarea.rows = 1;
  const sendButton = createElement(
    "button",
    "tvw-rounded-full tvw-bg-cw-primary tvw-px-4 tvw-py-2 tvw-text-sm tvw-font-semibold tvw-text-white disabled:tvw-opacity-50 tvw-cursor-pointer"
  ) as HTMLButtonElement;
  sendButton.type = "submit";
  sendButton.textContent = config?.copy?.sendButtonLabel ?? "Send";
  composerForm.append(textarea, sendButton);

  const statusText = createElement(
    "div",
    "tvw-mt-2 tvw-text-right tvw-text-xs tvw-text-cw-muted"
  );
  statusText.textContent = "Online";

  footer.append(suggestions, composerForm, statusText);

  container.append(header, body, footer);

  return {
    container,
    body,
    messagesWrapper,
    suggestions,
    textarea,
    sendButton,
    composerForm,
    statusText,
    introTitle,
    introSubtitle,
    closeButton
  };
};

