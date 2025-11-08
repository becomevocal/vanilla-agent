import { createChatExperience, ChatWidgetController } from "../ui";
import { ChatWidgetConfig, ChatWidgetInitOptions } from "../types";

const ensureTarget = (target: string | HTMLElement): HTMLElement => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Chat widget can only be mounted in a browser environment");
  }

  if (typeof target === "string") {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) {
      throw new Error(`Chat widget target "${target}" was not found`);
    }
    return element;
  }

  return target;
};

const widgetCssHref = (): string | null => {
  try {
    // This works in ESM builds but not in IIFE builds
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return new URL("../widget.css", import.meta.url).href;
    }
  } catch {
    // Fallback for IIFE builds where CSS should be loaded separately
  }
  return null;
};

const mountStyles = (root: ShadowRoot | HTMLElement) => {
  const href = widgetCssHref();

  if (root instanceof ShadowRoot) {
    // For shadow DOM, we need to load CSS into the shadow root
    if (href) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-site-agent", "true");
      root.insertBefore(link, root.firstChild);
    }
    // If href is null (IIFE build), CSS should already be loaded globally
  } else {
    // For non-shadow DOM, check if CSS is already loaded
    const existing = document.head.querySelector<HTMLLinkElement>(
      "link[data-site-agent]"
    );
    if (!existing) {
      if (href) {
        // ESM build - load CSS dynamically
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-site-agent", "true");
        document.head.appendChild(link);
      }
      // IIFE build - CSS should be loaded via <link> tag before script
      // If not found, we'll assume it's loaded globally or warn in dev
    }
  }
};

export type ChatWidgetInitHandle = ChatWidgetController & { host: HTMLElement };

export const initChatWidget = (
  options: ChatWidgetInitOptions
): ChatWidgetInitHandle => {
  const target = ensureTarget(options.target);
  const host = document.createElement("div");
  host.className = "site-agent-host";
  target.appendChild(host);

  const useShadow = options.useShadowDom !== false;
  let mount: HTMLElement;
  let root: ShadowRoot | HTMLElement;

  if (useShadow) {
    const shadowRoot = host.attachShadow({ mode: "open" });
    root = shadowRoot;
    mount = document.createElement("div");
    mount.id = "site-agent-root";
    shadowRoot.appendChild(mount);
    mountStyles(shadowRoot);
  } else {
    root = host;
    mount = document.createElement("div");
    mount.id = "site-agent-root";
    host.appendChild(mount);
    mountStyles(host);
  }

  let controller = createChatExperience(mount, options.config);
  options.onReady?.();

  return {
    host,
    update(nextConfig: ChatWidgetConfig) {
      controller.update(nextConfig);
    },
    open() {
      controller.open();
    },
    close() {
      controller.close();
    },
    toggle() {
      controller.toggle();
    },
    destroy() {
      controller.destroy();
      host.remove();
    }
  };
};
