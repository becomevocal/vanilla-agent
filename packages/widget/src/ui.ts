import { escapeHtml } from "./postprocessors";
import { ChatWidgetSession, ChatWidgetSessionStatus } from "./session";
import { ChatWidgetConfig, ChatWidgetMessage } from "./types";
import { applyThemeVariables } from "./utils/theme";
import { renderLucideIcon } from "./utils/icons";
import { createElement } from "./utils/dom";
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
  // Tailwind config uses important: "#site-agent-root", so ensure mount has this ID
  if (!mount.id || mount.id !== "site-agent-root") {
    mount.id = "site-agent-root";
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
  const panelElements = buildPanel(config, launcherEnabled);
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
  } = panelElements;
  
  // Use mutable references for mic button so we can update them dynamically
  let micButton: HTMLButtonElement | null = panelElements.micButton;
  let micButtonWrapper: HTMLElement | null = panelElements.micButtonWrapper;

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

  // Create typing indicator element
  const createTypingIndicator = (): HTMLElement => {
    const container = document.createElement("div");
    container.className = "tvw-flex tvw-items-center tvw-space-x-1 tvw-h-5";

    const dot1 = document.createElement("div");
    dot1.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
    dot1.style.animationDelay = "0ms";

    const dot2 = document.createElement("div");
    dot2.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
    dot2.style.animationDelay = "250ms";

    const dot3 = document.createElement("div");
    dot3.className = "tvw-bg-cw-primary tvw-animate-typing tvw-rounded-full tvw-h-1.5 tvw-w-1.5";
    dot3.style.animationDelay = "500ms";

    const srOnly = document.createElement("span");
    srOnly.className = "tvw-sr-only";
    srOnly.textContent = "Loading";

    container.appendChild(dot1);
    container.appendChild(dot2);
    container.appendChild(dot3);
    container.appendChild(srOnly);

    return container;
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

    // Add typing indicator if streaming and there's at least one user message
    if (isStreaming && messages.some((msg) => msg.role === "user")) {
      const typingIndicator = createTypingIndicator();
      const typingWrapper = document.createElement("div");
      typingWrapper.className = "tvw-flex tvw-justify-end";
      typingWrapper.appendChild(typingIndicator);
      fragment.appendChild(typingWrapper);
    }

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
    if (micButton) {
      micButton.disabled = disabled;
    }
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
    
    // Update textarea font family and weight
    const fontFamily = config.theme?.inputFontFamily ?? "sans-serif";
    const fontWeight = config.theme?.inputFontWeight ?? "400";
    
    const getFontFamilyValue = (family: "sans-serif" | "serif" | "mono"): string => {
      switch (family) {
        case "serif":
          return 'Georgia, "Times New Roman", Times, serif';
        case "mono":
          return '"Courier New", Courier, "Lucida Console", Monaco, monospace';
        case "sans-serif":
        default:
          return '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
      }
    };
    
    textarea.style.fontFamily = getFontFamilyValue(fontFamily);
    textarea.style.fontWeight = fontWeight;
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
      // Re-render messages to show/hide typing indicator
      if (session) {
        renderMessagesWithPlugins(messagesWrapper, session.getMessages(), postprocess);
      }
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

  // Voice recognition state and logic
  let speechRecognition: any = null;
  let isRecording = false;
  let pauseTimer: number | null = null;
  let originalMicStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  } | null = null;

  const getSpeechRecognitionClass = (): any => {
    if (typeof window === 'undefined') return null;
    return (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition || null;
  };

  const startVoiceRecognition = () => {
    if (isRecording || session.isStreaming()) return;

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) return;

    speechRecognition = new SpeechRecognitionClass();
    const voiceConfig = config.voiceRecognition ?? {};
    const pauseDuration = voiceConfig.pauseDuration ?? 2000;

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';

    // Store the initial text that was in the textarea
    const initialText = textarea.value;

    speechRecognition.onresult = (event: any) => {
      // Build the complete transcript from all results
      let fullTranscript = "";
      let interimTranscript = "";
      
      // Process all results from the beginning
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          fullTranscript += transcript + " ";
        } else {
          // Only take the last interim result
          interimTranscript = transcript;
        }
      }
      
      // Update textarea with initial text + full transcript + interim
      const newValue = initialText + fullTranscript + interimTranscript;
      textarea.value = newValue;

      // Reset pause timer on each result
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }

      // Set timer to auto-submit after pause when we have any speech
      if (fullTranscript || interimTranscript) {
        pauseTimer = window.setTimeout(() => {
          const finalValue = textarea.value.trim();
          if (finalValue && speechRecognition && isRecording) {
            stopVoiceRecognition();
            textarea.value = "";
            session.sendMessage(finalValue);
          }
        }, pauseDuration);
      }
    };

    speechRecognition.onerror = (event: any) => {
      // Don't stop on "no-speech" error, just ignore it
      if (event.error !== 'no-speech') {
        stopVoiceRecognition();
      }
    };

    speechRecognition.onend = () => {
      // If recognition ended naturally (not manually stopped), submit if there's text
      if (isRecording) {
        const finalValue = textarea.value.trim();
        if (finalValue && finalValue !== initialText.trim()) {
          textarea.value = "";
          session.sendMessage(finalValue);
        }
        stopVoiceRecognition();
      }
    };

    try {
      speechRecognition.start();
      isRecording = true;
      if (micButton) {
        // Store original styles
        originalMicStyles = {
          backgroundColor: micButton.style.backgroundColor,
          color: micButton.style.color,
          borderColor: micButton.style.borderColor
        };
        
        // Apply recording state styles from config
        const voiceConfig = config.voiceRecognition ?? {};
        const recordingBackgroundColor = voiceConfig.recordingBackgroundColor ?? "#ef4444";
        const recordingIconColor = voiceConfig.recordingIconColor;
        const recordingBorderColor = voiceConfig.recordingBorderColor;
        
        micButton.classList.add("tvw-voice-recording");
        micButton.style.backgroundColor = recordingBackgroundColor;
        
        if (recordingIconColor) {
          micButton.style.color = recordingIconColor;
          // Update SVG stroke color if present
          const svg = micButton.querySelector("svg");
          if (svg) {
            svg.setAttribute("stroke", recordingIconColor);
          }
        }
        
        if (recordingBorderColor) {
          micButton.style.borderColor = recordingBorderColor;
        }
        
        micButton.setAttribute("aria-label", "Stop voice recognition");
      }
    } catch (error) {
      stopVoiceRecognition();
    }
  };

  const stopVoiceRecognition = () => {
    if (!isRecording) return;

    isRecording = false;
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }

    if (speechRecognition) {
      try {
        speechRecognition.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
      speechRecognition = null;
    }

    if (micButton) {
      micButton.classList.remove("tvw-voice-recording");
      
      // Restore original styles
      if (originalMicStyles) {
        micButton.style.backgroundColor = originalMicStyles.backgroundColor;
        micButton.style.color = originalMicStyles.color;
        micButton.style.borderColor = originalMicStyles.borderColor;
        
        // Restore SVG stroke color if present
        const svg = micButton.querySelector("svg");
        if (svg) {
          svg.setAttribute("stroke", originalMicStyles.color || "currentColor");
        }
        
        originalMicStyles = null;
      }
      
      micButton.setAttribute("aria-label", "Start voice recognition");
    }
  };

  // Function to create mic button dynamically
  const createMicButton = (voiceConfig: ChatWidgetConfig['voiceRecognition'], sendButtonConfig: ChatWidgetConfig['sendButton']): { micButton: HTMLButtonElement; micButtonWrapper: HTMLElement } | null => {
    const hasSpeechRecognition = 
      typeof window !== 'undefined' && 
      (typeof (window as any).webkitSpeechRecognition !== 'undefined' || 
       typeof (window as any).SpeechRecognition !== 'undefined');
    
    if (!hasSpeechRecognition) return null;

    const micButtonWrapper = createElement("div", "tvw-send-button-wrapper");
    const micButton = createElement(
      "button",
      "tvw-rounded-button tvw-flex tvw-items-center tvw-justify-center disabled:tvw-opacity-50 tvw-cursor-pointer"
    ) as HTMLButtonElement;
    
    micButton.type = "button";
    micButton.setAttribute("aria-label", "Start voice recognition");
    
    const micIconName = voiceConfig?.iconName ?? "mic";
    const buttonSize = sendButtonConfig?.size ?? "40px";
    const micIconSize = voiceConfig?.iconSize ?? buttonSize;
    const micIconSizeNum = parseFloat(micIconSize) || 24;
    
    // Use dedicated colors from voice recognition config, fallback to send button colors
    const backgroundColor = voiceConfig?.backgroundColor ?? sendButtonConfig?.backgroundColor;
    const iconColor = voiceConfig?.iconColor ?? sendButtonConfig?.textColor;
    
    micButton.style.width = micIconSize;
    micButton.style.height = micIconSize;
    micButton.style.minWidth = micIconSize;
    micButton.style.minHeight = micIconSize;
    micButton.style.fontSize = "18px";
    micButton.style.lineHeight = "1";
    
    // Use Lucide mic icon with configured color (stroke width 1.5 for minimalist outline style)
    const iconColorValue = iconColor || "currentColor";
    const micIconSvg = renderLucideIcon(micIconName, micIconSizeNum, iconColorValue, 1.5);
    if (micIconSvg) {
      micButton.appendChild(micIconSvg);
      micButton.style.color = iconColorValue;
    } else {
      // Fallback to text if icon fails
      micButton.textContent = "🎤";
      micButton.style.color = iconColorValue;
    }
    
    // Apply background color
    if (backgroundColor) {
      micButton.style.backgroundColor = backgroundColor;
    } else {
      micButton.classList.add("tvw-bg-cw-primary");
    }
    
    // Apply icon/text color
    if (iconColor) {
      micButton.style.color = iconColor;
    } else if (!iconColor && !sendButtonConfig?.textColor) {
      micButton.classList.add("tvw-text-white");
    }
    
    // Apply border styling
    if (voiceConfig?.borderWidth) {
      micButton.style.borderWidth = voiceConfig.borderWidth;
      micButton.style.borderStyle = "solid";
    }
    if (voiceConfig?.borderColor) {
      micButton.style.borderColor = voiceConfig.borderColor;
    }
    
    // Apply padding styling
    if (voiceConfig?.paddingX) {
      micButton.style.paddingLeft = voiceConfig.paddingX;
      micButton.style.paddingRight = voiceConfig.paddingX;
    }
    if (voiceConfig?.paddingY) {
      micButton.style.paddingTop = voiceConfig.paddingY;
      micButton.style.paddingBottom = voiceConfig.paddingY;
    }
    
    micButtonWrapper.appendChild(micButton);
    
    // Add tooltip if enabled
    const tooltipText = voiceConfig?.tooltipText ?? "Start voice recognition";
    const showTooltip = voiceConfig?.showTooltip ?? false;
    if (showTooltip && tooltipText) {
      const tooltip = createElement("div", "tvw-send-button-tooltip");
      tooltip.textContent = tooltipText;
      micButtonWrapper.appendChild(tooltip);
    }
    
    return { micButton, micButtonWrapper };
  };

  // Wire up mic button click handler
  const handleMicButtonClick = () => {
    if (isRecording) {
      // Stop recording and submit
      const finalValue = textarea.value.trim();
      stopVoiceRecognition();
      if (finalValue) {
        textarea.value = "";
        session.sendMessage(finalValue);
      }
    } else {
      // Start recording
      startVoiceRecognition();
    }
  };

  if (micButton) {
    micButton.addEventListener("click", handleMicButtonClick);

    destroyCallbacks.push(() => {
      stopVoiceRecognition();
      if (micButton) {
        micButton.removeEventListener("click", handleMicButtonClick);
      }
    });
  }

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
      const headerIconHidden = launcher.headerIconHidden ?? false;
      const headerIconName = launcher.headerIconName;
      const headerIconSize = launcher.headerIconSize ?? "48px";
      
      if (iconHolder) {
        const header = container.querySelector(".tvw-border-b-cw-divider");
        const headerCopy = header?.querySelector(".tvw-flex-col");
        
        // Handle hide/show
        if (headerIconHidden) {
          // Hide iconHolder
          iconHolder.style.display = "none";
          // Ensure headerCopy is still in header
          if (header && headerCopy && !header.contains(headerCopy)) {
            header.insertBefore(headerCopy, header.firstChild);
          }
        } else {
          // Show iconHolder
          iconHolder.style.display = "";
          iconHolder.style.height = headerIconSize;
          iconHolder.style.width = headerIconSize;
          
          // Ensure iconHolder is before headerCopy in header
          if (header && headerCopy) {
            if (!header.contains(iconHolder)) {
              header.insertBefore(iconHolder, headerCopy);
            } else if (iconHolder.nextSibling !== headerCopy) {
              // Reorder if needed
              iconHolder.remove();
              header.insertBefore(iconHolder, headerCopy);
            }
          }
          
          // Update icon content based on priority: Lucide icon > iconUrl > agentIconText
          if (headerIconName) {
            // Use Lucide icon
            const iconSize = parseFloat(headerIconSize) || 24;
            const iconSvg = renderLucideIcon(headerIconName, iconSize * 0.6, "#ffffff", 2);
            if (iconSvg) {
              iconHolder.replaceChildren(iconSvg);
            } else {
              // Fallback to agentIconText if Lucide icon fails
              iconHolder.textContent = launcher.agentIconText ?? "💬";
            }
          } else if (launcher.iconUrl) {
            // Use image URL
            const img = iconHolder.querySelector("img");
            if (img) {
              img.src = launcher.iconUrl;
              img.style.height = headerIconSize;
              img.style.width = headerIconSize;
            } else {
              // Create new img if it doesn't exist
              const newImg = document.createElement("img");
              newImg.src = launcher.iconUrl;
              newImg.alt = "";
              newImg.className = "tvw-rounded-xl tvw-object-cover";
              newImg.style.height = headerIconSize;
              newImg.style.width = headerIconSize;
              iconHolder.replaceChildren(newImg);
            }
          } else {
            // Use text/emoji - clear any SVG or img first
            const existingSvg = iconHolder.querySelector("svg");
            const existingImg = iconHolder.querySelector("img");
            if (existingSvg || existingImg) {
              iconHolder.replaceChildren();
            }
            iconHolder.textContent = launcher.agentIconText ?? "💬";
          }
          
          // Update image size if present
          const img = iconHolder.querySelector("img");
          if (img) {
            img.style.height = headerIconSize;
            img.style.width = headerIconSize;
          }
        }
      }
      if (closeButton) {
        const closeButtonSize = launcher.closeButtonSize ?? "32px";
        const closeButtonPlacement = launcher.closeButtonPlacement ?? "inline";
        closeButton.style.height = closeButtonSize;
        closeButton.style.width = closeButtonSize;
        
        // Update placement if changed
        const isTopRight = closeButtonPlacement === "top-right";
        const hasTopRightClasses = closeButton.classList.contains("tvw-absolute");
        
        if (isTopRight !== hasTopRightClasses) {
          // Placement changed - need to move button and update classes
          closeButton.remove();
          
          // Update classes
          if (isTopRight) {
            closeButton.className = "tvw-absolute tvw-top-4 tvw-right-4 tvw-z-50 tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none";
            container.style.position = "relative";
            container.appendChild(closeButton);
          } else {
            closeButton.className = "tvw-ml-auto tvw-inline-flex tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-cw-muted hover:tvw-bg-gray-100 tvw-cursor-pointer tvw-border-none";
            // Find header element (first child of container)
            const header = container.querySelector(".tvw-border-b-cw-divider");
            if (header) {
              header.appendChild(closeButton);
            }
          }
        }
        
        // Apply close button styling from config
        if (launcher.closeButtonColor) {
          closeButton.style.color = launcher.closeButtonColor;
          closeButton.classList.remove("tvw-text-cw-muted");
        } else {
          closeButton.style.color = "";
          closeButton.classList.add("tvw-text-cw-muted");
        }
        
        if (launcher.closeButtonBackgroundColor) {
          closeButton.style.backgroundColor = launcher.closeButtonBackgroundColor;
          closeButton.classList.remove("hover:tvw-bg-gray-100");
        } else {
          closeButton.style.backgroundColor = "";
          closeButton.classList.add("hover:tvw-bg-gray-100");
        }
        
        // Apply border if width and/or color are provided
        if (launcher.closeButtonBorderWidth || launcher.closeButtonBorderColor) {
          const borderWidth = launcher.closeButtonBorderWidth || "0px";
          const borderColor = launcher.closeButtonBorderColor || "transparent";
          closeButton.style.border = `${borderWidth} solid ${borderColor}`;
          closeButton.classList.remove("tvw-border-none");
        } else {
          closeButton.style.border = "";
          closeButton.classList.add("tvw-border-none");
        }
        
        if (launcher.closeButtonBorderRadius) {
          closeButton.style.borderRadius = launcher.closeButtonBorderRadius;
          closeButton.classList.remove("tvw-rounded-full");
        } else {
          closeButton.style.borderRadius = "";
          closeButton.classList.add("tvw-rounded-full");
        }
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
      
      // Update voice recognition mic button visibility
      const voiceRecognitionEnabled = config.voiceRecognition?.enabled === true;
      const hasSpeechRecognition = 
        typeof window !== 'undefined' && 
        (typeof (window as any).webkitSpeechRecognition !== 'undefined' || 
         typeof (window as any).SpeechRecognition !== 'undefined');
      
      // Update composer form gap based on voice recognition
      const shouldUseSmallGap = voiceRecognitionEnabled && hasSpeechRecognition;
      composerForm.classList.remove("tvw-gap-1", "tvw-gap-3");
      composerForm.classList.add(shouldUseSmallGap ? "tvw-gap-1" : "tvw-gap-3");
      
      if (voiceRecognitionEnabled && hasSpeechRecognition) {
        // Create or update mic button
        if (!micButton || !micButtonWrapper) {
          // Create new mic button
          const micButtonResult = createMicButton(config.voiceRecognition, config.sendButton);
          if (micButtonResult) {
            // Update the mutable references
            micButton = micButtonResult.micButton;
            micButtonWrapper = micButtonResult.micButtonWrapper;
            
            // Insert before send button wrapper
            composerForm.insertBefore(micButtonWrapper, sendButtonWrapper);
            
            // Wire up click handler
            micButton.addEventListener("click", handleMicButtonClick);
            
            // Set disabled state
            micButton.disabled = session.isStreaming();
          }
        } else {
          // Update existing mic button with new config
          const voiceConfig = config.voiceRecognition ?? {};
          const sendButtonConfig = config.sendButton ?? {};
          
          // Update icon name and size
          const micIconName = voiceConfig.iconName ?? "mic";
          const buttonSize = sendButtonConfig.size ?? "40px";
          const micIconSize = voiceConfig.iconSize ?? buttonSize;
          const micIconSizeNum = parseFloat(micIconSize) || 24;
          
          micButton.style.width = micIconSize;
          micButton.style.height = micIconSize;
          micButton.style.minWidth = micIconSize;
          micButton.style.minHeight = micIconSize;
          
          // Update icon
          const iconColor = voiceConfig.iconColor ?? sendButtonConfig.textColor ?? "currentColor";
          micButton.innerHTML = "";
          const micIconSvg = renderLucideIcon(micIconName, micIconSizeNum, iconColor, 2);
          if (micIconSvg) {
            micButton.appendChild(micIconSvg);
          } else {
            micButton.textContent = "🎤";
          }
          
          // Update colors
          const backgroundColor = voiceConfig.backgroundColor ?? sendButtonConfig.backgroundColor;
          if (backgroundColor) {
            micButton.style.backgroundColor = backgroundColor;
            micButton.classList.remove("tvw-bg-cw-primary");
          } else {
            micButton.style.backgroundColor = "";
            micButton.classList.add("tvw-bg-cw-primary");
          }
          
          if (iconColor) {
            micButton.style.color = iconColor;
            micButton.classList.remove("tvw-text-white");
          } else if (!iconColor && !sendButtonConfig.textColor) {
            micButton.style.color = "";
            micButton.classList.add("tvw-text-white");
          }
          
          // Update border styling
          if (voiceConfig.borderWidth) {
            micButton.style.borderWidth = voiceConfig.borderWidth;
            micButton.style.borderStyle = "solid";
          } else {
            micButton.style.borderWidth = "";
            micButton.style.borderStyle = "";
          }
          if (voiceConfig.borderColor) {
            micButton.style.borderColor = voiceConfig.borderColor;
          } else {
            micButton.style.borderColor = "";
          }
          
          // Update padding styling
          if (voiceConfig.paddingX) {
            micButton.style.paddingLeft = voiceConfig.paddingX;
            micButton.style.paddingRight = voiceConfig.paddingX;
          } else {
            micButton.style.paddingLeft = "";
            micButton.style.paddingRight = "";
          }
          if (voiceConfig.paddingY) {
            micButton.style.paddingTop = voiceConfig.paddingY;
            micButton.style.paddingBottom = voiceConfig.paddingY;
          } else {
            micButton.style.paddingTop = "";
            micButton.style.paddingBottom = "";
          }
          
          // Update tooltip
          const tooltip = micButtonWrapper?.querySelector(".tvw-send-button-tooltip") as HTMLElement | null;
          const tooltipText = voiceConfig.tooltipText ?? "Start voice recognition";
          const showTooltip = voiceConfig.showTooltip ?? false;
          if (showTooltip && tooltipText) {
            if (!tooltip) {
              // Create tooltip if it doesn't exist
              const newTooltip = document.createElement("div");
              newTooltip.className = "tvw-send-button-tooltip";
              newTooltip.textContent = tooltipText;
              micButtonWrapper?.insertBefore(newTooltip, micButton);
            } else {
              tooltip.textContent = tooltipText;
              tooltip.style.display = "";
            }
          } else if (tooltip) {
            // Hide tooltip if disabled
            tooltip.style.display = "none";
          }
          
          // Show and update disabled state
          micButtonWrapper.style.display = "";
          micButton.disabled = session.isStreaming();
        }
      } else {
        // Hide mic button
        if (micButton && micButtonWrapper) {
          micButtonWrapper.style.display = "none";
          // Stop any active recording if disabling
          if (isRecording) {
            stopVoiceRecognition();
          }
        }
      }
      
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
      const tooltip = sendButtonWrapper?.querySelector(".tvw-send-button-tooltip") as HTMLElement | null;
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
