import { createElement } from "../utils/dom";
import { renderLucideIcon } from "../utils/icons";
import { AgentWidgetConfig } from "../types";

export interface ComposerElements {
  footer: HTMLElement;
  suggestions: HTMLElement;
  composerForm: HTMLFormElement;
  textarea: HTMLTextAreaElement;
  sendButton: HTMLButtonElement;
  sendButtonWrapper: HTMLElement;
  micButton: HTMLButtonElement | null;
  micButtonWrapper: HTMLElement | null;
  statusText: HTMLElement;
}

export interface ComposerBuildContext {
  config?: AgentWidgetConfig;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
}

/**
 * Helper to get font family CSS value from config preset
 */
const getFontFamilyValue = (
  family: "sans-serif" | "serif" | "mono"
): string => {
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

/**
 * Build the composer/footer section of the panel.
 * Extracted for reuse and plugin override support.
 */
export const buildComposer = (context: ComposerBuildContext): ComposerElements => {
  const { config } = context;

  const footer = createElement(
    "div",
    "tvw-widget-footer tvw-border-t-cw-divider tvw-bg-cw-surface tvw-px-6 tvw-py-4"
  );

  const suggestions = createElement(
    "div",
    "tvw-mb-3 tvw-flex tvw-flex-wrap tvw-gap-2"
  );

  // Determine gap based on voice recognition
  const voiceRecognitionEnabledForGap =
    config?.voiceRecognition?.enabled === true;
  const hasSpeechRecognitionForGap =
    typeof window !== "undefined" &&
    (typeof (window as any).webkitSpeechRecognition !== "undefined" ||
      typeof (window as any).SpeechRecognition !== "undefined");
  const shouldUseSmallGap =
    voiceRecognitionEnabledForGap && hasSpeechRecognitionForGap;
  const gapClass = shouldUseSmallGap ? "tvw-gap-1" : "tvw-gap-3";

  const composerForm = createElement(
    "form",
    `tvw-widget-composer tvw-flex tvw-items-end ${gapClass} tvw-rounded-2xl tvw-border tvw-border-gray-200 tvw-bg-cw-input-background tvw-px-4 tvw-py-3`
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
      const iconColor =
        textColor && typeof textColor === "string" && textColor.trim()
          ? textColor.trim()
          : "currentColor";
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
    typeof window !== "undefined" &&
    (typeof (window as any).webkitSpeechRecognition !== "undefined" ||
      typeof (window as any).SpeechRecognition !== "undefined");

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
    const micBackgroundColor =
      voiceRecognitionConfig.backgroundColor ?? backgroundColor;
    const micIconColor = voiceRecognitionConfig.iconColor ?? textColor;

    micButton.style.width = micIconSize;
    micButton.style.height = micIconSize;
    micButton.style.minWidth = micIconSize;
    micButton.style.minHeight = micIconSize;
    micButton.style.fontSize = "18px";
    micButton.style.lineHeight = "1";

    // Use Lucide mic icon with configured color (stroke width 1.5 for minimalist outline style)
    const iconColorValue = micIconColor || "currentColor";
    const micIconSvg = renderLucideIcon(
      micIconName,
      micIconSizeNum,
      iconColorValue,
      1.5
    );
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
    const micTooltipText =
      voiceRecognitionConfig.tooltipText ?? "Start voice recognition";
    const showMicTooltip = voiceRecognitionConfig.showTooltip ?? false;
    if (showMicTooltip && micTooltipText) {
      const tooltip = createElement("div", "tvw-send-button-tooltip");
      tooltip.textContent = micTooltipText;
      micButtonWrapper.appendChild(tooltip);
    }
  }

  // Focus textarea when composer form container is clicked
  composerForm.addEventListener("click", (e) => {
    // Don't focus if clicking on the send button, mic button, or their wrappers
    if (
      e.target !== sendButton &&
      e.target !== sendButtonWrapper &&
      e.target !== micButton &&
      e.target !== micButtonWrapper
    ) {
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

  return {
    footer,
    suggestions,
    composerForm,
    textarea,
    sendButton,
    sendButtonWrapper,
    micButton,
    micButtonWrapper,
    statusText
  };
};


