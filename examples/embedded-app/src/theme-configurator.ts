import "@chaty-assistant/vanilla/widget.css";
import "./index.css";
import "./theme-configurator.css";

import {
  createChatExperience,
  markdownPostprocessor
} from "@chaty-assistant/vanilla";
import type { ChatWidgetConfig } from "@chaty-assistant/vanilla";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ?? `http://localhost:${proxyPort}/api/chat/dispatch`;

// Theme presets
const THEME_PRESETS = {
  default: {
    primary: "#111827",
    accent: "#1d4ed8",
    surface: "#ffffff",
    muted: "#6b7280",
    container: "#f8fafc",
    border: "#f1f5f9",
    divider: "#f1f5f9",
    messageBorder: "#f1f5f9",
    inputBackground: "#ffffff",
    callToAction: "#ffffff",
    callToActionBackground: "#000000"
  },
  dark: {
    primary: "#f9fafb",
    accent: "#60a5fa",
    surface: "#1f2937",
    muted: "#9ca3af",
    container: "#111827",
    border: "#374151",
    divider: "#374151",
    messageBorder: "#4b5563",
    inputBackground: "#1f2937",
    callToAction: "#000000",
    callToActionBackground: "#ffffff"
  },
  contrast: {
    primary: "#000000",
    accent: "#0066cc",
    surface: "#ffffff",
    muted: "#666666",
    container: "#e5e5e5",
    border: "#999999",
    divider: "#999999",
    messageBorder: "#999999",
    inputBackground: "#ffffff",
    callToAction: "#ffffff",
    callToActionBackground: "#0066cc"
  }
};

// Radius presets
const RADIUS_PRESETS = {
  default: {
    radiusSm: "0.75rem",
    radiusMd: "1rem",
    radiusLg: "1.5rem",
    launcherRadius: "9999px",
    buttonRadius: "9999px"
  },
  sharp: {
    radiusSm: "1px",
    radiusMd: "2px",
    radiusLg: "2px",
    launcherRadius: "3px",
    buttonRadius: "3px"
  },  
  rounded: {
    radiusSm: "1rem",
    radiusMd: "1.25rem",
    radiusLg: "2rem",
    launcherRadius: "0.5rem",
    buttonRadius: "0.5rem"
  },
  extraRounded: {
    radiusSm: "1.5rem",
    radiusMd: "2rem",
    radiusLg: "2.5rem",
    launcherRadius: "5rem",
    buttonRadius: "5rem"
  }
};

// Send button presets
const SEND_BUTTON_PRESETS = {
  iconArrow: {
    useIcon: true,
    iconName: "arrow-up",
    iconText: "↑",
    size: "36px",
    backgroundColor: "#000000",
    textColor: "#ffffff",
    borderWidth: "0px",
    borderColor: "#000000",
    paddingX: "10px",
    paddingY: "6px",
    showTooltip: true,
    tooltipText: "Send message"
  },
  iconSend: {
    useIcon: true,
    iconName: "send",
    iconText: "➤",
    size: "36px",
    backgroundColor: "#000000",
    textColor: "#ffffff",
    borderWidth: "0px",
    borderColor: "#000000",
    paddingX: "10px",
    paddingY: "6px",
    showTooltip: true,
    tooltipText: "Send message"
  },
  text: {
    useIcon: false,
    backgroundColor: "#3b82f6",
    textColor: "#ffffff",
    borderWidth: "0px",
    borderColor: "#000000",
    paddingX: "16px",
    paddingY: "8px",
    showTooltip: false,
    tooltipText: "Send message"
  }
};

// Call to action (launcher agent icon) presets
const CALL_TO_ACTION_PRESETS = {
  arrow: {
    agentIconName: "arrow-up-right",
    agentIconText: "↗",
    agentIconSize: "40px",
    agentIconPadding: "12px",
    agentIconBackgroundColor: "#3b82f6"
  },
  sparkles: {
    agentIconName: "sparkles",
    agentIconText: "✨",
    agentIconSize: "40px",
    agentIconPadding: "12px",
    agentIconBackgroundColor: "#8b5cf6"
  },
  send: {
    agentIconName: "send",
    agentIconText: "➤",
    agentIconSize: "40px",
    agentIconPadding: "12px",
    agentIconBackgroundColor: "#3b82f6"
  },
  text: {
    agentIconName: "",
    agentIconText: "↗",
    agentIconSize: "40px",
    agentIconPadding: "12px",
    agentIconBackgroundColor: "#3b82f6"
  }
};

// Default configuration
const getDefaultConfig = (): ChatWidgetConfig => ({
  apiUrl: proxyUrl,
  theme: { ...THEME_PRESETS.default, ...RADIUS_PRESETS.default },
  launcher: {
    enabled: true,
    title: "Chat Assistant",
    subtitle: "Here to help you get answers fast",
    iconText: "💬",
    position: "bottom-right",
    width: "min(360px, calc(100vw - 24px))",
    autoExpand: false,
    agentIconText: "↗",
    agentIconColor: "#ffffff",
    agentIconBackgroundColor: "#3b82f6",
    agentIconHidden: false,
    agentIconPadding: "5px",
    iconSize: "40px",
    agentIconSize: "32px",
    headerIconSize: "48px",
    closeButtonSize: "32px"
  },
  copy: {
    welcomeTitle: "Hello 👋",
    welcomeSubtitle: "Ask anything about your account or products.",
    inputPlaceholder: "Type your message…",
    sendButtonLabel: "Send"
  },
  sendButton: {
    borderWidth: "0px",
    borderColor: "#000000",
    paddingX: "16px",
    paddingY: "8px"
  },
  statusIndicator: {
    visible: true,
    idleText: "Online",
    connectingText: "Connecting…",
    connectedText: "Streaming…",
    errorText: "Offline"
  },
  features: {
    showReasoning: true,
    showToolCalls: true
  },
  suggestionChips: [
    "What can you help me with?",
    "Tell me about your features",
    "How does this work?"
  ],
  debug: false,
  initialMessages: [
    {
      id: "sample-1",
      role: "assistant",
      content: "Welcome! This is a sample message to help you preview your theme configuration. Try asking a question to see how it looks!",
      createdAt: new Date().toISOString()
    }
  ],
  postprocessMessage: ({ text }) => markdownPostprocessor(text)
});

