import { ChatWidgetSession, ChatWidgetSessionStatus } from "./session";
import { ChatWidgetConfig, ChatWidgetMessage } from "./types";

const statusCopy: Record<ChatWidgetSessionStatus, string> = {
  idle: "Online",
  connecting: "Connecting…",
  connected: "Streaming…",
  error: "Offline"
};

const positionMap: Record<
  NonNullable<ChatWidgetConfig["launcher"]>["position"],
  string
> = {
  "bottom-right": "tvw-bottom-6 tvw-right-6",
  "bottom-left": "tvw-bottom-6 tvw-left-6",
  "top-right": "tvw-top-6 tvw-right-6",
  "top-left": "tvw-top-6 tvw-left-6"
};

type Controller = {
  update: (config: ChatWidgetConfig) => void;
  destroy: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

type MessageTransform = (context: {
  text: string;
  message: ChatWidgetMessage;
  streaming: boolean;
}) => string;

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string
) => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
};

const applyThemeVariables = (
  element: HTMLElement,
  config?: ChatWidgetConfig
) => {
  const theme = config?.theme ?? {};
  Object.entries(theme).forEach(([key, value]) => {
    element.style.setProperty(`--travrse-${key}`, value);
  });
};

const renderMessages = (
  container: HTMLElement,
  messages: ChatWidgetMessage[],
  transform: MessageTransform,
  enhance?: (bubble: HTMLElement, message: ChatWidgetMessage) => void
) => {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  messages.forEach((message) => {
    const bubble = createElement(
      "div",
      [
        "tvw-max-w-[85%]",
        "tvw-rounded-2xl",
        "tvw-px-5",
        "tvw-py-3",
        "tvw-text-sm",
        "tvw-leading-relaxed",
        "tvw-shadow-sm",
        message.role === "user"
          ? "tvw-ml-auto tvw-bg-travrse-accent tvw-text-white"
          : "tvw-bg-white tvw-border tvw-border-gray-100 tvw-text-travrse-primary"
      ].join(" ")
    );
    bubble.innerHTML = transform({
      text: message.content,
      message,
      streaming: Boolean(message.streaming)
    });
    enhance?.(bubble, message);

    const wrapper = createElement("div", "tvw-flex");
    wrapper.appendChild(bubble);
    fragment.appendChild(wrapper);
  });

  container.appendChild(fragment);
  container.scrollTop = container.scrollHeight;
};

