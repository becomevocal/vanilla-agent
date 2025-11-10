import "vanilla-agent/widget.css";
import "./index.css";
import "./theme-configurator.css";

import {
  createChatExperience,
  markdownPostprocessor
} from "vanilla-agent";
import type { ChatWidgetConfig } from "vanilla-agent";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ?? `http://localhost:${proxyPort}/api/chat/dispatch`;

// Typography presets
const TYPOGRAPHY_PRESETS = {
  default: {
    inputFontFamily: "sans-serif" as const,
    inputFontWeight: "400"
  },
  bold: {
    inputFontFamily: "sans-serif" as const,
    inputFontWeight: "700"
  },
  serif: {
    inputFontFamily: "serif" as const,
    inputFontWeight: "400"
  },
  mono: {
    inputFontFamily: "mono" as const,
    inputFontWeight: "400"
  }
};

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
    callToAction: "#000000",
    callToActionBackground: "#ffffff",
    sendButtonBackgroundColor: "#111827",
    sendButtonTextColor: "#ffffff",
    sendButtonBorderColor: "#60a5fa",
    closeButtonColor: "#9ca3af",
    closeButtonBackgroundColor: "transparent",
    closeButtonBorderColor: "",
    clearChatIconColor: "#9ca3af",
    clearChatBackgroundColor: "transparent",
    clearChatBorderColor: "transparent",
    micIconColor: "#111827",
    micBackgroundColor: "transparent",
    micBorderColor: "transparent",
    recordingIconColor: "#ffffff",
    recordingBackgroundColor: "#ef4444",
    recordingBorderColor: "transparent",
    inputFontFamily: TYPOGRAPHY_PRESETS.default.inputFontFamily,
    inputFontWeight: TYPOGRAPHY_PRESETS.default.inputFontWeight
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
    callToAction: "#ffffff",
    callToActionBackground: "#1f2937",
    sendButtonBackgroundColor: "#ffffff",
    sendButtonTextColor: "#000000",
    sendButtonBorderColor: "#60a5fa",
    closeButtonColor: "#9ca3af",
    closeButtonBackgroundColor: "transparent",
    closeButtonBorderColor: "",
    clearChatIconColor: "#d1d5db",
    clearChatBackgroundColor: "transparent",
    clearChatBorderColor: "transparent",
    micIconColor: "#f9fafb",
    micBackgroundColor: "transparent",
    micBorderColor: "transparent",
    recordingIconColor: "#ffffff",
    recordingBackgroundColor: "#dc2626",
    recordingBorderColor: "transparent",
    inputFontFamily: TYPOGRAPHY_PRESETS.default.inputFontFamily,
    inputFontWeight: TYPOGRAPHY_PRESETS.default.inputFontWeight
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
    callToActionBackground: "#000000",
    sendButtonBackgroundColor: "#0066cc",
    sendButtonTextColor: "#ffffff",
    sendButtonBorderColor: "#0066cc",
    closeButtonColor: "#666666",
    closeButtonBackgroundColor: "",
    closeButtonBorderColor: "",
    clearChatIconColor: "#666666",
    clearChatBackgroundColor: "transparent",
    clearChatBorderColor: "#999999",
    micIconColor: "#000000",
    micBackgroundColor: "transparent",
    micBorderColor: "transparent",
    recordingIconColor: "#ffffff",
    recordingBackgroundColor: "#cc0000",
    recordingBorderColor: "#cc0000",
    inputFontFamily: TYPOGRAPHY_PRESETS.default.inputFontFamily,
    inputFontWeight: TYPOGRAPHY_PRESETS.default.inputFontWeight
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
  }
};

// Send button presets
// Note: Colors come from THEME_PRESETS (sendButtonBackgroundColor, sendButtonTextColor, sendButtonBorderColor)
const SEND_BUTTON_PRESETS = {
  iconArrow: {
    useIcon: true,
    iconName: "arrow-up",
    iconText: "↑",
    size: "36px",
    borderWidth: "0px",
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
    borderWidth: "0px",
    paddingX: "10px",
    paddingY: "6px",
    showTooltip: true,
    tooltipText: "Send message"
  },
  text: {
    useIcon: false,
    borderWidth: "0px",
    paddingX: "16px",
    paddingY: "8px",
    showTooltip: false,
    tooltipText: "Send message"
  }
};

// Call to action (launcher call to action icon) presets
// Note: Colors come from THEME_PRESETS (callToAction and callToActionBackground)
const CALL_TO_ACTION_PRESETS = {
  default: {
    callToActionIconName: "arrow-up-right",
    callToActionIconText: "",
    callToActionIconSize: "32px",
    callToActionIconPadding: "5px"
  },
  sparkles: {
    callToActionIconName: "sparkles",
    callToActionIconText: "",
    callToActionIconSize: "40px",
    callToActionIconPadding: "12px"
  },
  send: {
    callToActionIconName: "send",
    callToActionIconText: "➤",
    callToActionIconSize: "40px",
    callToActionIconPadding: "12px"
  },
  text: {
    callToActionIconName: "",
    callToActionIconText: "↗",
    callToActionIconSize: "40px",
    callToActionIconPadding: "12px"
  }
};

// Close button presets
// Note: Colors come from THEME_PRESETS (closeButtonColor, closeButtonBackgroundColor, closeButtonBorderColor)
const CLOSE_BUTTON_PRESETS = {
  default: {
    closeButtonBorderWidth: "",
    closeButtonBorderRadius: ""
  },
  minimal: {
    closeButtonBorderWidth: "1px",
    closeButtonBorderRadius: "6px"
  },
  outlined: {
    closeButtonBorderWidth: "1px",
    closeButtonBorderRadius: "50%"
  }
};

