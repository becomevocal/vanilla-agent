import { createElement } from "../utils/dom";
import { renderLucideIcon } from "../utils/icons";
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
  sendButtonWrapper: HTMLElement;
  composerForm: HTMLFormElement;
  statusText: HTMLElement;
  introTitle: HTMLElement;
  introSubtitle: HTMLElement;
  closeButton: HTMLButtonElement;
  iconHolder: HTMLElement;
}

export const buildPanel = (config?: ChatWidgetConfig, showClose = true): PanelElements => {
  const container = createElement(
    "div",
    "tvw-flex tvw-h-full tvw-w-full tvw-flex-col tvw-bg-cw-surface tvw-text-cw-primary tvw-rounded-2xl tvw-overflow-hidden tvw-shadow-2xl tvw-border tvw-border-cw-border"
  );

  const header = createElement(
    "div",
    "tvw-flex tvw-items-center tvw-gap-3 tvw-bg-cw-surface tvw-px-6 tvw-py-5 tvw-border-b-cw-divider"
  );

  const launcher = config?.launcher ?? {};
  const headerIconSize = launcher.headerIconSize ?? "48px";
  const closeButtonSize = launcher.closeButtonSize ?? "32px";

  const iconHolder = createElement(
    "div",
    "tvw-flex tvw-items-center tvw-justify-center tvw-rounded-xl tvw-bg-cw-primary tvw-text-white tvw-text-xl"
  );
  iconHolder.style.height = headerIconSize;
  iconHolder.style.width = headerIconSize;
  iconHolder.textContent = config?.launcher?.iconUrl ? "" : (config?.launcher?.iconText ?? "💬");

  if (config?.launcher?.iconUrl) {
    const img = createElement("img") as HTMLImageElement;
    img.src = config.launcher.iconUrl;
    img.alt = "";
    img.className = "tvw-rounded-xl tvw-object-cover";
    img.style.height = headerIconSize;
    img.style.width = headerIconSize;
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
    "tvw-ml-auto tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none"
  ) as HTMLButtonElement;
  closeButton.style.height = closeButtonSize;
  closeButton.style.width = closeButtonSize;
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close chat");
  closeButton.textContent = "×";
  closeButton.style.display = showClose ? "" : "none";
  header.appendChild(closeButton);

  const body = createElement(
    "div",
    "tvw-flex tvw-flex-1 tvw-min-h-0 tvw-flex-col tvw-gap-6 tvw-overflow-y-auto tvw-bg-cw-container tvw-px-6 tvw-py-6"
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
    "tvw-border-t-cw-divider tvw-bg-cw-surface tvw-px-6 tvw-py-4"
  );
  const suggestions = createElement(
    "div",
    "tvw-mb-3 tvw-flex tvw-flex-wrap tvw-gap-2"
  );
  const composerForm = createElement(
    "form",
    "tvw-flex tvw-items-end tvw-gap-3 tvw-rounded-2xl tvw-border tvw-border-gray-200 tvw-bg-cw-input-background tvw-px-4 tvw-py-3"
  ) as HTMLFormElement;
  // Prevent form from getting focus styles
  composerForm.style.outline = "none";
  
  const textarea = createElement("textarea") as HTMLTextAreaElement;
  textarea.placeholder = config?.copy?.inputPlaceholder ?? "Type your message…";
  textarea.className =
    "tvw-min-h-[48px] tvw-flex-1 tvw-resize-none tvw-border-none tvw-bg-transparent tvw-text-sm tvw-text-cw-primary focus:tvw-outline-none focus:tvw-border-none";
  textarea.rows = 1;
  // Explicitly remove border and outline on focus to prevent browser defaults
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.borderWidth = "0";
  textarea.style.borderStyle = "none";
  textarea.style.borderColor = "transparent";
  textarea.addEventListener("focus", () => {
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.borderWidth = "0";
    textarea.style.borderStyle = "none";
    textarea.style.borderColor = "transparent";
    textarea.style.boxShadow = "none";
  });
  textarea.addEventListener("blur", () => {
    textarea.style.border = "none";
    textarea.style.outline = "none";
  });
  // Send button configuration
  const sendButtonConfig = config?.sendButton ?? {};
  const useIcon = sendButtonConfig.useIcon ?? false;
  const iconText = sendButtonConfig.iconText ?? "↑";
  const iconName = sendButtonConfig.iconName;
  const tooltipText = sendButtonConfig.tooltipText ?? "Send message";
  const showTooltip = sendButtonConfig.showTooltip ?? false;
  const buttonSize = sendButtonConfig.size ?? "40px";
  const backgroundColor = sendButtonConfig.backgroundColor;
  const textColor = sendButtonConfig.textColor;

  // Create wrapper for tooltip positioning
  const sendButtonWrapper = createElement("div", "tvw-send-button-wrapper");

  const sendButton = createElement(
    "button",
    useIcon 
      ? "tvw-rounded-button tvw-flex tvw-items-center tvw-justify-center disabled:tvw-opacity-50 tvw-cursor-pointer"
      : "tvw-rounded-button tvw-bg-cw-accent tvw-px-4 tvw-py-2 tvw-text-sm tvw-font-semibold disabled:tvw-opacity-50 tvw-cursor-pointer"
  ) as HTMLButtonElement;

  sendButton.type = "submit";

  if (useIcon) {
    // Icon mode: circular button
    sendButton.style.width = buttonSize;
    sendButton.style.height = buttonSize;
    sendButton.style.minWidth = buttonSize;
    sendButton.style.minHeight = buttonSize;
    sendButton.style.fontSize = "18px";
    sendButton.style.lineHeight = "1";
    
    // Clear any existing content
    sendButton.innerHTML = "";
    
    // Use Lucide icon if iconName is provided, otherwise fall back to iconText
    if (iconName) {
      const iconSize = parseFloat(buttonSize) || 24;
      const iconColor = textColor && typeof textColor === 'string' && textColor.trim() ? textColor.trim() : "currentColor";
      const iconSvg = renderLucideIcon(iconName, iconSize, iconColor, 2);
      if (iconSvg) {
        sendButton.appendChild(iconSvg);
        sendButton.style.color = iconColor;
      } else {
        // Fallback to text if icon fails to render
        sendButton.textContent = iconText;
        if (textColor) {
          sendButton.style.color = textColor;
        } else {
          sendButton.classList.add("tvw-text-white");
        }
      }
    } else {
      sendButton.textContent = iconText;
      if (textColor) {
        sendButton.style.color = textColor;
      } else {
        sendButton.classList.add("tvw-text-white");
      }
    }
    
    if (backgroundColor) {
      sendButton.style.backgroundColor = backgroundColor;
    } else {
      sendButton.classList.add("tvw-bg-cw-primary");
    }
  } else {
    // Text mode: existing behavior
    sendButton.textContent = config?.copy?.sendButtonLabel ?? "Send";
    if (textColor) {
      sendButton.style.color = textColor;
    } else {
      sendButton.classList.add("tvw-text-white");
    }
  }
  
  // Apply existing styling from config
  if (sendButtonConfig.borderWidth) {
    sendButton.style.borderWidth = sendButtonConfig.borderWidth;
    sendButton.style.borderStyle = "solid";
  }
  if (sendButtonConfig.borderColor) {
    sendButton.style.borderColor = sendButtonConfig.borderColor;
  }
  
  // Apply padding styling (works in both icon and text mode)
  if (sendButtonConfig.paddingX) {
    sendButton.style.paddingLeft = sendButtonConfig.paddingX;
    sendButton.style.paddingRight = sendButtonConfig.paddingX;
  } else {
    sendButton.style.paddingLeft = "";
    sendButton.style.paddingRight = "";
  }
  if (sendButtonConfig.paddingY) {
    sendButton.style.paddingTop = sendButtonConfig.paddingY;
    sendButton.style.paddingBottom = sendButtonConfig.paddingY;
  } else {
    sendButton.style.paddingTop = "";
    sendButton.style.paddingBottom = "";
  }

  // Add tooltip if enabled
  if (showTooltip && tooltipText) {
    const tooltip = createElement("div", "tvw-send-button-tooltip");
    tooltip.textContent = tooltipText;
    sendButtonWrapper.appendChild(tooltip);
  }

  sendButtonWrapper.appendChild(sendButton);
  
  // Focus textarea when composer form container is clicked
  composerForm.addEventListener("click", (e) => {
    // Don't focus if clicking on the send button or wrapper
    if (e.target !== sendButton && e.target !== sendButtonWrapper) {
      textarea.focus();
    }
  });
  
  composerForm.append(textarea, sendButtonWrapper);

  const statusText = createElement(
    "div",
    "tvw-mt-2 tvw-text-right tvw-text-xs tvw-text-cw-muted"
  );
  
  // Apply status indicator config
  const statusConfig = config?.statusIndicator ?? {};
  const isVisible = statusConfig.visible ?? true;
  statusText.style.display = isVisible ? "" : "none";
  statusText.textContent = statusConfig.idleText ?? "Online";

  footer.append(suggestions, composerForm, statusText);

  container.append(header, body, footer);

  return {
    container,
    body,
    messagesWrapper,
    suggestions,
    textarea,
    sendButton,
    sendButtonWrapper,
    composerForm,
    statusText,
    introTitle,
    introSubtitle,
    closeButton,
    iconHolder
  };
};



