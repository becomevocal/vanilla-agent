import { escapeHtml } from "./postprocessors";
import { AgentWidgetSession, AgentWidgetSessionStatus } from "./session";
import {
  AgentWidgetConfig,
  AgentWidgetMessage,
  AgentWidgetEvent,
  AgentWidgetStorageAdapter,
  AgentWidgetStoredState,
  AgentWidgetControllerEventMap,
  AgentWidgetVoiceStateEvent,
  AgentWidgetStateEvent,
  AgentWidgetStateSnapshot,
  WidgetLayoutSlot,
  SlotRenderer
} from "./types";
import { applyThemeVariables } from "./utils/theme";
import { renderLucideIcon } from "./utils/icons";
import { createElement } from "./utils/dom";
import { statusCopy } from "./utils/constants";
import { createLauncherButton } from "./components/launcher";
import { createWrapper, buildPanel, buildHeader, buildComposer, attachHeaderToContainer } from "./components/panel";
import { positionMap } from "./utils/positioning";
import type { HeaderElements, ComposerElements } from "./components/panel";
import { MessageTransform } from "./components/message-bubble";
import { createStandardBubble, createTypingIndicator } from "./components/message-bubble";
import { createReasoningBubble } from "./components/reasoning-bubble";
import { createToolBubble } from "./components/tool-bubble";
import { createSuggestions } from "./components/suggestions";
import { enhanceWithForms } from "./components/forms";
import { pluginRegistry } from "./plugins/registry";
import { mergeWithDefaults } from "./defaults";
import { createEventBus } from "./utils/events";
import {
  createActionManager,
  defaultActionHandlers,
  defaultJsonActionParser
} from "./utils/actions";
import { createLocalStorageAdapter } from "./utils/storage";
import { componentRegistry } from "./components/registry";
import {
  renderComponentDirective,
  extractComponentDirectiveFromMessage,
  hasComponentDirective
} from "./utils/component-middleware";

// Default localStorage key for chat history (automatically cleared on clear chat)
const DEFAULT_CHAT_HISTORY_STORAGE_KEY = "vanilla-agent-chat-history";
const VOICE_STATE_RESTORE_WINDOW = 30 * 1000;

const ensureRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
};

const stripStreamingFromMessages = (messages: AgentWidgetMessage[]) =>
  messages.map((message) => ({
    ...message,
    streaming: false
  }));

