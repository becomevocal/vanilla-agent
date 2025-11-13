import { createElement } from "../utils/dom";
import { renderLucideIcon } from "../utils/icons";
import { AgentWidgetConfig } from "../types";
import { positionMap } from "../utils/positioning";

export interface PanelWrapper {
  wrapper: HTMLElement;
  panel: HTMLElement;
}

export const createWrapper = (config?: AgentWidgetConfig): PanelWrapper => {
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
}

export const buildPanel = (config?: AgentWidgetConfig, showClose = true): PanelElements => {
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
  const closeButtonPlacement = launcher.closeButtonPlacement ?? "inline";
  const headerIconHidden = launcher.headerIconHidden ?? false;
  const headerIconName = launcher.headerIconName;

  const iconHolder = createElement(
    "div",
    "tvw-flex tvw-items-center tvw-justify-center tvw-rounded-xl tvw-bg-cw-primary tvw-text-white tvw-text-xl"
  );
  iconHolder.style.height = headerIconSize;
  iconHolder.style.width = headerIconSize;
  
  // Render icon based on priority: Lucide icon > iconUrl > agentIconText
  if (!headerIconHidden) {
    if (headerIconName) {
      // Use Lucide icon
      const iconSize = parseFloat(headerIconSize) || 24;
      const iconSvg = renderLucideIcon(headerIconName, iconSize * 0.6, "#ffffff", 2);
      if (iconSvg) {
        iconHolder.replaceChildren(iconSvg);
      } else {
        // Fallback to agentIconText if Lucide icon fails
        iconHolder.textContent = config?.launcher?.agentIconText ?? "💬";
      }
    } else if (config?.launcher?.iconUrl) {
      // Use image URL
      const img = createElement("img") as HTMLImageElement;
      img.src = config.launcher.iconUrl;
      img.alt = "";
      img.className = "tvw-rounded-xl tvw-object-cover";
      img.style.height = headerIconSize;
      img.style.width = headerIconSize;
      iconHolder.replaceChildren(img);
    } else {
      // Use text/emoji
      iconHolder.textContent = config?.launcher?.agentIconText ?? "💬";
    }
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
    "tvw-text-xs tvw-text-cw-muted"
  );
  subtitle.textContent =
    config?.launcher?.subtitle ?? "Here to help you get answers fast";

  headerCopy.append(title, subtitle);
  
  // Only append iconHolder if not hidden
  if (!headerIconHidden) {
    header.append(iconHolder, headerCopy);
  } else {
    header.append(headerCopy);
  }

  // Create clear chat button if enabled
  const clearChatConfig = launcher.clearChat ?? {};
  const clearChatEnabled = clearChatConfig.enabled ?? true;
  let clearChatButton: HTMLButtonElement | null = null;
  let clearChatButtonWrapper: HTMLElement | null = null;

  if (clearChatEnabled) {
    const clearChatSize = clearChatConfig.size ?? "32px";
    const clearChatIconName = clearChatConfig.iconName ?? "refresh-cw";
    const clearChatIconColor = clearChatConfig.iconColor ?? "";
    const clearChatBgColor = clearChatConfig.backgroundColor ?? "";
    const clearChatBorderWidth = clearChatConfig.borderWidth ?? "";
    const clearChatBorderColor = clearChatConfig.borderColor ?? "";
    const clearChatBorderRadius = clearChatConfig.borderRadius ?? "";
    const clearChatPaddingX = clearChatConfig.paddingX ?? "";
    const clearChatPaddingY = clearChatConfig.paddingY ?? "";
    const clearChatTooltipText = clearChatConfig.tooltipText ?? "Clear chat";
    const clearChatShowTooltip = clearChatConfig.showTooltip ?? true;

    // Create button wrapper for tooltip
    clearChatButtonWrapper = createElement(
      "div",
      "tvw-relative tvw-ml-auto tvw-clear-chat-button-wrapper"
    );

    clearChatButton = createElement(
      "button",
      "tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none"
    ) as HTMLButtonElement;

    clearChatButton.style.height = clearChatSize;
    clearChatButton.style.width = clearChatSize;
    clearChatButton.type = "button";
    clearChatButton.setAttribute("aria-label", clearChatTooltipText);

    // Add icon
    const iconSvg = renderLucideIcon(clearChatIconName, "20px", clearChatIconColor || "", 2);
    if (iconSvg) {
      clearChatButton.appendChild(iconSvg);
    }

    // Apply styling from config
    if (clearChatIconColor) {
      clearChatButton.style.color = clearChatIconColor;
      clearChatButton.classList.remove("tvw-text-cw-muted");
    }

    if (clearChatBgColor) {
      clearChatButton.style.backgroundColor = clearChatBgColor;
      clearChatButton.classList.remove("hover:tvw-bg-gray-100");
    }

    if (clearChatBorderWidth || clearChatBorderColor) {
      const borderWidth = clearChatBorderWidth || "0px";
      const borderColor = clearChatBorderColor || "transparent";
      clearChatButton.style.border = `${borderWidth} solid ${borderColor}`;
      clearChatButton.classList.remove("tvw-border-none");
    }

    if (clearChatBorderRadius) {
      clearChatButton.style.borderRadius = clearChatBorderRadius;
      clearChatButton.classList.remove("tvw-rounded-full");
    }

    // Apply padding styling
    if (clearChatPaddingX) {
      clearChatButton.style.paddingLeft = clearChatPaddingX;
      clearChatButton.style.paddingRight = clearChatPaddingX;
    } else {
      clearChatButton.style.paddingLeft = "";
      clearChatButton.style.paddingRight = "";
    }
    if (clearChatPaddingY) {
      clearChatButton.style.paddingTop = clearChatPaddingY;
      clearChatButton.style.paddingBottom = clearChatPaddingY;
    } else {
      clearChatButton.style.paddingTop = "";
      clearChatButton.style.paddingBottom = "";
    }

    clearChatButtonWrapper.appendChild(clearChatButton);

    // Add tooltip with portaling to document.body to escape overflow clipping
    if (clearChatShowTooltip && clearChatTooltipText && clearChatButton && clearChatButtonWrapper) {
      let portaledTooltip: HTMLElement | null = null;

      const showTooltip = () => {
        if (portaledTooltip || !clearChatButton) return; // Already showing or button doesn't exist

        // Create tooltip element
        portaledTooltip = createElement("div", "tvw-clear-chat-tooltip");
        portaledTooltip.textContent = clearChatTooltipText;

        // Add arrow
        const arrow = createElement("div");
        arrow.className = "tvw-clear-chat-tooltip-arrow";
        portaledTooltip.appendChild(arrow);

        // Get button position
        const buttonRect = clearChatButton.getBoundingClientRect();

        // Position tooltip above button
        portaledTooltip.style.position = "fixed";
        portaledTooltip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
        portaledTooltip.style.top = `${buttonRect.top - 8}px`;
        portaledTooltip.style.transform = "translate(-50%, -100%)";

        // Append to body
        document.body.appendChild(portaledTooltip);
      };

      const hideTooltip = () => {
        if (portaledTooltip && portaledTooltip.parentNode) {
          portaledTooltip.parentNode.removeChild(portaledTooltip);
          portaledTooltip = null;
        }
      };

      // Add event listeners
      clearChatButtonWrapper.addEventListener("mouseenter", showTooltip);
      clearChatButtonWrapper.addEventListener("mouseleave", hideTooltip);
      clearChatButton.addEventListener("focus", showTooltip);
      clearChatButton.addEventListener("blur", hideTooltip);

      // Store cleanup function on the button for later use
      (clearChatButtonWrapper as any)._cleanupTooltip = () => {
        hideTooltip();
        if (clearChatButtonWrapper) {
          clearChatButtonWrapper.removeEventListener("mouseenter", showTooltip);
          clearChatButtonWrapper.removeEventListener("mouseleave", hideTooltip);
        }
        if (clearChatButton) {
          clearChatButton.removeEventListener("focus", showTooltip);
          clearChatButton.removeEventListener("blur", hideTooltip);
        }
      };
    }

    header.appendChild(clearChatButtonWrapper);
  }

  // Create close button wrapper for tooltip positioning
  const closeButtonWrapper = createElement(
    "div",
    closeButtonPlacement === "top-right"
      ? "tvw-absolute tvw-top-4 tvw-right-4 tvw-z-50"
      : (clearChatEnabled
          ? ""
          : "tvw-ml-auto")
  );

  // Create close button with base classes
  const closeButton = createElement(
    "button",
    "tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none"
  ) as HTMLButtonElement;
  closeButton.style.height = closeButtonSize;
  closeButton.style.width = closeButtonSize;
  closeButton.type = "button";

  // Get tooltip config
  const closeButtonTooltipText = launcher.closeButtonTooltipText ?? "Close chat";
  const closeButtonShowTooltip = launcher.closeButtonShowTooltip ?? true;

  closeButton.setAttribute("aria-label", closeButtonTooltipText);
  closeButton.style.display = showClose ? "" : "none";

  // Add icon or fallback text
  const closeButtonIconName = launcher.closeButtonIconName ?? "x";
  const closeButtonIconText = launcher.closeButtonIconText ?? "×";

  // Try to render Lucide icon, fallback to text if not provided or fails
  const iconSvg = renderLucideIcon(closeButtonIconName, "20px", launcher.closeButtonColor || "", 2);
  if (iconSvg) {
    closeButton.appendChild(iconSvg);
  } else {
    closeButton.textContent = closeButtonIconText;
  }
  
  // Apply close button styling from config
  if (launcher.closeButtonColor) {
    closeButton.style.color = launcher.closeButtonColor;
    closeButton.classList.remove("tvw-text-cw-muted");
  } else {
    closeButton.style.color = "";
    closeButton.classList.add("tvw-text-cw-muted");
  }
  
  if (launcher.closeButtonBackgroundColor) {
    closeButton.style.backgroundColor = launcher.closeButtonBackgroundColor;
    closeButton.classList.remove("hover:tvw-bg-gray-100");
  } else {
    closeButton.style.backgroundColor = "";
    closeButton.classList.add("hover:tvw-bg-gray-100");
  }
  
  // Apply border if width and/or color are provided
  if (launcher.closeButtonBorderWidth || launcher.closeButtonBorderColor) {
    const borderWidth = launcher.closeButtonBorderWidth || "0px";
    const borderColor = launcher.closeButtonBorderColor || "transparent";
    closeButton.style.border = `${borderWidth} solid ${borderColor}`;
    closeButton.classList.remove("tvw-border-none");
  } else {
    closeButton.style.border = "";
    closeButton.classList.add("tvw-border-none");
  }
  
  if (launcher.closeButtonBorderRadius) {
    closeButton.style.borderRadius = launcher.closeButtonBorderRadius;
    closeButton.classList.remove("tvw-rounded-full");
  } else {
    closeButton.style.borderRadius = "";
    closeButton.classList.add("tvw-rounded-full");
  }

  // Apply padding styling
  if (launcher.closeButtonPaddingX) {
    closeButton.style.paddingLeft = launcher.closeButtonPaddingX;
    closeButton.style.paddingRight = launcher.closeButtonPaddingX;
  } else {
    closeButton.style.paddingLeft = "";
    closeButton.style.paddingRight = "";
  }
  if (launcher.closeButtonPaddingY) {
    closeButton.style.paddingTop = launcher.closeButtonPaddingY;
    closeButton.style.paddingBottom = launcher.closeButtonPaddingY;
  } else {
    closeButton.style.paddingTop = "";
    closeButton.style.paddingBottom = "";
  }

  closeButtonWrapper.appendChild(closeButton);

  // Add tooltip with portaling to document.body to escape overflow clipping
  if (closeButtonShowTooltip && closeButtonTooltipText) {
    let portaledTooltip: HTMLElement | null = null;

    const showTooltip = () => {
      if (portaledTooltip) return; // Already showing

      // Create tooltip element
      portaledTooltip = createElement("div", "tvw-clear-chat-tooltip");
      portaledTooltip.textContent = closeButtonTooltipText;

      // Add arrow
      const arrow = createElement("div");
      arrow.className = "tvw-clear-chat-tooltip-arrow";
      portaledTooltip.appendChild(arrow);

      // Get button position
      const buttonRect = closeButton.getBoundingClientRect();

      // Position tooltip above button
      portaledTooltip.style.position = "fixed";
      portaledTooltip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
      portaledTooltip.style.top = `${buttonRect.top - 8}px`;
      portaledTooltip.style.transform = "translate(-50%, -100%)";

      // Append to body
      document.body.appendChild(portaledTooltip);
    };

    const hideTooltip = () => {
      if (portaledTooltip && portaledTooltip.parentNode) {
        portaledTooltip.parentNode.removeChild(portaledTooltip);
        portaledTooltip = null;
      }
    };

    // Add event listeners
    closeButtonWrapper.addEventListener("mouseenter", showTooltip);
    closeButtonWrapper.addEventListener("mouseleave", hideTooltip);
    closeButton.addEventListener("focus", showTooltip);
    closeButton.addEventListener("blur", hideTooltip);

    // Store cleanup function on the wrapper for later use
    (closeButtonWrapper as any)._cleanupTooltip = () => {
      hideTooltip();
      closeButtonWrapper.removeEventListener("mouseenter", showTooltip);
      closeButtonWrapper.removeEventListener("mouseleave", hideTooltip);
      closeButton.removeEventListener("focus", showTooltip);
      closeButton.removeEventListener("blur", hideTooltip);
    };
  }

  // Position close button wrapper based on placement
  if (closeButtonPlacement === "top-right") {
    // Make container position relative for absolute positioning
    container.style.position = "relative";
    container.appendChild(closeButtonWrapper);
  } else {
    // Inline placement: append to header
    header.appendChild(closeButtonWrapper);
  }

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

  const footer = createElement(
    "div",
    "tvw-border-t-cw-divider tvw-bg-cw-surface tvw-px-6 tvw-py-4"
  );
  const suggestions = createElement(
    "div",
    "tvw-mb-3 tvw-flex tvw-flex-wrap tvw-gap-2"
  );
  // Determine gap based on voice recognition
  const voiceRecognitionEnabledForGap = config?.voiceRecognition?.enabled === true;
  const hasSpeechRecognitionForGap = 
    typeof window !== 'undefined' && 
    (typeof (window as any).webkitSpeechRecognition !== 'undefined' || 
     typeof (window as any).SpeechRecognition !== 'undefined');
  const shouldUseSmallGap = voiceRecognitionEnabledForGap && hasSpeechRecognitionForGap;
  const gapClass = shouldUseSmallGap ? "tvw-gap-1" : "tvw-gap-3";
  
  const composerForm = createElement(
    "form",
    `tvw-flex tvw-items-end ${gapClass} tvw-rounded-2xl tvw-border tvw-border-gray-200 tvw-bg-cw-input-background tvw-px-4 tvw-py-3`
  ) as HTMLFormElement;
  // Prevent form from getting focus styles
  composerForm.style.outline = "none";
  
  const textarea = createElement("textarea") as HTMLTextAreaElement;
  textarea.placeholder = config?.copy?.inputPlaceholder ?? "Type your message…";
  textarea.className =
    "tvw-min-h-[48px] tvw-flex-1 tvw-resize-none tvw-border-none tvw-bg-transparent tvw-text-sm tvw-text-cw-primary focus:tvw-outline-none focus:tvw-border-none";
  textarea.rows = 1;
  
  // Apply font family and weight from config
  const fontFamily = config?.theme?.inputFontFamily ?? "sans-serif";
  const fontWeight = config?.theme?.inputFontWeight ?? "400";
  
  const getFontFamilyValue = (family: "sans-serif" | "serif" | "mono"): string => {
    switch (family) {
      case "serif":
        return 'Georgia, "Times New Roman", Times, serif';
      case "mono":
        return '"Courier New", Courier, "Lucida Console", Monaco, monospace';
      case "sans-serif":
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    }
  };
  
  textarea.style.fontFamily = getFontFamilyValue(fontFamily);
  textarea.style.fontWeight = fontWeight;
  
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
  
  // Voice recognition mic button
  const voiceRecognitionConfig = config?.voiceRecognition ?? {};
  const voiceRecognitionEnabled = voiceRecognitionConfig.enabled === true;
  let micButton: HTMLButtonElement | null = null;
  let micButtonWrapper: HTMLElement | null = null;
  
  // Check browser support for speech recognition
  const hasSpeechRecognition = 
    typeof window !== 'undefined' && 
    (typeof (window as any).webkitSpeechRecognition !== 'undefined' || 
     typeof (window as any).SpeechRecognition !== 'undefined');
  
  if (voiceRecognitionEnabled && hasSpeechRecognition) {
    micButtonWrapper = createElement("div", "tvw-send-button-wrapper");
    micButton = createElement(
      "button",
      "tvw-rounded-button tvw-flex tvw-items-center tvw-justify-center disabled:tvw-opacity-50 tvw-cursor-pointer"
    ) as HTMLButtonElement;
    
    micButton.type = "button";
    micButton.setAttribute("aria-label", "Start voice recognition");
    
    const micIconName = voiceRecognitionConfig.iconName ?? "mic";
    const micIconSize = voiceRecognitionConfig.iconSize ?? buttonSize;
    const micIconSizeNum = parseFloat(micIconSize) || 24;
    
    // Use dedicated colors from voice recognition config, fallback to send button colors
    const micBackgroundColor = voiceRecognitionConfig.backgroundColor ?? backgroundColor;
    const micIconColor = voiceRecognitionConfig.iconColor ?? textColor;
    
    micButton.style.width = micIconSize;
    micButton.style.height = micIconSize;
    micButton.style.minWidth = micIconSize;
    micButton.style.minHeight = micIconSize;
    micButton.style.fontSize = "18px";
    micButton.style.lineHeight = "1";
    
    // Use Lucide mic icon with configured color (stroke width 1.5 for minimalist outline style)
    const iconColorValue = micIconColor || "currentColor";
    const micIconSvg = renderLucideIcon(micIconName, micIconSizeNum, iconColorValue, 1.5);
    if (micIconSvg) {
      micButton.appendChild(micIconSvg);
      micButton.style.color = iconColorValue;
    } else {
      // Fallback to text if icon fails
      micButton.textContent = "🎤";
      micButton.style.color = iconColorValue;
    }
    
    // Apply background color
    if (micBackgroundColor) {
      micButton.style.backgroundColor = micBackgroundColor;
    } else {
      micButton.classList.add("tvw-bg-cw-primary");
    }
    
    // Apply icon/text color
    if (micIconColor) {
      micButton.style.color = micIconColor;
    } else if (!micIconColor && !textColor) {
      micButton.classList.add("tvw-text-white");
    }
    
    // Apply border styling
    if (voiceRecognitionConfig.borderWidth) {
      micButton.style.borderWidth = voiceRecognitionConfig.borderWidth;
      micButton.style.borderStyle = "solid";
    }
    if (voiceRecognitionConfig.borderColor) {
      micButton.style.borderColor = voiceRecognitionConfig.borderColor;
    }
    
    // Apply padding styling
    if (voiceRecognitionConfig.paddingX) {
      micButton.style.paddingLeft = voiceRecognitionConfig.paddingX;
      micButton.style.paddingRight = voiceRecognitionConfig.paddingX;
    }
    if (voiceRecognitionConfig.paddingY) {
      micButton.style.paddingTop = voiceRecognitionConfig.paddingY;
      micButton.style.paddingBottom = voiceRecognitionConfig.paddingY;
    }
    
    micButtonWrapper.appendChild(micButton);
    
    // Add tooltip if enabled
    const tooltipText = voiceRecognitionConfig.tooltipText ?? "Start voice recognition";
    const showTooltip = voiceRecognitionConfig.showTooltip ?? false;
    if (showTooltip && tooltipText) {
      const tooltip = createElement("div", "tvw-send-button-tooltip");
      tooltip.textContent = tooltipText;
      micButtonWrapper.appendChild(tooltip);
    }
  }
  
  // Focus textarea when composer form container is clicked
  composerForm.addEventListener("click", (e) => {
    // Don't focus if clicking on the send button, mic button, or their wrappers
    if (e.target !== sendButton && e.target !== sendButtonWrapper && 
        e.target !== micButton && e.target !== micButtonWrapper) {
      textarea.focus();
    }
  });
  
  // Append elements: textarea, mic button (if exists), send button
  composerForm.append(textarea);
  if (micButtonWrapper) {
    composerForm.append(micButtonWrapper);
  }
  composerForm.append(sendButtonWrapper);

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
    micButton,
    micButtonWrapper,
    composerForm,
    statusText,
    introTitle,
    introSubtitle,
    closeButton,
    closeButtonWrapper,
    clearChatButton,
    clearChatButtonWrapper,
    iconHolder
  };
};