// Current configuration state
let currentConfig: ChatWidgetConfig = getDefaultConfig();

// Widget instance
const previewMount = document.getElementById("widget-preview");
if (!previewMount) {
  throw new Error("Preview mount element not found");
}

const widgetController = createChatExperience(previewMount, currentConfig);

// Update debounce
let updateTimeout: number | null = null;
const debouncedUpdate = (config: ChatWidgetConfig) => {
  if (updateTimeout !== null) {
    clearTimeout(updateTimeout);
  }
  updateTimeout = window.setTimeout(() => {
    currentConfig = config;
    widgetController.update(config);
    saveConfigToLocalStorage(config);
  }, 300);
};

// Immediate update (for presets and explicit actions)
const immediateUpdate = (config: ChatWidgetConfig) => {
  if (updateTimeout !== null) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
  currentConfig = config;
  widgetController.update(config);
  saveConfigToLocalStorage(config);
};

// Local storage
const STORAGE_KEY = "chaty-widget-config";

function saveConfigToLocalStorage(config: ChatWidgetConfig) {
  try {
    const configToSave = {
      ...config,
      postprocessMessage: undefined, // Can't serialize functions
      initialMessages: undefined // Don't persist sample messages
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

function loadConfigFromLocalStorage(): ChatWidgetConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const defaults = getDefaultConfig();
      return {
        ...defaults,
        ...parsed,
        theme: {
          ...defaults.theme,
          ...parsed.theme
        },
        sendButton: {
          ...defaults.sendButton,
          ...parsed.sendButton
        },
        statusIndicator: {
          ...defaults.statusIndicator,
          ...parsed.statusIndicator
        }
      };
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }
  return null;
}

// Initialize from localStorage if available
const savedConfig = loadConfigFromLocalStorage();
if (savedConfig) {
  currentConfig = savedConfig;
  widgetController.update(currentConfig);
}

// Helper to get input element
function getInput<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

// CSS value parsing utilities
interface ParsedCssValue {
  value: number;
  unit: "px" | "rem";
}

function parseCssValue(cssValue: string): ParsedCssValue {
  const trimmed = cssValue.trim();
  
  // Handle special case: "9999px" maps to max slider value
  if (trimmed === "9999px") {
    return { value: 100, unit: "px" };
  }
  
  // Match number followed by unit (px or rem)
  const match = trimmed.match(/^([\d.]+)(px|rem)$/);
  if (!match) {
    // Default fallback: assume px if no unit
    const numValue = parseFloat(trimmed);
    return { value: isNaN(numValue) ? 0 : numValue, unit: "px" };
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] as "px" | "rem";
  
  return { value: isNaN(value) ? 0 : value, unit };
}

function formatCssValue(parsed: ParsedCssValue): string {
  // Handle special case: if value is 100 and unit is px, and it's for radiusFull, use "9999px"
  // (We'll handle this in the specific context where needed)
  return `${parsed.value}${parsed.unit}`;
}

function convertToPx(value: number, unit: "px" | "rem"): number {
  if (unit === "px") return value;
  // Assume 16px = 1rem base
  return value * 16;
}

function convertFromPx(pxValue: number, preferredUnit: "px" | "rem"): ParsedCssValue {
  if (preferredUnit === "px") {
    return { value: Math.round(pxValue), unit: "px" };
  }
  // Convert to rem, round to 2 decimal places
  return { value: Math.round((pxValue / 16) * 100) / 100, unit: "rem" };
}

interface SliderConfig {
  sliderId: string;
  textInputId: string;
  min: number;
  max: number;
  step: number;
  isRadiusFull?: boolean;
  onUpdate: (value: string) => void;
  getInitialValue: () => string;
}

function setupSliderInput(config: SliderConfig) {
  const slider = getInput<HTMLInputElement>(config.sliderId);
  const textInput = getInput<HTMLInputElement>(config.textInputId);
  
  // Track preferred unit to preserve user preference
  let preferredUnit: "px" | "rem" = "px";
  
  // Initialize from current config
  const initialValue = config.getInitialValue();
  const parsed = parseCssValue(initialValue);
  preferredUnit = parsed.unit;
  
  // Convert to px for slider
  const pxValue = convertToPx(parsed.value, parsed.unit);
  slider.value = pxValue.toString();
  textInput.value = initialValue;
  
  // Handle special case: radiusFull "9999px"
  if (config.isRadiusFull && initialValue === "9999px") {
    slider.value = config.max.toString();
  }
  
  // Flag to prevent update loops
  let isUpdating = false;
  
  // Update from slider to text input
  slider.addEventListener("input", () => {
    if (isUpdating) return;
    isUpdating = true;
    
    const sliderValue = parseFloat(slider.value);
    const converted = convertFromPx(sliderValue, preferredUnit);
    
    // Handle special case: radiusFull max value
    let cssValue: string;
    if (config.isRadiusFull && sliderValue >= config.max) {
      cssValue = "9999px";
      preferredUnit = "px";
    } else {
      cssValue = formatCssValue(converted);
    }
    
    textInput.value = cssValue;
    config.onUpdate(cssValue);
    isUpdating = false;
  });
  
  // Update from text input to slider
  textInput.addEventListener("input", () => {
    if (isUpdating) return;
    
    const value = textInput.value.trim();
    if (!value) return;
    
    const parsed = parseCssValue(value);
    
    // Update preferred unit
    preferredUnit = parsed.unit;
    
    // Convert to px for slider
    const pxValue = convertToPx(parsed.value, parsed.unit);
    
    // Clamp to slider range
    const clampedValue = Math.max(config.min, Math.min(config.max, pxValue));
    
    // Handle special case: radiusFull "9999px"
    if (config.isRadiusFull && value === "9999px") {
      slider.value = config.max.toString();
    } else {
      slider.value = clampedValue.toString();
    }
    
    // Update config if value is valid
    if (value === parsed.value + parsed.unit || (config.isRadiusFull && value === "9999px")) {
      isUpdating = true;
      config.onUpdate(value);
      isUpdating = false;
    }
  });
}

// Theme controls
function setupThemeControls() {
  const themeKeys = ["primary", "accent", "callToAction", "surface", "container", "border", "divider", "messageBorder", "inputBackground", "muted"] as const;

  themeKeys.forEach((key) => {
    const colorInput = getInput<HTMLInputElement>(`color-${key}`);
    const textInput = getInput<HTMLInputElement>(`color-${key}-text`);

    // Sync color picker and text input
    colorInput.addEventListener("input", () => {
      textInput.value = colorInput.value;
      updateTheme(key, colorInput.value);
    });

    textInput.addEventListener("input", () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
        colorInput.value = textInput.value;
        updateTheme(key, textInput.value);
      }
    });

    // Set initial values
    const initialValue = currentConfig.theme?.[key] || THEME_PRESETS.default[key];
    colorInput.value = initialValue;
    textInput.value = initialValue;
  });

  // Radius controls
  const radiusKeys = ["radiusSm", "radiusMd", "radiusLg", "launcherRadius", "buttonRadius"] as const;
  
  const radiusConfigs = {
    radiusSm: { min: 0, max: 32, step: 1 },
    radiusMd: { min: 0, max: 48, step: 1 },
    radiusLg: { min: 0, max: 64, step: 1 },
    launcherRadius: { min: 0, max: 100, step: 1, isRadiusFull: true },
    buttonRadius: { min: 0, max: 100, step: 1, isRadiusFull: true }
  };

  radiusKeys.forEach((key) => {
    const config = radiusConfigs[key];
    setupSliderInput({
      sliderId: `${key}-slider`,
      textInputId: key,
      min: config.min,
      max: config.max,
      step: config.step,
      isRadiusFull: "isRadiusFull" in config ? config.isRadiusFull : undefined,
      onUpdate: (value: string) => {
        updateTheme(key, value);
      },
      getInitialValue: () => {
        return currentConfig.theme?.[key] || RADIUS_PRESETS.default[key];
      }
    });
  });

  // Color preset buttons
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.preset as keyof typeof THEME_PRESETS;
      applyPreset(preset);
    });
  });

  // Radius preset buttons
  document.querySelectorAll("[data-radius-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.radiusPreset as keyof typeof RADIUS_PRESETS;
      applyRadiusPreset(preset);
    });
  });
}

