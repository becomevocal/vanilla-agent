import "vanilla-agent/widget.css";
import "./index.css";
import "./App.css";

import {
  initChatWidget,
  createChatExperience,
  markdownPostprocessor
} from "vanilla-agent";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ??
  `http://localhost:${proxyPort}/api/chat/dispatch`;

const inlineMount = document.getElementById("inline-widget");
if (!inlineMount) {
  throw new Error("Inline widget mount node missing");
}

createChatExperience(inlineMount, {
  apiUrl: proxyUrl,
  launcher: {
    enabled: false
  },
  theme: {
    primary: "#0f172a",
    accent: "#ea580c",
    surface: "#f8fafc",
    muted: "#64748b"
  },
  copy: {
    welcomeTitle: "Inline Demo",
    welcomeSubtitle:
      "This instance is rendered via createChatExperience with a neutral theme.",
    inputPlaceholder: "Ask about embedding, styling, or integrations…",
    sendButtonLabel: "Send"
  },
  suggestionChips: [
    "Do you support streaming?",
    "How do I theme the widget?",
    "Show me the proxy setup"
  ],
  postprocessMessage: ({ text }) => markdownPostprocessor(text)
});

const launcherController = initChatWidget({
  target: "#launcher-root",
  config: {
    apiUrl: proxyUrl,
    launcher: {
      enabled: true,
      autoExpand: false,
      width: 'min(920px, 95vw)',
      title: "AI Assistant",
      subtitle: "Here to help you get answers fast",
      iconUrl: "https://dummyimage.com/96x96/111827/ffffff&text=AI"
    },
    theme: {
      primary: "#101828",
      accent: "#1d4ed8",
      surface: "#ffffff",
      muted: "#475467"
    },
    copy: {
      welcomeTitle: "Chat with the team",
      welcomeSubtitle:
        "This workspace demo shows how you can configure features and launcher styling.",
      inputPlaceholder: "Type your message…",
      sendButtonLabel: "Send"
    },
    suggestionChips: [
      "How do I embed the widget?",
      "Show me the API docs",
      "Schedule a demo"
    ],
    postprocessMessage: ({ text }) => markdownPostprocessor(text)
  }
});

const openButton = document.getElementById('open-chat')
const toggleButton = document.getElementById('toggle-chat')
if (openButton) {
  openButton.addEventListener('click', () => launcherController.open())
}
if (toggleButton) {
  toggleButton.addEventListener('click', () => launcherController.toggle())
}
