import { createElement } from "../utils/dom";
import { ChatWidgetConfig } from "../types";
import { positionMap } from "../utils/positioning";

export interface LauncherButton {
  element: HTMLButtonElement;
  update: (config: ChatWidgetConfig) => void;
  destroy: () => void;
}

export const createLauncherButton = (
  config: ChatWidgetConfig | undefined,
  onToggle: () => void
): LauncherButton => {
  const button = createElement("button") as HTMLButtonElement;
  button.type = "button";
  button.innerHTML = `
    <span class="tvw-inline-flex tvw-h-10 tvw-w-10 tvw-items-center tvw-justify-center tvw-rounded-full tvw-bg-cw-primary tvw-text-white" data-role="launcher-icon">💬</span>
    <img data-role="launcher-image" class="tvw-h-10 tvw-w-10 tvw-rounded-full tvw-object-cover" alt="" style="display:none" />
    <span class="tvw-flex tvw-flex-col tvw-items-start tvw-text-left">
      <span class="tvw-text-sm tvw-font-semibold tvw-text-cw-primary" data-role="launcher-title"></span>
      <span class="tvw-text-xs tvw-text-cw-muted" data-role="launcher-subtitle"></span>
    </span>
    <span class="tvw-ml-2 tvw-grid tvw-h-8 tvw-w-8 tvw-place-items-center tvw-rounded-full tvw-bg-cw-primary tvw-text-white">↗</span>
  `;
  button.addEventListener("click", onToggle);

  const update = (newConfig: ChatWidgetConfig) => {
    const launcher = newConfig.launcher ?? {};

    const titleEl = button.querySelector("[data-role='launcher-title']");
    if (titleEl) {
      titleEl.textContent = launcher.title ?? "Chat Assistant";
    }

    const subtitleEl = button.querySelector("[data-role='launcher-subtitle']");
    if (subtitleEl) {
      subtitleEl.textContent = launcher.subtitle ?? "Get answers fast";
    }

    const icon = button.querySelector<HTMLSpanElement>("[data-role='launcher-icon']");
    if (icon) {
      if (launcher.iconUrl) {
        icon.style.display = "none";
      } else {
        icon.style.display = "";
        icon.textContent = launcher.iconText ?? "💬";
      }
    }

    const img = button.querySelector<HTMLImageElement>("[data-role='launcher-image']");
    if (img) {
      if (launcher.iconUrl) {
        img.src = launcher.iconUrl;
        img.style.display = "block";
      } else {
        img.style.display = "none";
      }
    }

    const positionClass =
      launcher.position && positionMap[launcher.position]
        ? positionMap[launcher.position]
        : positionMap["bottom-right"];

    const base =
      "tvw-fixed tvw-flex tvw-items-center tvw-gap-3 tvw-rounded-full tvw-bg-cw-surface tvw-py-2.5 tvw-pl-4 tvw-pr-3 tvw-shadow-lg tvw-border tvw-border-gray-200 tvw-transition hover:tvw-translate-y-[-2px] tvw-cursor-pointer";

    button.className = `${base} ${positionClass}`;
  };

  const destroy = () => {
    button.removeEventListener("click", onToggle);
    button.remove();
  };

  // Initial update
  if (config) {
    update(config);
  }

  return {
    element: button,
    update,
    destroy
  };
};

