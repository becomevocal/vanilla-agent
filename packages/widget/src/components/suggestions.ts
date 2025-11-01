import { createElement } from "../utils/dom";
import { ChatWidgetSession } from "../session";

export interface SuggestionButtons {
  buttons: HTMLButtonElement[];
  render: (chips: string[] | undefined, session: ChatWidgetSession, textarea: HTMLTextAreaElement) => void;
}

export const createSuggestions = (container: HTMLElement): SuggestionButtons => {
  const suggestionButtons: HTMLButtonElement[] = [];

  const render = (chips: string[] | undefined, session: ChatWidgetSession, textarea: HTMLTextAreaElement) => {
    container.innerHTML = "";
    suggestionButtons.length = 0;
    if (!chips || !chips.length) return;

    const fragment = document.createDocumentFragment();
    const streaming = session.isStreaming();
    chips.forEach((chip) => {
      const btn = createElement(
        "button",
        "tvw-rounded-full tvw-bg-gray-100 tvw-px-3 tvw-py-1.5 tvw-text-xs tvw-font-medium tvw-text-cw-muted hover:tvw-bg-gray-200 tvw-cursor-pointer"
      ) as HTMLButtonElement;
      btn.type = "button";
      btn.textContent = chip;
      btn.disabled = streaming;
      btn.addEventListener("click", () => {
        if (session.isStreaming()) return;
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

