/**
 * Navigation Persistence Demo
 * 
 * This demo shows the built-in `persistState` feature that automatically
 * persists the widget's open state and voice mode across page navigations.
 * 
 * Just set `persistState: true` in your config - that's it!
 */

import "vanilla-agent/widget.css";
import {
  initAgentWidget,
  markdownPostprocessor,
  DEFAULT_WIDGET_CONFIG
} from "vanilla-agent";

// Proxy configuration
const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL
    ? `${import.meta.env.VITE_PROXY_URL}/api/chat/dispatch`
    : `http://localhost:${proxyPort}/api/chat/dispatch`;

// Storage keys used by persistState (for status panel display)
const WIDGET_OPEN_KEY = "vanilla-agent-widget-open";
const WIDGET_VOICE_KEY = "vanilla-agent-widget-voice";

// Status panel update function
function updateStatusPanel(widgetHandle: NonNullable<ReturnType<typeof initAgentWidget>>) {
  const openEl = document.getElementById("status-open");
  const voiceEl = document.getElementById("status-voice");
  const keysEl = document.getElementById("status-keys");

  if (openEl) {
    const isOpen = widgetHandle.isOpen();
    openEl.textContent = isOpen ? "Yes" : "No";
    openEl.className = `status-value ${isOpen ? "active" : "inactive"}`;
  }

  if (voiceEl) {
    const isVoice = widgetHandle.isVoiceActive();
    voiceEl.textContent = isVoice ? "Yes" : "No";
    voiceEl.className = `status-value ${isVoice ? "active" : "inactive"}`;
  }

  if (keysEl) {
    const keys = [];
    if (localStorage.getItem(WIDGET_OPEN_KEY) === "true") keys.push("open=true");
    if (localStorage.getItem(WIDGET_OPEN_KEY) === "false") keys.push("open=false");
    if (localStorage.getItem(WIDGET_VOICE_KEY) === "true") keys.push("voice=true");
    if (localStorage.getItem(WIDGET_VOICE_KEY) === "false") keys.push("voice=false");
    keysEl.textContent = keys.length > 0 ? keys.join(", ") : "none";
  }
}

// Initialize widget
const mount = document.getElementById("launcher-root");
if (!mount) throw new Error("Mount not found");

const widgetHandle = initAgentWidget({
  target: mount,
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: proxyUrl,
    
    // ✨ THAT'S IT! Just enable persistState and the widget automatically:
    // - Re-opens if it was open before navigation
    // - Resumes voice recognition if it was active
    // - Focuses the text input if voice wasn't active
    // - Clears state when chat is cleared
    persistState: true,
    
    launcher: {
      ...DEFAULT_WIDGET_CONFIG.launcher,
      enabled: true,
      title: "Navigation Demo",
      subtitle: "I persist across pages!",
      position: "bottom-right",
      width: "380px"
    },
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      primary: "#1e1b4b",
      accent: "#8b5cf6",
      surface: "#ffffff"
    },
    copy: {
      ...DEFAULT_WIDGET_CONFIG.copy,
      welcomeTitle: "Persistent Chat",
      welcomeSubtitle: "Navigate between pages - I'll stay open!",
      inputPlaceholder: "Try voice input, then navigate..."
    },
    voiceRecognition: {
      enabled: true
    },
    suggestionChips: [
      "Hello!",
      "Tell me about navigation",
      "What products do you have?"
    ],
    postprocessMessage: ({ text }) => markdownPostprocessor(text)
  }
});

// ============================================================================
// STATUS PANEL UPDATES (just for demo visualization)
// ============================================================================

if (widgetHandle) {
  // Initial status update
  setTimeout(() => updateStatusPanel(widgetHandle), 200);

  // Update status on widget events
  widgetHandle.on("widget:opened", () => updateStatusPanel(widgetHandle));
  widgetHandle.on("widget:closed", () => updateStatusPanel(widgetHandle));
  widgetHandle.on("voice:state", () => updateStatusPanel(widgetHandle));

  // Show success banner on page 2 if widget was restored
  setTimeout(() => {
    if (widgetHandle.isOpen()) {
      const successBanner = document.getElementById("success-banner");
      if (successBanner) {
        successBanner.style.display = "flex";
      }
    }
  }, 200);

  // Make handle available for debugging
  (window as unknown as { navDemoWidget: typeof widgetHandle }).navDemoWidget = widgetHandle;

  console.log("[Navigation Persist Demo] Initialized with built-in persistState: true");
}
