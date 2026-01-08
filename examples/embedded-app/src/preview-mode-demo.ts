/**
 * Preview Mode Demo
 * 
 * This demo shows how to use the `previewQueryParam` option to conditionally
 * load the widget based on a URL parameter. This is useful for:
 * - Testing in production without affecting all users
 * - Letting merchants preview the widget before enabling
 * - Staged rollouts with preview links
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

// The query parameter name for preview mode
const PREVIEW_PARAM = "preview";

// Check if preview mode is active
const urlParams = new URLSearchParams(window.location.search);
const previewValue = urlParams.get(PREVIEW_PARAM);
const isPreviewActive = previewValue === "true" || previewValue === "1" || previewValue === "yes";

// Update the UI based on preview mode status
function updateUI() {
  const banner = document.getElementById("status-banner");
  const icon = document.getElementById("status-icon");
  const title = document.getElementById("status-title");
  const description = document.getElementById("status-description");
  const urlDisplay = document.getElementById("current-url");
  const enableBtn = document.getElementById("enable-btn");
  const disableBtn = document.getElementById("disable-btn");

  if (banner && icon && title && description) {
    if (isPreviewActive) {
      banner.className = "status-banner active";
      icon.textContent = "✅";
      title.textContent = "Preview Mode Active";
      description.textContent = "The chat widget is visible. Look for it in the bottom-right corner!";
    } else {
      banner.className = "status-banner inactive";
      icon.textContent = "🔒";
      title.textContent = "Preview Mode Disabled";
      description.textContent = "The chat widget is hidden. Click 'Enable Preview Mode' to see it.";
    }
  }

  // Update URL display with highlighting
  if (urlDisplay) {
    const baseUrl = window.location.origin + window.location.pathname;
    if (isPreviewActive) {
      urlDisplay.innerHTML = `${baseUrl}<span class="param">?${PREVIEW_PARAM}=true</span>`;
    } else {
      urlDisplay.textContent = baseUrl;
    }
  }

  // Update button visibility
  if (enableBtn && disableBtn) {
    if (isPreviewActive) {
      (enableBtn as HTMLElement).style.display = "none";
      (disableBtn as HTMLElement).style.display = "inline-flex";
    } else {
      (enableBtn as HTMLElement).style.display = "inline-flex";
      (disableBtn as HTMLElement).style.display = "none";
    }
  }
}

// Initialize UI
updateUI();

// Initialize widget with preview mode
// The widget will only load if ?preview=true is in the URL
const mount = document.getElementById("launcher-root");
if (!mount) throw new Error("Mount not found");

const widgetHandle = initAgentWidget({
  target: mount,
  previewQueryParam: PREVIEW_PARAM, // ← This enables preview mode!
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: proxyUrl,
    launcher: {
      ...DEFAULT_WIDGET_CONFIG.launcher,
      enabled: true,
      title: "Preview Mode",
      subtitle: "Only visible with ?preview=true",
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
      welcomeTitle: "Preview Mode Active! 🎉",
      welcomeSubtitle: "This widget is only visible because you have ?preview=true in the URL.",
      inputPlaceholder: "Try sending a message..."
    },
    suggestionChips: [
      "Hello!",
      "How does preview mode work?",
      "What's the weather?"
    ],
    postprocessMessage: ({ text }) => markdownPostprocessor(text)
  }
});

// Log whether widget was initialized
if (widgetHandle) {
  console.log("[Preview Mode Demo] Widget initialized successfully!");
  console.log("  - Preview param:", PREVIEW_PARAM);
  console.log("  - Widget handle:", widgetHandle);
  
  // Make available for debugging
  (window as unknown as { previewWidget: typeof widgetHandle }).previewWidget = widgetHandle;
} else {
  console.log("[Preview Mode Demo] Widget not initialized (preview mode disabled)");
  console.log(`  - Add ?${PREVIEW_PARAM}=true to the URL to enable`);
}
