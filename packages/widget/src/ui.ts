import { escapeHtml } from "./postprocessors";
import { ChatWidgetSession, ChatWidgetSessionStatus } from "./session";
import { ChatWidgetConfig, ChatWidgetMessage } from "./types";
import { applyThemeVariables } from "./utils/theme";
import { renderLucideIcon } from "./utils/icons";
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
  let prevAutoExpand = autoExpand;
  let prevLauncherEnabled = launcherEnabled;
  let open = launcherEnabled ? autoExpand : true;
  let postprocess = buildPostprocessor(config);
  let showReasoning = config.features?.showReasoning ?? true;
  let showToolCalls = config.features?.showToolCalls ?? true;
  
  // Get status indicator config
  const statusConfig = config.statusIndicator ?? {};
  const getStatusText = (status: ChatWidgetSessionStatus): string => {
    if (status === "idle") return statusConfig.idleText ?? statusCopy.idle;
    if (status === "connecting") return statusConfig.connectingText ?? statusCopy.connecting;
    if (status === "connected") return statusConfig.connectedText ?? statusCopy.connected;
    if (status === "error") return statusConfig.errorText ?? statusCopy.error;
    return statusCopy[status];
  };

  const { wrapper, panel } = createWrapper(config);
  const {
    container,
    body,
    messagesWrapper,
    suggestions,
    textarea,
    sendButton,
    sendButtonWrapper,
    composerForm,
    statusText,
    introTitle,
    introSubtitle,
    closeButton,
    iconHolder
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
      // Hide launcher button when widget is open
      if (launcherButtonInstance) {
        launcherButtonInstance.element.style.display = "none";
      }
    } else {
      wrapper.classList.add("tvw-pointer-events-none", "tvw-opacity-0");
      panel.classList.remove("tvw-scale-100", "tvw-opacity-100");
      panel.classList.add("tvw-scale-95", "tvw-opacity-0");
      // Show launcher button when widget is closed
      if (launcherButtonInstance) {
        launcherButtonInstance.element.style.display = "";
      }
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
      // Re-render suggestions to hide them after first user message
      // Pass messages directly to avoid calling session.getMessages() during construction
      if (session) {
        const hasUserMessage = messages.some((msg) => msg.role === "user");
        if (hasUserMessage) {
          // Hide suggestions if user message exists
          suggestionsManager.render([], session, textarea, messages);
        } else {
          // Show suggestions if no user message yet
          suggestionsManager.render(config.suggestionChips, session, textarea, messages);
        }
      }
      scheduleAutoScroll(!isStreaming);
    },
    onStatusChanged(status) {
      const currentStatusConfig = config.statusIndicator ?? {};
      const getCurrentStatusText = (status: ChatWidgetSessionStatus): string => {
        if (status === "idle") return currentStatusConfig.idleText ?? statusCopy.idle;
        if (status === "connecting") return currentStatusConfig.connectingText ?? statusCopy.connecting;
        if (status === "connected") return currentStatusConfig.connectedText ?? statusCopy.connected;
        if (status === "error") return currentStatusConfig.errorText ?? statusCopy.error;
        return statusCopy[status];
      };
      statusText.textContent = getCurrentStatusText(status);
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
      }

      if (config.launcher?.enabled !== false && !launcherButtonInstance) {
        launcherButtonInstance = createLauncherButton(config, toggleOpen);
        mount.appendChild(launcherButtonInstance.element);
      }

      if (launcherButtonInstance) {
        launcherButtonInstance.update(config);
      }

      // Only update open state if launcher enabled state changed or autoExpand value changed
      const launcherEnabledChanged = launcherEnabled !== prevLauncherEnabled;
      const autoExpandChanged = autoExpand !== prevAutoExpand;

      if (launcherEnabledChanged) {
        // Launcher was enabled/disabled - update state accordingly
        if (!launcherEnabled) {
          // When launcher is disabled, always keep panel open
          open = true;
          updateOpenState();
        } else {
          // Launcher was just enabled - respect autoExpand setting
          setOpenState(autoExpand);
        }
      } else if (autoExpandChanged) {
        // autoExpand value changed - update state to match
        setOpenState(autoExpand);
      }
      // Otherwise, preserve current open state (user may have manually opened/closed)

      // Update previous values for next comparison
      prevAutoExpand = autoExpand;
      prevLauncherEnabled = launcherEnabled;
      recalcPanelHeight();
      refreshCloseButton();

      // Update panel icon sizes
      const launcher = config.launcher ?? {};
      if (iconHolder) {
        const headerIconSize = launcher.headerIconSize ?? "48px";
        iconHolder.style.height = headerIconSize;
        iconHolder.style.width = headerIconSize;
        const img = iconHolder.querySelector("img");
        if (img) {
          img.style.height = headerIconSize;
          img.style.width = headerIconSize;
        }
      }
      if (closeButton) {
        const closeButtonSize = launcher.closeButtonSize ?? "32px";
        closeButton.style.height = closeButtonSize;
        closeButton.style.width = closeButtonSize;
      }

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
      
      // Update send button styling
      const sendButtonConfig = config.sendButton ?? {};
      const useIcon = sendButtonConfig.useIcon ?? false;
      const iconText = sendButtonConfig.iconText ?? "↑";
      const iconName = sendButtonConfig.iconName;
      const tooltipText = sendButtonConfig.tooltipText ?? "Send message";
      const showTooltip = sendButtonConfig.showTooltip ?? false;
      const buttonSize = sendButtonConfig.size ?? "40px";
      const backgroundColor = sendButtonConfig.backgroundColor;
      const textColor = sendButtonConfig.textColor;

      // Update button content and styling based on mode
      if (useIcon) {
        // Icon mode: circular button
        sendButton.style.width = buttonSize;
        sendButton.style.height = buttonSize;
        sendButton.style.minWidth = buttonSize;
        sendButton.style.minHeight = buttonSize;
        sendButton.style.fontSize = "18px";
        sendButton.style.lineHeight = "1";
        
        // Clear existing content
        sendButton.innerHTML = "";
        
        // Use Lucide icon if iconName is provided, otherwise fall back to iconText
        if (iconName) {
          const iconSize = parseFloat(buttonSize) || 24;
          const iconColor = textColor && typeof textColor === 'string' && textColor.trim() ? textColor.trim() : "currentColor";
          const iconSvg = renderLucideIcon(iconName, iconSize, iconColor, 2);
          if (iconSvg) {
            sendButton.appendChild(iconSvg);
            sendButton.style.color = iconColor;
          } else {
            // Fallback to text if icon fails to render
            sendButton.textContent = iconText;
            if (textColor) {
              sendButton.style.color = textColor;
            } else {
              sendButton.classList.add("tvw-text-white");
            }
          }
        } else {
          sendButton.textContent = iconText;
          if (textColor) {
            sendButton.style.color = textColor;
          } else {
            sendButton.classList.add("tvw-text-white");
          }
        }
        
        // Update classes
        sendButton.className = "tvw-rounded-button tvw-flex tvw-items-center tvw-justify-center disabled:tvw-opacity-50 tvw-cursor-pointer";
        
        if (backgroundColor) {
          sendButton.style.backgroundColor = backgroundColor;
          sendButton.classList.remove("tvw-bg-cw-primary");
        } else {
          sendButton.classList.add("tvw-bg-cw-primary");
        }
      } else {
        // Text mode: existing behavior
        sendButton.textContent = config.copy?.sendButtonLabel ?? "Send";
        sendButton.style.width = "";
        sendButton.style.height = "";
        sendButton.style.minWidth = "";
        sendButton.style.minHeight = "";
        sendButton.style.fontSize = "";
        sendButton.style.lineHeight = "";
        
        // Update classes
        sendButton.className = "tvw-rounded-button tvw-bg-cw-accent tvw-px-4 tvw-py-2 tvw-text-sm tvw-font-semibold tvw-text-white disabled:tvw-opacity-50 tvw-cursor-pointer";
        
        if (backgroundColor) {
          sendButton.style.backgroundColor = backgroundColor;
          sendButton.classList.remove("tvw-bg-cw-accent");
        } else {
          sendButton.classList.add("tvw-bg-cw-accent");
        }
        
        if (textColor) {
          sendButton.style.color = textColor;
        } else {
          sendButton.classList.add("tvw-text-white");
        }
      }

      // Apply border styling
      if (sendButtonConfig.borderWidth) {
        sendButton.style.borderWidth = sendButtonConfig.borderWidth;
        sendButton.style.borderStyle = "solid";
      } else {
        sendButton.style.borderWidth = "";
        sendButton.style.borderStyle = "";
      }
      if (sendButtonConfig.borderColor) {
        sendButton.style.borderColor = sendButtonConfig.borderColor;
      } else {
        sendButton.style.borderColor = "";
      }

      // Apply padding styling (works in both icon and text mode)
      if (sendButtonConfig.paddingX) {
        sendButton.style.paddingLeft = sendButtonConfig.paddingX;
        sendButton.style.paddingRight = sendButtonConfig.paddingX;
      } else {
        sendButton.style.paddingLeft = "";
        sendButton.style.paddingRight = "";
      }
      if (sendButtonConfig.paddingY) {
        sendButton.style.paddingTop = sendButtonConfig.paddingY;
        sendButton.style.paddingBottom = sendButtonConfig.paddingY;
      } else {
        sendButton.style.paddingTop = "";
        sendButton.style.paddingBottom = "";
      }

      // Update tooltip
      const tooltip = sendButtonWrapper?.querySelector(".tvw-send-button-tooltip");
      if (showTooltip && tooltipText) {
        if (!tooltip) {
          // Create tooltip if it doesn't exist
          const newTooltip = document.createElement("div");
          newTooltip.className = "tvw-send-button-tooltip";
          newTooltip.textContent = tooltipText;
          sendButtonWrapper?.insertBefore(newTooltip, sendButton);
        } else {
          tooltip.textContent = tooltipText;
          tooltip.style.display = "";
        }
      } else if (tooltip) {
        tooltip.style.display = "none";
      }
      
      // Update status indicator visibility and text
      const statusIndicatorConfig = config.statusIndicator ?? {};
      const isVisible = statusIndicatorConfig.visible ?? true;
      statusText.style.display = isVisible ? "" : "none";
      
      // Update status text if status is currently set
      if (session) {
        const currentStatus = session.getStatus();
        const getCurrentStatusText = (status: ChatWidgetSessionStatus): string => {
          if (status === "idle") return statusIndicatorConfig.idleText ?? statusCopy.idle;
          if (status === "connecting") return statusIndicatorConfig.connectingText ?? statusCopy.connecting;
          if (status === "connected") return statusIndicatorConfig.connectedText ?? statusCopy.connected;
          if (status === "error") return statusIndicatorConfig.errorText ?? statusCopy.error;
          return statusCopy[status];
        };
        statusText.textContent = getCurrentStatusText(currentStatus);
      }
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
