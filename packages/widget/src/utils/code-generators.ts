import type { AgentWidgetConfig } from "../types";

type ParserType = "plain" | "json" | "regex-json" | "xml";
export type CodeFormat = "esm" | "script-installer" | "script-manual" | "script-advanced" | "react-component" | "react-advanced";

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

// Helper to generate toolCall config
function generateToolCallConfig(config: any, indent: string): string[] {
  const lines: string[] = [];
  if (config.toolCall) {
    lines.push(`${indent}toolCall: {`);
    Object.entries(config.toolCall).forEach(([key, value]) => {
      if (typeof value === "string") {
        lines.push(`${indent}  ${key}: "${value}",`);
      }
    });
    lines.push(`${indent}},`);
  }
  return lines;
}

// Helper to generate messageActions config (excluding callbacks)
function generateMessageActionsConfig(config: any, indent: string): string[] {
  const lines: string[] = [];
  if (config.messageActions) {
    const hasSerializableProps = Object.entries(config.messageActions).some(
      ([key, value]) => key !== "onFeedback" && key !== "onCopy" && value !== undefined
    );
    if (hasSerializableProps) {
      lines.push(`${indent}messageActions: {`);
      Object.entries(config.messageActions).forEach(([key, value]) => {
        // Skip function callbacks
        if (key === "onFeedback" || key === "onCopy") return;
        if (typeof value === "string") {
          lines.push(`${indent}  ${key}: "${value}",`);
        } else if (typeof value === "boolean") {
          lines.push(`${indent}  ${key}: ${value},`);
        }
      });
      lines.push(`${indent}},`);
    }
  }
  return lines;
}

// Helper to generate markdown config (excluding renderer functions)
function generateMarkdownConfig(config: any, indent: string): string[] {
  const lines: string[] = [];
  if (config.markdown) {
    const hasOptions = config.markdown.options && Object.keys(config.markdown.options).length > 0;
    const hasDisableDefaultStyles = config.markdown.disableDefaultStyles !== undefined;
    
    if (hasOptions || hasDisableDefaultStyles) {
      lines.push(`${indent}markdown: {`);
      
      if (hasOptions) {
        lines.push(`${indent}  options: {`);
        Object.entries(config.markdown.options).forEach(([key, value]) => {
          if (typeof value === "string") {
            lines.push(`${indent}    ${key}: "${value}",`);
          } else if (typeof value === "boolean") {
            lines.push(`${indent}    ${key}: ${value},`);
          }
        });
        lines.push(`${indent}  },`);
      }
      
      if (hasDisableDefaultStyles) {
        lines.push(`${indent}  disableDefaultStyles: ${config.markdown.disableDefaultStyles},`);
      }
      
      lines.push(`${indent}},`);
    }
  }
  return lines;
}