function updateTheme(key: string, value: string) {
  const newConfig = {
    ...currentConfig,
    theme: {
      ...currentConfig.theme,
      [key]: value
    }
  };
  // Use immediate update for radius values to ensure instant visual feedback
  if (key.startsWith('radius')) {
    immediateUpdate(newConfig);
  } else {
    debouncedUpdate(newConfig);
  }
}

function applyPreset(preset: keyof typeof THEME_PRESETS) {
  const themeValues = THEME_PRESETS[preset];
  const { callToActionBackground, ...themeColors } = themeValues;
  
  Object.entries(themeColors).forEach(([key, value]) => {
    const colorInput = getInput<HTMLInputElement>(`color-${key}`);
    const textInput = getInput<HTMLInputElement>(`color-${key}-text`);
    colorInput.value = value;
    textInput.value = value;
  });

  // Also set the call to action background color
  const agentIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color");
  const agentIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color-text");
  if (agentIconBackgroundColorInput && agentIconBackgroundColorTextInput) {
    agentIconBackgroundColorInput.value = callToActionBackground;
    agentIconBackgroundColorTextInput.value = callToActionBackground;
  }

  const newConfig = {
    ...currentConfig,
    theme: { ...currentConfig.theme, ...themeColors },
    launcher: {
      ...currentConfig.launcher,
      agentIconBackgroundColor: callToActionBackground
    }
  };
  immediateUpdate(newConfig);
}

function applyRadiusPreset(preset: keyof typeof RADIUS_PRESETS) {
  const radiusValues = RADIUS_PRESETS[preset];
  Object.entries(radiusValues).forEach(([key, value]) => {
    const textInput = getInput<HTMLInputElement>(key);
    const slider = getInput<HTMLInputElement>(`${key}-slider`);
    textInput.value = value;
    
    // Update slider value
    const parsed = parseCssValue(value);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    
    // Handle special case: radiusFull "9999px"
    if (key === "radiusFull" && value === "9999px") {
      slider.value = "100";
    } else {
      slider.value = pxValue.toString();
    }
  });

  const newConfig = {
    ...currentConfig,
    theme: { ...currentConfig.theme, ...radiusValues }
  };
  immediateUpdate(newConfig);
}

