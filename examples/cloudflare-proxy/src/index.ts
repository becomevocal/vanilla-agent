import { createChatProxyApp, type TravrseFlowConfig } from "vanilla-agent-proxy";
import { Hono } from "hono";

// Environment variables interface for Cloudflare Workers
interface Env {
  TRAVRSE_API_KEY: string;
  TRAVRSE_FLOW_ID?: string;
}

// Main app that combines all proxy endpoints
const app = new Hono<{ Bindings: Env }>();

// 1. Basic conversational assistant proxy
// This is the simplest configuration - just proxies to Travrse with default settings
const basicProxyApp = new Hono<{ Bindings: Env }>();
basicProxyApp.use("*", async (c, next) => {
  const proxyApp = createChatProxyApp({
    path: "/api/chat/dispatch",
    apiKey: c.env.TRAVRSE_API_KEY,
    allowedOrigins: ["*"], // Configure this to your frontend domain in production
  });
  return proxyApp.fetch(c.req.raw, c.env);
});

// 2. Directive-enabled proxy using a flow ID
// This demonstrates using a reference to an existing Travrse flow
const directiveProxyApp = new Hono<{ Bindings: Env }>();
directiveProxyApp.use("*", async (c, next) => {
  const proxyApp = createChatProxyApp({
    path: "/api/chat/dispatch-directive",
    apiKey: c.env.TRAVRSE_API_KEY,
    flowId: c.env.TRAVRSE_FLOW_ID, // Reference existing flow from environment
    allowedOrigins: ["*"], // Configure this to your frontend domain in production
  });
  return proxyApp.fetch(c.req.raw, c.env);
});

// 3. Custom flow configuration example
// This shows how to define a flow with action middleware inline
const actionFlowConfig: TravrseFlowConfig = {
  model: "claude-sonnet-4",
  system_prompt: `You are a helpful AI assistant with access to custom actions.
You can help users by executing actions when needed.`,
  action_middleware: [
    {
      name: "get_time",
      description: "Get the current time",
      input_schema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "calculate",
      description: "Perform a mathematical calculation",
      input_schema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate (e.g., '2 + 2')",
          },
        },
        required: ["expression"],
      },
    },
  ],
};

const actionProxyApp = new Hono<{ Bindings: Env }>();
actionProxyApp.use("*", async (c, next) => {
  const proxyApp = createChatProxyApp({
    path: "/api/chat/dispatch-action",
    apiKey: c.env.TRAVRSE_API_KEY,
    flowConfig: actionFlowConfig,
    allowedOrigins: ["*"], // Configure this to your frontend domain in production
  });
  return proxyApp.fetch(c.req.raw, c.env);
});

// Mount all proxy apps
app.route("/", basicProxyApp);
app.route("/", directiveProxyApp);
app.route("/", actionProxyApp);

// Custom endpoint: Form submission handler
// This demonstrates how to add custom API endpoints alongside the proxy
app.post("/api/form", async (c) => {
  try {
    const body = await c.req.json();

    // In a real application, you might:
    // - Validate the form data
    // - Store it in a database (D1, KV, etc.)
    // - Send notifications
    // - Trigger workflows

    console.log("Form submission received:", body);

    return c.json({
      success: true,
      message: "Form submitted successfully",
      timestamp: new Date().toISOString(),
      data: body,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Invalid form data",
      },
      400
    );
  }
});

// Custom endpoint: Health check
// Useful for monitoring and ensuring the worker is running
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: {
      basic: "/api/chat/dispatch",
      directive: "/api/chat/dispatch-directive",
      action: "/api/chat/dispatch-action",
      form: "/api/form",
    },
  });
});

// Root endpoint with usage information
app.get("/", (c) => {
  return c.json({
    name: "Vanilla Agent Proxy - Cloudflare Workers",
    description: "Chat proxy service powered by Travrse AI",
    endpoints: {
      "/api/chat/dispatch": "Basic conversational assistant",
      "/api/chat/dispatch-directive": "Directive-enabled flow (requires TRAVRSE_FLOW_ID)",
      "/api/chat/dispatch-action": "Custom flow with action middleware",
      "/api/form": "Form submission handler (POST)",
      "/health": "Health check endpoint",
    },
    docs: "https://docs.travrse.ai",
  });
});

// Export for Cloudflare Workers
export default app;
