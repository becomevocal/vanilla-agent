import { ChatWidgetConfig, ChatWidgetMessage, ChatWidgetEvent } from "./types";

type DispatchOptions = {
  messages: ChatWidgetMessage[];
  signal?: AbortSignal;
};

type SSEHandler = (event: ChatWidgetEvent) => void;

const DEFAULT_ENDPOINT = "https://api.travrse.ai/v1/dispatch";

export class ChatWidgetClient {
  private readonly apiUrl: string;
  private readonly headers: Record<string, string>;
  private readonly debug: boolean;

  constructor(private config: ChatWidgetConfig = {}) {
    this.apiUrl = config.apiUrl ?? DEFAULT_ENDPOINT;
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers
    };
    this.debug = Boolean(config.debug);
  }

  public async dispatch(options: DispatchOptions, onEvent: SSEHandler) {
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort());
    }

    onEvent({ type: "status", status: "connecting" });

    // Build simplified payload with just messages and optional flowId
    const body = {
      messages: options.messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt
      })),
      ...(this.config.flowId && { flowId: this.config.flowId })
    };

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug("[ChatWidgetClient] dispatch body", body);
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      const error = new Error(
        `Chat backend request failed: ${response.status} ${response.statusText}`
      );
      onEvent({ type: "error", error });
      throw error;
    }

    onEvent({ type: "status", status: "connected" });
    try {
      await this.streamResponse(response.body, onEvent);
    } finally {
      onEvent({ type: "status", status: "idle" });
    }
  }

  private async streamResponse(
    body: ReadableStream<Uint8Array>,
    onEvent: SSEHandler
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const message: ChatWidgetMessage = {
      id: `message-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true
    };

    onEvent({ type: "message", message });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const lines = event.split("\n");
        let eventType = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          } else if (line.startsWith("data:")) {
            data += line.replace("data:", "").trim();
          }
        }

        if (!data) continue;
        let payload: any;
        try {
          payload = JSON.parse(data);
        } catch (error) {
          onEvent({
            type: "error",
            error:
              error instanceof Error
                ? error
                : new Error("Failed to parse chat stream payload")
          });
          continue;
        }

        const payloadType =
          eventType !== "message" ? eventType : payload.type ?? "message";

        if (payloadType === "step_chunk") {
          const chunk = payload.text ?? payload.delta ?? payload.content ?? "";
          if (chunk) {
            message.content += chunk;
            onEvent({ type: "message", message: { ...message } });
          }
          if (payload.isComplete) {
            const finalContent = payload.result?.response ?? message.content;
            if (finalContent) {
              message.content = finalContent;
              message.streaming = false;
              onEvent({ type: "message", message: { ...message } });
            }
          }
        } else if (payloadType === "step_complete") {
          const finalContent = payload.result?.response;
          if (finalContent) {
            message.content = finalContent;
            message.streaming = false;
            onEvent({ type: "message", message: { ...message } });
          } else {
            // No final content, just mark as complete
            message.streaming = false;
            onEvent({ type: "message", message: { ...message } });
          }
        } else if (payloadType === "flow_complete") {
          const finalContent = payload.result?.response;
          if (finalContent && finalContent !== message.content) {
            message.content = finalContent;
            onEvent({ type: "message", message: { ...message } });
          }
          message.streaming = false;
          onEvent({ type: "status", status: "idle" });
        } else if (payloadType === "error" && payload.error) {
          onEvent({
            type: "error",
            error:
              payload.error instanceof Error
                ? payload.error
                : new Error(String(payload.error))
          });
        }
      }
    }
  }
}