function applySendButtonPreset(preset: keyof typeof SEND_BUTTON_PRESETS) {
  const presetValues = SEND_BUTTON_PRESETS[preset];
  
  // Get all the input elements
  const useIconInput = getInput<HTMLInputElement>("send-button-use-icon");
  const iconTextInput = getInput<HTMLInputElement>("send-button-icon-text");
  const iconNameInput = getInput<HTMLInputElement>("send-button-icon-name");
  const sizeInput = getInput<HTMLInputElement>("send-button-size");
  const backgroundColorInput = getInput<HTMLInputElement>("send-button-background-color");
  const backgroundColorTextInput = getInput<HTMLInputElement>("send-button-background-color-text");
  const textColorInput = getInput<HTMLInputElement>("send-button-text-color");
  const textColorTextInput = getInput<HTMLInputElement>("send-button-text-color-text");
  const borderColorInput = getInput<HTMLInputElement>("send-button-border-color");
  const borderColorTextInput = getInput<HTMLInputElement>("send-button-border-color-text");
  const borderWidthInput = getInput<HTMLInputElement>("send-button-border-width");
  const borderWidthSlider = getInput<HTMLInputElement>("send-button-border-width-slider");
  const paddingXInput = getInput<HTMLInputElement>("send-button-padding-x");
  const paddingXSlider = getInput<HTMLInputElement>("send-button-padding-x-slider");
  const paddingYInput = getInput<HTMLInputElement>("send-button-padding-y");
  const paddingYSlider = getInput<HTMLInputElement>("send-button-padding-y-slider");
  const sizeSlider = getInput<HTMLInputElement>("send-button-size-slider");
  const showTooltipInput = getInput<HTMLInputElement>("send-button-show-tooltip");
  const tooltipTextInput = getInput<HTMLInputElement>("send-button-tooltip-text");
  
  // Update all input fields with preset values
  if (presetValues.useIcon !== undefined) useIconInput.checked = presetValues.useIcon;
  if ("iconText" in presetValues && presetValues.iconText) iconTextInput.value = presetValues.iconText;
  if ("iconName" in presetValues && presetValues.iconName !== undefined) iconNameInput.value = presetValues.iconName || "";
  if ("size" in presetValues && presetValues.size) {
    sizeInput.value = presetValues.size;
    const parsed = parseCssValue(presetValues.size);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    sizeSlider.value = pxValue.toString();
  }
  if (presetValues.backgroundColor) {
    backgroundColorInput.value = presetValues.backgroundColor;
    backgroundColorTextInput.value = presetValues.backgroundColor;
  }
  if (presetValues.textColor) {
    textColorInput.value = presetValues.textColor;
    textColorTextInput.value = presetValues.textColor;
  }
  if (presetValues.borderColor) {
    borderColorInput.value = presetValues.borderColor;
    borderColorTextInput.value = presetValues.borderColor;
  }
  if (presetValues.borderWidth) {
    borderWidthInput.value = presetValues.borderWidth;
    const parsed = parseCssValue(presetValues.borderWidth);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    borderWidthSlider.value = pxValue.toString();
  }
  if (presetValues.paddingX) {
    paddingXInput.value = presetValues.paddingX;
    const parsed = parseCssValue(presetValues.paddingX);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    paddingXSlider.value = pxValue.toString();
  }
  if (presetValues.paddingY) {
    paddingYInput.value = presetValues.paddingY;
    const parsed = parseCssValue(presetValues.paddingY);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    paddingYSlider.value = pxValue.toString();
  }
  if (presetValues.showTooltip !== undefined) showTooltipInput.checked = presetValues.showTooltip;
  if (presetValues.tooltipText) tooltipTextInput.value = presetValues.tooltipText;
  
  const newConfig = {
    ...currentConfig,
    sendButton: { ...currentConfig.sendButton, ...presetValues }
  };
  immediateUpdate(newConfig);
}

function applyCallToActionPreset(preset: keyof typeof CALL_TO_ACTION_PRESETS) {
  const presetValues = CALL_TO_ACTION_PRESETS[preset];
  
  // Get input elements
  const agentIconTextInput = getInput<HTMLInputElement>("launcher-agent-icon-text");
  const agentIconNameInput = getInput<HTMLInputElement>("launcher-agent-icon-name");
  const agentIconSizeInput = getInput<HTMLInputElement>("launcher-agent-icon-size");
  const agentIconSizeSlider = getInput<HTMLInputElement>("launcher-agent-icon-size-slider");
  const agentIconPaddingInput = getInput<HTMLInputElement>("launcher-agent-icon-padding");
  const agentIconPaddingSlider = getInput<HTMLInputElement>("launcher-agent-icon-padding-slider");
  const agentIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color");
  const agentIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color-text");
  
  // Update input fields with preset values
  if (presetValues.agentIconText) agentIconTextInput.value = presetValues.agentIconText;
  if (presetValues.agentIconName !== undefined) agentIconNameInput.value = presetValues.agentIconName || "";
  if (presetValues.agentIconSize) {
    agentIconSizeInput.value = presetValues.agentIconSize;
    const parsed = parseCssValue(presetValues.agentIconSize);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    agentIconSizeSlider.value = pxValue.toString();
  }
  if (presetValues.agentIconPadding) {
    agentIconPaddingInput.value = presetValues.agentIconPadding;
    const parsed = parseCssValue(presetValues.agentIconPadding);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    agentIconPaddingSlider.value = pxValue.toString();
  }
  if (presetValues.agentIconBackgroundColor) {
    agentIconBackgroundColorInput.value = presetValues.agentIconBackgroundColor;
    agentIconBackgroundColorTextInput.value = presetValues.agentIconBackgroundColor;
  }
  
  const newConfig = {
    ...currentConfig,
    launcher: { 
      ...currentConfig.launcher, 
      agentIconText: presetValues.agentIconText,
      agentIconName: presetValues.agentIconName || undefined,
      agentIconSize: presetValues.agentIconSize,
      agentIconPadding: presetValues.agentIconPadding || undefined,
      agentIconBackgroundColor: presetValues.agentIconBackgroundColor
    }
  };
  immediateUpdate(newConfig);
}

