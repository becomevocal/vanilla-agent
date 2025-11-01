import { escapeHtml } from "./postprocessors";
import { ChatWidgetSession, ChatWidgetSessionStatus } from "./session";
import { ChatWidgetConfig, ChatWidgetMessage } from "./types";
import { applyThemeVariables } from "./utils/theme";
import { statusCopy } from "./utils/constants";
import { createLauncherButton } from "./components/launcher";
import { createWrapper, buildPanel } from "./components/panel";
import { MessageTransform } from "./components/message-bubble";
import { createStandardBubble } from "./components/message-bubble";
import { createReasoningBubble } from "./components/reasoning-bubble";
import { createToolBubble } from "./components/tool-bubble";
import { createSuggestions } from "./components/suggestions";
import { enhanceWithForms } from "./components/forms";
import { pluginRegistry } from "./plugins/registry";

type Controller = {
  update: (config: ChatWidgetConfig) => void;
  destroy: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const buildPostprocessor = (cfg?: ChatWidgetConfig): MessageTransform => {
  if (cfg?.postprocessMessage) {
    return (context) =>
      cfg.postprocessMessage!({
        text: context.text,
        message: context.message,
        streaming: context.streaming
      });
  }
  return ({ text }) => escapeHtml(text);
};

export const createChatExperience = (
  mount: HTMLElement,
  initialConfig?: ChatWidgetConfig
): Controller => {
  // Tailwind config uses important: "#chaty-assistant-root", so ensure mount has this ID
  if (!mount.id || mount.id !== "chaty-assistant-root") {
    mount.id = "chaty-assistant-root";
  }

  let config = { ...initialConfig };
  applyThemeVariables(mount, config);

  // Get plugins for this instance
  const plugins = pluginRegistry.getForInstance(config.plugins);

  let launcherEnabled = config.launcher?.enabled ?? true;
  let autoExpand = config.launcher?.autoExpand ?? false;
  let open = launcherEnabled ? autoExpand : true;
  let postprocess = buildPostprocessor(config);
  let showReasoning = config.features?.showReasoning ?? true;
  let showToolCalls = config.features?.showToolCalls ?? true;

  const { wrapper, panel } = createWrapper(config);
  const {
    container,
    body,
    messagesWrapper,
    suggestions,
    textarea,
    sendButton,
    composerForm,
    statusText,
    introTitle,
    introSubtitle,
    closeButton
  } = buildPanel(config, launcherEnabled);

  panel.appendChild(container);
  mount.appendChild(wrapper);

  const destroyCallbacks: Array<() => void> = [];
  const suggestionsManager = createSuggestions(suggestions);
  let closeHandler: (() => void) | null = null;
  let session: ChatWidgetSession;
  let isStreaming = false;
  let shouldAutoScroll = true;
  let lastScrollTop = 0;
  let lastAutoScrollTime = 0;
  let scrollRAF: number | null = null;
  let isAutoScrollBlocked = false;
  let blockUntilTime = 0;
  let isAutoScrolling = false;

  const AUTO_SCROLL_THROTTLE = 125;
  const AUTO_SCROLL_BLOCK_TIME = 2000;
  const USER_SCROLL_THRESHOLD = 5;
  const BOTTOM_THRESHOLD = 50;

  const scheduleAutoScroll = (force = false) => {
    if (!shouldAutoScroll) return;

    const now = Date.now();

    if (isAutoScrollBlocked && now < blockUntilTime) {
      if (!force) return;
    }

    if (isAutoScrollBlocked && now >= blockUntilTime) {
      isAutoScrollBlocked = false;
    }

    if (!force && !isStreaming) return;

    if (now - lastAutoScrollTime < AUTO_SCROLL_THROTTLE) return;
    lastAutoScrollTime = now;

    if (scrollRAF) {
      cancelAnimationFrame(scrollRAF);
    }

    scrollRAF = requestAnimationFrame(() => {
      if (isAutoScrollBlocked || !shouldAutoScroll) return;
      isAutoScrolling = true;
      body.scrollTop = body.scrollHeight;
      lastScrollTop = body.scrollTop;
      requestAnimationFrame(() => {
        isAutoScrolling = false;
      });
      scrollRAF = null;
    });
  };

  // Message rendering with plugin support
  const renderMessagesWithPlugins = (
    container: HTMLElement,
    messages: ChatWidgetMessage[],
    transform: MessageTransform
  ) => {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    messages.forEach((message) => {
      let bubble: HTMLElement | null = null;

      // Try plugins first
      const matchingPlugin = plugins.find((p) => {
        if (message.variant === "reasoning" && p.renderReasoning) {
          return true;
        }
        if (message.variant === "tool" && p.renderToolCall) {
          return true;
        }
        if (!message.variant && p.renderMessage) {
          return true;
        }
        return false;
      });

      if (matchingPlugin) {
        if (message.variant === "reasoning" && message.reasoning && matchingPlugin.renderReasoning) {
          if (!showReasoning) return;
          bubble = matchingPlugin.renderReasoning({
            message,
            defaultRenderer: () => createReasoningBubble(message),
            config
          });
        } else if (message.variant === "tool" && message.toolCall && matchingPlugin.renderToolCall) {
          if (!showToolCalls) return;
          bubble = matchingPlugin.renderToolCall({
            message,
            defaultRenderer: () => createToolBubble(message),
            config
          });
        } else if (matchingPlugin.renderMessage) {
          bubble = matchingPlugin.renderMessage({
            message,
            defaultRenderer: () => {
              const b = createStandardBubble(message, transform);
              if (message.role !== "user") {
                enhanceWithForms(b, message, config, session);
              }
              return b;
            },
            config
          });
        }
      }

      // Fallback to default rendering if plugin returned null or no plugin matched
      if (!bubble) {
        if (message.variant === "reasoning" && message.reasoning) {
          if (!showReasoning) return;
          bubble = createReasoningBubble(message);
        } else if (message.variant === "tool" && message.toolCall) {
          if (!showToolCalls) return;
          bubble = createToolBubble(message);
        } else {
          bubble = createStandardBubble(message, transform);
          if (message.role !== "user") {
            enhanceWithForms(bubble, message, config, session);
          }
        }
      }

      const wrapper = document.createElement("div");
      wrapper.className = "tvw-flex";
      if (message.role === "user") {
        wrapper.classList.add("tvw-justify-end");
      }
      wrapper.appendChild(bubble);
      fragment.appendChild(wrapper);
    });

    container.appendChild(fragment);
    container.scrollTop = container.scrollHeight;
  };

  const updateOpenState = () => {
    if (!launcherEnabled) return;
    if (open) {
      wrapper.classList.remove("tvw-pointer-events-none", "tvw-opacity-0");
      panel.classList.remove("tvw-scale-95", "tvw-opacity-0");
      panel.classList.add("tvw-scale-100", "tvw-opacity-100");
    } else {
      wrapper.classList.add("tvw-pointer-events-none", "tvw-opacity-0");
      panel.classList.remove("tvw-scale-100", "tvw-opacity-100");
      panel.classList.add("tvw-scale-95", "tvw-opacity-0");
    }
  };

  const setOpenState = (nextOpen: boolean) => {
    if (!launcherEnabled) return;
    if (open === nextOpen) return;
    open = nextOpen;
    updateOpenState();
    if (open) {
      recalcPanelHeight();
      scheduleAutoScroll(true);
    }
  };

  const setComposerDisabled = (disabled: boolean) => {
    textarea.disabled = disabled;
    sendButton.disabled = disabled;
    suggestionsManager.buttons.forEach((btn) => {
      btn.disabled = disabled;
    });
  };

  const updateCopy = () => {
    introTitle.textContent = config.copy?.welcomeTitle ?? "Hello 👋";
    introSubtitle.textContent =
      config.copy?.welcomeSubtitle ??
      "Ask anything about your account or products.";
    textarea.placeholder = config.copy?.inputPlaceholder ?? "Type your message…";
    sendButton.textContent = config.copy?.sendButtonLabel ?? "Send";
  };

  session = new ChatWidgetSession(config, {
    onMessagesChanged(messages) {
      renderMessagesWithPlugins(messagesWrapper, messages, postprocess);
      scheduleAutoScroll(!isStreaming);
    },
    onStatusChanged(status) {
      statusText.textContent = statusCopy[status];
    },
    onStreamingChanged(streaming) {
      isStreaming = streaming;
      setComposerDisabled(streaming);
      if (!streaming) {
        scheduleAutoScroll(true);
      }
    }
  });

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const value = textarea.value.trim();
    if (!value) return;
    textarea.value = "";
    session.sendMessage(value);
  };

  const handleInputEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendButton.click();
    }
  };

  const toggleOpen = () => {
    setOpenState(!open);
  };

  let launcherButtonInstance = launcherEnabled
    ? createLauncherButton(config, toggleOpen)
    : null;

  if (launcherButtonInstance) {
    mount.appendChild(launcherButtonInstance.element);
  }
  updateOpenState();
  suggestionsManager.render(config.suggestionChips, session, textarea);
  updateCopy();
  setComposerDisabled(session.isStreaming());
  scheduleAutoScroll(true);

  const recalcPanelHeight = () => {
    if (!launcherEnabled) {
      panel.style.height = "";
      panel.style.width = "";
      return;
    }
    const launcherWidth = config?.launcher?.width ?? config?.launcherWidth;
    const width = launcherWidth ?? "min(360px, calc(100vw - 24px))";
    panel.style.width = width;
    panel.style.maxWidth = width;
    const viewportHeight = window.innerHeight;
    const verticalMargin = 64; // leave space for launcher's offset
    const available = Math.max(200, viewportHeight - verticalMargin);
    const clamped = Math.min(640, available);
    panel.style.height = `${clamped}px`;
  };

  recalcPanelHeight();
  window.addEventListener("resize", recalcPanelHeight);
  destroyCallbacks.push(() => window.removeEventListener("resize", recalcPanelHeight));

  lastScrollTop = body.scrollTop;

  const handleScroll = () => {
    const scrollTop = body.scrollTop;
    const scrollHeight = body.scrollHeight;
    const clientHeight = body.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const delta = Math.abs(scrollTop - lastScrollTop);
    lastScrollTop = scrollTop;

    if (isAutoScrolling) return;
    if (delta <= USER_SCROLL_THRESHOLD) return;

    if (!shouldAutoScroll && distanceFromBottom < BOTTOM_THRESHOLD) {
      isAutoScrollBlocked = false;
      shouldAutoScroll = true;
      return;
    }

    if (shouldAutoScroll && distanceFromBottom > BOTTOM_THRESHOLD) {
      isAutoScrollBlocked = true;
      blockUntilTime = Date.now() + AUTO_SCROLL_BLOCK_TIME;
      shouldAutoScroll = false;
    }
  };

  body.addEventListener("scroll", handleScroll, { passive: true });
  destroyCallbacks.push(() => body.removeEventListener("scroll", handleScroll));
  destroyCallbacks.push(() => {
    if (scrollRAF) cancelAnimationFrame(scrollRAF);
  });

  const refreshCloseButton = () => {
    if (!closeButton) return;
    if (closeHandler) {
      closeButton.removeEventListener("click", closeHandler);
      closeHandler = null;
    }
    if (launcherEnabled) {
      closeButton.style.display = "";
      closeHandler = () => {
        open = false;
        updateOpenState();
      };
      closeButton.addEventListener("click", closeHandler);
    } else {
      closeButton.style.display = "none";
    }
  };

  refreshCloseButton();

  composerForm.addEventListener("submit", handleSubmit);
  textarea.addEventListener("keydown", handleInputEnter);

  destroyCallbacks.push(() => {
    composerForm.removeEventListener("submit", handleSubmit);
    textarea.removeEventListener("keydown", handleInputEnter);
  });

  destroyCallbacks.push(() => {
    session.cancel();
  });

  if (launcherButtonInstance) {
    destroyCallbacks.push(() => {
      launcherButtonInstance?.destroy();
    });
  }

  return {
    update(nextConfig: ChatWidgetConfig) {
      config = { ...config, ...nextConfig };
      applyThemeVariables(mount, config);

      // Update plugins
      const newPlugins = pluginRegistry.getForInstance(config.plugins);
      plugins.length = 0;
      plugins.push(...newPlugins);

      launcherEnabled = config.launcher?.enabled ?? true;
      autoExpand = config.launcher?.autoExpand ?? false;
      showReasoning = config.features?.showReasoning ?? true;
      showToolCalls = config.features?.showToolCalls ?? true;

      if (config.launcher?.enabled === false && launcherButtonInstance) {
        launcherButtonInstance.destroy();
        launcherButtonInstance = null;
        setOpenState(true);
      }

      if (config.launcher?.enabled !== false && !launcherButtonInstance) {
        launcherButtonInstance = createLauncherButton(config, toggleOpen);
        mount.appendChild(launcherButtonInstance.element);
      }

      if (launcherButtonInstance) {
        launcherButtonInstance.update(config);
      }

      if (!launcherEnabled) {
        setOpenState(true);
      } else if (config.launcher?.autoExpand !== undefined) {
        setOpenState(Boolean(config.launcher.autoExpand));
      }
      recalcPanelHeight();
      refreshCloseButton();

      postprocess = buildPostprocessor(config);
      session.updateConfig(config);
      renderMessagesWithPlugins(
        messagesWrapper,
        session.getMessages(),
        postprocess
      );
      suggestionsManager.render(config.suggestionChips, session, textarea);
      updateCopy();
      setComposerDisabled(session.isStreaming());
    },
    open() {
      if (!launcherEnabled) return;
      setOpenState(true);
    },
    close() {
      if (!launcherEnabled) return;
      setOpenState(false);
    },
    toggle() {
      if (!launcherEnabled) return;
      setOpenState(!open);
    },
    destroy() {
      destroyCallbacks.forEach((cb) => cb());
      wrapper.remove();
      launcherButtonInstance?.destroy();
      if (closeHandler) {
        closeButton.removeEventListener("click", closeHandler);
      }
    }
  };
};

export type ChatWidgetController = Controller;
