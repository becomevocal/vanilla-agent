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
    muted: "#6b7280"
  },
  dark: {
    primary: "#f9fafb",
    accent: "#60a5fa",
    surface: "#1f2937",
    muted: "#9ca3af"
  },
  contrast: {
    primary: "#000000",
    accent: "#0066cc",
    surface: "#ffffff",
    muted: "#666666"
  }
};

// Radius presets
const RADIUS_PRESETS = {
  sharp: {
    radiusSm: "0.25rem",
    radiusMd: "0.375rem",
    radiusLg: "0.5rem",
    radiusFull: "9999px"
  },
  default: {
    radiusSm: "0.75rem",
    radiusMd: "1rem",
    radiusLg: "1.5rem",
    radiusFull: "9999px"
  },
  rounded: {
    radiusSm: "1rem",
    radiusMd: "1.25rem",
    radiusLg: "2rem",
    radiusFull: "9999px"
  },
  extraRounded: {
    radiusSm: "1.5rem",
    radiusMd: "2rem",
    radiusLg: "2.5rem",
    radiusFull: "9999px"
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
    autoExpand: false
  },
  copy: {
    welcomeTitle: "Hello 👋",
    welcomeSubtitle: "Ask anything about your account or products.",
    inputPlaceholder: "Type your message…",
    sendButtonLabel: "Send"
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

// Theme controls
function setupThemeControls() {
  const themeKeys = ["primary", "accent", "surface", "muted"] as const;

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
  const radiusKeys = ["radiusSm", "radiusMd", "radiusLg", "radiusFull"] as const;

  radiusKeys.forEach((key) => {
    const input = getInput<HTMLInputElement>(`${key}`);

    input.addEventListener("input", () => {
      updateTheme(key, input.value);
    });

    // Set initial values
    const initialValue = currentConfig.theme?.[key] || RADIUS_PRESETS.default[key];
    input.value = initialValue;
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
  debouncedUpdate(newConfig);
}

function applyPreset(preset: keyof typeof THEME_PRESETS) {
  const themeValues = THEME_PRESETS[preset];
  Object.entries(themeValues).forEach(([key, value]) => {
    const colorInput = getInput<HTMLInputElement>(`color-${key}`);
    const textInput = getInput<HTMLInputElement>(`color-${key}-text`);
    colorInput.value = value;
    textInput.value = value;
  });

  const newConfig = {
    ...currentConfig,
    theme: { ...themeValues, ...currentConfig.theme }
  };
  debouncedUpdate(newConfig);
}

function applyRadiusPreset(preset: keyof typeof RADIUS_PRESETS) {
  const radiusValues = RADIUS_PRESETS[preset];
  Object.entries(radiusValues).forEach(([key, value]) => {
    const input = getInput<HTMLInputElement>(key);
    input.value = value;
  });

  const newConfig = {
    ...currentConfig,
    theme: { ...currentConfig.theme, ...radiusValues }
  };
  debouncedUpdate(newConfig);
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

  // Set initial values
  enabledInput.checked = currentConfig.launcher?.enabled ?? true;
  titleInput.value = currentConfig.launcher?.title ?? "Chat Assistant";
  subtitleInput.value = currentConfig.launcher?.subtitle ?? "Here to help you get answers fast";
  iconTextInput.value = currentConfig.launcher?.iconText ?? "💬";
  positionInput.value = currentConfig.launcher?.position ?? "bottom-right";
  widthInput.value = currentConfig.launcher?.width ?? "min(360px, calc(100vw - 24px))";
  autoExpandInput.checked = currentConfig.launcher?.autoExpand ?? false;

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
        autoExpand: autoExpandInput.checked
      }
    };
    debouncedUpdate(newConfig);
  };

  [enabledInput, titleInput, subtitleInput, iconTextInput, positionInput, widthInput, autoExpandInput]
    .forEach((input) => {
      input.addEventListener("input", updateLauncher);
      input.addEventListener("change", updateLauncher);
    });
}

// Copy/Text controls
function setupCopyControls() {
  const welcomeTitleInput = getInput<HTMLInputElement>("copy-welcome-title");
  const welcomeSubtitleInput = getInput<HTMLInputElement>("copy-welcome-subtitle");
  const placeholderInput = getInput<HTMLInputElement>("copy-placeholder");
  const sendButtonInput = getInput<HTMLInputElement>("copy-send-button");

  // Set initial values
  welcomeTitleInput.value = currentConfig.copy?.welcomeTitle ?? "Hello 👋";
  welcomeSubtitleInput.value = currentConfig.copy?.welcomeSubtitle ?? "Ask anything about your account or products.";
  placeholderInput.value = currentConfig.copy?.inputPlaceholder ?? "Type your message…";
  sendButtonInput.value = currentConfig.copy?.sendButtonLabel ?? "Send";

  const updateCopy = () => {
    const newConfig = {
      ...currentConfig,
      copy: {
        welcomeTitle: welcomeTitleInput.value,
        welcomeSubtitle: welcomeSubtitleInput.value,
        inputPlaceholder: placeholderInput.value,
        sendButtonLabel: sendButtonInput.value
      }
    };
    debouncedUpdate(newConfig);
  };

  [welcomeTitleInput, welcomeSubtitleInput, placeholderInput, sendButtonInput]
    .forEach((input) => input.addEventListener("input", updateCopy));
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

  const renderChips = () => {
    const chips = currentConfig.suggestionChips || [];
    chipsList.innerHTML = "";

    chips.forEach((chip, index) => {
      const chipItem = document.createElement("div");
      chipItem.className = "chip-item";

      const chipInput = document.createElement("input");
      chipInput.type = "text";
      chipInput.value = chip;
      chipInput.addEventListener("input", () => {
        const newChips = [...chips];
        newChips[index] = chipInput.value;
        updateSuggestionChips(newChips);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "×";
      deleteButton.className = "delete-chip";
      deleteButton.addEventListener("click", () => {
        const newChips = chips.filter((_, i) => i !== index);
        updateSuggestionChips(newChips);
        renderChips();
      });

      chipItem.appendChild(chipInput);
      chipItem.appendChild(deleteButton);
      chipsList.appendChild(chipItem);
    });
  };

  const updateSuggestionChips = (chips: string[]) => {
    const newConfig = {
      ...currentConfig,
      suggestionChips: chips
    };
    debouncedUpdate(newConfig);
  };

  addButton.addEventListener("click", () => {
    const chips = currentConfig.suggestionChips || [];
    updateSuggestionChips([...chips, "New suggestion"]);
    renderChips();
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
  setupFeatureControls();
  setupSuggestionChipsControls();
  setupOtherOptionsControls();
  setupExportControls();
  setupResetControls();
}

// Start the configurator
init();
