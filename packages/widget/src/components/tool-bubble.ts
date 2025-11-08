import { createElement } from "../utils/dom";
import { ChatWidgetMessage } from "../types";
import { formatUnknownValue, describeToolTitle } from "../utils/formatting";

// Expansion state per widget instance
const toolExpansionState = new Set<string>();

export const createToolBubble = (message: ChatWidgetMessage): HTMLElement => {
  const tool = message.toolCall;
  const bubble = createElement(
    "div",
    [
      "tvw-max-w-[85%]",
      "tvw-rounded-2xl",
      "tvw-bg-cw-surface",
      "tvw-border",
      "tvw-border-cw-message-border",
      "tvw-text-cw-primary",
      "tvw-shadow-sm",
      "tvw-overflow-hidden",
      "tvw-px-0",
      "tvw-py-0"
    ].join(" ")
  );

  if (!tool) {
    return bubble;
  }

  let expanded = toolExpansionState.has(message.id);
  const header = createElement(
    "button",
    "tvw-flex tvw-w-full tvw-items-center tvw-justify-between tvw-gap-3 tvw-bg-transparent tvw-px-4 tvw-py-3 tvw-text-left tvw-cursor-pointer tvw-border-none"
  ) as HTMLButtonElement;
  header.type = "button";
  header.setAttribute("aria-expanded", expanded ? "true" : "false");

  const headerContent = createElement("div", "tvw-flex tvw-flex-col tvw-text-left");
  const title = createElement("span", "tvw-text-xs tvw-text-cw-primary");
  title.textContent = describeToolTitle(tool);
  headerContent.appendChild(title);

  if (tool.name) {
    const name = createElement("span", "tvw-text-[11px] tvw-text-cw-muted");
    name.textContent = tool.name;
    headerContent.appendChild(name);
  }

  const toggleLabel = createElement(
    "span",
    "tvw-text-xs tvw-text-cw-primary"
  );
  toggleLabel.textContent = expanded ? "Hide" : "Show";

  const headerMeta = createElement("div", "tvw-flex tvw-items-center tvw-gap-2");
  headerMeta.append(toggleLabel);

  header.append(headerContent, headerMeta);

  const content = createElement(
    "div",
    "tvw-border-t tvw-border-gray-200 tvw-bg-gray-50 tvw-space-y-3 tvw-px-4 tvw-py-3"
  );
  content.style.display = expanded ? "" : "none";

  if (tool.args !== undefined) {
    const argsBlock = createElement("div", "tvw-space-y-1");
    const argsLabel = createElement(
      "div",
      "tvw-font-xxs tvw-font-medium tvw-text-cw-muted"
    );
    argsLabel.textContent = "Arguments";
    const argsPre = createElement(
      "pre",
      "tvw-max-h-48 tvw-overflow-auto tvw-whitespace-pre-wrap tvw-rounded-lg tvw-border tvw-border-gray-100 tvw-bg-white tvw-px-3 tvw-py-2 tvw-font-xxs tvw-text-cw-primary"
    );
    argsPre.textContent = formatUnknownValue(tool.args);
    argsBlock.append(argsLabel, argsPre);
    content.appendChild(argsBlock);
  }

  if (tool.chunks && tool.chunks.length) {
    const logsBlock = createElement("div", "tvw-space-y-1");
    const logsLabel = createElement(
      "div",
      "tvw-font-xxs tvw-font-medium tvw-text-cw-muted"
    );
    logsLabel.textContent = "Activity";
    const logsPre = createElement(
      "pre",
      "tvw-max-h-48 tvw-overflow-auto tvw-whitespace-pre-wrap tvw-rounded-lg tvw-border tvw-border-gray-100 tvw-bg-white tvw-px-3 tvw-py-2 tvw-font-xxs tvw-text-cw-primary"
    );
    logsPre.textContent = tool.chunks.join("\n");
    logsBlock.append(logsLabel, logsPre);
    content.appendChild(logsBlock);
  }

  if (tool.status === "complete" && tool.result !== undefined) {
    const resultBlock = createElement("div", "tvw-space-y-1");
    const resultLabel = createElement(
      "div",
      "tvw-font-xxs tvw-text-sm tvw-text-cw-muted"
    );
    resultLabel.textContent = "Result";
    const resultPre = createElement(
      "pre",
      "tvw-max-h-48 tvw-overflow-auto tvw-whitespace-pre-wrap tvw-rounded-lg tvw-border tvw-border-gray-100 tvw-bg-white tvw-px-3 tvw-py-2 tvw-font-xxs tvw-text-cw-primary"
    );
    resultPre.textContent = formatUnknownValue(tool.result);
    resultBlock.append(resultLabel, resultPre);
    content.appendChild(resultBlock);
  }

  if (tool.status === "complete" && typeof tool.duration === "number") {
    const duration = createElement(
      "div",
      "tvw-font-xxs tvw-text-cw-muted"
    );
    duration.textContent = `Duration: ${tool.duration}ms`;
    content.appendChild(duration);
  }

  const applyToolExpansion = () => {
    header.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggleLabel.textContent = expanded ? "Hide" : "Show";
    content.style.display = expanded ? "" : "none";
  };

  const toggleToolExpansion = () => {
    expanded = !expanded;
    if (expanded) {
      toolExpansionState.add(message.id);
    } else {
      toolExpansionState.delete(message.id);
    }
    applyToolExpansion();
  };

  header.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    toggleToolExpansion();
  });

  header.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleToolExpansion();
    }
  });

  applyToolExpansion();

  bubble.append(header, content);
  return bubble;
};