// Launcher controls
function setupLauncherControls() {
  const enabledInput = getInput<HTMLInputElement>("launcher-enabled");
  const titleInput = getInput<HTMLInputElement>("launcher-title");
  const subtitleInput = getInput<HTMLInputElement>("launcher-subtitle");
  const iconTextInput = getInput<HTMLInputElement>("launcher-icon-text");
  const positionInput = getInput<HTMLSelectElement>("launcher-position");
  const widthInput = getInput<HTMLInputElement>("launcher-width");
  const autoExpandInput = getInput<HTMLInputElement>("launcher-auto-expand");
  const agentIconTextInput = getInput<HTMLInputElement>("launcher-agent-icon-text");
  const agentIconNameInput = getInput<HTMLInputElement>("launcher-agent-icon-name");
  const agentIconHiddenInput = getInput<HTMLInputElement>("launcher-agent-icon-hidden");
  const agentIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color");
  const agentIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-agent-icon-background-color-text");
  
  // Size inputs - these will be handled by sliders, but we still need references for the update function
  const iconSizeInput = getInput<HTMLInputElement>("launcher-icon-size");
  const agentIconSizeInput = getInput<HTMLInputElement>("launcher-agent-icon-size");
  const agentIconPaddingInput = getInput<HTMLInputElement>("launcher-agent-icon-padding");
  const headerIconSizeInput = getInput<HTMLInputElement>("launcher-header-icon-size");
  const closeButtonSizeInput = getInput<HTMLInputElement>("launcher-close-button-size");

  // Set initial values
  enabledInput.checked = currentConfig.launcher?.enabled ?? true;
  titleInput.value = currentConfig.launcher?.title ?? "Chat Assistant";
  subtitleInput.value = currentConfig.launcher?.subtitle ?? "Here to help you get answers fast";
  iconTextInput.value = currentConfig.launcher?.iconText ?? "💬";
  positionInput.value = currentConfig.launcher?.position ?? "bottom-right";
  widthInput.value = currentConfig.launcher?.width ?? "min(360px, calc(100vw - 24px))";
  autoExpandInput.checked = currentConfig.launcher?.autoExpand ?? false;
  agentIconTextInput.value = currentConfig.launcher?.agentIconText ?? "↗";
  agentIconNameInput.value = currentConfig.launcher?.agentIconName ?? "";
  agentIconHiddenInput.checked = currentConfig.launcher?.agentIconHidden ?? false;
  agentIconBackgroundColorInput.value = currentConfig.launcher?.agentIconBackgroundColor ?? "";
  agentIconBackgroundColorTextInput.value = currentConfig.launcher?.agentIconBackgroundColor ?? "";

  const updateLauncher = () => {
    const newConfig = {
      ...currentConfig,
      launcher: {
        ...currentConfig.launcher,
        enabled: enabledInput.checked,
        title: titleInput.value,
        subtitle: subtitleInput.value,
        iconText: iconTextInput.value,
        position: positionInput.value as "bottom-right" | "bottom-left" | "top-right" | "top-left",
        width: widthInput.value,
        autoExpand: autoExpandInput.checked,
        agentIconText: agentIconTextInput.value,
        agentIconName: agentIconNameInput.value || undefined,
        agentIconHidden: agentIconHiddenInput.checked,
        agentIconBackgroundColor: agentIconBackgroundColorInput.value || undefined,
        iconSize: iconSizeInput.value,
        agentIconSize: agentIconSizeInput.value,
        agentIconPadding: agentIconPaddingInput.value || undefined,
        headerIconSize: headerIconSizeInput.value,
        closeButtonSize: closeButtonSizeInput.value
      }
    };
    debouncedUpdate(newConfig);
  };

  // Setup sliders for size inputs
  const sizeInputs = [
    { key: "iconSize", inputId: "launcher-icon-size", sliderId: "launcher-icon-size-slider" },
    { key: "agentIconSize", inputId: "launcher-agent-icon-size", sliderId: "launcher-agent-icon-size-slider" },
    { key: "headerIconSize", inputId: "launcher-header-icon-size", sliderId: "launcher-header-icon-size-slider" },
    { key: "closeButtonSize", inputId: "launcher-close-button-size", sliderId: "launcher-close-button-size-slider" }
  ];

  sizeInputs.forEach(({ key, inputId, sliderId }) => {
    setupSliderInput({
      sliderId,
      textInputId: inputId,
      min: 16,
      max: 128,
      step: 1,
      onUpdate: (value: string) => {
        updateLauncher();
      },
      getInitialValue: () => {
        return currentConfig.launcher?.[key as keyof typeof currentConfig.launcher] as string || 
               (key === "iconSize" ? "40px" : 
                key === "agentIconSize" ? "32px" : 
                key === "headerIconSize" ? "48px" : "32px");
      }
    });
  });

  // Setup slider for agent icon padding
  setupSliderInput({
    sliderId: "launcher-agent-icon-padding-slider",
    textInputId: "launcher-agent-icon-padding",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateLauncher();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.agentIconPadding ?? "5px";
    }
  });

  // Bidirectional sync for agent icon background color
  agentIconBackgroundColorInput.addEventListener("input", () => {
    agentIconBackgroundColorTextInput.value = agentIconBackgroundColorInput.value;
    updateLauncher();
  });
  agentIconBackgroundColorTextInput.addEventListener("input", () => {
    agentIconBackgroundColorInput.value = agentIconBackgroundColorTextInput.value;
    updateLauncher();
  });

  [enabledInput, titleInput, subtitleInput, iconTextInput, positionInput, widthInput, autoExpandInput, agentIconTextInput, agentIconNameInput, agentIconHiddenInput]
    .forEach((input) => {
      input.addEventListener("input", updateLauncher);
      input.addEventListener("change", updateLauncher);
    });

  // Call to action preset buttons
  document.querySelectorAll("[data-call-to-action-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.callToActionPreset as keyof typeof CALL_TO_ACTION_PRESETS;
      applyCallToActionPreset(preset);
    });
  });
}