const updateLauncherButton = (
  button: HTMLButtonElement | null,
  config: ChatWidgetConfig | undefined
) => {
  if (!button || !config) return;
  const launcher = config.launcher ?? {};

  button.querySelector("[data-role='launcher-title']")!.textContent =
    launcher.title ?? "Chat Assistant";
  button.querySelector("[data-role='launcher-subtitle']")!.textContent =
    launcher.subtitle ?? "Get answers fast";

  const icon = button.querySelector<HTMLSpanElement>("[data-role='launcher-icon']");
  if (icon) {
    icon.textContent = launcher.iconUrl ? "" : "💬";
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
    "tvw-fixed tvw-flex tvw-items-center tvw-gap-3 tvw-rounded-full tvw-bg-travrse-surface tvw-py-2.5 tvw-pl-4 tvw-pr-3 tvw-shadow-lg tvw-border tvw-border-gray-200 tvw-transition hover:tvw-translate-y-[-2px]";

  button.className = `${base} ${positionClass}`;
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

const buildLauncherButton = (
  config: ChatWidgetConfig | undefined,
  toggle: () => void
) => {
  const button = createElement("button") as HTMLButtonElement;
  button.type = "button";
  button.innerHTML = `
    <span class="tvw-inline-flex tvw-h-10 tvw-w-10 tvw-items-center tvw-justify-center tvw-rounded-full tvw-bg-travrse-primary tvw-text-white" data-role="launcher-icon">💬</span>
    <img data-role="launcher-image" class="tvw-h-10 tvw-w-10 tvw-rounded-full tvw-object-cover" alt="" style="display:none" />
    <span class="tvw-flex tvw-flex-col tvw-items-start tvw-text-left">
      <span class="tvw-text-sm tvw-font-semibold tvw-text-travrse-primary" data-role="launcher-title"></span>
      <span class="tvw-text-xs tvw-text-travrse-muted" data-role="launcher-subtitle"></span>
    </span>
    <span class="tvw-ml-2 tvw-grid tvw-h-8 tvw-w-8 tvw-place-items-center tvw-rounded-full tvw-bg-travrse-primary tvw-text-white">↗</span>
  `;
  button.addEventListener("click", toggle);
  updateLauncherButton(button, config);
  return button;
};

const createWrapper = (config?: ChatWidgetConfig) => {
  const launcherEnabled = config?.launcher?.enabled ?? true;

  if (!launcherEnabled) {
    const wrapper = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-h-full"
    );
    const panel = createElement(
      "div",
      "tvw-relative tvw-w-full tvw-h-full tvw-min-h-[360px]"
    );
    wrapper.appendChild(panel);
    return { wrapper, panel };
  }

  const launcher = config?.launcher ?? {};
  const position =
    launcher.position && positionMap[launcher.position]
      ? positionMap[launcher.position]
      : positionMap["bottom-right"];

  const wrapper = createElement(
    "div",
    `tvw-fixed ${position} tvw-z-50 tvw-transition`
  );

  const panel = createElement(
    "div",
    "tvw-relative tvw-min-h-[320px]"
  );
  const launcherWidth = config?.launcher?.width ?? config?.launcherWidth;
  const width = launcherWidth ?? "min(360px, calc(100vw - 24px))";
  panel.style.width = width;
  panel.style.maxWidth = width;

  wrapper.appendChild(panel);
  return { wrapper, panel };
};

const buildPanel = (config?: ChatWidgetConfig, showClose = true) => {
  const container = createElement(
    "div",
    "tvw-flex tvw-h-full tvw-w-full tvw-flex-col tvw-bg-travrse-surface tvw-text-travrse-primary tvw-rounded-2xl tvw-overflow-hidden tvw-shadow-2xl tvw-border tvw-border-gray-100"
  );

  const header = createElement(
    "div",
    "tvw-flex tvw-items-center tvw-gap-3 tvw-bg-travrse-surface tvw-px-6 tvw-py-5 tvw-border-b tvw-border-gray-100"
  );

  const iconHolder = createElement(
    "div",
    "tvw-flex tvw-h-12 tvw-w-12 tvw-items-center tvw-justify-center tvw-rounded-xl tvw-bg-travrse-primary tvw-text-white tvw-text-xl"
  );
  iconHolder.textContent = config?.launcher?.iconUrl ? "" : "💼";

  if (config?.launcher?.iconUrl) {
    const img = createElement("img") as HTMLImageElement;
    img.src = config.launcher.iconUrl;
    img.alt = "";
    img.className = "tvw-h-12 tvw-w-12 tvw-rounded-xl tvw-object-cover";
    iconHolder.replaceChildren(img);
  }

  const headerCopy = createElement("div", "tvw-flex tvw-flex-col");
  const title = createElement(
    "span",
    "tvw-text-base tvw-font-semibold"
  );
  title.textContent =
    config?.launcher?.title ?? "Chat Assistant";
  const subtitle = createElement(
    "span",
    "tvw-text-sm tvw-text-travrse-muted"
  );
  subtitle.textContent =
    config?.launcher?.subtitle ?? "Here to help you get answers fast";

  headerCopy.append(title, subtitle);
  header.append(iconHolder, headerCopy);

  const closeButton = createElement(
    "button",
    "tvw-ml-auto tvw-inline-flex tvw-h-8 tvw-w-8 tvw-items-center tvw-justify-center tvw-rounded-full tvw-text-travrse-muted hover:tvw-bg-gray-100"
  ) as HTMLButtonElement;
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close chat");
  closeButton.textContent = "×";
  closeButton.style.display = showClose ? "" : "none";
  header.appendChild(closeButton);

  const body = createElement(
    "div",
    "tvw-flex tvw-flex-1 tvw-min-h-0 tvw-flex-col tvw-gap-6 tvw-overflow-y-auto tvw-bg-[#f8fafc] tvw-px-6 tvw-py-6"
  );
  const introCard = createElement(
    "div",
    "tvw-rounded-2xl tvw-bg-travrse-surface tvw-p-6 tvw-shadow-sm"
  );
  const introTitle = createElement(
    "h2",
    "tvw-text-lg tvw-font-semibold tvw-text-travrse-primary"
  );
  introTitle.textContent = config?.copy?.welcomeTitle ?? "Hello 👋";
  const introSubtitle = createElement(
    "p",
    "tvw-mt-2 tvw-text-sm tvw-text-travrse-muted"
  );
  introSubtitle.textContent =
    config?.copy?.welcomeSubtitle ??
    "Ask anything about your account or products.";
  introCard.append(introTitle, introSubtitle);

  const messagesWrapper = createElement(
    "div",
    "tvw-flex tvw-flex-col tvw-gap-3"
  );

  body.append(introCard, messagesWrapper);

  const footer = createElement(
    "div",
    "tvw-border-t tvw-border-gray-100 tvw-bg-travrse-surface tvw-px-6 tvw-py-4"
  );
  const suggestions = createElement(
    "div",
    "tvw-mb-3 tvw-flex tvw-flex-wrap tvw-gap-2"
  );
  const composerForm = createElement(
    "form",
    "tvw-flex tvw-items-end tvw-gap-3 tvw-rounded-2xl tvw-border tvw-border-gray-200 tvw-bg-white tvw-px-4 tvw-py-3"
  );
  const textarea = createElement("textarea") as HTMLTextAreaElement;
  textarea.placeholder = config?.copy?.inputPlaceholder ?? "Type your message…";
  textarea.className =
    "tvw-min-h-[48px] tvw-flex-1 tvw-resize-none tvw-border-none tvw-bg-transparent tvw-text-sm tvw-text-travrse-primary focus:tvw-outline-none";
  textarea.rows = 1;
  const sendButton = createElement(
    "button",
    "tvw-rounded-full tvw-bg-travrse-primary tvw-px-4 tvw-py-2 tvw-text-sm tvw-font-semibold tvw-text-white disabled:tvw-opacity-50"
  ) as HTMLButtonElement;
  sendButton.type = "submit";
  sendButton.textContent = config?.copy?.sendButtonLabel ?? "Send";
  composerForm.append(textarea, sendButton);

  const statusText = createElement(
    "div",
    "tvw-mt-2 tvw-text-right tvw-text-xs tvw-text-travrse-muted"
  );
  statusText.textContent = statusCopy.idle;

  footer.append(suggestions, composerForm, statusText);

  container.append(header, body, footer);

  return {
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
  };
};

export const createChatExperience = (
  mount: HTMLElement,
  initialConfig?: ChatWidgetConfig
): Controller => {
  let config = { ...initialConfig };
  applyThemeVariables(mount, config);

  let launcherEnabled = config.launcher?.enabled ?? true;
  let autoExpand = config.launcher?.autoExpand ?? false;
  let open = launcherEnabled ? autoExpand : true;
  let postprocess = buildPostprocessor(config);

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
  let suggestionButtons: HTMLButtonElement[] = [];
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

  const formDefinitions: Record<
    string,
    {
      title: string;
      description?: string;
      fields: Array<{
        name: string;
        label: string;
        placeholder?: string;
        type?: "text" | "email" | "textarea";
        required?: boolean;
      }>;
      submitLabel?: string;
    }
  > = {
    init: {
      title: "Schedule a Demo",
      description: "Share the basics and we'll follow up with a confirmation.",
      fields: [
        { name: "name", label: "Full name", placeholder: "Jane Doe", required: true },
        { name: "email", label: "Work email", placeholder: "jane@example.com", type: "email", required: true },
        { name: "notes", label: "What would you like to cover?", type: "textarea" }
      ],
      submitLabel: "Submit details"
    },
    followup: {
      title: "Additional Information",
      description: "Provide any extra details to tailor the next steps.",
      fields: [
        { name: "company", label: "Company", placeholder: "Acme Inc." },
        { name: "context", label: "Context", type: "textarea", placeholder: "Share more about your use case" }
      ],
      submitLabel: "Send"
    }
  };

  const enhanceBubble = (bubble: HTMLElement, message: ChatWidgetMessage) => {
    const placeholders = bubble.querySelectorAll<HTMLElement>("[data-tv-form]");
    if (!placeholders.length) return;

    placeholders.forEach((placeholder) => {
      if (placeholder.dataset.enhanced === "true") return;
      const type = placeholder.dataset.tvForm ?? "init";
      placeholder.dataset.enhanced = "true";

      const definition = formDefinitions[type] ?? formDefinitions.init;
      placeholder.classList.add("tvw-form-card", "tvw-space-y-4");

      const heading = createElement("div", "tvw-space-y-1");
      const title = createElement(
        "h3",
        "tvw-text-base tvw-font-semibold tvw-text-travrse-primary"
      );
      title.textContent = definition.title;
      heading.appendChild(title);
      if (definition.description) {
        const desc = createElement(
          "p",
          "tvw-text-sm tvw-text-travrse-muted"
        );
        desc.textContent = definition.description;
        heading.appendChild(desc);
      }

      const form = document.createElement("form");
      form.className = "tvw-form-grid tvw-space-y-3";

      definition.fields.forEach((field) => {
        const group = createElement("label", "tvw-form-field tvw-flex tvw-flex-col tvw-gap-1");
        group.htmlFor = `${message.id}-${type}-${field.name}`;
        const label = createElement("span", "tvw-text-xs tvw-font-medium tvw-text-travrse-muted");
        label.textContent = field.label;
        group.appendChild(label);

        const inputType = field.type ?? "text";
        let control: HTMLInputElement | HTMLTextAreaElement;
        if (inputType === "textarea") {
          control = document.createElement("textarea");
          control.rows = 3;
        } else {
          control = document.createElement("input");
          control.type = inputType;
        }
        control.className =
          "tvw-rounded-xl tvw-border tvw-border-gray-200 tvw-bg-white tvw-px-3 tvw-py-2 tvw-text-sm tvw-text-travrse-primary focus:tvw-outline-none focus:tvw-border-travrse-primary";
        control.id = `${message.id}-${type}-${field.name}`;
        control.name = field.name;
        control.placeholder = field.placeholder ?? "";
        if (field.required) {
          control.required = true;
        }
        group.appendChild(control);
        form.appendChild(group);
      });

      const actions = createElement(
        "div",
        "tvw-flex tvw-items-center tvw-justify-between tvw-gap-2"
      );
      const status = createElement(
        "div",
        "tvw-text-xs tvw-text-travrse-muted tvw-min-h-[1.5rem]"
      );
      const submit = createElement(
        "button",
        "tvw-inline-flex tvw-items-center tvw-rounded-full tvw-bg-travrse-primary tvw-px-4 tvw-py-2 tvw-text-sm tvw-font-semibold tvw-text-white disabled:tvw-opacity-60"
      ) as HTMLButtonElement;
      submit.type = "submit";
      submit.textContent = definition.submitLabel ?? "Submit";
      actions.appendChild(status);
      actions.appendChild(submit);
      form.appendChild(actions);

      placeholder.replaceChildren(heading, form);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formEndpoint = config.formEndpoint ?? "/form";
        const formData = new FormData(form as HTMLFormElement);
        const payload: Record<string, unknown> = {};
        formData.forEach((value, key) => {
          payload[key] = value;
        });
        payload["type"] = type;

        submit.disabled = true;
        status.textContent = "Submitting…";

        try {
          const response = await fetch(formEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            throw new Error(`Form submission failed (${response.status})`);
          }
          const data = await response.json();
          status.textContent = data.message ?? "Thanks! We'll be in touch soon.";
          if (data.success && data.nextPrompt) {
            await session.sendMessage(String(data.nextPrompt));
          }
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : "Something went wrong. Please try again.";
        } finally {
          submit.disabled = false;
        }
      });
    });
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
    suggestionButtons.forEach((btn) => {
      btn.disabled = disabled;
    });
  };

  const renderSuggestions = (chips: string[] | undefined) => {
    suggestions.innerHTML = "";
    suggestionButtons = [];
    if (!chips || !chips.length) return;

    const fragment = document.createDocumentFragment();
    const streaming = session.isStreaming();
    chips.forEach((chip) => {
      const btn = createElement(
        "button",
        "tvw-rounded-full tvw-bg-gray-100 tvw-px-3 tvw-py-1.5 tvw-text-xs tvw-font-medium tvw-text-travrse-muted hover:tvw-bg-gray-200"
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
    suggestions.appendChild(fragment);
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
      renderMessages(messagesWrapper, messages, postprocess, enhanceBubble);
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

  let launcherButton: HTMLButtonElement | null = null;
  if (launcherEnabled) {
    launcherButton = buildLauncherButton(config, toggleOpen);
    mount.appendChild(launcherButton);
  }
  updateOpenState();
  renderSuggestions(config.suggestionChips);
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

  if (launcherButton) {
    destroyCallbacks.push(() => {
      launcherButton?.remove();
    });
  }

  return {
    update(nextConfig: ChatWidgetConfig) {
      config = { ...config, ...nextConfig };
      applyThemeVariables(mount, config);

      launcherEnabled = config.launcher?.enabled ?? true;
      autoExpand = config.launcher?.autoExpand ?? false;

      if (config.launcher?.enabled === false && launcherButton) {
        launcherButton.remove();
        launcherButton = null;
        setOpenState(true);
      }

      if (config.launcher?.enabled !== false && !launcherButton) {
        launcherButton = buildLauncherButton(config, toggleOpen);
        mount.appendChild(launcherButton);
      }

      if (launcherButton) {
        updateLauncherButton(launcherButton, config);
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
      renderMessages(
        messagesWrapper,
        session.getMessages(),
        postprocess
      );
      renderSuggestions(config.suggestionChips);
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
      launcherButton?.remove();
      if (closeHandler) {
        closeButton.removeEventListener("click", closeHandler);
      }
    }
  };
};

export type ChatWidgetController = Controller;