// Default configuration
const getDefaultConfig = (): ChatWidgetConfig => ({
  apiUrl: proxyUrl,
  theme: { ...THEME_PRESETS.default, ...RADIUS_PRESETS.default, ...TYPOGRAPHY_PRESETS.default },
  launcher: {
    enabled: true,
    title: "Chat Assistant",
    subtitle: "Here to help you get answers fast",
    agentIconText: "💬",
    position: "bottom-right",
    width: "min(400px, calc(100vw - 24px))",
    autoExpand: false,
    callToActionIconHidden: false,
    agentIconSize: "40px",
    headerIconSize: "48px",
    closeButtonSize: "32px",
    ...CALL_TO_ACTION_PRESETS.default,
    // Colors come from theme presets
    callToActionIconColor: THEME_PRESETS.default.callToAction,
    callToActionIconBackgroundColor: THEME_PRESETS.default.callToActionBackground,
    closeButtonColor: THEME_PRESETS.default.closeButtonColor || undefined,
    closeButtonBackgroundColor: THEME_PRESETS.default.closeButtonBackgroundColor || undefined,
    closeButtonBorderColor: THEME_PRESETS.default.closeButtonBorderColor || undefined,
    clearChat: {
      iconColor: THEME_PRESETS.default.clearChatIconColor || undefined,
      backgroundColor: THEME_PRESETS.default.clearChatBackgroundColor || undefined,
      borderColor: THEME_PRESETS.default.clearChatBorderColor || undefined
    }
  },
  copy: {
    welcomeTitle: "Hello 👋",
    welcomeSubtitle: "Ask anything about your account or products.",
    inputPlaceholder: "Type your message…",
    sendButtonLabel: "Send"
  },
  sendButton: {
    borderWidth: "0px",
    paddingX: "16px",
    paddingY: "8px",
    // Colors come from theme presets
    backgroundColor: THEME_PRESETS.default.sendButtonBackgroundColor,
    textColor: THEME_PRESETS.default.sendButtonTextColor,
    borderColor: THEME_PRESETS.default.sendButtonBorderColor
  },
  statusIndicator: {
    visible: true,
    idleText: "Online",
    connectingText: "Connecting…",
    connectedText: "Streaming…",
    errorText: "Offline"
  },
  voiceRecognition: {
    enabled: false,
    pauseDuration: 2000,
    iconName: "mic",
    iconSize: "37px",
    borderWidth: "0px",
    paddingX: "10px",
    paddingY: "10px",
    // Colors come from theme presets (background defaults to transparent)
    iconColor: THEME_PRESETS.default.micIconColor,
    backgroundColor: THEME_PRESETS.default.micBackgroundColor || "transparent",
    borderColor: THEME_PRESETS.default.micBorderColor,
    recordingIconColor: THEME_PRESETS.default.recordingIconColor,
    recordingBackgroundColor: THEME_PRESETS.default.recordingBackgroundColor,
    recordingBorderColor: THEME_PRESETS.default.recordingBorderColor
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
const STORAGE_KEY = "vanilla-agent-widget-config";

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

// Helper function to setup color inputs with transparent support
function setupColorInput(
  colorInputId: string,
  textInputId: string,
  getValue: () => string,
  setValue: (value: string) => void,
  defaultValue: string = "transparent"
) {
  const colorInput = getInput<HTMLInputElement>(colorInputId);
  const textInput = getInput<HTMLInputElement>(textInputId);
  
  // Initialize values
  const currentValue = getValue() || defaultValue;
  if (currentValue === "transparent") {
    textInput.value = "transparent";
    colorInput.value = "#000000"; // Placeholder value for color picker
  } else {
    textInput.value = currentValue;
    colorInput.value = currentValue || "#000000";
  }
  
  // Sync from color picker to text input
  colorInput.addEventListener("input", () => {
    textInput.value = colorInput.value;
    setValue(colorInput.value);
  });
  
  // Sync from text input to color picker
  textInput.addEventListener("input", () => {
    const value = textInput.value.trim().toLowerCase();
    if (value === "transparent") {
      colorInput.value = "#000000";
      setValue("transparent");
    } else if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      colorInput.value = value;
      setValue(value);
    } else if (value === "") {
      // Empty means use default (transparent)
      colorInput.value = "#000000";
      setValue("transparent");
    } else {
      // Allow other CSS color values (like rgba, etc.)
      setValue(value);
    }
  });
}

// Theme controls
function setupThemeControls() {
  const themeKeys = ["primary", "accent", "callToAction", "surface", "container", "border", "divider", "messageBorder", "inputBackground", "muted", "sendButtonBackgroundColor", "sendButtonTextColor", "sendButtonBorderColor", "closeButtonColor", "closeButtonBackgroundColor", "closeButtonBorderColor", "clearChatIconColor", "clearChatBackgroundColor", "clearChatBorderColor", "micIconColor", "micBackgroundColor", "micBorderColor", "recordingIconColor", "recordingBackgroundColor", "recordingBorderColor"] as const;

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
  
  // If updating send button colors, also update sendButton config
  if (key === "sendButtonBackgroundColor" || key === "sendButtonTextColor" || key === "sendButtonBorderColor") {
    newConfig.sendButton = {
      ...currentConfig.sendButton,
      [key === "sendButtonBackgroundColor" ? "backgroundColor" : key === "sendButtonTextColor" ? "textColor" : "borderColor"]: value === "transparent" ? undefined : value
    };
  }
  
  // If updating close button colors, also update launcher config
  if (key === "closeButtonColor" || key === "closeButtonBackgroundColor" || key === "closeButtonBorderColor") {
    newConfig.launcher = {
      ...currentConfig.launcher,
      [key === "closeButtonColor" ? "closeButtonColor" : key === "closeButtonBackgroundColor" ? "closeButtonBackgroundColor" : "closeButtonBorderColor"]: (value === "" || value === "transparent") ? undefined : value
    };
  }

  // If updating clear chat button colors, also update launcher.clearChat config
  if (key === "clearChatIconColor" || key === "clearChatBackgroundColor" || key === "clearChatBorderColor") {
    newConfig.launcher = {
      ...currentConfig.launcher,
      clearChat: {
        ...currentConfig.launcher?.clearChat,
        [key === "clearChatIconColor" ? "iconColor" : key === "clearChatBackgroundColor" ? "backgroundColor" : "borderColor"]: (value === "" || value === "transparent") ? undefined : value
      }
    };
  }

  // If updating mic button colors, also update voiceRecognition config
  if (key === "micIconColor" || key === "micBackgroundColor" || key === "micBorderColor" || 
      key === "recordingIconColor" || key === "recordingBackgroundColor" || key === "recordingBorderColor") {
    newConfig.voiceRecognition = {
      ...currentConfig.voiceRecognition,
      [key === "micIconColor" ? "iconColor" : 
       key === "micBackgroundColor" ? "backgroundColor" : 
       key === "micBorderColor" ? "borderColor" :
       key === "recordingIconColor" ? "recordingIconColor" :
       key === "recordingBackgroundColor" ? "recordingBackgroundColor" :
       "recordingBorderColor"]: (value === "" || value === "transparent") ? undefined : value
    };
  }
  
  // Use immediate update for radius values to ensure instant visual feedback
  if (key.startsWith('radius')) {
    immediateUpdate(newConfig);
  } else {
    debouncedUpdate(newConfig);
  }
}

function applyPreset(preset: keyof typeof THEME_PRESETS) {
  const themeValues = THEME_PRESETS[preset];
  const { callToActionBackground, sendButtonBackgroundColor, sendButtonTextColor, sendButtonBorderColor, closeButtonColor, closeButtonBackgroundColor, closeButtonBorderColor, clearChatIconColor, clearChatBackgroundColor, clearChatBorderColor, micIconColor, micBackgroundColor, micBorderColor, recordingIconColor, recordingBackgroundColor, recordingBorderColor, inputFontFamily, inputFontWeight, ...themeColors } = themeValues;
  
  Object.entries(themeColors).forEach(([key, value]) => {
    const colorInput = getInput<HTMLInputElement>(`color-${key}`);
    const textInput = getInput<HTMLInputElement>(`color-${key}-text`);
    colorInput.value = value;
    textInput.value = value;
  });

  // Set send button colors
  const sendButtonBgColorInput = getInput<HTMLInputElement>("color-sendButtonBackgroundColor");
  const sendButtonBgColorTextInput = getInput<HTMLInputElement>("color-sendButtonBackgroundColor-text");
  const sendButtonTextColorInput = getInput<HTMLInputElement>("color-sendButtonTextColor");
  const sendButtonTextColorTextInput = getInput<HTMLInputElement>("color-sendButtonTextColor-text");
  const sendButtonBorderColorInput = getInput<HTMLInputElement>("color-sendButtonBorderColor");
  const sendButtonBorderColorTextInput = getInput<HTMLInputElement>("color-sendButtonBorderColor-text");
  
  if (sendButtonBgColorInput && sendButtonBgColorTextInput) {
    sendButtonBgColorInput.value = sendButtonBackgroundColor;
    sendButtonBgColorTextInput.value = sendButtonBackgroundColor;
  }
  if (sendButtonTextColorInput && sendButtonTextColorTextInput) {
    sendButtonTextColorInput.value = sendButtonTextColor;
    sendButtonTextColorTextInput.value = sendButtonTextColor;
  }
  if (sendButtonBorderColorInput && sendButtonBorderColorTextInput) {
    sendButtonBorderColorInput.value = sendButtonBorderColor;
    sendButtonBorderColorTextInput.value = sendButtonBorderColor;
  }

  // Set close button colors
  const closeButtonColorInput = getInput<HTMLInputElement>("color-closeButtonColor");
  const closeButtonColorTextInput = getInput<HTMLInputElement>("color-closeButtonColor-text");
  const closeButtonBgColorInput = getInput<HTMLInputElement>("color-closeButtonBackgroundColor");
  const closeButtonBgColorTextInput = getInput<HTMLInputElement>("color-closeButtonBackgroundColor-text");
  const closeButtonBorderColorInput = getInput<HTMLInputElement>("color-closeButtonBorderColor");
  const closeButtonBorderColorTextInput = getInput<HTMLInputElement>("color-closeButtonBorderColor-text");
  
  if (closeButtonColorInput && closeButtonColorTextInput) {
    if (closeButtonColor) {
      closeButtonColorInput.value = closeButtonColor;
      closeButtonColorTextInput.value = closeButtonColor;
    } else {
      closeButtonColorInput.value = "";
      closeButtonColorTextInput.value = "";
    }
  }
  if (closeButtonBgColorInput && closeButtonBgColorTextInput) {
    if (closeButtonBackgroundColor === "" || closeButtonBackgroundColor === "transparent") {
      closeButtonBgColorTextInput.value = "transparent";
      closeButtonBgColorInput.value = "#000000";
    } else {
      closeButtonBgColorTextInput.value = closeButtonBackgroundColor;
      closeButtonBgColorInput.value = closeButtonBackgroundColor;
    }
  }
  if (closeButtonBorderColorInput && closeButtonBorderColorTextInput) {
    if (closeButtonBorderColor === "" || closeButtonBorderColor === "transparent") {
      closeButtonBorderColorTextInput.value = "transparent";
      closeButtonBorderColorInput.value = "#000000";
    } else {
      closeButtonBorderColorTextInput.value = closeButtonBorderColor;
      closeButtonBorderColorInput.value = closeButtonBorderColor;
    }
  }

  // Set clear chat button colors
  const clearChatIconColorInput = getInput<HTMLInputElement>("color-clearChatIconColor");
  const clearChatIconColorTextInput = getInput<HTMLInputElement>("color-clearChatIconColor-text");
  const clearChatBackgroundColorInput = getInput<HTMLInputElement>("color-clearChatBackgroundColor");
  const clearChatBackgroundColorTextInput = getInput<HTMLInputElement>("color-clearChatBackgroundColor-text");
  const clearChatBorderColorInput = getInput<HTMLInputElement>("color-clearChatBorderColor");
  const clearChatBorderColorTextInput = getInput<HTMLInputElement>("color-clearChatBorderColor-text");

  if (clearChatIconColorInput && clearChatIconColorTextInput) {
    if (clearChatIconColor === "" || clearChatIconColor === "transparent") {
      clearChatIconColorTextInput.value = "transparent";
      clearChatIconColorInput.value = "#000000";
    } else {
      clearChatIconColorTextInput.value = clearChatIconColor;
      clearChatIconColorInput.value = clearChatIconColor;
    }
  }
  if (clearChatBackgroundColorInput && clearChatBackgroundColorTextInput) {
    if (clearChatBackgroundColor === "" || clearChatBackgroundColor === "transparent") {
      clearChatBackgroundColorTextInput.value = "transparent";
      clearChatBackgroundColorInput.value = "#000000";
    } else {
      clearChatBackgroundColorTextInput.value = clearChatBackgroundColor;
      clearChatBackgroundColorInput.value = clearChatBackgroundColor;
    }
  }
  if (clearChatBorderColorInput && clearChatBorderColorTextInput) {
    if (clearChatBorderColor === "" || clearChatBorderColor === "transparent") {
      clearChatBorderColorTextInput.value = "transparent";
      clearChatBorderColorInput.value = "#000000";
    } else {
      clearChatBorderColorTextInput.value = clearChatBorderColor;
      clearChatBorderColorInput.value = clearChatBorderColor;
    }
  }

  // Set mic button colors
  const micIconColorInput = getInput<HTMLInputElement>("color-micIconColor");
  const micIconColorTextInput = getInput<HTMLInputElement>("color-micIconColor-text");
  const micBackgroundColorInput = getInput<HTMLInputElement>("color-micBackgroundColor");
  const micBackgroundColorTextInput = getInput<HTMLInputElement>("color-micBackgroundColor-text");
  const micBorderColorInput = getInput<HTMLInputElement>("color-micBorderColor");
  const micBorderColorTextInput = getInput<HTMLInputElement>("color-micBorderColor-text");
  
  if (micIconColorInput && micIconColorTextInput) {
    micIconColorInput.value = micIconColor;
    micIconColorTextInput.value = micIconColor;
  }
  if (micBackgroundColorInput && micBackgroundColorTextInput) {
    micBackgroundColorInput.value = micBackgroundColor;
    micBackgroundColorTextInput.value = micBackgroundColor;
  }
  if (micBorderColorInput && micBorderColorTextInput) {
    if (micBorderColor === "" || micBorderColor === "transparent") {
      micBorderColorTextInput.value = "transparent";
      micBorderColorInput.value = "#000000";
    } else {
      micBorderColorTextInput.value = micBorderColor;
      micBorderColorInput.value = micBorderColor;
    }
  }

  // Set recording state colors
  const recordingIconColorInput = getInput<HTMLInputElement>("color-recordingIconColor");
  const recordingIconColorTextInput = getInput<HTMLInputElement>("color-recordingIconColor-text");
  const recordingBackgroundColorInput = getInput<HTMLInputElement>("color-recordingBackgroundColor");
  const recordingBackgroundColorTextInput = getInput<HTMLInputElement>("color-recordingBackgroundColor-text");
  const recordingBorderColorInput = getInput<HTMLInputElement>("color-recordingBorderColor");
  const recordingBorderColorTextInput = getInput<HTMLInputElement>("color-recordingBorderColor-text");
  
  if (recordingIconColorInput && recordingIconColorTextInput) {
    recordingIconColorInput.value = recordingIconColor;
    recordingIconColorTextInput.value = recordingIconColor;
  }
  if (recordingBackgroundColorInput && recordingBackgroundColorTextInput) {
    recordingBackgroundColorInput.value = recordingBackgroundColor;
    recordingBackgroundColorTextInput.value = recordingBackgroundColor;
  }
  if (recordingBorderColorInput && recordingBorderColorTextInput) {
    if (recordingBorderColor === "" || recordingBorderColor === "transparent") {
      recordingBorderColorTextInput.value = "transparent";
      recordingBorderColorInput.value = "#000000";
    } else {
      recordingBorderColorTextInput.value = recordingBorderColor;
      recordingBorderColorInput.value = recordingBorderColor;
    }
  }

  // Also set the call to action background color
  const callToActionIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color");
  const callToActionIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color-text");
  if (callToActionIconBackgroundColorInput && callToActionIconBackgroundColorTextInput) {
    callToActionIconBackgroundColorInput.value = callToActionBackground;
    callToActionIconBackgroundColorTextInput.value = callToActionBackground;
  }

  // Set typography controls
  const fontFamilySelect = getInput<HTMLSelectElement>("input-font-family");
  const fontWeightInput = getInput<HTMLInputElement>("input-font-weight");
  const fontWeightSlider = getInput<HTMLInputElement>("input-font-weight-slider");
  if (fontFamilySelect) {
    fontFamilySelect.value = inputFontFamily;
  }
  if (fontWeightInput && fontWeightSlider) {
    // Remove any units and use just the number
    const fontWeightNum = parseInt(inputFontWeight.replace(/[^\d]/g, ''), 10) || 400;
    fontWeightInput.value = String(fontWeightNum);
    fontWeightSlider.value = String(fontWeightNum);
  }

  const newConfig = {
    ...currentConfig,
    theme: { ...currentConfig.theme, ...themeColors, sendButtonBackgroundColor, sendButtonTextColor, sendButtonBorderColor, closeButtonColor, closeButtonBackgroundColor, closeButtonBorderColor, micIconColor, micBackgroundColor, micBorderColor, recordingIconColor, recordingBackgroundColor, recordingBorderColor, inputFontFamily, inputFontWeight },
    sendButton: {
      ...currentConfig.sendButton,
      backgroundColor: sendButtonBackgroundColor,
      textColor: sendButtonTextColor,
      borderColor: sendButtonBorderColor
    },
    launcher: {
      ...currentConfig.launcher,
      callToActionIconBackgroundColor: callToActionBackground,
      closeButtonColor: closeButtonColor || undefined,
      closeButtonBackgroundColor: closeButtonBackgroundColor || undefined,
      closeButtonBorderColor: closeButtonBorderColor || undefined,
      clearChat: {
        ...currentConfig.launcher?.clearChat,
        iconColor: clearChatIconColor || undefined,
        backgroundColor: clearChatBackgroundColor || undefined,
        borderColor: clearChatBorderColor || undefined
      }
    },
    voiceRecognition: {
      ...currentConfig.voiceRecognition,
      iconColor: micIconColor,
      backgroundColor: micBackgroundColor,
      borderColor: micBorderColor || undefined,
      recordingIconColor: recordingIconColor,
      recordingBackgroundColor: recordingBackgroundColor,
      recordingBorderColor: recordingBorderColor || undefined
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
  // Note: Colors come from theme, not from presets - they are managed through theme controls
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
    sendButton: { 
      ...currentConfig.sendButton, 
      ...presetValues
      // Note: Colors are preserved from current config (they come from theme, not from send button presets)
    }
  };
  immediateUpdate(newConfig);
}

function applyCallToActionPreset(preset: keyof typeof CALL_TO_ACTION_PRESETS) {
  const presetValues = CALL_TO_ACTION_PRESETS[preset];
  
  // Get input elements
  const callToActionIconTextInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-text");
  const callToActionIconNameInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-name");
  const callToActionIconSizeInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-size");
  const callToActionIconSizeSlider = getInput<HTMLInputElement>("launcher-call-to-action-icon-size-slider");
  const callToActionIconPaddingInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-padding");
  const callToActionIconPaddingSlider = getInput<HTMLInputElement>("launcher-call-to-action-icon-padding-slider");
  const callToActionIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color");
  const callToActionIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color-text");
  
  // Update input fields with preset values
  if (presetValues.callToActionIconText) callToActionIconTextInput.value = presetValues.callToActionIconText;
  if (presetValues.callToActionIconName !== undefined) callToActionIconNameInput.value = presetValues.callToActionIconName || "";
  if (presetValues.callToActionIconSize) {
    callToActionIconSizeInput.value = presetValues.callToActionIconSize;
    const parsed = parseCssValue(presetValues.callToActionIconSize);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    callToActionIconSizeSlider.value = pxValue.toString();
  }
  if (presetValues.callToActionIconPadding) {
    callToActionIconPaddingInput.value = presetValues.callToActionIconPadding;
    const parsed = parseCssValue(presetValues.callToActionIconPadding);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    callToActionIconPaddingSlider.value = pxValue.toString();
  }
  
  const newConfig = {
    ...currentConfig,
    launcher: { 
      ...currentConfig.launcher, 
      callToActionIconText: presetValues.callToActionIconText,
      callToActionIconName: presetValues.callToActionIconName || undefined,
      callToActionIconSize: presetValues.callToActionIconSize,
      callToActionIconPadding: presetValues.callToActionIconPadding || undefined
      // Note: callToActionIconColor and callToActionIconBackgroundColor are preserved from current config
      // (they come from theme, not from call-to-action presets)
    }
  };
  immediateUpdate(newConfig);
  
  // Sync background color inputs with current config value (from theme)
  const currentBgColor = newConfig.launcher?.callToActionIconBackgroundColor ?? "transparent";
  if (callToActionIconBackgroundColorInput && callToActionIconBackgroundColorTextInput) {
    if (currentBgColor === "transparent") {
      callToActionIconBackgroundColorTextInput.value = "transparent";
      callToActionIconBackgroundColorInput.value = "#000000"; // Placeholder for color picker
    } else {
      callToActionIconBackgroundColorTextInput.value = currentBgColor;
      callToActionIconBackgroundColorInput.value = currentBgColor;
    }
  }
}

function applyCloseButtonPreset(preset: keyof typeof CLOSE_BUTTON_PRESETS) {
  const presetValues = CLOSE_BUTTON_PRESETS[preset];
  
  // Get input elements
  const closeButtonBorderWidthInput = getInput<HTMLInputElement>("launcher-close-button-border-width");
  const closeButtonBorderWidthSlider = getInput<HTMLInputElement>("launcher-close-button-border-width-slider");
  const closeButtonBorderRadiusInput = getInput<HTMLInputElement>("launcher-close-button-border-radius");
  const closeButtonBorderRadiusSlider = getInput<HTMLInputElement>("launcher-close-button-border-radius-slider");
  
  // Note: Colors come from theme, not from presets - they are managed through theme controls
  if (presetValues.closeButtonBorderWidth) {
    closeButtonBorderWidthInput.value = presetValues.closeButtonBorderWidth;
    const parsed = parseCssValue(presetValues.closeButtonBorderWidth);
    const pxValue = convertToPx(parsed.value, parsed.unit);
    closeButtonBorderWidthSlider.value = pxValue.toString();
  } else {
    closeButtonBorderWidthInput.value = "";
    closeButtonBorderWidthSlider.value = "0";
  }
  if (presetValues.closeButtonBorderRadius) {
    closeButtonBorderRadiusInput.value = presetValues.closeButtonBorderRadius;
    // Update slider if it's a percentage value (50%)
    if (presetValues.closeButtonBorderRadius === "50%") {
      closeButtonBorderRadiusSlider.value = "100";
    } else {
      const parsed = parseCssValue(presetValues.closeButtonBorderRadius);
      const pxValue = convertToPx(parsed.value, parsed.unit);
      closeButtonBorderRadiusSlider.value = pxValue.toString();
    }
  }
  
  const newConfig = {
    ...currentConfig,
    launcher: { 
      ...currentConfig.launcher, 
      closeButtonBorderWidth: presetValues.closeButtonBorderWidth || undefined,
      closeButtonBorderRadius: presetValues.closeButtonBorderRadius || undefined
      // Note: Colors are preserved from current config (they come from theme, not from close button presets)
    }
  };
  immediateUpdate(newConfig);
}

// Launcher controls
function setupLauncherControls() {
  const enabledInput = getInput<HTMLInputElement>("launcher-enabled");
  const titleInput = getInput<HTMLInputElement>("launcher-title");
  const subtitleInput = getInput<HTMLInputElement>("launcher-subtitle");
  const textHiddenInput = getInput<HTMLInputElement>("launcher-text-hidden");
  const agentIconTextInput = getInput<HTMLInputElement>("launcher-agent-icon-text");
  const agentIconNameInput = getInput<HTMLInputElement>("launcher-agent-icon-name");
  const agentIconHiddenInput = getInput<HTMLInputElement>("launcher-agent-icon-hidden");
  const positionInput = getInput<HTMLSelectElement>("launcher-position");
  const widthInput = getInput<HTMLInputElement>("launcher-width");
  const autoExpandInput = getInput<HTMLInputElement>("launcher-auto-expand");
  const callToActionIconTextInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-text");
  const callToActionIconNameInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-name");
  const callToActionIconHiddenInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-hidden");
  const callToActionIconBackgroundColorInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color");
  const callToActionIconBackgroundColorTextInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-background-color-text");
  
  // Size inputs - these will be handled by sliders, but we still need references for the update function
  const agentIconSizeInput = getInput<HTMLInputElement>("launcher-agent-icon-size");
  const callToActionIconSizeInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-size");
  const callToActionIconPaddingInput = getInput<HTMLInputElement>("launcher-call-to-action-icon-padding");

  // Set initial values
  enabledInput.checked = currentConfig.launcher?.enabled ?? true;
  titleInput.value = currentConfig.launcher?.title ?? "Chat Assistant";
  subtitleInput.value = currentConfig.launcher?.subtitle ?? "Here to help you get answers fast";
  textHiddenInput.checked = currentConfig.launcher?.textHidden ?? false;
  agentIconTextInput.value = currentConfig.launcher?.agentIconText ?? "💬";
  agentIconNameInput.value = currentConfig.launcher?.agentIconName ?? "";
  agentIconHiddenInput.checked = currentConfig.launcher?.agentIconHidden ?? false;
  positionInput.value = currentConfig.launcher?.position ?? "bottom-right";
  widthInput.value = currentConfig.launcher?.width ?? "min(400px, calc(100vw - 24px))";
  autoExpandInput.checked = currentConfig.launcher?.autoExpand ?? false;
  callToActionIconTextInput.value = currentConfig.launcher?.callToActionIconText ?? "↗";
  callToActionIconNameInput.value = currentConfig.launcher?.callToActionIconName ?? "";
  callToActionIconHiddenInput.checked = currentConfig.launcher?.callToActionIconHidden ?? false;
  
  // Setup color inputs with transparent support
  setupColorInput(
    "launcher-call-to-action-icon-background-color",
    "launcher-call-to-action-icon-background-color-text",
    () => currentConfig.launcher?.callToActionIconBackgroundColor ?? "transparent",
    (value) => {
      const newConfig = {
        ...currentConfig,
        launcher: {
          ...currentConfig.launcher,
          callToActionIconBackgroundColor: value === "transparent" ? undefined : value
        }
      };
      debouncedUpdate(newConfig);
    }
  );

  const updateLauncher = () => {
    const newConfig = {
      ...currentConfig,
      launcher: {
        ...currentConfig.launcher,
        enabled: enabledInput.checked,
        title: titleInput.value,
        subtitle: subtitleInput.value,
        textHidden: textHiddenInput.checked,
        agentIconText: agentIconTextInput.value,
        agentIconName: agentIconNameInput.value || undefined,
        agentIconHidden: agentIconHiddenInput.checked,
        position: positionInput.value as "bottom-right" | "bottom-left" | "top-right" | "top-left",
        width: widthInput.value,
        autoExpand: autoExpandInput.checked,
        callToActionIconText: callToActionIconTextInput.value,
        callToActionIconName: callToActionIconNameInput.value || undefined,
        callToActionIconHidden: callToActionIconHiddenInput.checked,
        callToActionIconBackgroundColor: callToActionIconBackgroundColorTextInput.value === "transparent" ? undefined : (callToActionIconBackgroundColorTextInput.value || undefined),
        agentIconSize: agentIconSizeInput.value,
        callToActionIconSize: callToActionIconSizeInput.value,
        callToActionIconPadding: callToActionIconPaddingInput.value || undefined
      }
    };
    debouncedUpdate(newConfig);
  };

  // Setup sliders for size inputs
  const sizeInputs = [
    { key: "agentIconSize", inputId: "launcher-agent-icon-size", sliderId: "launcher-agent-icon-size-slider" },
    { key: "callToActionIconSize", inputId: "launcher-call-to-action-icon-size", sliderId: "launcher-call-to-action-icon-size-slider" }
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
               (key === "agentIconSize" ? "40px" : 
                key === "callToActionIconSize" ? "32px" : "32px");
      }
    });
  });

  // Setup slider for call to action icon padding
  setupSliderInput({
    sliderId: "launcher-call-to-action-icon-padding-slider",
    textInputId: "launcher-call-to-action-icon-padding",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateLauncher();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.callToActionIconPadding ?? "5px";
    }
  });

  [enabledInput, titleInput, subtitleInput, textHiddenInput, agentIconTextInput, agentIconNameInput, agentIconHiddenInput, positionInput, widthInput, autoExpandInput, callToActionIconTextInput, callToActionIconNameInput, callToActionIconHiddenInput]
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

