import { createElement, createFragment } from "../utils/dom";
import { ChatWidgetMessage } from "../types";
import { MessageTransform } from "./message-bubble";
import { createStandardBubble } from "./message-bubble";
import { createReasoningBubble } from "./reasoning-bubble";
import { createToolBubble } from "./tool-bubble";

export const renderMessages = (
  container: HTMLElement,
  messages: ChatWidgetMessage[],
  transform: MessageTransform,
  showReasoning: boolean,
  showToolCalls: boolean
) => {
  container.innerHTML = "";
  const fragment = createFragment();

  messages.forEach((message) => {
    let bubble: HTMLElement;
    if (message.variant === "reasoning" && message.reasoning) {
      if (!showReasoning) return;
      bubble = createReasoningBubble(message);
    } else if (message.variant === "tool" && message.toolCall) {
      if (!showToolCalls) return;
      bubble = createToolBubble(message);
    } else {
      bubble = createStandardBubble(message, transform);
    }

    const wrapper = createElement("div", "tvw-flex");
    if (message.role === "user") {
      wrapper.classList.add("tvw-justify-end");
    }
    wrapper.appendChild(bubble);
    fragment.appendChild(wrapper);
  });

  container.appendChild(fragment);
  container.scrollTop = container.scrollHeight;
};




