import { Hono } from "hono";
import type { Context } from "hono";
import { handle } from "hono/vercel";

export type ChatProxyOptions = {
  upstreamUrl?: string;
  apiKey?: string;
  path?: string;
  allowedOrigins?: string[];
};

const DEFAULT_ENDPOINT = "https://api.travrse.ai/v1/dispatch";
const DEFAULT_PATH = "/api/chat/dispatch";

const withCors =
  (allowedOrigins: string[] | undefined) =>
  async (c: Context, next: () => Promise<void>) => {
    const origin = c.req.header("origin") ?? "*";
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin":
        allowedOrigins && allowedOrigins.length
          ? allowedOrigins.includes(origin)
            ? origin
            : allowedOrigins[0]
          : origin,
      "Access-Control-Allow-Headers":
        c.req.header("access-control-request-headers") ??
        "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin"
    };

    if (c.req.method === "OPTIONS") {
      return c.text("", 204, headers);
    }

    await next();
    Object.entries(headers).forEach(([key, value]) =>
      c.header(key, value, { append: false })
    );
  };

export const createChatProxyApp = (options: ChatProxyOptions = {}) => {
  const app = new Hono();
  const path = options.path ?? DEFAULT_PATH;
  const upstream = options.upstreamUrl ?? DEFAULT_ENDPOINT;

  app.use("*", withCors(options.allowedOrigins));

  app.post(path, async (c) => {
    const apiKey = options.apiKey ?? process.env.TRAVRSE_API_KEY;
    if (!apiKey) {
      return c.json(
        { error: "Missing API key. Set TRAVRSE_API_KEY." },
        401
      );
    }

    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch (error) {
      return c.json(
        { error: "Invalid JSON body", details: error },
        400
      );
    }

    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store"
      }
    });
  });

  return app;
};

export const createVercelHandler = (options?: ChatProxyOptions) =>
  handle(createChatProxyApp(options));


export default createChatProxyApp;
