import "dotenv/config";
import { serve } from "@hono/node-server";
import getPort from "get-port";
import Stripe from "stripe";
import { createChatProxyApp, type TravrseFlowConfig } from "site-agent-proxy";

const preferredPort = Number(process.env.PORT ?? 43111);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

// Default chat proxy - basic conversational assistant
const app = createChatProxyApp({
  path: "/api/chat/dispatch",
  allowedOrigins: ["http://localhost:5173"]
});

// Directive-enabled proxy for interactive form demo
// This flow includes instructions to output form directives
const directiveApp = createChatProxyApp({
  path: "/api/chat/dispatch-directive",
  allowedOrigins: ["http://localhost:5173"],
  flowId: process.env.TRAVRSE_FLOW_ID,
});

// Action middleware proxy - returns JSON actions for page interaction
const actionFlowConfig: TravrseFlowConfig = {
  name: "Action Middleware Flow",
  description: "Returns JSON actions for page interaction",
  steps: [
    {
      id: "action_prompt",
      name: "Action Prompt",
      type: "prompt",
      enabled: true,
      config: {
        // model: "qwen/qwen3-8b",
        model: "meta/llama3.1-8b-instruct-free",
        responseFormat: "JSON",
        outputVariable: "prompt_result",
        userPrompt: "{{user_message}}",
        // tools: {
        //   tool_ids: [
        //     "builtin:firecrawl"
        //   ]
        // },
        systemPrompt: `You are a helpful shopping assistant that can interact with web pages. 
You will receive information about the current page's elements (class names and text content) 
and user messages. You must respond with JSON in one of these formats:

1. Simple message:
{
  "action": "message",
  "text": "Your response text here"
}

2. Navigate then show message (for navigation to another page):
{
  "action": "nav_then_click",
  "page": "http://site.com/page-url",
  "on_load_text": "Message to show after navigation"
}

3. Show message and click an element:
{
  "action": "message_and_click",
  "element": ".className-of-element",
  "text": "Your message text"
}

4. Create Stripe checkout:
{
  "action": "checkout",
  "text": "Your message text",
  "items": [
    {"name": "Product Name", "price": 2999, "quantity": 1}
  ]
}

Guidelines:
- Use "message" for simple conversational responses
- Use "nav_then_click" when you need to navigate to a different page (like a product detail page)
- Use "message_and_click" when you want to click a button or element on the current page
- Use "checkout" when the user wants to proceed to checkout/payment. Include items array with name (string), price (number in cents), and quantity (number)
- When selecting elements, use the class names provided in the page context
- Always respond with valid JSON only, no additional text
- For product searches, format results as markdown links: [Product Name](url)
- Be helpful and conversational in your messages
- Product prices: Black Shirt - Medium: $29.99 (2999 cents), Blue Shirt - Large: $34.99 (3499 cents), Red T-Shirt - Small: $19.99 (1999 cents), Jeans - Medium: $49.99 (4999 cents)

Example conversation flow:
- User: "I am looking for a black shirt in medium"
- You: {"action": "message", "text": "Here are the products I found:\\n1. [Black Shirt - Medium](/products.html?product=black-shirt-medium) - $29.99\\n2. [Blue Shirt - Large](/products.html?product=blue-shirt-large) - $34.99\\n3. [Red T-Shirt - Small](/products.html?product=red-tshirt-small) - $19.99\\n4. [Jeans - Medium](/products.html?product=jeans-medium) - $49.99\\n\\nWould you like me to navigate to the first result and add it to your cart?"}

- User: "No, I would like to add another shirt to the cart"
- You: {"action": "message_and_click", "element": ".AddToCartButton-blue-shirt-large", "text": "I've added the Blue Shirt - Large to your cart. Ready to checkout?"}

- User: "yes"
- You: {"action": "checkout", "text": "Perfect! I'll set up the checkout for you.", "items": [{"name": "Black Shirt - Medium", "price": 2999, "quantity": 1}]}`,
        previousMessages: "{{messages}}"
      }
    }
  ]
};

const actionApp = createChatProxyApp({
  path: "/api/chat/dispatch-action",
  allowedOrigins: ["http://localhost:5173"],
  flowConfig: actionFlowConfig
});

// Mount both apps
app.route("/", directiveApp);
app.route("/", actionApp);

// Stripe checkout endpoint
app.post("/api/checkout", async (c) => {
  // Handle CORS
  if (c.req.method === "OPTIONS") {
    return c.json({}, 200, {
      "Access-Control-Allow-Origin": "http://localhost:5173",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
  }

  try {
    const body = await c.req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json(
        { success: false, error: "Items array is required" },
        400,
        {
          "Access-Control-Allow-Origin": "http://localhost:5173",
        }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || typeof item.quantity !== "number") {
        return c.json(
          { success: false, error: "Each item must have name (string), price (number in cents), and quantity (number)" },
          400,
          {
            "Access-Control-Allow-Origin": "http://localhost:5173",
          }
        );
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: items.map((item: { name: string; price: number; quantity: number }) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: item.price, // Price in cents
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/action-middleware.html?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/action-middleware.html?checkout=cancelled`,
    });

    return c.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    }, 200, {
      "Access-Control-Allow-Origin": "http://localhost:5173",
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create checkout session" },
      500,
      {
        "Access-Control-Allow-Origin": "http://localhost:5173",
      }
    );
  }
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
