import { createElement } from "../utils/dom";
import { ChatWidgetSession } from "../session";
import { ChatWidgetMessage } from "../types";

export interface SuggestionButtons {
  buttons: HTMLButtonElement[];
  render: (chips: string[] | undefined, session: ChatWidgetSession, textarea: HTMLTextAreaElement, messages?: ChatWidgetMessage[]) => void;
}

export const createSuggestions = (container: HTMLElement): SuggestionButtons => {
  const suggestionButtons: HTMLButtonElement[] = [];

  const render = (chips: string[] | undefined, session: ChatWidgetSession, textarea: HTMLTextAreaElement, messages?: ChatWidgetMessage[]) => {
    container.innerHTML = "";
    suggestionButtons.length = 0;
    if (!chips || !chips.length) return;

    // Hide suggestions after the first user message is sent
    // Use provided messages or get from session
    const messagesToCheck = messages ?? (session ? session.getMessages() : []);
    const hasUserMessage = messagesToCheck.some((msg) => msg.role === "user");
    if (hasUserMessage) return;

    const fragment = document.createDocumentFragment();
    const streaming = session ? session.isStreaming() : false;
    chips.forEach((chip) => {
      const btn = createElement(
        "button",
        "tvw-rounded-button tvw-bg-cw-surface tvw-px-3 tvw-py-1.5 tvw-text-xs tvw-font-medium tvw-text-cw-muted hover:tvw-opacity-90 tvw-cursor-pointer tvw-border tvw-border-gray-200"
      ) as HTMLButtonElement;
      btn.type = "button";
      btn.textContent = chip;
      btn.disabled = streaming;
      btn.addEventListener("click", () => {
        if (!session || session.isStreaming()) return;
        textarea.value = "";
        session.sendMessage(chip);
      });
      fragment.appendChild(btn);
      suggestionButtons.push(btn);
    });
    container.appendChild(fragment);
  };

  return {
    buttons: suggestionButtons,
    render
  };
};



