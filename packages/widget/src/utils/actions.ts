import type {
  AgentWidgetActionContext,
  AgentWidgetActionEventPayload,
  AgentWidgetActionHandler,
  AgentWidgetActionHandlerResult,
  AgentWidgetActionParser,
  AgentWidgetParsedAction,
  AgentWidgetControllerEventMap,
  AgentWidgetMessage
} from "../types";

type ActionManagerProcessContext = {
  text: string;
  message: AgentWidgetMessage;
  streaming: boolean;
  raw?: string;
};

type ActionManagerOptions = {
  parsers: AgentWidgetActionParser[];
  handlers: AgentWidgetActionHandler[];
  getMetadata: () => Record<string, unknown>;
  updateMetadata: (
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => void;
  emit: <K extends keyof AgentWidgetControllerEventMap>(
    event: K,
    payload: AgentWidgetControllerEventMap[K]
  ) => void;
  documentRef: Document | null;
};

const stripCodeFence = (value: string) => {
  const match = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1] : value;
};

const extractJsonObject = (value: string) => {
  const trimmed = value.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }
  return null;
};

export const defaultJsonActionParser: AgentWidgetActionParser = ({ text }) => {
  if (!text) return null;
  if (!text.includes("{")) return null;

  try {
    const withoutFence = stripCodeFence(text);
    const jsonBody = extractJsonObject(withoutFence);
    if (!jsonBody) return null;
    const parsed = JSON.parse(jsonBody);
    if (!parsed || typeof parsed !== "object" || !parsed.action) {
      return null;
    }
    const { action, ...payload } = parsed;
    return {
      type: String(action),
      payload,
      raw: parsed
    };
  } catch {
    return null;
  }
};

const asString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

export const defaultActionHandlers: Record<
  string,
  AgentWidgetActionHandler
> = {
  message: (action) => {
    if (action.type !== "message") return;
    const text = asString((action.payload as Record<string, unknown>).text);
    return {
      handled: true,
      displayText: text
    };
  },
  messageAndClick: (action, context) => {
    if (action.type !== "message_and_click") return;
    const payload = action.payload as Record<string, unknown>;
    const selector = asString(payload.element);
    if (selector && context.document?.querySelector) {
      const element = context.document.querySelector<HTMLElement>(selector);
      if (element) {
        setTimeout(() => {
          element.click();
        }, 400);
      } else if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[AgentWidget] Element not found for selector:", selector);
      }
    }
    return {
      handled: true,
      displayText: asString(payload.text)
    };
  },
  navThenClick: (action, context) => {
    if (action.type !== "nav_then_click") return;

    const payload = action.payload as Record<string, unknown>;
    const page = asString(payload.page);
    const onLoadText = asString(
      payload.on_load_text ?? (payload as Record<string, unknown>).onLoadText
    );

    if (!page) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[AgentWidget] nav_then_click action missing page property");
      }
      return {
        handled: true,
        displayText: ""
      };
    }

    const navigationContext = {
      page,
      onLoadText,
      messageId: context.message.id,
      triggeredAt: Date.now()
    };

    try {
      context.updateMetadata((prev) => ({
        ...prev,
        pendingNavigation: navigationContext
      }));
    } catch (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[AgentWidget] Failed to persist navigation metadata:", error);
      }
    }

    const doc = context.document;
    const win =
      doc?.defaultView ?? (typeof window !== "undefined" ? window : null);

    if (!win) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn(
          "[AgentWidget] nav_then_click handler requires a browser environment"
        );
      }
      return {
        handled: true,
        displayText: ""
      };
    }

    const NAVIGATION_FLAG_KEY = "vanilla-agent-nav-flag";
    const NAVIGATION_DEBOUNCE_KEY = "vanilla-agent-last-nav-time";
    const NAVIGATION_DEBOUNCE_MS = 2000;

    try {
      win.localStorage?.setItem(
        NAVIGATION_FLAG_KEY,
        JSON.stringify(navigationContext)
      );
    } catch (error) {
      if (typeof console !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[AgentWidget] Failed to persist navigation flag:", error);
      }
    }

    let shouldNavigate = true;
    try {
      const lastNavRaw = win.sessionStorage?.getItem(NAVIGATION_DEBOUNCE_KEY);
      const now = Date.now();
      if (lastNavRaw) {
        const lastNav = Number(lastNavRaw);
        if (!Number.isNaN(lastNav) && now - lastNav < NAVIGATION_DEBOUNCE_MS) {
          shouldNavigate = false;
        }
      }
      if (shouldNavigate) {
        win.sessionStorage?.setItem(NAVIGATION_DEBOUNCE_KEY, String(now));
      }
    } catch {
      // Ignore storage errors (e.g., Safari private mode)
    }

    if (shouldNavigate) {
      setTimeout(() => {
        try {
          const targetUrl =
            page.startsWith("http://") || page.startsWith("https://")
              ? page
              : new URL(page, win.location.origin).toString();
          win.location.assign(targetUrl);
        } catch (error) {
          if (typeof console !== "undefined") {
            // eslint-disable-next-line no-console
            console.error("[AgentWidget] Failed to navigate to page:", error);
          }
        }
      }, 300);
    }

    return {
      handled: true,
      displayText: ""
    };
  }
};

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  return [];
};

export const createActionManager = (options: ActionManagerOptions) => {
  let processedIds = new Set(
    ensureArrayOfStrings(options.getMetadata().processedActionMessageIds)
  );

  const syncFromMetadata = () => {
    processedIds = new Set(
      ensureArrayOfStrings(options.getMetadata().processedActionMessageIds)
    );
  };

  const persistProcessedIds = () => {
    const latestIds = Array.from(processedIds);
    options.updateMetadata((prev) => ({
      ...prev,
      processedActionMessageIds: latestIds
    }));
  };

  const process = (context: ActionManagerProcessContext): string | null => {
    if (
      context.streaming ||
      context.message.role !== "assistant" ||
      !context.text ||
      processedIds.has(context.message.id)
    ) {
      return null;
    }

    const parseSource =
      (typeof context.raw === "string" && context.raw) ||
      (typeof context.message.rawContent === "string" &&
        context.message.rawContent) ||
      (typeof context.text === "string" && context.text) ||
      null;

    if (
      !parseSource &&
      typeof context.text === "string" &&
      context.text.trim().startsWith("{") &&
      typeof console !== "undefined"
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "[AgentWidget] Structured response detected but no raw payload was provided. Ensure your stream parser returns { text, raw }."
      );
    }

    const action = parseSource
      ? options.parsers.reduce<AgentWidgetParsedAction | null>(
          (acc, parser) =>
            acc || parser?.({ text: parseSource, message: context.message }) || null,
          null
        )
      : null;

    if (!action) {
      return null;
    }

    processedIds.add(context.message.id);
    persistProcessedIds();

    const eventPayload: AgentWidgetActionEventPayload = {
      action,
      message: context.message
    };
    options.emit("action:detected", eventPayload);

    for (const handler of options.handlers) {
      if (!handler) continue;
      try {
        const handlerResult = handler(action, {
          message: context.message,
          metadata: options.getMetadata(),
          updateMetadata: options.updateMetadata,
          document: options.documentRef
        } as AgentWidgetActionContext) as AgentWidgetActionHandlerResult | void;

        if (!handlerResult) continue;

        if (handlerResult.displayText !== undefined && handlerResult.handled) {
          return handlerResult.displayText;
        }

        if (handlerResult.handled) {
          return "";
        }
      } catch (error) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.error("[AgentWidget] Action handler error:", error);
        }
      }
    }

    return "";
  };

  return {
    process,
    syncFromMetadata
  };
};

