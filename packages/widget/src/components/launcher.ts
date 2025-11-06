import { createElement } from "../utils/dom";
import { ChatWidgetConfig } from "../types";
import { positionMap } from "../utils/positioning";
import { renderLucideIcon } from "../utils/icons";

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
    <span class="tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-bg-cw-primary tvw-text-white" data-role="launcher-icon">💬</span>
    <img data-role="launcher-image" class="tvw-rounded-full tvw-object-cover" alt="" style="display:none" />
    <span class="tvw-flex tvw-flex-col tvw-items-start tvw-text-left">
      <span class="tvw-text-sm tvw-font-semibold tvw-text-cw-primary" data-role="launcher-title"></span>
      <span class="tvw-text-xs tvw-text-cw-muted" data-role="launcher-subtitle"></span>
    </span>
    <span class="tvw-ml-2 tvw-grid tvw-place-items-center tvw-rounded-full tvw-bg-cw-primary tvw-text-cw-call-to-action" data-role="launcher-agent-icon">↗</span>
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
      const iconSize = launcher.iconSize ?? "40px";
      icon.style.height = iconSize;
      icon.style.width = iconSize;
      if (launcher.iconUrl) {
        icon.style.display = "none";
      } else {
        icon.style.display = "";
        icon.textContent = launcher.iconText ?? "💬";
      }
    }

    const img = button.querySelector<HTMLImageElement>("[data-role='launcher-image']");
    if (img) {
      const iconSize = launcher.iconSize ?? "40px";
      img.style.height = iconSize;
      img.style.width = iconSize;
      if (launcher.iconUrl) {
        img.src = launcher.iconUrl;
        img.style.display = "block";
      } else {
        img.style.display = "none";
      }
    }

    const agentIconEl = button.querySelector<HTMLSpanElement>("[data-role='launcher-agent-icon']");
    if (agentIconEl) {
      const agentIconSize = launcher.agentIconSize ?? "32px";
      agentIconEl.style.height = agentIconSize;
      agentIconEl.style.width = agentIconSize;
      
      // Apply background color if configured
      if (launcher.agentIconBackgroundColor) {
        agentIconEl.style.backgroundColor = launcher.agentIconBackgroundColor;
        agentIconEl.classList.remove("tvw-bg-cw-primary");
      } else {
        agentIconEl.style.backgroundColor = "";
        agentIconEl.classList.add("tvw-bg-cw-primary");
      }
      
      // Calculate padding to adjust icon size
      let paddingTotal = 0;
      if (launcher.agentIconPadding) {
        agentIconEl.style.boxSizing = "border-box";
        agentIconEl.style.padding = launcher.agentIconPadding;
        // Parse padding value to calculate total padding (padding applies to both sides)
        const paddingValue = parseFloat(launcher.agentIconPadding) || 0;
        paddingTotal = paddingValue * 2; // padding on both sides
      } else {
        agentIconEl.style.boxSizing = "";
        agentIconEl.style.padding = "";
      }
      
      if (launcher.agentIconHidden) {
        agentIconEl.style.display = "none";
      } else {
        agentIconEl.style.display = "";
        
        // Clear existing content
        agentIconEl.innerHTML = "";
        
        // Use Lucide icon if provided, otherwise fall back to text
        if (launcher.agentIconName) {
          // Calculate actual icon size by subtracting padding
          const containerSize = parseFloat(agentIconSize) || 24;
          const iconSize = Math.max(containerSize - paddingTotal, 8); // Ensure minimum size of 8px
          const iconSvg = renderLucideIcon(launcher.agentIconName, iconSize, "currentColor", 2);
          if (iconSvg) {
            agentIconEl.appendChild(iconSvg);
          } else {
            // Fallback to text if icon fails to render
            agentIconEl.textContent = launcher.agentIconText ?? "↗";
          }
        } else {
          agentIconEl.textContent = launcher.agentIconText ?? "↗";
        }
      }
    }

    const positionClass =
      launcher.position && positionMap[launcher.position]
        ? positionMap[launcher.position]
        : positionMap["bottom-right"];

    const base =
      "tvw-fixed tvw-flex tvw-items-center tvw-gap-3 tvw-rounded-launcher tvw-bg-cw-surface tvw-py-2.5 tvw-pl-4 tvw-pr-3 tvw-shadow-lg tvw-border tvw-border-gray-200 tvw-transition hover:tvw-translate-y-[-2px] tvw-cursor-pointer";

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