// Close Button controls
function setupCloseButtonControls() {
  const closeButtonSizeInput = getInput<HTMLInputElement>("launcher-close-button-size");
  const closeButtonPlacementInput = getInput<HTMLSelectElement>("launcher-close-button-placement");
  const closeButtonBorderWidthInput = getInput<HTMLInputElement>("launcher-close-button-border-width");
  const closeButtonBorderRadiusInput = getInput<HTMLInputElement>("launcher-close-button-border-radius");
  const closeButtonIconNameInput = getInput<HTMLInputElement>("launcher-close-button-icon-name");
  const closeButtonIconTextInput = getInput<HTMLInputElement>("launcher-close-button-icon-text");
  const closeButtonTooltipTextInput = getInput<HTMLInputElement>("launcher-close-button-tooltip-text");
  const closeButtonShowTooltipInput = getInput<HTMLInputElement>("launcher-close-button-show-tooltip");
  const closeButtonPaddingXInput = getInput<HTMLInputElement>("launcher-close-button-padding-x");
  const closeButtonPaddingYInput = getInput<HTMLInputElement>("launcher-close-button-padding-y");

  // Set initial values
  closeButtonPlacementInput.value = currentConfig.launcher?.closeButtonPlacement ?? "inline";
  closeButtonBorderWidthInput.value = currentConfig.launcher?.closeButtonBorderWidth ?? "";
  closeButtonBorderRadiusInput.value = currentConfig.launcher?.closeButtonBorderRadius ?? "";
  closeButtonIconNameInput.value = currentConfig.launcher?.closeButtonIconName ?? "x";
  closeButtonIconTextInput.value = currentConfig.launcher?.closeButtonIconText ?? "×";
  closeButtonTooltipTextInput.value = currentConfig.launcher?.closeButtonTooltipText ?? "Close chat";
  closeButtonShowTooltipInput.checked = currentConfig.launcher?.closeButtonShowTooltip ?? true;

  const updateCloseButton = () => {
    const newConfig = {
      ...currentConfig,
      launcher: {
        ...currentConfig.launcher,
        closeButtonSize: closeButtonSizeInput.value,
        closeButtonPlacement: closeButtonPlacementInput.value as "inline" | "top-right",
        // Note: Colors come from theme, not from these controls
        closeButtonBorderWidth: closeButtonBorderWidthInput.value || undefined,
        closeButtonBorderRadius: closeButtonBorderRadiusInput.value || undefined,
        closeButtonPaddingX: closeButtonPaddingXInput.value.trim() || undefined,
        closeButtonPaddingY: closeButtonPaddingYInput.value.trim() || undefined,
        closeButtonIconName: closeButtonIconNameInput.value.trim() || undefined,
        closeButtonIconText: closeButtonIconTextInput.value.trim() || undefined,
        closeButtonTooltipText: closeButtonTooltipTextInput.value.trim() || undefined,
        closeButtonShowTooltip: closeButtonShowTooltipInput.checked
      }
    };
    debouncedUpdate(newConfig);
  };

  // Setup slider for close button size
  setupSliderInput({
    sliderId: "launcher-close-button-size-slider",
    textInputId: "launcher-close-button-size",
    min: 16,
    max: 128,
    step: 1,
    onUpdate: (value: string) => {
      updateCloseButton();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.closeButtonSize ?? "32px";
    }
  });

  // Setup slider for close button border radius
  setupSliderInput({
    sliderId: "launcher-close-button-border-radius-slider",
    textInputId: "launcher-close-button-border-radius",
    min: 0,
    max: 100,
    step: 1,
    isRadiusFull: true,
    onUpdate: (value: string) => {
      updateCloseButton();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.closeButtonBorderRadius ?? "50%";
    }
  });

  // Setup slider for close button border width
  setupSliderInput({
    sliderId: "launcher-close-button-border-width-slider",
    textInputId: "launcher-close-button-border-width",
    min: 0,
    max: 8,
    step: 1,
    onUpdate: (value: string) => {
      updateCloseButton();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.closeButtonBorderWidth ?? "";
    }
  });

  // Setup slider for close button padding X
  setupSliderInput({
    sliderId: "launcher-close-button-padding-x-slider",
    textInputId: "launcher-close-button-padding-x",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateCloseButton();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.closeButtonPaddingX ?? "0px";
    }
  });

  // Setup slider for close button padding Y
  setupSliderInput({
    sliderId: "launcher-close-button-padding-y-slider",
    textInputId: "launcher-close-button-padding-y",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateCloseButton();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.closeButtonPaddingY ?? "0px";
    }
  });

  closeButtonPlacementInput.addEventListener("change", updateCloseButton);
  closeButtonIconNameInput.addEventListener("input", updateCloseButton);
  closeButtonIconTextInput.addEventListener("input", updateCloseButton);
  closeButtonTooltipTextInput.addEventListener("input", updateCloseButton);
  closeButtonShowTooltipInput.addEventListener("change", updateCloseButton);

  // Close button preset buttons
  document.querySelectorAll("[data-close-button-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.closeButtonPreset as keyof typeof CLOSE_BUTTON_PRESETS;
      applyCloseButtonPreset(preset);
    });
  });
}

