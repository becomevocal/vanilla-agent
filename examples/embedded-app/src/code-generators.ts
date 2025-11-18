import type { AgentWidgetConfig } from "vanilla-agent";

type ParserType = "plain" | "json" | "regex-json" | "xml";
export type CodeFormat = "esm" | "script-installer" | "script-manual" | "script-advanced" | "react-component";

function detectParserTypeFromStreamParser(streamParser: any): ParserType | null {
  if (!streamParser) return null;
  const fnString = streamParser.toString();
  if (fnString.includes("createJsonStreamParser") || fnString.includes("partial-json")) {
    return "json";
  }
  if (fnString.includes("createRegexJsonParser") || fnString.includes("regex")) {
    return "regex-json";
  }
  if (fnString.includes("createXmlParser") || fnString.includes("<text>")) {
    return "xml";
  }
  return null;
}

function getParserTypeFromConfig(config: AgentWidgetConfig): ParserType {
  return config.parserType ?? detectParserTypeFromStreamParser(config.streamParser) ?? "plain";
}

export function generateCodeSnippet(config: any, format: CodeFormat = "esm"): string {
  // Remove non-serializable properties
  const cleanConfig = { ...config };
  delete cleanConfig.postprocessMessage;
  delete cleanConfig.initialMessages;

  if (format === "esm") {
    return generateESMCode(cleanConfig);
  } else if (format === "script-installer") {
    return generateScriptInstallerCode(cleanConfig);
  } else if (format === "script-advanced") {
    return generateScriptAdvancedCode(cleanConfig);
  } else if (format === "react-component") {
    return generateReactComponentCode(cleanConfig);
  } else {
    return generateScriptManualCode(cleanConfig);
  }
}

