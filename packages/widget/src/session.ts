import { ChatWidgetClient } from "./client";
import {
  ChatWidgetConfig,
  ChatWidgetEvent,
  ChatWidgetMessage
} from "./types";

export type ChatWidgetSessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

type SessionCallbacks = {
  onMessagesChanged: (messages: ChatWidgetMessage[]) => void;
  onStatusChanged: (status: ChatWidgetSessionStatus) => void;
  onStreamingChanged: (streaming: boolean) => void;
  onError?: (error: Error) => void;
};

export class ChatWidgetSession {
  private client: ChatWidgetClient;
  private messages: ChatWidgetMessage[];
  private status: ChatWidgetSessionStatus = "idle";
  private streaming = false;
  private abortController: AbortController | null = null;

  constructor(
    private config: ChatWidgetConfig = {},
    private callbacks: SessionCallbacks
  ) {
    this.messages = [...(config.initialMessages ?? [])];
    this.client = new ChatWidgetClient(config);

    if (this.messages.length) {
      this.callbacks.onMessagesChanged([...this.messages]);
    }
    this.callbacks.onStatusChanged(this.status);
  }

  public updateConfig(next: ChatWidgetConfig) {
    this.config = { ...this.config, ...next };
    this.client = new ChatWidgetClient(this.config);
  }

  public getMessages() {
    return [...this.messages];
  }

  public getStatus() {
    return this.status;
  }

  public isStreaming() {
    return this.streaming;
  }

  public async sendMessage(rawInput: string) {
    const input = rawInput.trim();
    if (!input) return;

    this.abortController?.abort();

    const userMessage: ChatWidgetMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      createdAt: new Date().toISOString()
    };

    this.appendMessage(userMessage);
    this.setStreaming(true);

    const controller = new AbortController();
    this.abortController = controller;

    const snapshot = [...this.messages];

    try {
      await this.client.dispatch(
        {
          messages: snapshot,
          signal: controller.signal
        },
        this.handleEvent
      );
    } catch (error) {
      const fallback: ChatWidgetMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          "It looks like the proxy isn't returning a real response yet. Here's a sample message so you can continue testing locally."
      };

      this.appendMessage(fallback);
      this.setStatus("idle");
      this.setStreaming(false);
      this.abortController = null;
      if (error instanceof Error) {
        this.callbacks.onError?.(error);
      } else {
        this.callbacks.onError?.(new Error(String(error)));
      }
    }
  }

  public cancel() {
    this.abortController?.abort();
    this.abortController = null;
    this.setStreaming(false);
    this.setStatus("idle");
  }

  private handleEvent = (event: ChatWidgetEvent) => {
    if (event.type === "message") {
      this.upsertMessage(event.message);
    } else if (event.type === "status") {
      this.setStatus(event.status);
      if (event.status === "connecting") {
        this.setStreaming(true);
      } else if (event.status === "idle" || event.status === "error") {
        this.setStreaming(false);
        this.abortController = null;
      }
    } else if (event.type === "error") {
      this.setStatus("error");
      this.setStreaming(false);
      this.abortController = null;
      this.callbacks.onError?.(event.error);
    }
  };

  private setStatus(status: ChatWidgetSessionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.callbacks.onStatusChanged(status);
  }

  private setStreaming(streaming: boolean) {
    if (this.streaming === streaming) return;
    this.streaming = streaming;
    this.callbacks.onStreamingChanged(streaming);
  }

  private appendMessage(message: ChatWidgetMessage) {
    this.messages = [...this.messages, message];
    this.callbacks.onMessagesChanged([...this.messages]);
  }

  private upsertMessage(message: ChatWidgetMessage) {
    const index = this.messages.findIndex((m) => m.id === message.id);
    if (index === -1) {
      this.appendMessage(message);
      return;
    }

    this.messages = this.messages.map((existing, idx) =>
      idx === index ? { ...existing, ...message } : existing
    );
    this.callbacks.onMessagesChanged([...this.messages]);
  }
}