// Typography controls
function setupTypographyControls() {
  const fontFamilySelect = getInput<HTMLSelectElement>("input-font-family");
  const fontWeightSlider = getInput<HTMLInputElement>("input-font-weight-slider");
  const fontWeightInput = getInput<HTMLInputElement>("input-font-weight");
  
  // Set initial values from config or preset defaults
  fontFamilySelect.value = currentConfig.theme?.inputFontFamily ?? TYPOGRAPHY_PRESETS.default.inputFontFamily;
  const initialFontWeight = currentConfig.theme?.inputFontWeight ?? TYPOGRAPHY_PRESETS.default.inputFontWeight;
  const fontWeightNum = parseInt(initialFontWeight, 10) || 400;
  fontWeightSlider.value = String(fontWeightNum);
  fontWeightInput.value = String(fontWeightNum);
  
  // Flag to prevent update loops
  let isUpdating = false;
  
  // Update from slider to text input (number only, no units)
  fontWeightSlider.addEventListener("input", () => {
    if (isUpdating) return;
    isUpdating = true;
    const value = fontWeightSlider.value;
    fontWeightInput.value = value;
    updateTypography();
    isUpdating = false;
  });
  
  // Update from text input to slider (number only, no units)
  fontWeightInput.addEventListener("input", () => {
    if (isUpdating) return;
    const value = fontWeightInput.value.trim();
    if (!value) return;
    
    // Parse number, removing any units
    const numValue = parseInt(value.replace(/[^\d]/g, ''), 10);
    if (isNaN(numValue)) return;
    
    // Clamp to valid range
    const clampedValue = Math.max(100, Math.min(900, numValue));
    fontWeightSlider.value = String(clampedValue);
    fontWeightInput.value = String(clampedValue);
    updateTypography();
  });
  
  const updateTypography = () => {
    const fontWeightValue = fontWeightInput.value.trim();
    const fontWeightNum = parseInt(fontWeightValue, 10);
    
    const newConfig = {
      ...currentConfig,
      theme: {
        ...currentConfig.theme,
        inputFontFamily: fontFamilySelect.value as "sans-serif" | "serif" | "mono",
        inputFontWeight: isNaN(fontWeightNum) ? undefined : String(fontWeightNum)
      }
    };
    debouncedUpdate(newConfig);
  };
  
  fontFamilySelect.addEventListener("change", updateTypography);
  
  // Typography preset buttons
  document.querySelectorAll("[data-typography-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = (button as HTMLElement).dataset.typographyPreset as keyof typeof TYPOGRAPHY_PRESETS;
      applyTypographyPreset(preset);
    });
  });
}

