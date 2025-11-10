import "vanilla-agent/widget.css";
import "./index.css";
import "./App.css";

import {
  createAgentExperience,
  initAgentWidget,
  directivePostprocessor,
  markdownPostprocessor,
  DEFAULT_WIDGET_CONFIG
} from "vanilla-agent";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ??
  `http://localhost:${proxyPort}/api/chat/dispatch-directive`;

const inlineMount = document.getElementById("json-inline");
if (!inlineMount) {
  throw new Error("JSON demo mount node missing");
}

createAgentExperience(inlineMount, {
  ...DEFAULT_WIDGET_CONFIG,
  apiUrl: proxyUrl,
  launcher: { enabled: false },
  formEndpoint: "/form",
  theme: {
    ...DEFAULT_WIDGET_CONFIG.theme,
    primary: "#111827",
    accent: "#0ea5e9",
    surface: "#ffffff",
    muted: "#64748b"
  },
  features: {
    ...DEFAULT_WIDGET_CONFIG.features,
    showReasoning: true,
    showToolCalls: true
  },
  copy: {
    ...DEFAULT_WIDGET_CONFIG.copy,
    welcomeTitle: "Directive-aware demo",
    welcomeSubtitle:
      "Ask about scheduling or try the suggested prompts to see the form directive in action."
  },
  suggestionChips: [
    "Can you schedule a demo for me?",
    "What does the form directive do?",
    "Show me a form for extra context"
  ],
  postprocessMessage: ({ text, streaming }) => {
    // Render markdown first, then apply directive replacement once the full token arrives.
    if (streaming) {
      return markdownPostprocessor(text);
    }
    return directivePostprocessor(text);
  }
});

initAgentWidget({
  target: "#json-launcher",
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: proxyUrl,
    formEndpoint: "/form",
    launcher: {
      ...DEFAULT_WIDGET_CONFIG.launcher,
      enabled: true,
      title: "Directive Demo",
      subtitle: "Opens the interactive form example",
      iconText: "🧈",
      autoExpand: false,
      width: 'min(420px, 95vw)'
    },
    features: {
      ...DEFAULT_WIDGET_CONFIG.features,
      showReasoning: true,
      showToolCalls: true
    },
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      primary: "#020617",
      accent: "#6366f1",
      surface: "#ffffff",
      muted: "#64748b"
    },
    suggestionChips: [
      "Collect my details with a form",
      "I have extra requirements",
      "What's next after the form?"
    ],
    postprocessMessage: ({ text, streaming }) => {
      if (streaming) {
        return markdownPostprocessor(text);
      }
      return directivePostprocessor(text);
    }
  }
});
