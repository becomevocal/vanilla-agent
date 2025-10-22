import "dotenv/config";
import { serve } from "@hono/node-server";
import getPort from "get-port";
import { createChatProxyApp } from "@chaty-assistant/vanilla/server";

const preferredPort = Number(process.env.PORT ?? 43111);

const app = createChatProxyApp({
  path: "/api/chat/dispatch",
  allowedOrigins: ["http://localhost:5173"]
});

app.post("/form", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json(
      { success: false, message: "Invalid JSON payload", error: String(error) },
      400
    );
  }

  const type = typeof body.type === "string" ? body.type : "init";
  const name = typeof body.name === "string" ? body.name : undefined;
  const email = typeof body.email === "string" ? body.email : undefined;

  const summaryLines = [
    type === "init"
      ? "We'll follow up shortly to confirm your demo slot."
      : "Thanks for the additional context."
  ];
  if (name) summaryLines.push(`Name: ${name}`);
  if (email) summaryLines.push(`Email: ${email}`);

  return c.json({
    success: true,
    message: summaryLines.join(" "),
    nextPrompt:
      type === "init"
        ? `Demo request captured for ${name ?? "this prospect"}. What should we prepare next?`
        : `Captured extra information for ${name ?? "the request"}.`
  });
});

const start = async () => {
  const port = await getPort({ port: preferredPort });

  serve(
    {
      fetch: app.fetch,
      port
    },
    (info) => {
      // eslint-disable-next-line no-console
      console.log(`Chat proxy running on http://localhost:${info.port}`);
    }
  );
};

start();
