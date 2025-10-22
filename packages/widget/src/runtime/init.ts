import { createChatExperience, TravrseChatController } from "../ui";
import { TravrseChatConfig, TravrseInitOptions } from "../types";

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

const widgetCssHref = () => new URL("../widget.css", import.meta.url).href;

const mountStyles = (root: ShadowRoot | HTMLElement) => {
  const href = widgetCssHref();

  if (root instanceof ShadowRoot) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-chat-widget", "true");
    root.insertBefore(link, root.firstChild);
  } else {
    const existing = document.head.querySelector<HTMLLinkElement>(
      "link[data-chat-widget]"
    );
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-chat-widget", "true");
      document.head.appendChild(link);
    }
  }
};

export type TravrseInitHandle = TravrseChatController & { host: HTMLElement };

export const initTravrseChat = (
  options: TravrseInitOptions
): TravrseInitHandle => {
  const target = ensureTarget(options.target);
  const host = document.createElement("div");
  host.className = "chat-widget-host";
  target.appendChild(host);

  const useShadow = options.useShadowDom !== false;
  let mount: HTMLElement;
  let root: ShadowRoot | HTMLElement;

  if (useShadow) {
    const shadowRoot = host.attachShadow({ mode: "open" });
    root = shadowRoot;
    mount = document.createElement("div");
    mount.id = "chat-widget-root";
    shadowRoot.appendChild(mount);
    mountStyles(shadowRoot);
  } else {
    root = host;
    mount = document.createElement("div");
    mount.id = "chat-widget-root";
    host.appendChild(mount);
    mountStyles(host);
  }

  let controller = createChatExperience(mount, options.config);
  options.onReady?.();

  return {
    host,
    update(nextConfig: TravrseChatConfig) {
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
