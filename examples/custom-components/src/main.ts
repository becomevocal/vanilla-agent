import "vanilla-agent/widget.css";
import "./index.css";

import {
  initAgentWidget,
  componentRegistry,
  DEFAULT_WIDGET_CONFIG
} from "vanilla-agent";

import {
  ProductCard,
  SimpleChart,
  StatusBadge,
  InfoCard
} from "./components";

const proxyPort = import.meta.env.VITE_PROXY_PORT ?? 43111;
const proxyUrl =
  import.meta.env.VITE_PROXY_URL
    ? `${import.meta.env.VITE_PROXY_URL}/api/chat/dispatch-directive`
    : `http://localhost:${proxyPort}/api/chat/dispatch-directive`;

// Register custom components
componentRegistry.register("ProductCard", ProductCard);
componentRegistry.register("SimpleChart", SimpleChart);
componentRegistry.register("StatusBadge", StatusBadge);
componentRegistry.register("InfoCard", InfoCard);

// Alternative: Register via config
// const components = {
//   ProductCard,
//   SimpleChart,
//   StatusBadge,
//   InfoCard
// };

const widgetContainer = document.getElementById("widget-container");
if (!widgetContainer) {
  throw new Error("Widget container not found");
}

initAgentWidget({
  target: widgetContainer,
  useShadowDom: false,
  config: {
    ...DEFAULT_WIDGET_CONFIG,
    apiUrl: proxyUrl,
    parserType: "json", // Use JSON parser to handle component directives
    enableComponentStreaming: true, // Enable component streaming (default: true)
    launcher: {
      ...DEFAULT_WIDGET_CONFIG.launcher,
      enabled: false // Disable launcher for inline display
    },
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      primary: "#333",
      accent: "#2196f3",
      surface: "#ffffff",
      muted: "#666"
    },
    copy: {
      ...DEFAULT_WIDGET_CONFIG.copy,
      welcomeTitle: "Custom Components Demo",
      welcomeSubtitle: "Ask me to show you a product card, chart, or status badge!"
    },
    suggestionChips: [
      "Show me a product card",
      "Display a chart with data",
      "Create a status badge",
      "Show an info card"
    ]
    // Alternative: Register components via config instead of registry
    // components: {
    //   ProductCard,
    //   SimpleChart,
    //   StatusBadge,
    //   InfoCard
    // }
  }
});