function applyTypographyPreset(preset: keyof typeof TYPOGRAPHY_PRESETS) {
  const presetValues = TYPOGRAPHY_PRESETS[preset];
  const fontFamilySelect = getInput<HTMLSelectElement>("input-font-family");
  const fontWeightInput = getInput<HTMLInputElement>("input-font-weight");
  const fontWeightSlider = getInput<HTMLInputElement>("input-font-weight-slider");
  
  if (fontFamilySelect) {
    fontFamilySelect.value = presetValues.inputFontFamily;
  }
  if (fontWeightInput && fontWeightSlider) {
    const fontWeightNum = parseInt(presetValues.inputFontWeight, 10) || 400;
    fontWeightInput.value = String(fontWeightNum);
    fontWeightSlider.value = String(fontWeightNum);
  }
  
  const newConfig = {
    ...currentConfig,
    theme: {
      ...currentConfig.theme,
      inputFontFamily: presetValues.inputFontFamily,
      inputFontWeight: presetValues.inputFontWeight
    }
  };
  immediateUpdate(newConfig);
}

// Copy/Text controls
function setupCopyControls() {
  const welcomeTitleInput = getInput<HTMLInputElement>("copy-welcome-title");
  const welcomeSubtitleInput = getInput<HTMLInputElement>("copy-welcome-subtitle");
  const placeholderInput = getInput<HTMLInputElement>("copy-placeholder");
  const sendButtonInput = getInput<HTMLInputElement>("copy-send-button");
  const useIconInput = getInput<HTMLInputElement>("send-button-use-icon");
  const iconTextInput = getInput<HTMLInputElement>("send-button-icon-text");
  const iconNameInput = getInput<HTMLInputElement>("send-button-icon-name");
  const sizeInput = getInput<HTMLInputElement>("send-button-size");
  const showTooltipInput = getInput<HTMLInputElement>("send-button-show-tooltip");
  const tooltipTextInput = getInput<HTMLInputElement>("send-button-tooltip-text");
  const headerIconSizeInput = getInput<HTMLInputElement>("launcher-header-icon-size");
  const headerIconNameInput = getInput<HTMLInputElement>("launcher-header-icon-name");
  const headerIconHiddenInput = getInput<HTMLInputElement>("launcher-header-icon-hidden");

  // Clear chat button inputs
  const clearChatEnabledInput = getInput<HTMLInputElement>("clear-chat-enabled");
  const clearChatIconNameInput = getInput<HTMLInputElement>("clear-chat-icon-name");
  const clearChatBorderWidthInput = getInput<HTMLInputElement>("clear-chat-border-width");
  const clearChatBorderRadiusInput = getInput<HTMLInputElement>("clear-chat-border-radius");
  const clearChatSizeInput = getInput<HTMLInputElement>("clear-chat-size");
  const clearChatShowTooltipInput = getInput<HTMLInputElement>("clear-chat-show-tooltip");
  const clearChatTooltipTextInput = getInput<HTMLInputElement>("clear-chat-tooltip-text");
  const clearChatPaddingXInput = getInput<HTMLInputElement>("clear-chat-padding-x");
  const clearChatPaddingYInput = getInput<HTMLInputElement>("clear-chat-padding-y");

  // Set initial values
  welcomeTitleInput.value = currentConfig.copy?.welcomeTitle ?? "Hello 👋";
  welcomeSubtitleInput.value = currentConfig.copy?.welcomeSubtitle ?? "Ask anything about your account or products.";
  placeholderInput.value = currentConfig.copy?.inputPlaceholder ?? "Type your message…";
  sendButtonInput.value = currentConfig.copy?.sendButtonLabel ?? "Send";
  useIconInput.checked = currentConfig.sendButton?.useIcon ?? false;
  iconTextInput.value = currentConfig.sendButton?.iconText ?? "↑";
  iconNameInput.value = currentConfig.sendButton?.iconName ?? "";
  sizeInput.value = currentConfig.sendButton?.size ?? "40px";
  showTooltipInput.checked = currentConfig.sendButton?.showTooltip ?? false;
  tooltipTextInput.value = currentConfig.sendButton?.tooltipText ?? "Send message";
  headerIconNameInput.value = currentConfig.launcher?.headerIconName ?? "";
  headerIconHiddenInput.checked = currentConfig.launcher?.headerIconHidden ?? false;

  // Clear chat button initial values
  clearChatEnabledInput.checked = currentConfig.launcher?.clearChat?.enabled ?? true;
  clearChatIconNameInput.value = currentConfig.launcher?.clearChat?.iconName ?? "refresh-cw";
  clearChatBorderWidthInput.value = currentConfig.launcher?.clearChat?.borderWidth ?? "";
  clearChatBorderRadiusInput.value = currentConfig.launcher?.clearChat?.borderRadius ?? "";
  clearChatSizeInput.value = currentConfig.launcher?.clearChat?.size ?? "32px";
  clearChatShowTooltipInput.checked = currentConfig.launcher?.clearChat?.showTooltip ?? true;
  clearChatTooltipTextInput.value = currentConfig.launcher?.clearChat?.tooltipText ?? "Clear chat";

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

  // Setup slider for header icon size
  setupSliderInput({
    sliderId: "launcher-header-icon-size-slider",
    textInputId: "launcher-header-icon-size",
    min: 16,
    max: 128,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.headerIconSize ?? "48px";
    }
  });

  // Setup clear chat button sliders
  setupSliderInput({
    sliderId: "clear-chat-border-width-slider",
    textInputId: "clear-chat-border-width",
    min: 0,
    max: 8,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.clearChat?.borderWidth ?? "";
    }
  });

  setupSliderInput({
    sliderId: "clear-chat-border-radius-slider",
    textInputId: "clear-chat-border-radius",
    min: 0,
    max: 100,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.clearChat?.borderRadius ?? "";
    }
  });

  setupSliderInput({
    sliderId: "clear-chat-size-slider",
    textInputId: "clear-chat-size",
    min: 24,
    max: 64,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.clearChat?.size ?? "29px";
    }
  });

  setupSliderInput({
    sliderId: "clear-chat-padding-x-slider",
    textInputId: "clear-chat-padding-x",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.clearChat?.paddingX ?? "0px";
    }
  });

  setupSliderInput({
    sliderId: "clear-chat-padding-y-slider",
    textInputId: "clear-chat-padding-y",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateCopy();
    },
    getInitialValue: () => {
      return currentConfig.launcher?.clearChat?.paddingY ?? "0px";
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
        // Note: Colors come from theme, not from these controls
        useIcon: useIconInput.checked,
        iconText: iconTextInput.value.trim() || undefined,
        iconName: iconNameInput.value.trim() || undefined,
        size: sizeInput.value.trim() || undefined,
        showTooltip: showTooltipInput.checked,
        tooltipText: tooltipTextInput.value.trim() || undefined
      },
      launcher: {
        ...currentConfig.launcher,
        headerIconSize: headerIconSizeInput.value,
        headerIconName: headerIconNameInput.value || undefined,
        headerIconHidden: headerIconHiddenInput.checked,
        clearChat: {
          ...currentConfig.launcher?.clearChat,
          enabled: clearChatEnabledInput.checked,
          iconName: clearChatIconNameInput.value.trim() || undefined,
          borderWidth: clearChatBorderWidthInput.value.trim() || undefined,
          borderRadius: clearChatBorderRadiusInput.value.trim() || undefined,
          size: clearChatSizeInput.value.trim() || undefined,
          paddingX: clearChatPaddingXInput.value.trim() || undefined,
          paddingY: clearChatPaddingYInput.value.trim() || undefined,
          showTooltip: clearChatShowTooltipInput.checked,
          tooltipText: clearChatTooltipTextInput.value.trim() || undefined
        }
      }
    };
    debouncedUpdate(newConfig);
  };

  [welcomeTitleInput, welcomeSubtitleInput, placeholderInput, sendButtonInput, useIconInput, iconTextInput, iconNameInput, showTooltipInput, tooltipTextInput, headerIconNameInput, headerIconHiddenInput, clearChatEnabledInput, clearChatIconNameInput, clearChatShowTooltipInput, clearChatTooltipTextInput]
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
  const voiceRecognitionInput = getInput<HTMLInputElement>("voice-recognition-enabled");
  const pauseDurationSlider = getInput<HTMLInputElement>("voice-recognition-pause-duration-slider");
  const pauseDurationInput = getInput<HTMLInputElement>("voice-recognition-pause-duration");
  const iconNameInput = getInput<HTMLInputElement>("voice-recognition-icon-name");
  const showTooltipInput = getInput<HTMLInputElement>("voice-recognition-show-tooltip");
  const tooltipTextInput = getInput<HTMLInputElement>("voice-recognition-tooltip-text");

  // Set initial values
  reasoningInput.checked = currentConfig.features?.showReasoning ?? true;
  toolCallsInput.checked = currentConfig.features?.showToolCalls ?? true;
  debugInput.checked = currentConfig.debug ?? false;
  voiceRecognitionInput.checked = currentConfig.voiceRecognition?.enabled ?? false;
  
  const initialPauseDuration = currentConfig.voiceRecognition?.pauseDuration ?? 2000;
  pauseDurationSlider.value = String(initialPauseDuration);
  pauseDurationInput.value = String(initialPauseDuration);
  
  iconNameInput.value = currentConfig.voiceRecognition?.iconName ?? "";
  showTooltipInput.checked = currentConfig.voiceRecognition?.showTooltip ?? false;
  tooltipTextInput.value = currentConfig.voiceRecognition?.tooltipText ?? "Start voice recognition";

  // Setup icon size slider
  setupSliderInput({
    sliderId: "voice-recognition-icon-size-slider",
    textInputId: "voice-recognition-icon-size",
    min: 24,
    max: 64,
    step: 1,
    onUpdate: (value: string) => {
      updateVoiceRecognition();
    },
    getInitialValue: () => {
      return currentConfig.voiceRecognition?.iconSize ?? "";
    }
  });

  // Setup border width slider
  setupSliderInput({
    sliderId: "voice-recognition-border-width-slider",
    textInputId: "voice-recognition-border-width",
    min: 0,
    max: 10,
    step: 1,
    onUpdate: (value: string) => {
      updateVoiceRecognition();
    },
    getInitialValue: () => {
      return currentConfig.voiceRecognition?.borderWidth ?? "0px";
    }
  });

  // Setup padding X slider
  setupSliderInput({
    sliderId: "voice-recognition-padding-x-slider",
    textInputId: "voice-recognition-padding-x",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateVoiceRecognition();
    },
    getInitialValue: () => {
      return currentConfig.voiceRecognition?.paddingX ?? "10px";
    }
  });

  // Setup padding Y slider
  setupSliderInput({
    sliderId: "voice-recognition-padding-y-slider",
    textInputId: "voice-recognition-padding-y",
    min: 0,
    max: 32,
    step: 1,
    onUpdate: (value: string) => {
      updateVoiceRecognition();
    },
    getInitialValue: () => {
      return currentConfig.voiceRecognition?.paddingY ?? "10px";
    }
  });

  const updateVoiceRecognition = () => {
    const iconSizeInput = getInput<HTMLInputElement>("voice-recognition-icon-size");
    const borderWidthInput = getInput<HTMLInputElement>("voice-recognition-border-width");
    const paddingXInput = getInput<HTMLInputElement>("voice-recognition-padding-x");
    const paddingYInput = getInput<HTMLInputElement>("voice-recognition-padding-y");
    
    const newConfig = {
      ...currentConfig,
      voiceRecognition: {
        ...currentConfig.voiceRecognition,
        enabled: voiceRecognitionInput.checked,
        pauseDuration: parseInt(pauseDurationInput.value, 10) || 2000,
        iconName: iconNameInput.value.trim() || undefined,
        iconSize: iconSizeInput.value.trim() || undefined,
        borderWidth: borderWidthInput.value.trim() || undefined,
        paddingX: paddingXInput.value.trim() || undefined,
        paddingY: paddingYInput.value.trim() || undefined,
        showTooltip: showTooltipInput.checked,
        tooltipText: tooltipTextInput.value.trim() || undefined,
        // Colors are now managed by theme
        iconColor: currentConfig.theme?.micIconColor,
        backgroundColor: currentConfig.theme?.micBackgroundColor,
        borderColor: currentConfig.theme?.micBorderColor,
        recordingIconColor: currentConfig.theme?.recordingIconColor,
        recordingBackgroundColor: currentConfig.theme?.recordingBackgroundColor,
        recordingBorderColor: currentConfig.theme?.recordingBorderColor
      }
    };
    debouncedUpdate(newConfig);
  };

  const updateFeatures = () => {
    const iconSizeInput = getInput<HTMLInputElement>("voice-recognition-icon-size");
    const borderWidthInput = getInput<HTMLInputElement>("voice-recognition-border-width");
    const paddingXInput = getInput<HTMLInputElement>("voice-recognition-padding-x");
    const paddingYInput = getInput<HTMLInputElement>("voice-recognition-padding-y");
    
    const newConfig = {
      ...currentConfig,
      features: {
        showReasoning: reasoningInput.checked,
        showToolCalls: toolCallsInput.checked
      },
      debug: debugInput.checked,
      voiceRecognition: {
        ...currentConfig.voiceRecognition,
        enabled: voiceRecognitionInput.checked,
        pauseDuration: parseInt(pauseDurationInput.value, 10) || 2000,
        iconName: iconNameInput.value.trim() || undefined,
        iconSize: iconSizeInput.value.trim() || undefined,
        borderWidth: borderWidthInput.value.trim() || undefined,
        paddingX: paddingXInput.value.trim() || undefined,
        paddingY: paddingYInput.value.trim() || undefined,
        showTooltip: showTooltipInput.checked,
        tooltipText: tooltipTextInput.value.trim() || undefined,
        // Colors are now managed by theme
        iconColor: currentConfig.theme?.micIconColor,
        backgroundColor: currentConfig.theme?.micBackgroundColor,
        borderColor: currentConfig.theme?.micBorderColor,
        recordingIconColor: currentConfig.theme?.recordingIconColor,
        recordingBackgroundColor: currentConfig.theme?.recordingBackgroundColor,
        recordingBorderColor: currentConfig.theme?.recordingBorderColor
      }
    };
    debouncedUpdate(newConfig);
  };

  // Sync pause duration slider and input
  pauseDurationSlider.addEventListener("input", () => {
    pauseDurationInput.value = pauseDurationSlider.value;
    updateFeatures();
  });

  pauseDurationInput.addEventListener("input", () => {
    const value = parseInt(pauseDurationInput.value, 10);
    if (!isNaN(value) && value >= 500 && value <= 5000) {
      pauseDurationSlider.value = String(value);
      updateFeatures();
    }
  });

  // Update on icon name change
  iconNameInput.addEventListener("input", updateFeatures);
  
  // Update on tooltip changes
  showTooltipInput.addEventListener("change", updateFeatures);
  tooltipTextInput.addEventListener("input", updateFeatures);

  [reasoningInput, toolCallsInput, debugInput, voiceRecognitionInput].forEach((input) =>
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
  const dropdownMenu = getInput<HTMLDivElement>("code-dropdown-menu");
  const dropdownItems = document.querySelectorAll<HTMLButtonElement>(".dropdown-item");
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

  const dropdownContainer = copyCodeButton.closest(".code-dropdown-container") as HTMLElement;

  // Toggle dropdown menu
  copyCodeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.contains("show");
    if (isOpen) {
      dropdownMenu.classList.remove("show");
      dropdownContainer?.classList.remove("open");
    } else {
      dropdownMenu.classList.add("show");
      dropdownContainer?.classList.add("open");
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!copyCodeButton.contains(e.target as Node) && !dropdownMenu.contains(e.target as Node)) {
      dropdownMenu.classList.remove("show");
      dropdownContainer?.classList.remove("open");
    }
  });

  // Handle dropdown item clicks
  dropdownItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const format = item.getAttribute("data-format");
      if (format) {
        const code = generateCodeSnippet(format as "esm" | "script-installer" | "script-manual");
        navigator.clipboard.writeText(code).then(() => {
          const formatNames = {
            esm: "ESM/Module",
            "script-installer": "Script Tag (Auto Installer)",
            "script-manual": "Script Tag (Manual)"
          };
          showFeedback(`✓ ${formatNames[format]} code copied to clipboard!`);
          dropdownMenu.classList.remove("show");
          dropdownContainer?.classList.remove("open");
        });
      }
    });
  });
}