// Copy/Text controls
function setupCopyControls() {
  const welcomeTitleInput = getInput<HTMLInputElement>("copy-welcome-title");
  const welcomeSubtitleInput = getInput<HTMLInputElement>("copy-welcome-subtitle");
  const placeholderInput = getInput<HTMLInputElement>("copy-placeholder");
  const sendButtonInput = getInput<HTMLInputElement>("copy-send-button");
  const borderColorInput = getInput<HTMLInputElement>("send-button-border-color");
  const borderColorTextInput = getInput<HTMLInputElement>("send-button-border-color-text");
  const useIconInput = getInput<HTMLInputElement>("send-button-use-icon");
  const iconTextInput = getInput<HTMLInputElement>("send-button-icon-text");
  const iconNameInput = getInput<HTMLInputElement>("send-button-icon-name");
  const sizeInput = getInput<HTMLInputElement>("send-button-size");
  const backgroundColorInput = getInput<HTMLInputElement>("send-button-background-color");
  const backgroundColorTextInput = getInput<HTMLInputElement>("send-button-background-color-text");
  const textColorInput = getInput<HTMLInputElement>("send-button-text-color");
  const textColorTextInput = getInput<HTMLInputElement>("send-button-text-color-text");
  const showTooltipInput = getInput<HTMLInputElement>("send-button-show-tooltip");
  const tooltipTextInput = getInput<HTMLInputElement>("send-button-tooltip-text");

  // Set initial values
  welcomeTitleInput.value = currentConfig.copy?.welcomeTitle ?? "Hello 👋";
  welcomeSubtitleInput.value = currentConfig.copy?.welcomeSubtitle ?? "Ask anything about your account or products.";
  placeholderInput.value = currentConfig.copy?.inputPlaceholder ?? "Type your message…";
  sendButtonInput.value = currentConfig.copy?.sendButtonLabel ?? "Send";
  const borderColor = currentConfig.sendButton?.borderColor ?? "#000000";
  borderColorInput.value = borderColor;
  borderColorTextInput.value = borderColor;
  useIconInput.checked = currentConfig.sendButton?.useIcon ?? false;
  iconTextInput.value = currentConfig.sendButton?.iconText ?? "↑";
  iconNameInput.value = currentConfig.sendButton?.iconName ?? "";
  sizeInput.value = currentConfig.sendButton?.size ?? "40px";
  const bgColor = currentConfig.sendButton?.backgroundColor ?? "";
  backgroundColorInput.value = bgColor || "#111827";
  backgroundColorTextInput.value = bgColor || "#111827";
  const txtColor = currentConfig.sendButton?.textColor ?? "";
  textColorInput.value = txtColor || "#ffffff";
  textColorTextInput.value = txtColor || "#ffffff";
  showTooltipInput.checked = currentConfig.sendButton?.showTooltip ?? false;
  tooltipTextInput.value = currentConfig.sendButton?.tooltipText ?? "Send message";

  // Setup slider inputs for border width and padding
  setupSliderInput({
    sliderId: "send-button-border-width-slider",
    textInputId: "send-button-border-width",
    min: 0,
    max: 10,
    step: 1,
    onUpdate: (value: string) => {
      const newConfig = {
        ...currentConfig,
        sendButton: {
          ...currentConfig.sendButton,
          borderWidth: value.trim() || undefined
        }
      };
      debouncedUpdate(newConfig);
    },
    getInitialValue: () => {
      return currentConfig.sendButton?.borderWidth ?? "0px";
    }
  });

  setupSliderInput({
    sliderId: "send-button-padding-x-slider",
    textInputId: "send-button-padding-x",
    min: 0,
    max: 64,
    step: 1,
    onUpdate: (value: string) => {
      const newConfig = {
        ...currentConfig,
        sendButton: {
          ...currentConfig.sendButton,
          paddingX: value.trim() || undefined
        }
      };
      debouncedUpdate(newConfig);
    },
    getInitialValue: () => {
      return currentConfig.sendButton?.paddingX ?? "16px";
    }
  });

  setupSliderInput({
    sliderId: "send-button-padding-y-slider",
    textInputId: "send-button-padding-y",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      const newConfig = {
        ...currentConfig,
        sendButton: {
          ...currentConfig.sendButton,
          paddingY: value.trim() || undefined
        }
      };
      debouncedUpdate(newConfig);
    },
    getInitialValue: () => {
      return currentConfig.sendButton?.paddingY ?? "8px";
    }
  });

  setupSliderInput({
    sliderId: "send-button-size-slider",
    textInputId: "send-button-size",
    min: 24,
    max: 64,
    step: 1,
    onUpdate: (value: string) => {
      const newConfig = {
        ...currentConfig,
        sendButton: {
          ...currentConfig.sendButton,
          size: value.trim() || undefined
        }
      };
      debouncedUpdate(newConfig);
    },
    getInitialValue: () => {
      return currentConfig.sendButton?.size ?? "40px";
    }
  });

  const updateCopy = () => {
    const newConfig = {
      ...currentConfig,
      copy: {
        welcomeTitle: welcomeTitleInput.value,
        welcomeSubtitle: welcomeSubtitleInput.value,
        inputPlaceholder: placeholderInput.value,
        sendButtonLabel: sendButtonInput.value
      },
      sendButton: {
        ...currentConfig.sendButton,
        borderColor: borderColorTextInput.value.trim() || undefined,
        useIcon: useIconInput.checked,
        iconText: iconTextInput.value.trim() || undefined,
        iconName: iconNameInput.value.trim() || undefined,
        size: sizeInput.value.trim() || undefined,
        backgroundColor: backgroundColorTextInput.value.trim() || undefined,
        textColor: textColorTextInput.value.trim() || undefined,
        showTooltip: showTooltipInput.checked,
        tooltipText: tooltipTextInput.value.trim() || undefined
      }
    };
    debouncedUpdate(newConfig);
  };

  // Sync border color picker and text input
  borderColorInput.addEventListener("input", () => {
    borderColorTextInput.value = borderColorInput.value;
    updateCopy();
  });

  borderColorTextInput.addEventListener("input", () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(borderColorTextInput.value)) {
      borderColorInput.value = borderColorTextInput.value;
      updateCopy();
    }
  });

  // Sync background color picker and text input
  backgroundColorInput.addEventListener("input", () => {
    backgroundColorTextInput.value = backgroundColorInput.value;
    updateCopy();
  });

  backgroundColorTextInput.addEventListener("input", () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(backgroundColorTextInput.value)) {
      backgroundColorInput.value = backgroundColorTextInput.value;
      updateCopy();
    }
  });

  // Sync text color picker and text input
  textColorInput.addEventListener("input", () => {
    textColorTextInput.value = textColorInput.value;
    updateCopy();
  });

  textColorTextInput.addEventListener("input", () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(textColorTextInput.value)) {
      textColorInput.value = textColorTextInput.value;
      updateCopy();
    }
  });

  [welcomeTitleInput, welcomeSubtitleInput, placeholderInput, sendButtonInput, useIconInput, iconTextInput, iconNameInput, showTooltipInput, tooltipTextInput]
    .forEach((input) => input.addEventListener("input", updateCopy));

  // Send button preset buttons
  document.querySelectorAll("[data-send-button-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.sendButtonPreset as keyof typeof SEND_BUTTON_PRESETS;
      applySendButtonPreset(preset);
    });
  });
}

