import { createAgentExperience, AgentWidgetController } from "../ui";
import { AgentWidgetConfig, AgentWidgetInitOptions } from "../types";

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

  const adoptExistingStylesheet = () => {
    if (!(root instanceof ShadowRoot)) {
      return;
    }

    if (root.querySelector('link[data-vanilla-agent]')) {
      return;
    }

    const globalLink = document.head.querySelector<HTMLLinkElement>(
      'link[data-vanilla-agent]'
    );
    if (!globalLink) {
      return;
    }

    const clonedLink = globalLink.cloneNode(true) as HTMLLinkElement;
    root.insertBefore(clonedLink, root.firstChild);
  };

  if (root instanceof ShadowRoot) {
    // For shadow DOM, we need to load CSS into the shadow root
    if (href) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-vanilla-agent", "true");
      root.insertBefore(link, root.firstChild);
    } else {
      adoptExistingStylesheet();
    }
    // If href is null (IIFE build), CSS should already be loaded globally
  } else {
    // For non-shadow DOM, check if CSS is already loaded
    const existing = document.head.querySelector<HTMLLinkElement>(
      "link[data-vanilla-agent]"
    );
    if (!existing) {
      if (href) {
        // ESM build - load CSS dynamically
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-vanilla-agent", "true");
        document.head.appendChild(link);
      }
      // IIFE build - CSS should be loaded via <link> tag before script
      // If not found, we'll assume it's loaded globally or warn in dev
    }
  }
};

export type AgentWidgetInitHandle = AgentWidgetController & { host: HTMLElement };

export const initAgentWidget = (
  options: AgentWidgetInitOptions
): AgentWidgetInitHandle => {
  const target = ensureTarget(options.target);
  const host = document.createElement("div");
  host.className = "vanilla-agent-host";
  target.appendChild(host);

  const useShadow = options.useShadowDom !== false;
  let mount: HTMLElement;
  let root: ShadowRoot | HTMLElement;

  if (useShadow) {
    const shadowRoot = host.attachShadow({ mode: "open" });
    root = shadowRoot;
    mount = document.createElement("div");
    mount.id = "vanilla-agent-root";
    shadowRoot.appendChild(mount);
    mountStyles(shadowRoot);
  } else {
    root = host;
    mount = document.createElement("div");
    mount.id = "vanilla-agent-root";
    host.appendChild(mount);
    mountStyles(host);
  }

  let controller = createAgentExperience(mount, options.config);
  options.onReady?.();

  return {
    host,
    update(nextConfig: AgentWidgetConfig) {
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
    clearChat() {
      controller.clearChat();
    },
    destroy() {
      controller.destroy();
      host.remove();
    }
  };
};