function generateCodeSnippet(format: "esm" | "script-installer" | "script-manual" = "esm"): string {
  const config = { ...currentConfig };
  delete config.postprocessMessage;
  delete config.initialMessages;

  if (format === "esm") {
    return generateESMCode(config);
  } else if (format === "script-installer") {
    return generateScriptInstallerCode(config);
  } else {
    return generateScriptManualCode(config);
  }
}

function generateESMCode(config: any): string {
  const lines: string[] = [
    "import 'vanilla-agent/widget.css';",
    "import { initChatWidget, markdownPostprocessor } from 'vanilla-agent';",
    "",
    "initChatWidget({",
    "  target: 'body',",
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

function generateScriptInstallerCode(config: any): string {
  const lines: string[] = [
    "<script>",
    "  window.siteAgentConfig = {",
    "    target: '#chat-widget-root',",
    "    config: {"
  ];

  if (config.apiUrl) lines.push(`      apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`      flowId: "${config.flowId}",`);

  if (config.theme) {
    lines.push("      theme: {");
    Object.entries(config.theme).forEach(([key, value]) => {
      lines.push(`        ${key}: "${value}",`);
    });
    lines.push("      },");
  }

  if (config.launcher) {
    lines.push("      launcher: {");
    Object.entries(config.launcher).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.copy) {
    lines.push("      copy: {");
    Object.entries(config.copy).forEach(([key, value]) => {
      lines.push(`        ${key}: "${value}",`);
    });
    lines.push("      },");
  }

  if (config.features) {
    lines.push("      features: {");
    Object.entries(config.features).forEach(([key, value]) => {
      lines.push(`        ${key}: ${value},`);
    });
    lines.push("      },");
  }

  if (config.suggestionChips && config.suggestionChips.length > 0) {
    lines.push("      suggestionChips: [");
    config.suggestionChips.forEach((chip) => {
      lines.push(`        "${chip}",`);
    });
    lines.push("      ],");
  }

  if (config.debug) {
    lines.push(`      debug: ${config.debug},`);
  }

  lines.push("    }");
  lines.push("  };");
  lines.push("</script>");
  lines.push("<script src=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/install.global.js\"></script>");

  return lines.join("\n");
}

function generateScriptManualCode(config: any): string {
  const lines: string[] = [
    "<!-- Load CSS -->",
    "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/widget.css\" />",
    "",
    "<!-- Load JavaScript -->",
    "<script src=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/index.global.js\"></script>",
    "",
    "<!-- Initialize widget -->",
    "<script>",
    "  window.ChatWidget.initChatWidget({",
    "    target: '#chat-widget-root',",
    "    config: {"
  ];

  if (config.apiUrl) lines.push(`      apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`      flowId: "${config.flowId}",`);

  if (config.theme) {
    lines.push("      theme: {");
    Object.entries(config.theme).forEach(([key, value]) => {
      lines.push(`        ${key}: "${value}",`);
    });
    lines.push("      },");
  }

  if (config.launcher) {
    lines.push("      launcher: {");
    Object.entries(config.launcher).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.copy) {
    lines.push("      copy: {");
    Object.entries(config.copy).forEach(([key, value]) => {
      lines.push(`        ${key}: "${value}",`);
    });
    lines.push("      },");
  }

  if (config.features) {
    lines.push("      features: {");
    Object.entries(config.features).forEach(([key, value]) => {
      lines.push(`        ${key}: ${value},`);
    });
    lines.push("      },");
  }

  if (config.suggestionChips && config.suggestionChips.length > 0) {
    lines.push("      suggestionChips: [");
    config.suggestionChips.forEach((chip) => {
      lines.push(`        "${chip}",`);
    });
    lines.push("      ],");
  }

  if (config.debug) {
    lines.push(`      debug: ${config.debug},`);
  }

  lines.push("    }");
  lines.push("  });");
  lines.push("</script>");

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
      
      // Clear accordion state so all accordions are collapsed on reload
      clearAccordionState();

      // Reset all form inputs
      location.reload();
    }
  });
}

