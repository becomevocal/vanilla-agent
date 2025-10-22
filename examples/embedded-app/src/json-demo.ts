import "@chaty-widget/vanilla/widget.css";
import "./index.css";
import "./App.css";

import {
  createChatExperience,
  initTravrseChat,
  directivePostprocessor,
  markdownPostprocessor
} from "@chaty-widget/vanilla";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL ??
  `http://localhost:${proxyPort}/api/chat/dispatch`;

const formDirectivePrompt =
  "When the user provides scheduling details, respond with the directive <Form type=\"init\"/> so the widget can render an interactive form.";

const inlineMount = document.getElementById("json-inline");
if (!inlineMount) {
  throw new Error("JSON demo mount node missing");
}

createChatExperience(inlineMount, {
  apiUrl: proxyUrl,
  launcher: { enabled: false },
  formEndpoint: "/form",
  theme: {
    primary: "#111827",
    accent: "#0ea5e9",
    surface: "#ffffff",
    muted: "#64748b"
  },
  copy: {
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
  },
  metadata: {
    directive_hint: formDirectivePrompt
  }
});

initTravrseChat({
  target: "#json-launcher",
  config: {
    apiUrl: proxyUrl,
    formEndpoint: "/form",
    launcher: {
      enabled: true,
      title: "Directive Demo",
      subtitle: "Opens the interactive form example",
      autoExpand: false,
      width: 'min(420px, 95vw)'
    },
    theme: {
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
    },
    metadata: {
      directive_hint: formDirectivePrompt
    }
  }
});