// Helper to generate layout config (excluding render functions and slots)
function generateLayoutConfig(config: any, indent: string): string[] {
  const lines: string[] = [];
  if (config.layout) {
    const hasHeader = config.layout.header && Object.keys(config.layout.header).some(
      (key: string) => key !== "render"
    );
    const hasMessages = config.layout.messages && Object.keys(config.layout.messages).some(
      (key: string) => key !== "renderUserMessage" && key !== "renderAssistantMessage"
    );
    
    if (hasHeader || hasMessages) {
      lines.push(`${indent}layout: {`);
      
      // Header config (excluding render function)
      if (hasHeader) {
        lines.push(`${indent}  header: {`);
        Object.entries(config.layout.header).forEach(([key, value]) => {
          if (key === "render") return; // Skip render function
          if (typeof value === "string") {
            lines.push(`${indent}    ${key}: "${value}",`);
          } else if (typeof value === "boolean") {
            lines.push(`${indent}    ${key}: ${value},`);
          }
        });
        lines.push(`${indent}  },`);
      }
      
      // Messages config (excluding render functions)
      if (hasMessages) {
        lines.push(`${indent}  messages: {`);
        Object.entries(config.layout.messages).forEach(([key, value]) => {
          // Skip render functions
          if (key === "renderUserMessage" || key === "renderAssistantMessage") return;
          
          if (key === "avatar" && typeof value === "object" && value !== null) {
            lines.push(`${indent}    avatar: {`);
            Object.entries(value as Record<string, unknown>).forEach(([avatarKey, avatarValue]) => {
              if (typeof avatarValue === "string") {
                lines.push(`${indent}      ${avatarKey}: "${avatarValue}",`);
              } else if (typeof avatarValue === "boolean") {
                lines.push(`${indent}      ${avatarKey}: ${avatarValue},`);
              }
            });
            lines.push(`${indent}    },`);
          } else if (key === "timestamp" && typeof value === "object" && value !== null) {
            // Only emit serializable timestamp properties (skip format function)
            const hasSerializableTimestamp = Object.entries(value as Record<string, unknown>).some(
              ([k]) => k !== "format"
            );
            if (hasSerializableTimestamp) {
              lines.push(`${indent}    timestamp: {`);
              Object.entries(value as Record<string, unknown>).forEach(([tsKey, tsValue]) => {
                if (tsKey === "format") return; // Skip format function
                if (typeof tsValue === "string") {
                  lines.push(`${indent}      ${tsKey}: "${tsValue}",`);
                } else if (typeof tsValue === "boolean") {
                  lines.push(`${indent}      ${tsKey}: ${tsValue},`);
                }
              });
              lines.push(`${indent}    },`);
            }
          } else if (typeof value === "string") {
            lines.push(`${indent}    ${key}: "${value}",`);
          } else if (typeof value === "boolean") {
            lines.push(`${indent}    ${key}: ${value},`);
          }
        });
        lines.push(`${indent}  },`);
      }
      
      lines.push(`${indent}},`);
    }
  }
  return lines;
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
  } else if (format === "react-advanced") {
    return generateReactAdvancedCode(cleanConfig);
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

  // Add toolCall config
  lines.push(...generateToolCallConfig(config, "    "));

  // Add messageActions config
  lines.push(...generateMessageActionsConfig(config, "    "));

  // Add markdown config
  lines.push(...generateMarkdownConfig(config, "    "));

  // Add layout config
  lines.push(...generateLayoutConfig(config, "    "));

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

  // Add toolCall config
  lines.push(...generateToolCallConfig(config, "        "));

  // Add messageActions config
  lines.push(...generateMessageActionsConfig(config, "        "));

  // Add markdown config
  lines.push(...generateMarkdownConfig(config, "        "));

  // Add layout config
  lines.push(...generateLayoutConfig(config, "        "));

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

function generateReactAdvancedCode(config: any): string {
  const lines: string[] = [
    "// ChatWidgetAdvanced.tsx",
    "'use client'; // Required for Next.js - remove for Vite/CRA",
    "",
    "import { useEffect } from 'react';",
    "import 'vanilla-agent/widget.css';",
    "import {",
    "  initAgentWidget,",
    "  createFlexibleJsonStreamParser,",
    "  defaultJsonActionParser,",
    "  defaultActionHandlers,",
    "  markdownPostprocessor",
    "} from 'vanilla-agent';",
    "import type { AgentWidgetInitHandle } from 'vanilla-agent';",
    "",
    "const STORAGE_KEY = 'chat-widget-state';",
    "const PROCESSED_ACTIONS_KEY = 'chat-widget-processed-actions';",
    "",
    "// Types for DOM elements",
    "interface PageElement {",
    "  type: string;",
    "  tagName: string;",
    "  selector: string;",
    "  innerText: string;",
    "  href?: string;",
    "}",
    "",
    "interface DOMContext {",
    "  page_elements: PageElement[];",
    "  page_element_count: number;",
    "  element_types: Record<string, number>;",
    "  page_url: string;",
    "  page_title: string;",
    "  timestamp: string;",
    "}",
    "",
    "// DOM context provider - extracts page elements for AI context",
    "const collectDOMContext = (): DOMContext => {",
    "  const selectors = {",
    "    products: '[data-product-id], .product-card, .product-item, [role=\"article\"]',",
    "    buttons: 'button, [role=\"button\"], .btn',",
    "    links: 'a[href]',",
    "    inputs: 'input, textarea, select'",
    "  };",
    "",
    "  const elements: PageElement[] = [];",
    "  Object.entries(selectors).forEach(([type, selector]) => {",
    "    document.querySelectorAll(selector).forEach((element) => {",
    "      if (!(element instanceof HTMLElement)) return;",
    "      ",
    "      // Exclude elements within the widget",
    "      const widgetHost = element.closest('.vanilla-agent-host');",
    "      if (widgetHost) return;",
    "      ",
    "      const text = element.innerText?.trim();",
    "      if (!text) return;",
    "",
    "      const selectorString =",
    "        element.id ? `#${element.id}` :",
    "        element.getAttribute('data-testid') ? `[data-testid=\"${element.getAttribute('data-testid')}\"]` :",
    "        element.getAttribute('data-product-id') ? `[data-product-id=\"${element.getAttribute('data-product-id')}\"]` :",
    "        element.tagName.toLowerCase();",
    "",
    "      const elementData: PageElement = {",
    "        type,",
    "        tagName: element.tagName.toLowerCase(),",
    "        selector: selectorString,",
    "        innerText: text.substring(0, 200)",
    "      };",
    "",
    "      if (type === 'links' && element instanceof HTMLAnchorElement && element.href) {",
    "        elementData.href = element.href;",
    "      }",
    "",
    "      elements.push(elementData);",
    "    });",
    "  });",
    "",
    "  const counts = elements.reduce((acc, el) => {",
    "    acc[el.type] = (acc[el.type] || 0) + 1;",
    "    return acc;",
    "  }, {} as Record<string, number>);",
    "",
    "  return {",
    "    page_elements: elements.slice(0, 50),",
    "    page_element_count: elements.length,",
    "    element_types: counts,",
    "    page_url: window.location.href,",
    "    page_title: document.title,",
    "    timestamp: new Date().toISOString()",
    "  };",
    "};",
    "",
    "export function ChatWidgetAdvanced() {",
    "  useEffect(() => {",
    "    let handle: AgentWidgetInitHandle | null = null;",
    "",
    "    // Load saved state",
    "    const loadSavedMessages = () => {",
    "      const savedState = localStorage.getItem(STORAGE_KEY);",
    "      if (savedState) {",
    "        try {",
    "          const { messages } = JSON.parse(savedState);",
    "          return messages || [];",
    "        } catch (e) {",
    "          console.error('Failed to load saved state:', e);",
    "        }",
    "      }",
    "      return [];",
    "    };",
    "",
    "    handle = initAgentWidget({",
    "      target: 'body',",
    "      config: {"
  ];

  if (config.apiUrl) lines.push(`        apiUrl: "${config.apiUrl}",`);
  if (config.flowId) lines.push(`        flowId: "${config.flowId}",`);
  
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

  // Add toolCall config
  lines.push(...generateToolCallConfig(config, "        "));

  // Add messageActions config
  lines.push(...generateMessageActionsConfig(config, "        "));

  // Add markdown config
  lines.push(...generateMarkdownConfig(config, "        "));

  // Add layout config
  lines.push(...generateLayoutConfig(config, "        "));

  if (config.debug) {
    lines.push(`        debug: ${config.debug},`);
  }

  lines.push("        initialMessages: loadSavedMessages(),");
  lines.push("        // Flexible JSON stream parser for handling structured actions");
  lines.push("        streamParser: () => createFlexibleJsonStreamParser((parsed: any) => {");
  lines.push("          if (!parsed || typeof parsed !== 'object') return null;");
  lines.push("          // Extract display text based on action type");
  lines.push("          if (parsed.action === 'nav_then_click') return 'Navigating...';");
  lines.push("          if (parsed.action === 'message') return parsed.text || '';");
  lines.push("          if (parsed.action === 'message_and_click') return parsed.text || 'Processing...';");
  lines.push("          return parsed.text || null;");
  lines.push("        }),");
  lines.push("        // Action parsers to detect JSON actions in responses");
  lines.push("        actionParsers: [");
  lines.push("          defaultJsonActionParser,");
  lines.push("          // Custom parser for markdown-wrapped JSON");
  lines.push("          ({ text, message }: any) => {");
  lines.push("            const jsonSource = (message as any).rawContent || text || message.content;");
  lines.push("            if (!jsonSource || typeof jsonSource !== 'string') return null;");
  lines.push("            // Strip markdown code fences");
  lines.push("            let cleanJson = jsonSource");
  lines.push("              .replace(/^```(?:json)?\\s*\\n?/, '')");
  lines.push("              .replace(/\\n?```\\s*$/, '')");
  lines.push("              .trim();");
  lines.push("            if (!cleanJson.startsWith('{') || !cleanJson.endsWith('}')) return null;");
  lines.push("            try {");
  lines.push("              const parsed = JSON.parse(cleanJson);");
  lines.push("              if (parsed.action) return { type: parsed.action, payload: parsed };");
  lines.push("            } catch (e) { return null; }");
  lines.push("            return null;");
  lines.push("          }");
  lines.push("        ],");
  lines.push("        // Action handlers for navigation and other actions");
  lines.push("        actionHandlers: [");
  lines.push("          defaultActionHandlers.message,");
  lines.push("          defaultActionHandlers.messageAndClick,");
  lines.push("          // Handler for nav_then_click action");
  lines.push("          (action: any, context: any) => {");
  lines.push("            if (action.type !== 'nav_then_click') return;");
  lines.push("            const payload = action.payload || action.raw || {};");
  lines.push("            const url = payload?.page;");
  lines.push("            const text = payload?.on_load_text || 'Navigating...';");
  lines.push("            if (!url) return { handled: true, displayText: text };");
  lines.push("            // Check if already processed");
  lines.push("            const messageId = context.message?.id;");
  lines.push("            const processedActions = JSON.parse(localStorage.getItem(PROCESSED_ACTIONS_KEY) || '[]');");
  lines.push("            const actionKey = `nav_${messageId}_${url}`;");
  lines.push("            if (processedActions.includes(actionKey)) {");
  lines.push("              return { handled: true, displayText: text };");
  lines.push("            }");
  lines.push("            processedActions.push(actionKey);");
  lines.push("            localStorage.setItem(PROCESSED_ACTIONS_KEY, JSON.stringify(processedActions));");
  lines.push("            const targetUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();");
  lines.push("            window.location.href = targetUrl;");
  lines.push("            return { handled: true, displayText: text };");
  lines.push("          }");
  lines.push("        ],");
  lines.push("        postprocessMessage: ({ text }) => markdownPostprocessor(text),");
  lines.push("        requestMiddleware: ({ payload }) => {");
  lines.push("          return {");
  lines.push("            ...payload,");
  lines.push("            metadata: collectDOMContext()");
  lines.push("          };");
  lines.push("        }");
  lines.push("      }");
  lines.push("    });");
  lines.push("");
  lines.push("    // Save state on message events");
  lines.push("    const handleMessage = () => {");
  lines.push("      const session = handle?.getSession?.();");
  lines.push("      if (session) {");
  lines.push("        localStorage.setItem(STORAGE_KEY, JSON.stringify({");
  lines.push("          messages: session.messages,");
  lines.push("          timestamp: new Date().toISOString()");
  lines.push("        }));");
  lines.push("      }");
  lines.push("    };");
  lines.push("");
  lines.push("    // Clear state on clear chat");
  lines.push("    const handleClearChat = () => {");
  lines.push("      localStorage.removeItem(STORAGE_KEY);");
  lines.push("      localStorage.removeItem(PROCESSED_ACTIONS_KEY);");
  lines.push("    };");
  lines.push("");
  lines.push("    window.addEventListener('vanilla-agent:message', handleMessage);");
  lines.push("    window.addEventListener('vanilla-agent:clear-chat', handleClearChat);");
  lines.push("");
  lines.push("    // Cleanup on unmount");
  lines.push("    return () => {");
  lines.push("      window.removeEventListener('vanilla-agent:message', handleMessage);");
  lines.push("      window.removeEventListener('vanilla-agent:clear-chat', handleClearChat);");
  lines.push("      if (handle) {");
  lines.push("        handle.destroy();");
  lines.push("      }");
  lines.push("    };");
  lines.push("  }, []);");
  lines.push("");
  lines.push("  return null; // Widget injects itself into the DOM");
  lines.push("}");
  lines.push("");
  lines.push("// Usage: Collects DOM context for AI-powered navigation");
  lines.push("// Features:");
  lines.push("// - Extracts page elements (products, buttons, links)");
  lines.push("// - Persists chat history across page loads");
  lines.push("// - Handles navigation actions (nav_then_click)");
  lines.push("// - Processes structured JSON actions from AI");
  lines.push("//");
  lines.push("// Example usage in Next.js:");
  lines.push("// import { ChatWidgetAdvanced } from './components/ChatWidgetAdvanced';");
  lines.push("//");
  lines.push("// export default function RootLayout({ children }) {");
  lines.push("//   return (");
  lines.push("//     <html lang=\"en\">");
  lines.push("//       <body>");
  lines.push("//         {children}");
  lines.push("//         <ChatWidgetAdvanced />");
  lines.push("//       </body>");
  lines.push("//     </html>");
  lines.push("//   );");
  lines.push("// }");

  return lines.join("\n");
}

// Helper to build a serializable config object for JSON export
function buildSerializableConfig(config: any): Record<string, any> {
  const parserType = getParserTypeFromConfig(config as AgentWidgetConfig);
  const shouldEmitParserType = parserType !== "plain";
  
  const serializableConfig: Record<string, any> = {};
  
  if (config.apiUrl) serializableConfig.apiUrl = config.apiUrl;
  if (config.flowId) serializableConfig.flowId = config.flowId;
  if (shouldEmitParserType) serializableConfig.parserType = parserType;
  if (config.theme) serializableConfig.theme = config.theme;
  if (config.launcher) serializableConfig.launcher = config.launcher;
  if (config.copy) serializableConfig.copy = config.copy;
  if (config.sendButton) serializableConfig.sendButton = config.sendButton;
  if (config.voiceRecognition) serializableConfig.voiceRecognition = config.voiceRecognition;
  if (config.statusIndicator) serializableConfig.statusIndicator = config.statusIndicator;
  if (config.features) serializableConfig.features = config.features;
  if (config.suggestionChips?.length > 0) serializableConfig.suggestionChips = config.suggestionChips;
  if (config.suggestionChipsConfig) serializableConfig.suggestionChipsConfig = config.suggestionChipsConfig;
  if (config.debug) serializableConfig.debug = config.debug;
  
  // Add toolCall config (only serializable parts)
  if (config.toolCall) {
    const toolCallConfig: Record<string, any> = {};
    Object.entries(config.toolCall).forEach(([key, value]) => {
      if (typeof value === "string") toolCallConfig[key] = value;
    });
    if (Object.keys(toolCallConfig).length > 0) {
      serializableConfig.toolCall = toolCallConfig;
    }
  }
  
  // Add messageActions config (excluding callbacks)
  if (config.messageActions) {
    const messageActionsConfig: Record<string, any> = {};
    Object.entries(config.messageActions).forEach(([key, value]) => {
      if (key !== "onFeedback" && key !== "onCopy" && value !== undefined) {
        if (typeof value === "string" || typeof value === "boolean") {
          messageActionsConfig[key] = value;
        }
      }
    });
    if (Object.keys(messageActionsConfig).length > 0) {
      serializableConfig.messageActions = messageActionsConfig;
    }
  }
  
  // Add markdown config (excluding renderer functions)
  if (config.markdown) {
    const markdownConfig: Record<string, any> = {};
    if (config.markdown.options) markdownConfig.options = config.markdown.options;
    if (config.markdown.disableDefaultStyles !== undefined) {
      markdownConfig.disableDefaultStyles = config.markdown.disableDefaultStyles;
    }
    if (Object.keys(markdownConfig).length > 0) {
      serializableConfig.markdown = markdownConfig;
    }
  }
  
  // Add layout config (excluding render functions)
  if (config.layout) {
    const layoutConfig: Record<string, any> = {};
    
    if (config.layout.header) {
      const headerConfig: Record<string, any> = {};
      Object.entries(config.layout.header).forEach(([key, value]) => {
        if (key !== "render" && (typeof value === "string" || typeof value === "boolean")) {
          headerConfig[key] = value;
        }
      });
      if (Object.keys(headerConfig).length > 0) {
        layoutConfig.header = headerConfig;
      }
    }
    
    if (config.layout.messages) {
      const messagesConfig: Record<string, any> = {};
      Object.entries(config.layout.messages).forEach(([key, value]) => {
        if (key !== "renderUserMessage" && key !== "renderAssistantMessage") {
          if (key === "avatar" && typeof value === "object" && value !== null) {
            messagesConfig.avatar = value;
          } else if (key === "timestamp" && typeof value === "object" && value !== null) {
            // Exclude format function
            const tsConfig: Record<string, any> = {};
            Object.entries(value as Record<string, unknown>).forEach(([tsKey, tsValue]) => {
              if (tsKey !== "format" && (typeof tsValue === "string" || typeof tsValue === "boolean")) {
                tsConfig[tsKey] = tsValue;
              }
            });
            if (Object.keys(tsConfig).length > 0) {
              messagesConfig.timestamp = tsConfig;
            }
          } else if (typeof value === "string" || typeof value === "boolean") {
            messagesConfig[key] = value;
          }
        }
      });
      if (Object.keys(messagesConfig).length > 0) {
        layoutConfig.messages = messagesConfig;
      }
    }
    
    if (Object.keys(layoutConfig).length > 0) {
      serializableConfig.layout = layoutConfig;
    }
  }
  
  return serializableConfig;
}

function generateScriptInstallerCode(config: any): string {
  const serializableConfig = buildSerializableConfig(config);
  
  // Escape single quotes in JSON for HTML attribute
  const configJson = JSON.stringify(serializableConfig, null, 0).replace(/'/g, "&#39;");
  
  return `<script src="https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist/install.global.js" data-config='${configJson}'></script>`;
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

  // Add toolCall config
  lines.push(...generateToolCallConfig(config, "      "));

  // Add messageActions config
  lines.push(...generateMessageActionsConfig(config, "      "));

  // Add markdown config
  lines.push(...generateMarkdownConfig(config, "      "));

  // Add layout config
  lines.push(...generateLayoutConfig(config, "      "));

  if (config.debug) {
    lines.push(`      debug: ${config.debug},`);
  }

  lines.push("      postprocessMessage: ({ text }) => window.AgentWidget.markdownPostprocessor(text)");
  lines.push("    }");
  lines.push("  });");
  lines.push("</script>");

  return lines.join("\n");
}

function generateScriptAdvancedCode(config: any): string {
  const serializableConfig = buildSerializableConfig(config);
  const configJson = JSON.stringify(serializableConfig, null, 2);
  
  const lines: string[] = [
    "<script>",
    "(function() {",
    "  'use strict';",
    "",
    "  // Configuration",
    `  var CONFIG = ${configJson.split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')};`,
    "",
    "  // Constants",
    "  var CDN_BASE = 'https://cdn.jsdelivr.net/npm/vanilla-agent@latest/dist';",
    "  var STORAGE_KEY = 'chat-widget-state';",
    "  var PROCESSED_ACTIONS_KEY = 'chat-widget-processed-actions';",
    "",
    "  // DOM context provider - extracts page elements for AI context",
    "  var domContextProvider = function() {",
    "    var selectors = {",
    "      products: '[data-product-id], .product-card, .product-item, [role=\"article\"]',",
    "      buttons: 'button, [role=\"button\"], .btn',",
    "      links: 'a[href]',",
    "      inputs: 'input, textarea, select'",
    "    };",
    "",
    "    var elements = [];",
    "    Object.entries(selectors).forEach(function(entry) {",
    "      var type = entry[0], selector = entry[1];",
    "      document.querySelectorAll(selector).forEach(function(element) {",
    "        if (!(element instanceof HTMLElement)) return;",
    "        var widgetHost = element.closest('.vanilla-agent-host');",
    "        if (widgetHost) return;",
    "        var text = element.innerText ? element.innerText.trim() : '';",
    "        if (!text) return;",
    "",
    "        var selectorString = element.id ? '#' + element.id :",
    "          element.getAttribute('data-testid') ? '[data-testid=\"' + element.getAttribute('data-testid') + '\"]' :",
    "          element.getAttribute('data-product-id') ? '[data-product-id=\"' + element.getAttribute('data-product-id') + '\"]' :",
    "          element.tagName.toLowerCase();",
    "",
    "        var elementData = {",
    "          type: type,",
    "          tagName: element.tagName.toLowerCase(),",
    "          selector: selectorString,",
    "          innerText: text.substring(0, 200)",
    "        };",
    "",
    "        if (type === 'links' && element instanceof HTMLAnchorElement && element.href) {",
    "          elementData.href = element.href;",
    "        }",
    "        elements.push(elementData);",
    "      });",
    "    });",
    "",
    "    var counts = elements.reduce(function(acc, el) {",
    "      acc[el.type] = (acc[el.type] || 0) + 1;",
    "      return acc;",
    "    }, {});",
    "",
    "    return {",
    "      page_elements: elements.slice(0, 50),",
    "      page_element_count: elements.length,",
    "      element_types: counts,",
    "      page_url: window.location.href,",
    "      page_title: document.title,",
    "      timestamp: new Date().toISOString()",
    "    };",
    "  };",
    "",
    "  // Load CSS dynamically",
    "  var loadCSS = function() {",
    "    if (document.querySelector('link[data-vanilla-agent]')) return;",
    "    var link = document.createElement('link');",
    "    link.rel = 'stylesheet';",
    "    link.href = CDN_BASE + '/widget.css';",
    "    link.setAttribute('data-vanilla-agent', 'true');",
    "    document.head.appendChild(link);",
    "  };",
    "",
    "  // Load JS dynamically",
    "  var loadJS = function(callback) {",
    "    if (window.AgentWidget) { callback(); return; }",
    "    var script = document.createElement('script');",
    "    script.src = CDN_BASE + '/index.global.js';",
    "    script.onload = callback;",
    "    script.onerror = function() { console.error('Failed to load AgentWidget'); };",
    "    document.head.appendChild(script);",
    "  };",
    "",
    "  // Create widget config with advanced features",
    "  var createWidgetConfig = function(agentWidget) {",
    "    var widgetConfig = Object.assign({}, CONFIG);",
    "",
    "    // Flexible JSON stream parser for handling structured actions",
    "    widgetConfig.streamParser = function() {",
    "      return agentWidget.createFlexibleJsonStreamParser(function(parsed) {",
    "        if (!parsed || typeof parsed !== 'object') return null;",
    "        if (parsed.action === 'nav_then_click') return 'Navigating...';",
    "        if (parsed.action === 'message') return parsed.text || '';",
    "        if (parsed.action === 'message_and_click') return parsed.text || 'Processing...';",
    "        return parsed.text || null;",
    "      });",
    "    };",
    "",
    "    // Action parsers to detect JSON actions in responses",
    "    widgetConfig.actionParsers = [",
    "      agentWidget.defaultJsonActionParser,",
    "      function(ctx) {",
    "        var jsonSource = ctx.message.rawContent || ctx.text || ctx.message.content;",
    "        if (!jsonSource || typeof jsonSource !== 'string') return null;",
    "        var cleanJson = jsonSource",
    "          .replace(/^```(?:json)?\\s*\\n?/, '')",
    "          .replace(/\\n?```\\s*$/, '')",
    "          .trim();",
    "        if (!cleanJson.startsWith('{') || !cleanJson.endsWith('}')) return null;",
    "        try {",
    "          var parsed = JSON.parse(cleanJson);",
    "          if (parsed.action) return { type: parsed.action, payload: parsed };",
    "        } catch (e) { return null; }",
    "        return null;",
    "      }",
    "    ];",
    "",
    "    // Action handlers for navigation and other actions",
    "    widgetConfig.actionHandlers = [",
    "      agentWidget.defaultActionHandlers.message,",
    "      agentWidget.defaultActionHandlers.messageAndClick,",
    "      function(action, context) {",
    "        if (action.type !== 'nav_then_click') return;",
    "        var payload = action.payload || action.raw || {};",
    "        var url = payload.page;",
    "        var text = payload.on_load_text || 'Navigating...';",
    "        if (!url) return { handled: true, displayText: text };",
    "        var messageId = context.message ? context.message.id : null;",
    "        var processedActions = JSON.parse(localStorage.getItem(PROCESSED_ACTIONS_KEY) || '[]');",
    "        var actionKey = 'nav_' + messageId + '_' + url;",
    "        if (processedActions.includes(actionKey)) {",
    "          return { handled: true, displayText: text };",
    "        }",
    "        processedActions.push(actionKey);",
    "        localStorage.setItem(PROCESSED_ACTIONS_KEY, JSON.stringify(processedActions));",
    "        var targetUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();",
    "        window.location.href = targetUrl;",
    "        return { handled: true, displayText: text };",
    "      }",
    "    ];",
    "",
    "    // Send DOM context with each request",
    "    widgetConfig.requestMiddleware = function(ctx) {",
    "      return Object.assign({}, ctx.payload, { metadata: domContextProvider() });",
    "    };",
    "",
    "    // Markdown postprocessor",
    "    widgetConfig.postprocessMessage = function(ctx) {",
    "      return agentWidget.markdownPostprocessor(ctx.text);",
    "    };",
    "",
    "    return widgetConfig;",
    "  };",
    "",
    "  // Initialize widget",
    "  var init = function() {",
    "    var agentWidget = window.AgentWidget;",
    "    if (!agentWidget) {",
    "      console.error('AgentWidget not loaded');",
    "      return;",
    "    }",
    "",
    "    var widgetConfig = createWidgetConfig(agentWidget);",
    "",
    "    // Load saved state",
    "    var savedState = localStorage.getItem(STORAGE_KEY);",
    "    if (savedState) {",
    "      try {",
    "        var parsed = JSON.parse(savedState);",
    "        widgetConfig.initialMessages = parsed.messages || [];",
    "      } catch (e) {",
    "        console.error('Failed to load saved state:', e);",
    "      }",
    "    }",
    "",
    "    // Initialize widget",
    "    var handle = agentWidget.initAgentWidget({",
    "      target: 'body',",
    "      useShadowDom: false,",
    "      config: widgetConfig",
    "    });",
    "",
    "    // Save state on message events",
    "    window.addEventListener('vanilla-agent:message', function() {",
    "      var session = handle.getSession ? handle.getSession() : null;",
    "      if (session) {",
    "        localStorage.setItem(STORAGE_KEY, JSON.stringify({",
    "          messages: session.messages,",
    "          timestamp: new Date().toISOString()",
    "        }));",
    "      }",
    "    });",
    "",
    "    // Clear state on clear chat",
    "    window.addEventListener('vanilla-agent:clear-chat', function() {",
    "      localStorage.removeItem(STORAGE_KEY);",
    "      localStorage.removeItem(PROCESSED_ACTIONS_KEY);",
    "    });",
    "  };",
    "",
    "  // Boot sequence: load CSS, then JS, then initialize",
    "  loadCSS();",
    "  loadJS(function() {",
    "    if (document.readyState === 'loading') {",
    "      document.addEventListener('DOMContentLoaded', init);",
    "    } else {",
    "      init();",
    "    }",
    "  });",
    "})();",
    "</script>"
  ];

  return lines.join("\n");
}