function generateESMCode(config: any): string {
  const parserType = getParserTypeFromConfig(config as AgentWidgetConfig);
  const shouldEmitParserType = parserType !== "plain";
  
  const lines: string[] = [
    "import 'vanilla-agent/widget.css';",
    "import { initAgentWidget, markdownPostprocessor } from 'vanilla-agent';",
    "",
    "initAgentWidget({",
    "  target: 'body',",
    "  useShadowDom: false,",
    "  config: {"
  ];

  if (config.apiUrl) lines.push(`    apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`    flowId: "${config.flowId}",`);
  if (shouldEmitParserType) lines.push(`    parserType: "${parserType}",`);

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

  if (config.sendButton) {
    lines.push("    sendButton: {");
    Object.entries(config.sendButton).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      }
    });
    lines.push("    },");
  }

  if (config.voiceRecognition) {
    lines.push("    voiceRecognition: {");
    Object.entries(config.voiceRecognition).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      } else if (typeof value === "number") {
        lines.push(`      ${key}: ${value},`);
      }
    });
    lines.push("    },");
  }

  if (config.statusIndicator) {
    lines.push("    statusIndicator: {");
    Object.entries(config.statusIndicator).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      }
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
    config.suggestionChips.forEach((chip: string) => {
      lines.push(`      "${chip}",`);
    });
    lines.push("    ],");
  }

  if (config.suggestionChipsConfig) {
    lines.push("    suggestionChipsConfig: {");
    if (config.suggestionChipsConfig.fontFamily) {
      lines.push(`      fontFamily: "${config.suggestionChipsConfig.fontFamily}",`);
    }
    if (config.suggestionChipsConfig.fontWeight) {
      lines.push(`      fontWeight: "${config.suggestionChipsConfig.fontWeight}",`);
    }
    if (config.suggestionChipsConfig.paddingX) {
      lines.push(`      paddingX: "${config.suggestionChipsConfig.paddingX}",`);
    }
    if (config.suggestionChipsConfig.paddingY) {
      lines.push(`      paddingY: "${config.suggestionChipsConfig.paddingY}",`);
    }
    lines.push("    },");
  }

  if (config.debug) {
    lines.push(`    debug: ${config.debug},`);
  }

  lines.push("    postprocessMessage: ({ text }) => markdownPostprocessor(text)");
  lines.push("  }");
  lines.push("});");

  return lines.join("\n");
}

function generateReactComponentCode(config: any): string {
  const parserType = getParserTypeFromConfig(config as AgentWidgetConfig);
  const shouldEmitParserType = parserType !== "plain";
  
  const lines: string[] = [
    "// ChatWidget.tsx",
    "'use client'; // Required for Next.js - remove for Vite/CRA",
    "",
    "import { useEffect } from 'react';",
    "import 'vanilla-agent/widget.css';",
    "import { initAgentWidget, markdownPostprocessor } from 'vanilla-agent';",
    "import type { AgentWidgetInitHandle } from 'vanilla-agent';",
    "",
    "export function ChatWidget() {",
    "  useEffect(() => {",
    "    let handle: AgentWidgetInitHandle | null = null;",
    "",
    "    handle = initAgentWidget({",
    "      target: 'body',",
    "      useShadowDom: false,",
    "      config: {"
  ];

  if (config.apiUrl) lines.push(`        apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`        flowId: "${config.flowId}",`);
  if (shouldEmitParserType) lines.push(`        parserType: "${parserType}",`);

  if (config.theme) {
    lines.push("        theme: {");
    Object.entries(config.theme).forEach(([key, value]) => {
      lines.push(`          ${key}: "${value}",`);
    });
    lines.push("        },");
  }

  if (config.launcher) {
    lines.push("        launcher: {");
    Object.entries(config.launcher).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`          ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`          ${key}: ${value},`);
      }
    });
    lines.push("        },");
  }

  if (config.copy) {
    lines.push("        copy: {");
    Object.entries(config.copy).forEach(([key, value]) => {
      lines.push(`          ${key}: "${value}",`);
    });
    lines.push("        },");
  }

  if (config.sendButton) {
    lines.push("        sendButton: {");
    Object.entries(config.sendButton).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`          ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`          ${key}: ${value},`);
      }
    });
    lines.push("        },");
  }

  if (config.voiceRecognition) {
    lines.push("        voiceRecognition: {");
    Object.entries(config.voiceRecognition).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`          ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`          ${key}: ${value},`);
      } else if (typeof value === "number") {
        lines.push(`          ${key}: ${value},`);
      }
    });
    lines.push("        },");
  }

  if (config.statusIndicator) {
    lines.push("        statusIndicator: {");
    Object.entries(config.statusIndicator).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`          ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`          ${key}: ${value},`);
      }
    });
    lines.push("        },");
  }

  if (config.features) {
    lines.push("        features: {");
    Object.entries(config.features).forEach(([key, value]) => {
      lines.push(`          ${key}: ${value},`);
    });
    lines.push("        },");
  }

  if (config.suggestionChips && config.suggestionChips.length > 0) {
    lines.push("        suggestionChips: [");
    config.suggestionChips.forEach((chip: string) => {
      lines.push(`          "${chip}",`);
    });
    lines.push("        ],");
  }

  if (config.suggestionChipsConfig) {
    lines.push("        suggestionChipsConfig: {");
    if (config.suggestionChipsConfig.fontFamily) {
      lines.push(`          fontFamily: "${config.suggestionChipsConfig.fontFamily}",`);
    }
    if (config.suggestionChipsConfig.fontWeight) {
      lines.push(`          fontWeight: "${config.suggestionChipsConfig.fontWeight}",`);
    }
    if (config.suggestionChipsConfig.paddingX) {
      lines.push(`          paddingX: "${config.suggestionChipsConfig.paddingX}",`);
    }
    if (config.suggestionChipsConfig.paddingY) {
      lines.push(`          paddingY: "${config.suggestionChipsConfig.paddingY}",`);
    }
    lines.push("        },");
  }

  if (config.debug) {
    lines.push(`        debug: ${config.debug},`);
  }

  lines.push("        postprocessMessage: ({ text }) => markdownPostprocessor(text)");
  lines.push("      }");
  lines.push("    });");
  lines.push("");
  lines.push("    // Cleanup on unmount");
  lines.push("    return () => {");
  lines.push("      if (handle) {");
  lines.push("        handle.destroy();");
  lines.push("      }");
  lines.push("    };");
  lines.push("  }, []);");
  lines.push("");
  lines.push("  return null; // Widget injects itself into the DOM");
  lines.push("}");
  lines.push("");
  lines.push("// Usage in your app:");
  lines.push("// import { ChatWidget } from './components/ChatWidget';");
  lines.push("//");
  lines.push("// export default function App() {");
  lines.push("//   return (");
  lines.push("//     <div>");
  lines.push("//       {/* Your app content */}");
  lines.push("//       <ChatWidget />");
  lines.push("//     </div>");
  lines.push("//   );");
  lines.push("// }");

  return lines.join("\n");
}