// Status Indicator controls
function setupStatusIndicatorControls() {
  const visibleInput = getInput<HTMLInputElement>("status-indicator-visible");
  const idleTextInput = getInput<HTMLInputElement>("status-indicator-idle");
  const connectingTextInput = getInput<HTMLInputElement>("status-indicator-connecting");
  const connectedTextInput = getInput<HTMLInputElement>("status-indicator-connected");
  const errorTextInput = getInput<HTMLInputElement>("status-indicator-error");

  // Set initial values
  visibleInput.checked = currentConfig.statusIndicator?.visible ?? true;
  idleTextInput.value = currentConfig.statusIndicator?.idleText ?? "Online";
  connectingTextInput.value = currentConfig.statusIndicator?.connectingText ?? "Connecting…";
  connectedTextInput.value = currentConfig.statusIndicator?.connectedText ?? "Streaming…";
  errorTextInput.value = currentConfig.statusIndicator?.errorText ?? "Offline";

  const updateStatusIndicator = () => {
    const newConfig = {
      ...currentConfig,
      statusIndicator: {
        visible: visibleInput.checked,
        idleText: idleTextInput.value || undefined,
        connectingText: connectingTextInput.value || undefined,
        connectedText: connectedTextInput.value || undefined,
        errorText: errorTextInput.value || undefined
      }
    };
    debouncedUpdate(newConfig);
  };

  visibleInput.addEventListener("change", updateStatusIndicator);
  [idleTextInput, connectingTextInput, connectedTextInput, errorTextInput]
    .forEach((input) => input.addEventListener("input", updateStatusIndicator));
}

// Features controls
function setupFeatureControls() {
  const reasoningInput = getInput<HTMLInputElement>("feature-reasoning");
  const toolCallsInput = getInput<HTMLInputElement>("feature-tool-calls");
  const debugInput = getInput<HTMLInputElement>("debug-mode");

  // Set initial values
  reasoningInput.checked = currentConfig.features?.showReasoning ?? true;
  toolCallsInput.checked = currentConfig.features?.showToolCalls ?? true;
  debugInput.checked = currentConfig.debug ?? false;

  const updateFeatures = () => {
    const newConfig = {
      ...currentConfig,
      features: {
        showReasoning: reasoningInput.checked,
        showToolCalls: toolCallsInput.checked
      },
      debug: debugInput.checked
    };
    debouncedUpdate(newConfig);
  };

  [reasoningInput, toolCallsInput, debugInput].forEach((input) =>
    input.addEventListener("change", updateFeatures)
  );
}

