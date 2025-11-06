import { createElement } from "../utils/dom";
import { ChatWidgetMessage } from "../types";

export type MessageTransform = (context: {
  text: string;
  message: ChatWidgetMessage;
  streaming: boolean;
}) => string;

export const createStandardBubble = (
  message: ChatWidgetMessage,
  transform: MessageTransform
): HTMLElement => {
  const classes = [
    "tvw-max-w-[85%]",
    "tvw-rounded-2xl",
    "tvw-text-sm",
    "tvw-leading-relaxed",
    "tvw-shadow-sm"
  ];

  if (message.role === "user") {
    classes.push(
      "tvw-ml-auto",
      "tvw-bg-cw-accent",
      "tvw-text-white",
      "tvw-px-5",
      "tvw-py-3"
    );
  } else {
    classes.push(
      "tvw-bg-cw-surface",
      "tvw-border",
      "tvw-border-cw-message-border",
      "tvw-text-cw-primary",
      "tvw-px-5",
      "tvw-py-3"
    );
  }

  const bubble = createElement("div", classes.join(" "));
  bubble.innerHTML = transform({
    text: message.content,
    message,
    streaming: Boolean(message.streaming)
  });

  return bubble;
};