// Initialize all controls
function init() {
  setupAccordions();
  setupThemeControls();
  setupTypographyControls();
  setupLauncherControls();
  setupCopyControls();
  setupCloseButtonControls();
  setupStatusIndicatorControls();
  setupFeatureControls();
  setupSuggestionChipsControls();
  setupOtherOptionsControls();
  setupExportControls();
  setupResetControls();
}

// Accordion state management
const ACCORDION_STATE_KEY = "vanilla-agent-accordion-state";

function getAccordionState(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(ACCORDION_STATE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveAccordionState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(ACCORDION_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

function clearAccordionState() {
  try {
    localStorage.removeItem(ACCORDION_STATE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

// Initialize accordions
function setupAccordions() {
  const accordions = document.querySelectorAll(".accordion");
  const savedState = getAccordionState();
  let accordionState: Record<string, boolean> = { ...savedState };
  
  accordions.forEach((accordion, index) => {
    const header = accordion.querySelector(".accordion-header");
    const toggle = accordion.querySelector(".accordion-toggle");
    const title = accordion.querySelector("h2");
    
    if (!header || !toggle) return;
    
    // Create unique identifier for this accordion
    const accordionId = title?.textContent?.toLowerCase().replace(/\s+/g, "-") || `accordion-${index}`;
    
    // Get saved state or default to collapsed (true = collapsed)
    const isCollapsed = accordionState[accordionId] !== undefined ? accordionState[accordionId] : true;
    
    // Set initial state
    if (isCollapsed) {
      accordion.classList.add("collapsed");
    }
    
    // Ensure state is tracked
    accordionState[accordionId] = isCollapsed;
    
    // Click handler for header or toggle button
    const handleToggle = (e: Event) => {
      // Don't toggle if clicking on preset buttons
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON" && target.closest(".accordion-presets")) {
        return;
      }
      
      accordion.classList.toggle("collapsed");
      const isNowCollapsed = accordion.classList.contains("collapsed");
      accordionState[accordionId] = isNowCollapsed;
      saveAccordionState(accordionState);
    };
    
    header.addEventListener("click", handleToggle);
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      accordion.classList.toggle("collapsed");
      const isNowCollapsed = accordion.classList.contains("collapsed");
      accordionState[accordionId] = isNowCollapsed;
      saveAccordionState(accordionState);
    });
  });
  
  // Save initial state
  saveAccordionState(accordionState);
}

// Start the configurator
init();