function generateScriptInstallerCode(config: any): string {
  const parserType = getParserTypeFromConfig(config as AgentWidgetConfig);
  const shouldEmitParserType = parserType !== "plain";

  const lines: string[] = [
    "<script>",
    "  window.siteAgentConfig = {",
    "    target: 'body',",
    "    config: {"
  ];

  if (config.apiUrl) lines.push(`      apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`      flowId: "${config.flowId}",`);
  if (shouldEmitParserType) lines.push(`      parserType: "${parserType}",`);

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

  if (config.sendButton) {
    lines.push("      sendButton: {");
    Object.entries(config.sendButton).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.voiceRecognition) {
    lines.push("      voiceRecognition: {");
    Object.entries(config.voiceRecognition).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      } else if (typeof value === "number") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.statusIndicator) {
    lines.push("      statusIndicator: {");
    Object.entries(config.statusIndicator).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
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
    config.suggestionChips.forEach((chip: string) => {
      lines.push(`        "${chip}",`);
    });
    lines.push("      ],");
  }

  if (config.suggestionChipsConfig) {
    lines.push("      suggestionChipsConfig: {");
    if (config.suggestionChipsConfig.fontFamily) {
      lines.push(`        fontFamily: "${config.suggestionChipsConfig.fontFamily}",`);
    }
    if (config.suggestionChipsConfig.fontWeight) {
      lines.push(`        fontWeight: "${config.suggestionChipsConfig.fontWeight}",`);
    }
    if (config.suggestionChipsConfig.paddingX) {
      lines.push(`        paddingX: "${config.suggestionChipsConfig.paddingX}",`);
    }
    if (config.suggestionChipsConfig.paddingY) {
      lines.push(`        paddingY: "${config.suggestionChipsConfig.paddingY}",`);
    }
    lines.push("      },");
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
  const parserType = getParserTypeFromConfig(config as AgentWidgetConfig);
  const shouldEmitParserType = parserType !== "plain";

  const lines: string[] = [
    "<!-- Load CSS -->",
    "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/widget.css\" />",
    "",
    "<!-- Load JavaScript -->",
    "<script src=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/index.global.js\"></script>",
    "",
    "<!-- Initialize widget -->",
    "<script>",
    "  window.AgentWidget.initAgentWidget({",
    "    target: 'body',",
    "    config: {"
  ];

  if (config.apiUrl) lines.push(`      apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`      flowId: "${config.flowId}",`);
  if (shouldEmitParserType) lines.push(`      parserType: "${parserType}",`);

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

  if (config.sendButton) {
    lines.push("      sendButton: {");
    Object.entries(config.sendButton).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.voiceRecognition) {
    lines.push("      voiceRecognition: {");
    Object.entries(config.voiceRecognition).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      } else if (typeof value === "number") {
        lines.push(`        ${key}: ${value},`);
      }
    });
    lines.push("      },");
  }

  if (config.statusIndicator) {
    lines.push("      statusIndicator: {");
    Object.entries(config.statusIndicator).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`        ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`        ${key}: ${value},`);
      }
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
    config.suggestionChips.forEach((chip: string) => {
      lines.push(`        "${chip}",`);
    });
    lines.push("      ],");
  }

  if (config.suggestionChipsConfig) {
    lines.push("      suggestionChipsConfig: {");
    if (config.suggestionChipsConfig.fontFamily) {
      lines.push(`        fontFamily: "${config.suggestionChipsConfig.fontFamily}",`);
    }
    if (config.suggestionChipsConfig.fontWeight) {
      lines.push(`        fontWeight: "${config.suggestionChipsConfig.fontWeight}",`);
    }
    if (config.suggestionChipsConfig.paddingX) {
      lines.push(`        paddingX: "${config.suggestionChipsConfig.paddingX}",`);
    }
    if (config.suggestionChipsConfig.paddingY) {
      lines.push(`        paddingY: "${config.suggestionChipsConfig.paddingY}",`);
    }
    lines.push("      },");
  }

  if (config.debug) {
    lines.push(`      debug: ${config.debug},`);
  }

  lines.push("    }");
  lines.push("  });");
  lines.push("</script>");

  return lines.join("\n");
}

function generateScriptAdvancedCode(config: any): string {
  const lines: string[] = [
    "<!-- Chat Widget Configuration -->",
    "<script>",
    "  window.ChatWidgetConfig = {"
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

  if (config.sendButton) {
    lines.push("    sendButton: {");
    Object.entries(config.sendButton).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      }
    });
    lines.push("    },");
  }

  if (config.voiceRecognition) {
    lines.push("    voiceRecognition: {");
    Object.entries(config.voiceRecognition).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      } else if (typeof value === "number") {
        lines.push(`      ${key}: ${value},`);
      }
    });
    lines.push("    },");
  }

  if (config.statusIndicator) {
    lines.push("    statusIndicator: {");
    Object.entries(config.statusIndicator).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`      ${key}: "${value}",`);
      } else if (typeof value === "boolean") {
        lines.push(`      ${key}: ${value},`);
      }
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
    config.suggestionChips.forEach((chip: string) => {
      lines.push(`      "${chip}",`);
    });
    lines.push("    ],");
  }

  lines.push("  };");
  lines.push("</script>");
  lines.push("");
  lines.push("<!-- Chat Widget Script with DOM Helper -->");
  lines.push("<script>");
  lines.push("  (function () {");
  lines.push("    'use strict';");
  lines.push("    ");
  lines.push("    const STORAGE_KEY = 'chat-widget-state';");
  lines.push("    const PROCESSED_ACTIONS_KEY = 'chat-widget-processed-actions';");
  lines.push("");
  lines.push("    // DOM context provider - extracts page elements for AI context");
  lines.push("    const domContextProvider = () => {");
  lines.push("      const selectors = {");
  lines.push("        products: '[data-product-id], .product-card, .product-item, [role=\"article\"]',");
  lines.push("        buttons: 'button, [role=\"button\"], .btn',");
  lines.push("        links: 'a[href]',");
  lines.push("        inputs: 'input, textarea, select'");
  lines.push("      };");
  lines.push("");
  lines.push("      const elements = [];");
  lines.push("      Object.entries(selectors).forEach(([type, selector]) => {");
  lines.push("        document.querySelectorAll(selector).forEach((element) => {");
  lines.push("          if (!(element instanceof HTMLElement)) return;");
  lines.push("          const text = element.innerText?.trim();");
  lines.push("          if (!text) return;");
  lines.push("");
  lines.push("          const selectorString =");
  lines.push("            element.id ? `#${element.id}` :");
  lines.push("            element.getAttribute('data-testid') ? `[data-testid=\"${element.getAttribute('data-testid')}\"]` :");
  lines.push("            element.getAttribute('data-product-id') ? `[data-product-id=\"${element.getAttribute('data-product-id')}\"]` :");
  lines.push("            element.tagName.toLowerCase();");
  lines.push("");
  lines.push("          const elementData = {");
  lines.push("            type,");
  lines.push("            tagName: element.tagName.toLowerCase(),");
  lines.push("            selector: selectorString,");
  lines.push("            innerText: text.substring(0, 200)");
  lines.push("          };");
  lines.push("");
  lines.push("          if (type === 'links' && element instanceof HTMLAnchorElement && element.href) {");
  lines.push("            elementData.href = element.href;");
  lines.push("          }");
  lines.push("");
  lines.push("          elements.push(elementData);");
  lines.push("        });");
  lines.push("      });");
  lines.push("");
  lines.push("      const counts = elements.reduce((acc, el) => {");
  lines.push("        acc[el.type] = (acc[el.type] || 0) + 1;");
  lines.push("        return acc;");
  lines.push("      }, {});");
  lines.push("");
  lines.push("      return {");
  lines.push("        page_elements: elements.slice(0, 50),");
  lines.push("        page_element_count: elements.length,");
  lines.push("        element_types: counts,");
  lines.push("        page_url: window.location.href,");
  lines.push("        page_title: document.title,");
  lines.push("        timestamp: new Date().toISOString()");
  lines.push("      };");
  lines.push("    };");
  lines.push("");
  lines.push("    const createWidgetConfig = (agentWidget) => ({");
  lines.push("      ...window.ChatWidgetConfig,");
  lines.push("      // Flexible JSON stream parser for handling structured actions");
  lines.push("      streamParser: () => agentWidget.createFlexibleJsonStreamParser((parsed) => {");
  lines.push("        if (!parsed || typeof parsed !== 'object') return null;");
  lines.push("        ");
  lines.push("        // Extract display text based on action type");
  lines.push("        if (parsed.action === 'nav_then_click') {");
  lines.push("          return 'Navigating...';");
  lines.push("        } else if (parsed.action === 'message') {");
  lines.push("          return parsed.text || '';");
  lines.push("        } else if (parsed.action === 'message_and_click') {");
  lines.push("          return parsed.text || 'Processing...';");
  lines.push("        }");
  lines.push("        ");
  lines.push("        return parsed.text || null;");
  lines.push("      }),");
  lines.push("      // Action parsers to detect JSON actions in responses");
  lines.push("      actionParsers: [");
  lines.push("        agentWidget.defaultJsonActionParser,");
  lines.push("        // Custom parser for markdown-wrapped JSON");
  lines.push("        ({ text, message }) => {");
  lines.push("          const jsonSource = message.rawContent || text || message.content;");
  lines.push("          if (!jsonSource || typeof jsonSource !== 'string') return null;");
  lines.push("          ");
  lines.push("          // Strip markdown code fences");
  lines.push("          let cleanJson = jsonSource");
  lines.push("            .replace(/^```(?:json)?\\s*\\n?/, '')");
  lines.push("            .replace(/\\n?```\\s*$/, '')");
  lines.push("            .trim();");
  lines.push("          ");
  lines.push("          if (!cleanJson.startsWith('{') || !cleanJson.endsWith('}')) return null;");
  lines.push("          ");
  lines.push("          try {");
  lines.push("            const parsed = JSON.parse(cleanJson);");
  lines.push("            if (parsed.action) {");
  lines.push("              return { type: parsed.action, payload: parsed };");
  lines.push("            }");
  lines.push("          } catch (e) {");
  lines.push("            return null;");
  lines.push("          }");
  lines.push("          return null;");
  lines.push("        }");
  lines.push("      ],");
  lines.push("      // Action handlers for navigation and other actions");
  lines.push("      actionHandlers: [");
  lines.push("        agentWidget.defaultActionHandlers.message,");
  lines.push("        agentWidget.defaultActionHandlers.messageAndClick,");
  lines.push("        // Handler for nav_then_click action");
  lines.push("        (action, context) => {");
  lines.push("          if (action.type !== 'nav_then_click') return;");
  lines.push("          ");
  lines.push("          const payload = action.payload || action.raw || {};");
  lines.push("          const url = payload?.page;");
  lines.push("          const text = payload?.on_load_text || 'Navigating...';");
  lines.push("          ");
  lines.push("          if (!url) return { handled: true, displayText: text };");
  lines.push("          ");
  lines.push("          // Check if already processed");
  lines.push("          const messageId = context.message?.id;");
  lines.push("          const processedActions = JSON.parse(localStorage.getItem(PROCESSED_ACTIONS_KEY) || '[]');");
  lines.push("          const actionKey = `nav_${messageId}_${url}`;");
  lines.push("          ");
  lines.push("          if (processedActions.includes(actionKey)) {");
  lines.push("            return { handled: true, displayText: text };");
  lines.push("          }");
  lines.push("          ");
  lines.push("          processedActions.push(actionKey);");
  lines.push("          localStorage.setItem(PROCESSED_ACTIONS_KEY, JSON.stringify(processedActions));");
  lines.push("          ");
  lines.push("          const targetUrl = url.startsWith('http')");
  lines.push("            ? url");
  lines.push("            : new URL(url, window.location.origin).toString();");
  lines.push("          ");
  lines.push("          window.location.href = targetUrl;");
  lines.push("          ");
  lines.push("          return { handled: true, displayText: text };");
  lines.push("        }");
  lines.push("      ]");
  lines.push("    });");
  lines.push("");
  lines.push("    // Initialize widget when DOM is loaded");
  lines.push("    function init() {");
  lines.push("      const agentWidget = window.AgentWidget;");
  lines.push("      if (!agentWidget) {");
  lines.push("        console.error('AgentWidget not loaded');");
  lines.push("        return;");
  lines.push("      }");
  lines.push("");
  lines.push("      const widgetConfig = createWidgetConfig(agentWidget);");
  lines.push("");
  lines.push("      // Load saved state");
  lines.push("      const savedState = localStorage.getItem(STORAGE_KEY);");
  lines.push("      if (savedState) {");
  lines.push("        try {");
  lines.push("          const { messages } = JSON.parse(savedState);");
  lines.push("          widgetConfig.initialMessages = messages || [];");
  lines.push("        } catch (e) {");
  lines.push("          console.error('Failed to load saved state:', e);");
  lines.push("        }");
  lines.push("      }");
  lines.push("");
  lines.push("      // Initialize widget with DOM context");
  lines.push("      const handle = agentWidget.initAgentWidget({");
  lines.push("        target: 'body',");
  lines.push("        config: widgetConfig");
  lines.push("      });");
  lines.push("");
  lines.push("      // Save state on message events");
  lines.push("      window.addEventListener('vanilla-agent:message', (event) => {");
  lines.push("        const session = handle.getSession?.();");
  lines.push("        if (session) {");
  lines.push("          localStorage.setItem(STORAGE_KEY, JSON.stringify({");
  lines.push("            messages: session.messages,");
  lines.push("            timestamp: new Date().toISOString()");
  lines.push("          }));");
  lines.push("        }");
  lines.push("      });");
  lines.push("");
  lines.push("      // Clear state on clear chat");
  lines.push("      window.addEventListener('vanilla-agent:clear-chat', () => {");
  lines.push("        localStorage.removeItem(STORAGE_KEY);");
  lines.push("        localStorage.removeItem(PROCESSED_ACTIONS_KEY);");
  lines.push("      });");
  lines.push("    }");
  lines.push("");
  lines.push("    // Wait for both DOM and AgentWidget to be ready");
  lines.push("    if (document.readyState === 'loading') {");
  lines.push("      document.addEventListener('DOMContentLoaded', init);");
  lines.push("    } else if (window.AgentWidget) {");
  lines.push("      init();");
  lines.push("    } else {");
  lines.push("      // Poll for AgentWidget if not ready yet");
  lines.push("      const checkInterval = setInterval(() => {");
  lines.push("        if (window.AgentWidget) {");
  lines.push("          clearInterval(checkInterval);");
  lines.push("          init();");
  lines.push("        }");
  lines.push("      }, 100);");
  lines.push("    }");
  lines.push("  })();");
  lines.push("</script>");
  lines.push("");
  lines.push("<!-- Load the widget library -->");
  lines.push("<script src=\"https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/index.global.js\"></script>");

  return lines.join("\n");
}