// Suggestion chips controls
function setupSuggestionChipsControls() {
  const chipsList = getInput<HTMLDivElement>("suggestion-chips-list");
  const addButton = getInput<HTMLButtonElement>("add-suggestion-chip");

  const renderChips = (chipsToRender?: string[]) => {
    // Use provided chips or fall back to currentConfig
    const chips = chipsToRender ?? currentConfig.suggestionChips ?? [];
    
    // Clear the list
    chipsList.innerHTML = "";
    
    // If no chips, we're done
    if (chips.length === 0) return;

    chips.forEach((chip, index) => {
      const chipItem = document.createElement("div");
      chipItem.className = "chip-item";

      const chipInput = document.createElement("input");
      chipInput.type = "text";
      chipInput.value = chip;
      chipInput.addEventListener("input", () => {
        // Read current chips from currentConfig to avoid stale closure
        const currentChips = currentConfig.suggestionChips || [];
        const newChips = [...currentChips];
        newChips[index] = chipInput.value;
        updateSuggestionChips(newChips);
        // Don't call renderChips() here to avoid focus loss while typing
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "×";
      deleteButton.className = "delete-chip";
      deleteButton.addEventListener("click", () => {
        // Read current chips from currentConfig to avoid stale closure
        const currentChips = currentConfig.suggestionChips || [];
        const newChips = currentChips.filter((_, i) => i !== index);
        updateSuggestionChips(newChips);
        renderChips(newChips); // Re-render to update the UI after deletion
      });

      chipItem.appendChild(chipInput);
      chipItem.appendChild(deleteButton);
      chipsList.appendChild(chipItem);
    });
  };

  const updateSuggestionChips = (chips: string[]) => {
    // Update currentConfig immediately so renderChips() sees the updated value
    currentConfig = {
      ...currentConfig,
      suggestionChips: chips
    };
    debouncedUpdate(currentConfig);
  };

  addButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ensure currentConfig exists
    if (!currentConfig) {
      currentConfig = getDefaultConfig();
    }
    
    const chips = currentConfig.suggestionChips || [];
    const newChips = [...chips, "New suggestion"];
    
    // Update currentConfig immediately
    currentConfig = {
      ...currentConfig,
      suggestionChips: newChips
    };
    
    // Render immediately with the new chips array
    renderChips(newChips);
    
    // Verify the chips were rendered
    const renderedCount = chipsList.children.length;
    if (renderedCount !== newChips.length) {
      console.error(`Expected ${newChips.length} chips but rendered ${renderedCount}`);
    }
    
    // Then trigger debounced update for widget
    debouncedUpdate(currentConfig);
    
    return false;
  });

  renderChips();
}

// Other options controls
function setupOtherOptionsControls() {
  const apiUrlInput = getInput<HTMLInputElement>("api-url");
  const flowIdInput = getInput<HTMLInputElement>("flow-id");

  // Set initial values
  apiUrlInput.value = currentConfig.apiUrl ?? proxyUrl;
  flowIdInput.value = currentConfig.flowId ?? "";

  const updateOtherOptions = () => {
    const newConfig = {
      ...currentConfig,
      apiUrl: apiUrlInput.value,
      flowId: flowIdInput.value || undefined
    };
    debouncedUpdate(newConfig);
  };

  [apiUrlInput, flowIdInput].forEach((input) =>
    input.addEventListener("input", updateOtherOptions)
  );
}

// Export functions
function setupExportControls() {
  const copyJsonButton = getInput<HTMLButtonElement>("copy-json");
  const copyCodeButton = getInput<HTMLButtonElement>("copy-code");
  const feedbackDiv = getInput<HTMLDivElement>("export-feedback");

  const showFeedback = (message: string) => {
    feedbackDiv.textContent = message;
    feedbackDiv.classList.add("show");
    setTimeout(() => {
      feedbackDiv.classList.remove("show");
    }, 2000);
  };

  copyJsonButton.addEventListener("click", () => {
    const configToExport = {
      ...currentConfig,
      postprocessMessage: undefined,
      initialMessages: undefined
    };
    const json = JSON.stringify(configToExport, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showFeedback("✓ Config JSON copied to clipboard!");
    });
  });

  copyCodeButton.addEventListener("click", () => {
    const code = generateCodeSnippet();
    navigator.clipboard.writeText(code).then(() => {
      showFeedback("✓ Code snippet copied to clipboard!");
    });
  });
}

function generateCodeSnippet(): string {
  const config = { ...currentConfig };
  delete config.postprocessMessage;
  delete config.initialMessages;

  const lines: string[] = [
    "import '@chaty-assistant/vanilla/widget.css';",
    "import { initChatWidget, markdownPostprocessor } from '@chaty-assistant/vanilla';",
    "",
    "initChatWidget({",
    "  target: '#chat-widget-root',",
    "  config: {"
  ];

  if (config.apiUrl) lines.push(`    apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`    flowId: "${config.flowId}",`);

  if (config.theme) {
    lines.push("    theme: {");
    Object.entries(config.theme).forEach(([key, value]) => {
      lines.push(`      ${key}: "${value}",`);
    });
    lines.push("    },");
  }

  if (config.launcher) {
    lines.push("    launcher: {");
    Object.entries(config.launcher).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      }
    });
    lines.push("    },");
  }

  if (config.copy) {
    lines.push("    copy: {");
    Object.entries(config.copy).forEach(([key, value]) => {
      lines.push(`      ${key}: "${value}",`);
    });
    lines.push("    },");
  }

  if (config.features) {
    lines.push("    features: {");
    Object.entries(config.features).forEach(([key, value]) => {
      lines.push(`      ${key}: ${value},`);
    });
    lines.push("    },");
  }

  if (config.suggestionChips && config.suggestionChips.length > 0) {
    lines.push("    suggestionChips: [");
    config.suggestionChips.forEach((chip) => {
      lines.push(`      "${chip}",`);
    });
    lines.push("    ],");
  }

  if (config.debug) {
    lines.push(`    debug: ${config.debug},`);
  }

  lines.push("    postprocessMessage: ({ text }) => markdownPostprocessor(text)");
  lines.push("  }");
  lines.push("});");

  return lines.join("\n");
}

// Reset controls
function setupResetControls() {
  const resetButton = getInput<HTMLButtonElement>("reset-config");

  resetButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all configuration to defaults?")) {
      currentConfig = getDefaultConfig();
      widgetController.update(currentConfig);
      saveConfigToLocalStorage(currentConfig);

      // Reset all form inputs
      location.reload();
    }
  });
}

// Initialize all controls
function init() {
  setupThemeControls();
  setupLauncherControls();
  setupCopyControls();
  setupStatusIndicatorControls();
  setupFeatureControls();
  setupSuggestionChipsControls();
  setupOtherOptionsControls();
  setupExportControls();
  setupResetControls();
}

// Start the configurator
init();