type Controller = {
  update: (config: AgentWidgetConfig) => void;
  destroy: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  clearChat: () => void;
  setMessage: (message: string) => boolean;
  submitMessage: (message?: string) => boolean;
  startVoiceRecognition: () => boolean;
  stopVoiceRecognition: () => boolean;
  injectTestMessage: (event: AgentWidgetEvent) => void;
  getMessages: () => AgentWidgetMessage[];
  getStatus: () => AgentWidgetSessionStatus;
  getPersistentMetadata: () => Record<string, unknown>;
  updatePersistentMetadata: (
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => void;
  on: <K extends keyof AgentWidgetControllerEventMap>(
    event: K,
    handler: (payload: AgentWidgetControllerEventMap[K]) => void
  ) => () => void;
  off: <K extends keyof AgentWidgetControllerEventMap>(
    event: K,
    handler: (payload: AgentWidgetControllerEventMap[K]) => void
  ) => void;
  // State query methods
  isOpen: () => boolean;
  isVoiceActive: () => boolean;
  getState: () => AgentWidgetStateSnapshot;
};

const buildPostprocessor = (
  cfg: AgentWidgetConfig | undefined,
  actionManager?: ReturnType<typeof createActionManager>
): MessageTransform => {
  return (context) => {
    let nextText = context.text ?? "";
    const rawPayload = context.message.rawContent ?? null;

    if (actionManager) {
      const actionResult = actionManager.process({
        text: nextText,
        raw: rawPayload ?? nextText,
        message: context.message,
        streaming: context.streaming
      });
      if (actionResult !== null) {
        nextText = actionResult.text;
        // Mark message as non-persistable if persist is false
        if (!actionResult.persist) {
          (context.message as any).__skipPersist = true;
        }
      }
    }

    if (cfg?.postprocessMessage) {
      return cfg.postprocessMessage({
        ...context,
        text: nextText,
        raw: rawPayload ?? context.text ?? ""
      });
    }

    return escapeHtml(nextText);
  };
};

export const createAgentExperience = (
  mount: HTMLElement,
  initialConfig?: AgentWidgetConfig,
  runtimeOptions?: { debugTools?: boolean }
): Controller => {
  // Tailwind config uses important: "#vanilla-agent-root", so ensure mount has this ID
  if (!mount.id || mount.id !== "vanilla-agent-root") {
    mount.id = "vanilla-agent-root";
  }

  let config = mergeWithDefaults(initialConfig) as AgentWidgetConfig;
  // Note: applyThemeVariables is called after applyFullHeightStyles() below
  // because applyFullHeightStyles resets mount.style.cssText

  // Get plugins for this instance
  const plugins = pluginRegistry.getForInstance(config.plugins);
  
  // Register components from config
  if (config.components) {
    componentRegistry.registerAll(config.components);
  }
  const eventBus = createEventBus<AgentWidgetControllerEventMap>();

  const storageAdapter: AgentWidgetStorageAdapter =
    config.storageAdapter ?? createLocalStorageAdapter();
  let persistentMetadata: Record<string, unknown> = {};
  let pendingStoredState: Promise<AgentWidgetStoredState | null> | null = null;

  if (storageAdapter?.load) {
    try {
      const storedState = storageAdapter.load();
      if (storedState && typeof (storedState as Promise<any>).then === "function") {
        pendingStoredState = storedState as Promise<AgentWidgetStoredState | null>;
      } else if (storedState) {
        const immediateState = storedState as AgentWidgetStoredState;
        if (immediateState.metadata) {
          persistentMetadata = ensureRecord(immediateState.metadata);
        }
        if (immediateState.messages?.length) {
          config = { ...config, initialMessages: immediateState.messages };
        }
      }
    } catch (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.error("[AgentWidget] Failed to load stored state:", error);
      }
    }
  }

  const getMetadata = () => persistentMetadata;
  const updateMetadata = (
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => {
    const next = updater({ ...persistentMetadata }) ?? {};
    persistentMetadata = next;
    persistState();
  };

  const resolvedActionParsers =
    config.actionParsers && config.actionParsers.length
      ? config.actionParsers
      : [defaultJsonActionParser];

  const resolvedActionHandlers =
    config.actionHandlers && config.actionHandlers.length
      ? config.actionHandlers
      : [defaultActionHandlers.message, defaultActionHandlers.messageAndClick];

  let actionManager = createActionManager({
    parsers: resolvedActionParsers,
    handlers: resolvedActionHandlers,
    getMetadata,
    updateMetadata,
    emit: eventBus.emit,
    documentRef: typeof document !== "undefined" ? document : null
  });
  actionManager.syncFromMetadata();

  let launcherEnabled = config.launcher?.enabled ?? true;
  let autoExpand = config.launcher?.autoExpand ?? false;
  let prevAutoExpand = autoExpand;
  let prevLauncherEnabled = launcherEnabled;
  let open = launcherEnabled ? autoExpand : true;
  let postprocess = buildPostprocessor(config, actionManager);
  let showReasoning = config.features?.showReasoning ?? true;
  let showToolCalls = config.features?.showToolCalls ?? true;
  
  // Get status indicator config
  const statusConfig = config.statusIndicator ?? {};
  const getStatusText = (status: AgentWidgetSessionStatus): string => {
    if (status === "idle") return statusConfig.idleText ?? statusCopy.idle;
    if (status === "connecting") return statusConfig.connectingText ?? statusCopy.connecting;
    if (status === "connected") return statusConfig.connectedText ?? statusCopy.connected;
    if (status === "error") return statusConfig.errorText ?? statusCopy.error;
    return statusCopy[status];
  };

  const { wrapper, panel } = createWrapper(config);
  const panelElements = buildPanel(config, launcherEnabled);
  let {
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
    iconHolder,
    headerTitle,
    headerSubtitle,
    header,
    footer
  } = panelElements;
  
  // Use mutable references for mic button so we can update them dynamically
  let micButton: HTMLButtonElement | null = panelElements.micButton;
  let micButtonWrapper: HTMLElement | null = panelElements.micButtonWrapper;

  // Plugin hook: renderHeader - allow plugins to provide custom header
  const headerPlugin = plugins.find(p => p.renderHeader);
  if (headerPlugin?.renderHeader) {
    const customHeader = headerPlugin.renderHeader({
      config,
      defaultRenderer: () => {
        const headerElements = buildHeader({ config, showClose: launcherEnabled });
        attachHeaderToContainer(container, headerElements, config);
        return headerElements.header;
      },
      onClose: () => setOpenState(false, "user")
    });
    if (customHeader) {
      // Replace the default header with custom header
      const existingHeader = container.querySelector('.tvw-border-b-cw-divider');
      if (existingHeader) {
        existingHeader.replaceWith(customHeader);
        header = customHeader;
      }
    }
  }

  // Plugin hook: renderComposer - allow plugins to provide custom composer
  const composerPlugin = plugins.find(p => p.renderComposer);
  if (composerPlugin?.renderComposer) {
    const customComposer = composerPlugin.renderComposer({
      config,
      defaultRenderer: () => {
        const composerElements = buildComposer({ config });
        return composerElements.footer;
      },
      onSubmit: (text: string) => {
        if (session && !session.isStreaming()) {
          session.sendMessage(text);
        }
      },
      disabled: false
    });
    if (customComposer) {
      // Replace the default footer with custom composer
      footer.replaceWith(customComposer);
      footer = customComposer;
      // Note: When using custom composer, textarea/sendButton/etc may not exist
      // The plugin is responsible for providing its own submit handling
    }
  }

  // Slot system: allow custom content injection into specific regions
  const renderSlots = () => {
    const slots = config.layout?.slots ?? {};
    
    // Helper to get default slot content
    const getDefaultSlotContent = (slot: WidgetLayoutSlot): HTMLElement | null => {
      switch (slot) {
        case "body-top":
          // Default: the intro card
          return container.querySelector(".tvw-rounded-2xl.tvw-bg-cw-surface.tvw-p-6") as HTMLElement || null;
        case "messages":
          return messagesWrapper;
        case "footer-top":
          return suggestions;
        case "composer":
          return composerForm;
        case "footer-bottom":
          return statusText;
        default:
          return null;
      }
    };

    // Helper to insert content into slot region
    const insertSlotContent = (slot: WidgetLayoutSlot, element: HTMLElement) => {
      switch (slot) {
        case "header-left":
        case "header-center":
        case "header-right":
          // Header slots - prepend/append to header
          if (slot === "header-left") {
            header.insertBefore(element, header.firstChild);
          } else if (slot === "header-right") {
            header.appendChild(element);
          } else {
            // header-center: insert after icon/title
            const titleSection = header.querySelector(".tvw-flex-col");
            if (titleSection) {
              titleSection.parentNode?.insertBefore(element, titleSection.nextSibling);
            } else {
              header.appendChild(element);
            }
          }
          break;
        case "body-top":
          // Replace or prepend to body
          const introCard = body.querySelector(".tvw-rounded-2xl.tvw-bg-cw-surface.tvw-p-6");
          if (introCard) {
            introCard.replaceWith(element);
          } else {
            body.insertBefore(element, body.firstChild);
          }
          break;
        case "body-bottom":
          // Append after messages wrapper
          body.appendChild(element);
          break;
        case "footer-top":
          // Replace suggestions area
          suggestions.replaceWith(element);
          break;
        case "footer-bottom":
          // Replace or append after status text
          statusText.replaceWith(element);
          break;
        default:
          // For other slots, just append to appropriate container
          break;
      }
    };

    // Process each configured slot
    for (const [slotName, renderer] of Object.entries(slots) as [WidgetLayoutSlot, SlotRenderer][]) {
      if (renderer) {
        try {
          const slotElement = renderer({
            config,
            defaultContent: () => getDefaultSlotContent(slotName)
          });
          if (slotElement) {
            insertSlotContent(slotName, slotElement);
          }
        } catch (error) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.error(`[AgentWidget] Error rendering slot "${slotName}":`, error);
          }
        }
      }
    }
  };

  // Render custom slots
  renderSlots();

  panel.appendChild(container);
  mount.appendChild(wrapper);

  // Apply full-height and sidebar styles if enabled
  // This ensures the widget fills its container height with proper flex layout
  const applyFullHeightStyles = () => {
    const sidebarMode = config.launcher?.sidebarMode ?? false;
    const fullHeight = sidebarMode || (config.launcher?.fullHeight ?? false);
    const theme = config.theme ?? {};
    
    // Determine panel styling based on mode, with theme overrides
    const position = config.launcher?.position ?? 'bottom-left';
    const isLeftSidebar = position === 'bottom-left' || position === 'top-left';
    
    // Default values based on mode
    const defaultPanelBorder = sidebarMode ? 'none' : '1px solid var(--tvw-cw-border)';
    const defaultPanelShadow = sidebarMode 
      ? (isLeftSidebar ? '2px 0 12px rgba(0, 0, 0, 0.08)' : '-2px 0 12px rgba(0, 0, 0, 0.08)')
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    const defaultPanelBorderRadius = sidebarMode ? '0' : '16px';
    
    // Apply theme overrides or defaults
    const panelBorder = theme.panelBorder ?? defaultPanelBorder;
    const panelShadow = theme.panelShadow ?? defaultPanelShadow;
    const panelBorderRadius = theme.panelBorderRadius ?? defaultPanelBorderRadius;
    
    // Reset all inline styles first to handle mode toggling
    // This ensures styles don't persist when switching between modes
    mount.style.cssText = '';
    wrapper.style.cssText = '';
    panel.style.cssText = '';
    container.style.cssText = '';
    body.style.cssText = '';
    footer.style.cssText = '';
    
    // Re-apply panel width/maxWidth from initial setup
    const launcherWidth = config?.launcher?.width ?? config?.launcherWidth;
    const width = launcherWidth ?? "min(400px, calc(100vw - 24px))";
    if (!sidebarMode) {
      panel.style.width = width;
      panel.style.maxWidth = width;
    }
    
    // Apply panel styling
    // Box-shadow is applied to panel (parent) instead of container to avoid
    // rendering artifacts when container has overflow:hidden + border-radius
    // Panel also gets border-radius to make the shadow follow the rounded corners
    panel.style.boxShadow = panelShadow;
    panel.style.borderRadius = panelBorderRadius;
    container.style.border = panelBorder;
    container.style.borderRadius = panelBorderRadius;
    
    if (fullHeight) {
      // Check if this is inline embed mode (launcher disabled) vs launcher mode
      const isInlineEmbed = config.launcher?.enabled === false;
      
      // Mount container
      mount.style.display = 'flex';
      mount.style.flexDirection = 'column';
      mount.style.height = '100%';
      mount.style.minHeight = '0';
      
      // Wrapper
      // - Inline embed: needs overflow:hidden to contain the flex layout
      // - Launcher mode: no overflow:hidden to allow panel's box-shadow to render fully
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.flex = '1 1 0%';
      wrapper.style.minHeight = '0';
      wrapper.style.maxHeight = '100%';
      wrapper.style.height = '100%';
      if (isInlineEmbed) {
        wrapper.style.overflow = 'hidden';
      }
      
      // Panel
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.flex = '1 1 0%';
      panel.style.minHeight = '0';
      panel.style.maxHeight = '100%';
      panel.style.height = '100%';
      panel.style.overflow = 'hidden';
      
      // Main container
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.flex = '1 1 0%';
      container.style.minHeight = '0';
      container.style.maxHeight = '100%';
      container.style.overflow = 'hidden';
      
      // Body (scrollable messages area)
      body.style.flex = '1 1 0%';
      body.style.minHeight = '0';
      body.style.overflowY = 'auto';
      
      // Footer (composer) - should not shrink
      footer.style.flexShrink = '0';
    }
    
    // Handle positioning classes based on mode
    // First remove all position classes to reset state
    wrapper.classList.remove(
      'tvw-bottom-6', 'tvw-right-6', 'tvw-left-6', 'tvw-top-6',
      'tvw-bottom-4', 'tvw-right-4', 'tvw-left-4', 'tvw-top-4'
    );
    
    if (!sidebarMode) {
      // Restore positioning classes when not in sidebar mode
      const positionClasses = positionMap[position as keyof typeof positionMap] ?? positionMap['bottom-right'];
      positionClasses.split(' ').forEach(cls => wrapper.classList.add(cls));
    }
    
    // Apply sidebar-specific styles
    if (sidebarMode) {
      const sidebarWidth = config.launcher?.sidebarWidth ?? '420px';
      
      // Wrapper - fixed position, flush with edges
      wrapper.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        bottom: 0 !important;
        width: ${sidebarWidth} !important;
        height: 100vh !important;
        max-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        ${isLeftSidebar ? 'left: 0 !important; right: auto !important;' : 'left: auto !important; right: 0 !important;'}
      `;
      
      // Panel - fill wrapper (override inline width/max-width from panel.ts)
      // Box-shadow is on panel to avoid rendering artifacts with container's overflow:hidden
      // Border-radius on panel ensures shadow follows rounded corners
      panel.style.cssText = `
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: ${panelShadow} !important;
        border-radius: ${panelBorderRadius} !important;
      `;
      // Force override any inline width/maxWidth that may be set elsewhere
      panel.style.setProperty('width', '100%', 'important');
      panel.style.setProperty('max-width', '100%', 'important');
      
      // Container - apply configurable styles with sidebar layout
      // Note: box-shadow is on panel, not container
      container.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        flex: 1 1 0% !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: hidden !important;
        border-radius: ${panelBorderRadius} !important;
        border: ${panelBorder} !important;
      `;
      
      // Remove footer border in sidebar mode
      footer.style.cssText = `
        flex-shrink: 0 !important;
        border-top: none !important;
        padding: 8px 16px 12px 16px !important;
      `;
    }
    
    // Apply max-height constraints to wrapper to prevent expanding past viewport top
    // Use both -moz-available (Firefox) and stretch (standard) for cross-browser support
    // Append to cssText to allow multiple fallback values for the same property
    const maxHeightStyles = 'max-height: -moz-available !important; max-height: stretch !important;';
    const paddingStyles = sidebarMode ? '' : 'padding-top: 1.25em !important;';
    wrapper.style.cssText += maxHeightStyles + paddingStyles;
  };
  applyFullHeightStyles();
  // Apply theme variables after applyFullHeightStyles since it resets mount.style.cssText
  applyThemeVariables(mount, config);

  const destroyCallbacks: Array<() => void> = [];
  const suggestionsManager = createSuggestions(suggestions);
  let closeHandler: (() => void) | null = null;
  let session: AgentWidgetSession;
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
  const messageState = new Map<
    string,
    { streaming?: boolean; role: AgentWidgetMessage["role"] }
  >();
  const voiceState = {
    active: false,
    manuallyDeactivated: false,
    lastUserMessageWasVoice: false
  };
  const voiceAutoResumeMode = config.voiceRecognition?.autoResume ?? false;
  const emitVoiceState = (source: AgentWidgetVoiceStateEvent["source"]) => {
    eventBus.emit("voice:state", {
      active: voiceState.active,
      source,
      timestamp: Date.now()
    });
  };
  const persistVoiceMetadata = () => {
    updateMetadata((prev) => ({
      ...prev,
      voiceState: {
        active: voiceState.active,
        timestamp: Date.now(),
        manuallyDeactivated: voiceState.manuallyDeactivated
      }
    }));
  };
  const maybeRestoreVoiceFromMetadata = () => {
    if (config.voiceRecognition?.enabled === false) return;
    const rawVoiceState = ensureRecord((persistentMetadata as any).voiceState);
    const wasActive = Boolean(rawVoiceState.active);
    const timestamp = Number(rawVoiceState.timestamp ?? 0);
    voiceState.manuallyDeactivated = Boolean(rawVoiceState.manuallyDeactivated);
    if (wasActive && Date.now() - timestamp < VOICE_STATE_RESTORE_WINDOW) {
      setTimeout(() => {
        if (!voiceState.active) {
          voiceState.manuallyDeactivated = false;
          startVoiceRecognition("restore");
        }
      }, 1000);
    }
  };

  const getMessagesForPersistence = () =>
    session 
      ? stripStreamingFromMessages(session.getMessages()).filter(msg => !(msg as any).__skipPersist)
      : [];

  function persistState(messagesOverride?: AgentWidgetMessage[]) {
    if (!storageAdapter?.save) return;

    // Allow saving even if session doesn't exist yet (for metadata during init)
    const messages = messagesOverride
      ? stripStreamingFromMessages(messagesOverride)
      : session
        ? getMessagesForPersistence()
        : [];

    const payload = {
      messages,
      metadata: persistentMetadata
    };
    try {
      const result = storageAdapter.save(payload);
      if (result instanceof Promise) {
        result.catch((error) => {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.error("[AgentWidget] Failed to persist state:", error);
          }
        });
      }
    } catch (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.error("[AgentWidget] Failed to persist state:", error);
      }
    }
  }

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

  // Track ongoing smooth scroll animation
  let smoothScrollRAF: number | null = null;

  // Get the scrollable container using its unique ID
  const getScrollableContainer = (): HTMLElement => {
    // Use the unique ID for reliable selection
    const scrollable = wrapper.querySelector('#vanilla-agent-scroll-container') as HTMLElement;
    // Fallback to body if ID not found (shouldn't happen, but safe fallback)
    return scrollable || body;
  };

  // Custom smooth scroll animation with easing
  const smoothScrollToBottom = (element: HTMLElement, duration = 500) => {
    const start = element.scrollTop;
    const clientHeight = element.clientHeight;
    // Recalculate target dynamically to handle layout changes
    let target = element.scrollHeight;
    let distance = target - start;

    // Check if already at bottom: scrollTop + clientHeight should be >= scrollHeight
    // Add a small threshold (2px) to account for rounding/subpixel differences
    const isAtBottom = start + clientHeight >= target - 2;
    
    // If already at bottom or very close, skip animation to prevent glitch
    if (isAtBottom || Math.abs(distance) < 5) {
      return;
    }

    // Cancel any ongoing smooth scroll animation
    if (smoothScrollRAF !== null) {
      cancelAnimationFrame(smoothScrollRAF);
      smoothScrollRAF = null;
    }

    const startTime = performance.now();

    // Easing function: ease-out cubic for smooth deceleration
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = (currentTime: number) => {
      // Recalculate target each frame in case scrollHeight changed
      const currentTarget = element.scrollHeight;
      if (currentTarget !== target) {
        target = currentTarget;
        distance = target - start;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      
      const currentScroll = start + distance * eased;
      element.scrollTop = currentScroll;

      if (progress < 1) {
        smoothScrollRAF = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target
        element.scrollTop = element.scrollHeight;
        smoothScrollRAF = null;
      }
    };

    smoothScrollRAF = requestAnimationFrame(animate);
  };

  const trackMessages = (messages: AgentWidgetMessage[]) => {
    const nextState = new Map<
      string,
      { streaming?: boolean; role: AgentWidgetMessage["role"] }
    >();

    messages.forEach((message) => {
      const previous = messageState.get(message.id);
      nextState.set(message.id, {
        streaming: message.streaming,
        role: message.role
      });

      if (!previous && message.role === "assistant") {
        eventBus.emit("assistant:message", message);
      }

      if (
        message.role === "assistant" &&
        previous?.streaming &&
        message.streaming === false
      ) {
        eventBus.emit("assistant:complete", message);
      }
    });

    messageState.clear();
    nextState.forEach((value, key) => {
      messageState.set(key, value);
    });
  };


  // Message rendering with plugin support (implementation)
  const renderMessagesWithPluginsImpl = (
    container: HTMLElement,
    messages: AgentWidgetMessage[],
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

      // Get message layout config
      const messageLayoutConfig = config.layout?.messages;

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
            defaultRenderer: () => createToolBubble(message, config),
            config
          });
        } else if (matchingPlugin.renderMessage) {
          bubble = matchingPlugin.renderMessage({
            message,
            defaultRenderer: () => {
              const b = createStandardBubble(message, transform, messageLayoutConfig);
              if (message.role !== "user") {
                enhanceWithForms(b, message, config, session);
              }
              return b;
            },
            config
          });
        }
      }

      // Check for component directive if no plugin handled it
      if (!bubble && message.role === "assistant" && !message.variant) {
        const enableComponentStreaming = config.enableComponentStreaming !== false; // Default to true
        if (enableComponentStreaming && hasComponentDirective(message)) {
          const directive = extractComponentDirectiveFromMessage(message);
          if (directive) {
            const componentBubble = renderComponentDirective(directive, {
              config,
              message,
              transform
            });
            if (componentBubble) {
              // Wrap component in standard bubble styling
              const wrapper = document.createElement("div");
              wrapper.className = [
                "vanilla-message-bubble",
                "tvw-max-w-[85%]",
                "tvw-rounded-2xl",
                "tvw-bg-cw-surface",
                "tvw-border",
                "tvw-border-cw-message-border",
                "tvw-p-4"
              ].join(" ");
              wrapper.setAttribute("data-message-id", message.id);

              // Add text content above component if present (combined text+component response)
              if (message.content && message.content.trim()) {
                const textDiv = document.createElement("div");
                textDiv.className = "tvw-mb-3 tvw-text-sm tvw-leading-relaxed";
                textDiv.innerHTML = transform({
                  text: message.content,
                  message,
                  streaming: Boolean(message.streaming),
                  raw: message.rawContent
                });
                wrapper.appendChild(textDiv);
              }

              wrapper.appendChild(componentBubble);
              bubble = wrapper;
            }
          }
        }
      }

      // Fallback to default rendering if plugin returned null or no plugin matched
      if (!bubble) {
        if (message.variant === "reasoning" && message.reasoning) {
          if (!showReasoning) return;
          bubble = createReasoningBubble(message);
        } else if (message.variant === "tool" && message.toolCall) {
          if (!showToolCalls) return;
          bubble = createToolBubble(message, config);
        } else {
          // Check for custom message renderers in layout config
          const messageLayoutConfig = config.layout?.messages;
          if (messageLayoutConfig?.renderUserMessage && message.role === "user") {
            bubble = messageLayoutConfig.renderUserMessage({
              message,
              config,
              streaming: Boolean(message.streaming)
            });
          } else if (messageLayoutConfig?.renderAssistantMessage && message.role === "assistant") {
            bubble = messageLayoutConfig.renderAssistantMessage({
              message,
              config,
              streaming: Boolean(message.streaming)
            });
          } else {
            bubble = createStandardBubble(message, transform, messageLayoutConfig);
          }
          if (message.role !== "user" && bubble) {
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

    // Add standalone typing indicator only if streaming but no assistant message is streaming yet
    // (This shows while waiting for the stream to start)
    // Check for ANY streaming assistant message, even if empty (to avoid duplicate bubbles)
    const hasStreamingAssistantMessage = messages.some(
      (msg) => msg.role === "assistant" && msg.streaming
    );
    
    // Also check if there's a recently completed assistant message (streaming just ended)
    // This prevents flicker when the message completes but isStreaming hasn't updated yet
    const lastMessage = messages[messages.length - 1];
    const hasRecentAssistantResponse = lastMessage?.role === "assistant" && !lastMessage.streaming;

    if (isStreaming && messages.some((msg) => msg.role === "user") && !hasStreamingAssistantMessage && !hasRecentAssistantResponse) {
      const typingIndicator = createTypingIndicator();

      // Create a bubble wrapper for the typing indicator (similar to assistant messages)
      const typingBubble = document.createElement("div");
      typingBubble.className = [
        "tvw-max-w-[85%]",
        "tvw-rounded-2xl",
        "tvw-text-sm",
        "tvw-leading-relaxed",
        "tvw-shadow-sm",
        "tvw-bg-cw-surface",
        "tvw-border",
        "tvw-border-cw-message-border",
        "tvw-text-cw-primary",
        "tvw-px-5",
        "tvw-py-3"
      ].join(" ");

      typingBubble.appendChild(typingIndicator);

      const typingWrapper = document.createElement("div");
      typingWrapper.className = "tvw-flex";
      typingWrapper.appendChild(typingBubble);
      fragment.appendChild(typingWrapper);
    }

    container.appendChild(fragment);
    // Defer scroll to next frame for smoother animation and to prevent jolt
    // This allows the browser to update layout (e.g., typing indicator removal) before scrolling
    // Use double RAF to ensure layout has fully settled before starting scroll animation
    // Get the scrollable container using its unique ID (#vanilla-agent-scroll-container)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scrollableContainer = getScrollableContainer();
        smoothScrollToBottom(scrollableContainer);
      });
    });
  };

  // Alias for clarity - the implementation handles flicker prevention via typing indicator logic
  const renderMessagesWithPlugins = renderMessagesWithPluginsImpl;

  const updateOpenState = () => {
    if (!launcherEnabled) return;
    if (open) {
      wrapper.classList.remove("tvw-pointer-events-none", "tvw-opacity-0");
      panel.classList.remove("tvw-scale-95", "tvw-opacity-0");
      panel.classList.add("tvw-scale-100", "tvw-opacity-100");
      // Hide launcher button when widget is open
      if (launcherButtonInstance) {
        launcherButtonInstance.element.style.display = "none";
      } else if (customLauncherElement) {
        customLauncherElement.style.display = "none";
      }
    } else {
      wrapper.classList.add("tvw-pointer-events-none", "tvw-opacity-0");
      panel.classList.remove("tvw-scale-100", "tvw-opacity-100");
      panel.classList.add("tvw-scale-95", "tvw-opacity-0");
      // Show launcher button when widget is closed
      if (launcherButtonInstance) {
        launcherButtonInstance.element.style.display = "";
      } else if (customLauncherElement) {
        customLauncherElement.style.display = "";
      }
    }
  };

  const setOpenState = (nextOpen: boolean, source: "user" | "auto" | "api" | "system" = "user") => {
    if (!launcherEnabled) return;
    if (open === nextOpen) return;
    
    const prevOpen = open;
    open = nextOpen;
    updateOpenState();
    
    if (open) {
      recalcPanelHeight();
      scheduleAutoScroll(true);
    }
    
    // Emit widget state events
    const stateEvent: AgentWidgetStateEvent = {
      open,
      source,
      timestamp: Date.now()
    };
    
    if (open && !prevOpen) {
      eventBus.emit("widget:opened", stateEvent);
    } else if (!open && prevOpen) {
      eventBus.emit("widget:closed", stateEvent);
    }
    
    // Emit general state snapshot
    eventBus.emit("widget:state", {
      open,
      launcherEnabled,
      voiceActive: voiceState.active,
      streaming: session.isStreaming()
    });
  };

  const setComposerDisabled = (disabled: boolean) => {
    // Keep textarea always enabled so users can type while streaming
    // Only disable submit controls to prevent sending during streaming
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
    textarea.placeholder = config.copy?.inputPlaceholder ?? "How can I help...";

    // Only update send button text if NOT using icon mode
    const useIcon = config.sendButton?.useIcon ?? false;
    if (!useIcon) {
      sendButton.textContent = config.copy?.sendButtonLabel ?? "Send";
    }

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

  session = new AgentWidgetSession(config, {
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
          suggestionsManager.render(config.suggestionChips, session, textarea, messages, config.suggestionChipsConfig);
        }
      }
      scheduleAutoScroll(!isStreaming);
      trackMessages(messages);

      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.role === "user");
      voiceState.lastUserMessageWasVoice = Boolean(lastUserMessage?.viaVoice);
      persistState(messages);
    },
    onStatusChanged(status) {
      const currentStatusConfig = config.statusIndicator ?? {};
      const getCurrentStatusText = (status: AgentWidgetSessionStatus): string => {
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

  if (pendingStoredState) {
    pendingStoredState
      .then((state) => {
        if (!state) return;
        if (state.metadata) {
          persistentMetadata = ensureRecord(state.metadata);
          actionManager.syncFromMetadata();
        }
        if (state.messages?.length) {
          session.hydrateMessages(state.messages);
        }
      })
      .catch((error) => {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.error("[AgentWidget] Failed to hydrate stored state:", error);
        }
      });
  }

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

  const startVoiceRecognition = (
    source: AgentWidgetVoiceStateEvent["source"] = "user"
  ) => {
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
            session.sendMessage(finalValue, { viaVoice: true });
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
          session.sendMessage(finalValue, { viaVoice: true });
        }
        stopVoiceRecognition();
      }
    };

    try {
      speechRecognition.start();
      isRecording = true;
      voiceState.active = true;
      if (source !== "system") {
        voiceState.manuallyDeactivated = false;
      }
      emitVoiceState(source);
      persistVoiceMetadata();
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
      stopVoiceRecognition("system");
    }
  };

  const stopVoiceRecognition = (
    source: AgentWidgetVoiceStateEvent["source"] = "user"
  ) => {
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

    voiceState.active = false;
    emitVoiceState(source);
    persistVoiceMetadata();

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
  const createMicButton = (voiceConfig: AgentWidgetConfig['voiceRecognition'], sendButtonConfig: AgentWidgetConfig['sendButton']): { micButton: HTMLButtonElement; micButtonWrapper: HTMLElement } | null => {
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
      voiceState.manuallyDeactivated = true;
      persistVoiceMetadata();
      stopVoiceRecognition("user");
      if (finalValue) {
        textarea.value = "";
        session.sendMessage(finalValue);
      }
    } else {
      // Start recording
      voiceState.manuallyDeactivated = false;
      persistVoiceMetadata();
      startVoiceRecognition("user");
    }
  };

  if (micButton) {
    micButton.addEventListener("click", handleMicButtonClick);

    destroyCallbacks.push(() => {
      stopVoiceRecognition("system");
      if (micButton) {
        micButton.removeEventListener("click", handleMicButtonClick);
      }
    });
  }

  const autoResumeUnsub = eventBus.on("assistant:complete", () => {
    if (!voiceAutoResumeMode) return;
    if (voiceState.active || voiceState.manuallyDeactivated) return;
    if (voiceAutoResumeMode === "assistant" && !voiceState.lastUserMessageWasVoice) {
      return;
    }
    setTimeout(() => {
      if (!voiceState.active && !voiceState.manuallyDeactivated) {
        startVoiceRecognition("auto");
      }
    }, 600);
  });
  destroyCallbacks.push(autoResumeUnsub);

  const toggleOpen = () => {
    setOpenState(!open, "user");
  };

  // Plugin hook: renderLauncher - allow plugins to provide custom launcher
  let launcherButtonInstance: ReturnType<typeof createLauncherButton> | null = null;
  let customLauncherElement: HTMLElement | null = null;
  
  if (launcherEnabled) {
    const launcherPlugin = plugins.find(p => p.renderLauncher);
    if (launcherPlugin?.renderLauncher) {
      const customLauncher = launcherPlugin.renderLauncher({
        config,
        defaultRenderer: () => {
          const btn = createLauncherButton(config, toggleOpen);
          return btn.element;
        },
        onToggle: toggleOpen
      });
      if (customLauncher) {
        customLauncherElement = customLauncher;
      }
    }
    
    // Use custom launcher if provided, otherwise use default
    if (!customLauncherElement) {
      launcherButtonInstance = createLauncherButton(config, toggleOpen);
    }
  }

  if (launcherButtonInstance) {
    mount.appendChild(launcherButtonInstance.element);
  } else if (customLauncherElement) {
    mount.appendChild(customLauncherElement);
  }
  updateOpenState();
  suggestionsManager.render(config.suggestionChips, session, textarea, undefined, config.suggestionChipsConfig);
  updateCopy();
  setComposerDisabled(session.isStreaming());
  scheduleAutoScroll(true);
  maybeRestoreVoiceFromMetadata();

  const recalcPanelHeight = () => {
    const sidebarMode = config.launcher?.sidebarMode ?? false;
    const fullHeight = sidebarMode || (config.launcher?.fullHeight ?? false);
    
    if (!launcherEnabled) {
      panel.style.height = "";
      panel.style.width = "";
      return;
    }
    
    // In sidebar/fullHeight mode, don't override the width - it's handled by applyFullHeightStyles
    if (!sidebarMode) {
      const launcherWidth = config?.launcher?.width ?? config?.launcherWidth;
      const width = launcherWidth ?? "min(400px, calc(100vw - 24px))";
      panel.style.width = width;
      panel.style.maxWidth = width;
    }
    
    // In fullHeight mode, don't set a fixed height
    if (!fullHeight) {
      const viewportHeight = window.innerHeight;
      const verticalMargin = 64; // leave space for launcher's offset
      const available = Math.max(200, viewportHeight - verticalMargin);
      const clamped = Math.min(640, available);
      panel.style.height = `${clamped}px`;
    }
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

  // Setup clear chat button click handler
  const setupClearChatButton = () => {
    const { clearChatButton } = panelElements;
    if (!clearChatButton) return;

    clearChatButton.addEventListener("click", () => {
      // Clear messages in session (this will trigger onMessagesChanged which re-renders)
      session.clearMessages();

      // Always clear the default localStorage key
      try {
        localStorage.removeItem(DEFAULT_CHAT_HISTORY_STORAGE_KEY);
        if (config.debug) {
          console.log(`[AgentWidget] Cleared default localStorage key: ${DEFAULT_CHAT_HISTORY_STORAGE_KEY}`);
        }
      } catch (error) {
        console.error("[AgentWidget] Failed to clear default localStorage:", error);
      }

      // Also clear custom localStorage key if configured
      if (config.clearChatHistoryStorageKey && config.clearChatHistoryStorageKey !== DEFAULT_CHAT_HISTORY_STORAGE_KEY) {
        try {
          localStorage.removeItem(config.clearChatHistoryStorageKey);
          if (config.debug) {
            console.log(`[AgentWidget] Cleared custom localStorage key: ${config.clearChatHistoryStorageKey}`);
          }
        } catch (error) {
          console.error("[AgentWidget] Failed to clear custom localStorage:", error);
        }
      }

      // Dispatch custom event for external handlers (e.g., localStorage clearing in examples)
      const clearEvent = new CustomEvent("vanilla-agent:clear-chat", {
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(clearEvent);

      if (storageAdapter?.clear) {
        try {
          const result = storageAdapter.clear();
          if (result instanceof Promise) {
            result.catch((error) => {
              if (typeof console !== "undefined") {
                // eslint-disable-next-line no-console
                console.error("[AgentWidget] Failed to clear storage adapter:", error);
              }
            });
          }
        } catch (error) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.error("[AgentWidget] Failed to clear storage adapter:", error);
          }
        }
      }
      persistentMetadata = {};
      actionManager.syncFromMetadata();
    });
  };

  setupClearChatButton();

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
  } else if (customLauncherElement) {
    destroyCallbacks.push(() => {
      customLauncherElement?.remove();
    });
  }

  const controller: Controller = {
    update(nextConfig: AgentWidgetConfig) {
      const previousToolCallConfig = config.toolCall;
      config = { ...config, ...nextConfig };
      // applyFullHeightStyles resets mount.style.cssText, so call it before applyThemeVariables
      applyFullHeightStyles();
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
      if (config.launcher?.enabled === false && customLauncherElement) {
        customLauncherElement.remove();
        customLauncherElement = null;
      }

      if (config.launcher?.enabled !== false && !launcherButtonInstance && !customLauncherElement) {
        // Check for launcher plugin when re-enabling
        const launcherPlugin = plugins.find(p => p.renderLauncher);
        if (launcherPlugin?.renderLauncher) {
          const customLauncher = launcherPlugin.renderLauncher({
            config,
            defaultRenderer: () => {
              const btn = createLauncherButton(config, toggleOpen);
              return btn.element;
            },
            onToggle: toggleOpen
          });
          if (customLauncher) {
            customLauncherElement = customLauncher;
            mount.appendChild(customLauncherElement);
          }
        }
        if (!customLauncherElement) {
          launcherButtonInstance = createLauncherButton(config, toggleOpen);
          mount.appendChild(launcherButtonInstance.element);
        }
      }

      if (launcherButtonInstance) {
        launcherButtonInstance.update(config);
      }
      // Note: Custom launcher updates are handled by the plugin's own logic

      // Update panel header title and subtitle
      if (headerTitle && config.launcher?.title !== undefined) {
        headerTitle.textContent = config.launcher.title;
      }
      if (headerSubtitle && config.launcher?.subtitle !== undefined) {
        headerSubtitle.textContent = config.launcher.subtitle;
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
          setOpenState(autoExpand, "auto");
        }
      } else if (autoExpandChanged) {
        // autoExpand value changed - update state to match
        setOpenState(autoExpand, "auto");
      }
      // Otherwise, preserve current open state (user may have manually opened/closed)

      // Update previous values for next comparison
      prevAutoExpand = autoExpand;
      prevLauncherEnabled = launcherEnabled;
      recalcPanelHeight();
      refreshCloseButton();

      // Re-render messages if toolCall config changed (to apply new styles)
      const toolCallConfigChanged = JSON.stringify(nextConfig.toolCall) !== JSON.stringify(previousToolCallConfig);
      if (toolCallConfigChanged && session) {
        renderMessagesWithPlugins(messagesWrapper, session.getMessages(), postprocess);
      }

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
        
        // Update placement if changed - move the wrapper (not just the button) to preserve tooltip
        const { closeButtonWrapper } = panelElements;
        const isTopRight = closeButtonPlacement === "top-right";
        const currentlyTopRight = closeButtonWrapper?.classList.contains("tvw-absolute");
        
        if (closeButtonWrapper && isTopRight !== currentlyTopRight) {
          // Placement changed - need to move wrapper and update classes
          closeButtonWrapper.remove();
          
          // Update wrapper classes
          if (isTopRight) {
            closeButtonWrapper.className = "tvw-absolute tvw-top-4 tvw-right-4 tvw-z-50";
            container.style.position = "relative";
            container.appendChild(closeButtonWrapper);
          } else {
            // Check if clear chat is inline to determine if we need ml-auto
            const clearChatPlacement = launcher.clearChat?.placement ?? "inline";
            const clearChatEnabled = launcher.clearChat?.enabled ?? true;
            closeButtonWrapper.className = (clearChatEnabled && clearChatPlacement === "inline") ? "" : "tvw-ml-auto";
            // Find header element
            const header = container.querySelector(".tvw-border-b-cw-divider");
            if (header) {
              header.appendChild(closeButtonWrapper);
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

        // Update padding
        if (launcher.closeButtonPaddingX) {
          closeButton.style.paddingLeft = launcher.closeButtonPaddingX;
          closeButton.style.paddingRight = launcher.closeButtonPaddingX;
        } else {
          closeButton.style.paddingLeft = "";
          closeButton.style.paddingRight = "";
        }
        if (launcher.closeButtonPaddingY) {
          closeButton.style.paddingTop = launcher.closeButtonPaddingY;
          closeButton.style.paddingBottom = launcher.closeButtonPaddingY;
        } else {
          closeButton.style.paddingTop = "";
          closeButton.style.paddingBottom = "";
        }

        // Update icon
        const closeButtonIconName = launcher.closeButtonIconName ?? "x";
        const closeButtonIconText = launcher.closeButtonIconText ?? "×";

        // Clear existing content and render new icon
        closeButton.innerHTML = "";
        const iconSvg = renderLucideIcon(closeButtonIconName, "20px", launcher.closeButtonColor || "", 2);
        if (iconSvg) {
          closeButton.appendChild(iconSvg);
        } else {
          closeButton.textContent = closeButtonIconText;
        }

        // Update tooltip
        const closeButtonTooltipText = launcher.closeButtonTooltipText ?? "Close chat";
        const closeButtonShowTooltip = launcher.closeButtonShowTooltip ?? true;

        closeButton.setAttribute("aria-label", closeButtonTooltipText);

        if (closeButtonWrapper) {
          // Clean up old tooltip event listeners if they exist
          if ((closeButtonWrapper as any)._cleanupTooltip) {
            (closeButtonWrapper as any)._cleanupTooltip();
            delete (closeButtonWrapper as any)._cleanupTooltip;
          }

          // Set up new portaled tooltip with event listeners
          if (closeButtonShowTooltip && closeButtonTooltipText) {
            let portaledTooltip: HTMLElement | null = null;

            const showTooltip = () => {
              if (portaledTooltip || !closeButton) return; // Already showing or button doesn't exist

              // Create tooltip element
              portaledTooltip = createElement("div", "tvw-clear-chat-tooltip");
              portaledTooltip.textContent = closeButtonTooltipText;

              // Add arrow
              const arrow = createElement("div");
              arrow.className = "tvw-clear-chat-tooltip-arrow";
              portaledTooltip.appendChild(arrow);

              // Get button position
              const buttonRect = closeButton.getBoundingClientRect();

              // Position tooltip above button
              portaledTooltip.style.position = "fixed";
              portaledTooltip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
              portaledTooltip.style.top = `${buttonRect.top - 8}px`;
              portaledTooltip.style.transform = "translate(-50%, -100%)";

              // Append to body
              document.body.appendChild(portaledTooltip);
            };

            const hideTooltip = () => {
              if (portaledTooltip && portaledTooltip.parentNode) {
                portaledTooltip.parentNode.removeChild(portaledTooltip);
                portaledTooltip = null;
              }
            };

            // Add event listeners
            closeButtonWrapper.addEventListener("mouseenter", showTooltip);
            closeButtonWrapper.addEventListener("mouseleave", hideTooltip);
            closeButton.addEventListener("focus", showTooltip);
            closeButton.addEventListener("blur", hideTooltip);

            // Store cleanup function on the wrapper for later use
            (closeButtonWrapper as any)._cleanupTooltip = () => {
              hideTooltip();
              if (closeButtonWrapper) {
                closeButtonWrapper.removeEventListener("mouseenter", showTooltip);
                closeButtonWrapper.removeEventListener("mouseleave", hideTooltip);
              }
              if (closeButton) {
                closeButton.removeEventListener("focus", showTooltip);
                closeButton.removeEventListener("blur", hideTooltip);
              }
            };
          }
        }
      }

      // Update clear chat button styling from config
      const { clearChatButton, clearChatButtonWrapper } = panelElements;
      if (clearChatButton) {
        const clearChatConfig = launcher.clearChat ?? {};
        const clearChatEnabled = clearChatConfig.enabled ?? true;
        const clearChatPlacement = clearChatConfig.placement ?? "inline";

        // Show/hide button based on enabled state
        if (clearChatButtonWrapper) {
          clearChatButtonWrapper.style.display = clearChatEnabled ? "" : "none";

          // Update placement if changed
          const isTopRight = clearChatPlacement === "top-right";
          const currentlyTopRight = clearChatButtonWrapper.classList.contains("tvw-absolute");

          if (isTopRight !== currentlyTopRight && clearChatEnabled) {
            clearChatButtonWrapper.remove();

            if (isTopRight) {
              // Don't use tvw-clear-chat-button-wrapper class for top-right mode as its
              // display: inline-flex causes alignment issues with the close button
              clearChatButtonWrapper.className = "tvw-absolute tvw-top-4 tvw-z-50";
              // Position to the left of the close button (which is at right: 1rem/16px)
              // Close button is ~32px wide, plus small gap = 48px from right
              clearChatButtonWrapper.style.right = "48px";
              container.style.position = "relative";
              container.appendChild(clearChatButtonWrapper);
            } else {
              clearChatButtonWrapper.className = "tvw-relative tvw-ml-auto tvw-clear-chat-button-wrapper";
              // Clear the inline right style when switching back to inline mode
              clearChatButtonWrapper.style.right = "";
              // Find header and insert before close button
              const header = container.querySelector(".tvw-border-b-cw-divider");
              const closeButtonWrapperEl = panelElements.closeButtonWrapper;
              if (header && closeButtonWrapperEl && closeButtonWrapperEl.parentElement === header) {
                header.insertBefore(clearChatButtonWrapper, closeButtonWrapperEl);
              } else if (header) {
                header.appendChild(clearChatButtonWrapper);
              }
            }

            // Also update close button's ml-auto class based on clear chat position
            const closeButtonWrapperEl = panelElements.closeButtonWrapper;
            if (closeButtonWrapperEl && !closeButtonWrapperEl.classList.contains("tvw-absolute")) {
              if (isTopRight) {
                // Clear chat moved to top-right, close needs ml-auto
                closeButtonWrapperEl.classList.add("tvw-ml-auto");
              } else {
                // Clear chat is inline, close doesn't need ml-auto
                closeButtonWrapperEl.classList.remove("tvw-ml-auto");
              }
            }
          }
        }

        if (clearChatEnabled) {
          // Update size
          const clearChatSize = clearChatConfig.size ?? "32px";
          clearChatButton.style.height = clearChatSize;
          clearChatButton.style.width = clearChatSize;

          // Update icon
          const clearChatIconName = clearChatConfig.iconName ?? "refresh-cw";
          const clearChatIconColor = clearChatConfig.iconColor ?? "";

          // Clear existing icon and render new one
          clearChatButton.innerHTML = "";
          const iconSvg = renderLucideIcon(clearChatIconName, "20px", clearChatIconColor || "", 2);
          if (iconSvg) {
            clearChatButton.appendChild(iconSvg);
          }

          // Update icon color
          if (clearChatIconColor) {
            clearChatButton.style.color = clearChatIconColor;
            clearChatButton.classList.remove("tvw-text-cw-muted");
          } else {
            clearChatButton.style.color = "";
            clearChatButton.classList.add("tvw-text-cw-muted");
          }

          // Update background color
          if (clearChatConfig.backgroundColor) {
            clearChatButton.style.backgroundColor = clearChatConfig.backgroundColor;
            clearChatButton.classList.remove("hover:tvw-bg-gray-100");
          } else {
            clearChatButton.style.backgroundColor = "";
            clearChatButton.classList.add("hover:tvw-bg-gray-100");
          }

          // Update border
          if (clearChatConfig.borderWidth || clearChatConfig.borderColor) {
            const borderWidth = clearChatConfig.borderWidth || "0px";
            const borderColor = clearChatConfig.borderColor || "transparent";
            clearChatButton.style.border = `${borderWidth} solid ${borderColor}`;
            clearChatButton.classList.remove("tvw-border-none");
          } else {
            clearChatButton.style.border = "";
            clearChatButton.classList.add("tvw-border-none");
          }

          // Update border radius
          if (clearChatConfig.borderRadius) {
            clearChatButton.style.borderRadius = clearChatConfig.borderRadius;
            clearChatButton.classList.remove("tvw-rounded-full");
          } else {
            clearChatButton.style.borderRadius = "";
            clearChatButton.classList.add("tvw-rounded-full");
          }

          // Update padding
          if (clearChatConfig.paddingX) {
            clearChatButton.style.paddingLeft = clearChatConfig.paddingX;
            clearChatButton.style.paddingRight = clearChatConfig.paddingX;
          } else {
            clearChatButton.style.paddingLeft = "";
            clearChatButton.style.paddingRight = "";
          }
          if (clearChatConfig.paddingY) {
            clearChatButton.style.paddingTop = clearChatConfig.paddingY;
            clearChatButton.style.paddingBottom = clearChatConfig.paddingY;
          } else {
            clearChatButton.style.paddingTop = "";
            clearChatButton.style.paddingBottom = "";
          }

          const clearChatTooltipText = clearChatConfig.tooltipText ?? "Clear chat";
          const clearChatShowTooltip = clearChatConfig.showTooltip ?? true;

          clearChatButton.setAttribute("aria-label", clearChatTooltipText);

          if (clearChatButtonWrapper) {
            // Clean up old tooltip event listeners if they exist
            if ((clearChatButtonWrapper as any)._cleanupTooltip) {
              (clearChatButtonWrapper as any)._cleanupTooltip();
              delete (clearChatButtonWrapper as any)._cleanupTooltip;
            }

            // Set up new portaled tooltip with event listeners
            if (clearChatShowTooltip && clearChatTooltipText) {
              let portaledTooltip: HTMLElement | null = null;

              const showTooltip = () => {
                if (portaledTooltip || !clearChatButton) return; // Already showing or button doesn't exist

                // Create tooltip element
                portaledTooltip = createElement("div", "tvw-clear-chat-tooltip");
                portaledTooltip.textContent = clearChatTooltipText;

                // Add arrow
                const arrow = createElement("div");
                arrow.className = "tvw-clear-chat-tooltip-arrow";
                portaledTooltip.appendChild(arrow);

                // Get button position
                const buttonRect = clearChatButton.getBoundingClientRect();

                // Position tooltip above button
                portaledTooltip.style.position = "fixed";
                portaledTooltip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
                portaledTooltip.style.top = `${buttonRect.top - 8}px`;
                portaledTooltip.style.transform = "translate(-50%, -100%)";

                // Append to body
                document.body.appendChild(portaledTooltip);
              };

              const hideTooltip = () => {
                if (portaledTooltip && portaledTooltip.parentNode) {
                  portaledTooltip.parentNode.removeChild(portaledTooltip);
                  portaledTooltip = null;
                }
              };

              // Add event listeners
              clearChatButtonWrapper.addEventListener("mouseenter", showTooltip);
              clearChatButtonWrapper.addEventListener("mouseleave", hideTooltip);
              clearChatButton.addEventListener("focus", showTooltip);
              clearChatButton.addEventListener("blur", hideTooltip);

              // Store cleanup function on the button for later use
              (clearChatButtonWrapper as any)._cleanupTooltip = () => {
                hideTooltip();
                if (clearChatButtonWrapper) {
                  clearChatButtonWrapper.removeEventListener("mouseenter", showTooltip);
                  clearChatButtonWrapper.removeEventListener("mouseleave", hideTooltip);
                }
                if (clearChatButton) {
                  clearChatButton.removeEventListener("focus", showTooltip);
                  clearChatButton.removeEventListener("blur", hideTooltip);
                }
              };
            }
          }
        }
      }

      const nextParsers =
        config.actionParsers && config.actionParsers.length
          ? config.actionParsers
          : [defaultJsonActionParser];
      const nextHandlers =
        config.actionHandlers && config.actionHandlers.length
          ? config.actionHandlers
          : [defaultActionHandlers.message, defaultActionHandlers.messageAndClick];

      actionManager = createActionManager({
        parsers: nextParsers,
        handlers: nextHandlers,
        getMetadata,
        updateMetadata,
        emit: eventBus.emit,
        documentRef: typeof document !== "undefined" ? document : null
      });

      postprocess = buildPostprocessor(config, actionManager);
      session.updateConfig(config);
      renderMessagesWithPlugins(
        messagesWrapper,
        session.getMessages(),
        postprocess
      );
      suggestionsManager.render(config.suggestionChips, session, textarea, undefined, config.suggestionChipsConfig);
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
        const getCurrentStatusText = (status: AgentWidgetSessionStatus): string => {
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
      setOpenState(true, "api");
    },
    close() {
      if (!launcherEnabled) return;
      setOpenState(false, "api");
    },
    toggle() {
      if (!launcherEnabled) return;
      setOpenState(!open, "api");
    },
    clearChat() {
      // Clear messages in session (this will trigger onMessagesChanged which re-renders)
      session.clearMessages();

      // Always clear the default localStorage key
      try {
        localStorage.removeItem(DEFAULT_CHAT_HISTORY_STORAGE_KEY);
        if (config.debug) {
          console.log(`[AgentWidget] Cleared default localStorage key: ${DEFAULT_CHAT_HISTORY_STORAGE_KEY}`);
        }
      } catch (error) {
        console.error("[AgentWidget] Failed to clear default localStorage:", error);
      }

      // Also clear custom localStorage key if configured
      if (config.clearChatHistoryStorageKey && config.clearChatHistoryStorageKey !== DEFAULT_CHAT_HISTORY_STORAGE_KEY) {
        try {
          localStorage.removeItem(config.clearChatHistoryStorageKey);
          if (config.debug) {
            console.log(`[AgentWidget] Cleared custom localStorage key: ${config.clearChatHistoryStorageKey}`);
          }
        } catch (error) {
          console.error("[AgentWidget] Failed to clear custom localStorage:", error);
        }
      }

      // Dispatch custom event for external handlers (e.g., localStorage clearing in examples)
      const clearEvent = new CustomEvent("vanilla-agent:clear-chat", {
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(clearEvent);

      if (storageAdapter?.clear) {
        try {
          const result = storageAdapter.clear();
          if (result instanceof Promise) {
            result.catch((error) => {
              if (typeof console !== "undefined") {
                // eslint-disable-next-line no-console
                console.error("[AgentWidget] Failed to clear storage adapter:", error);
              }
            });
          }
        } catch (error) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.error("[AgentWidget] Failed to clear storage adapter:", error);
          }
        }
      }
      persistentMetadata = {};
      actionManager.syncFromMetadata();
    },
    setMessage(message: string): boolean {
      if (!textarea) return false;
      if (session.isStreaming()) return false;
      
      // Auto-open widget if closed and launcher is enabled
      if (!open && launcherEnabled) {
        setOpenState(true, "system");
      }
      
      textarea.value = message;
      // Trigger input event for any listeners
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    },
    submitMessage(message?: string): boolean {
      if (session.isStreaming()) return false;
      
      const valueToSubmit = message?.trim() || textarea.value.trim();
      if (!valueToSubmit) return false;
      
      // Auto-open widget if closed and launcher is enabled
      if (!open && launcherEnabled) {
        setOpenState(true, "system");
      }
      
      textarea.value = "";
      session.sendMessage(valueToSubmit);
      return true;
    },
    startVoiceRecognition(): boolean {
      if (isRecording || session.isStreaming()) return false;
      
      const SpeechRecognitionClass = getSpeechRecognitionClass();
      if (!SpeechRecognitionClass) return false;
      
      // Auto-open widget if closed and launcher is enabled
      if (!open && launcherEnabled) {
        setOpenState(true, "system");
      }
      
      voiceState.manuallyDeactivated = false;
      persistVoiceMetadata();
      startVoiceRecognition("user");
      return true;
    },
    stopVoiceRecognition(): boolean {
      if (!isRecording) return false;
      
      voiceState.manuallyDeactivated = true;
      persistVoiceMetadata();
      stopVoiceRecognition("user");
      return true;
    },
    injectTestMessage(event: AgentWidgetEvent) {
      // Auto-open widget if closed and launcher is enabled
      if (!open && launcherEnabled) {
        setOpenState(true, "system");
      }
      session.injectTestEvent(event);
    },
    getMessages() {
      return session.getMessages();
    },
    getStatus() {
      return session.getStatus();
    },
    getPersistentMetadata() {
      return { ...persistentMetadata };
    },
    updatePersistentMetadata(
      updater: (prev: Record<string, unknown>) => Record<string, unknown>
    ) {
      updateMetadata(updater);
    },
    on(event, handler) {
      return eventBus.on(event, handler);
    },
    off(event, handler) {
      eventBus.off(event, handler);
    },
    // State query methods
    isOpen(): boolean {
      return launcherEnabled && open;
    },
    isVoiceActive(): boolean {
      return voiceState.active;
    },
    getState(): AgentWidgetStateSnapshot {
      return {
        open: launcherEnabled && open,
        launcherEnabled,
        voiceActive: voiceState.active,
        streaming: session.isStreaming()
      };
    },
    destroy() {
      destroyCallbacks.forEach((cb) => cb());
      wrapper.remove();
      launcherButtonInstance?.destroy();
      customLauncherElement?.remove();
      if (closeHandler) {
        closeButton.removeEventListener("click", closeHandler);
      }
    }
  };

  const shouldExposeDebugApi =
    (runtimeOptions?.debugTools ?? false) || Boolean(config.debug);

  if (shouldExposeDebugApi && typeof window !== "undefined") {
    const previousDebug = (window as any).AgentWidgetBrowser;
    const debugApi = {
      controller,
      getMessages: controller.getMessages,
      getStatus: controller.getStatus,
      getMetadata: controller.getPersistentMetadata,
      updateMetadata: controller.updatePersistentMetadata,
      clearHistory: () => controller.clearChat(),
      setVoiceActive: (active: boolean) =>
        active
          ? controller.startVoiceRecognition()
          : controller.stopVoiceRecognition()
    };
    (window as any).AgentWidgetBrowser = debugApi;
    destroyCallbacks.push(() => {
      if ((window as any).AgentWidgetBrowser === debugApi) {
        (window as any).AgentWidgetBrowser = previousDebug;
      }
    });
  }

  return controller;
};

export type AgentWidgetController = Controller;
